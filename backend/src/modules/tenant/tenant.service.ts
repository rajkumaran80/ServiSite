import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from '@prisma/client';
import { TenantCacheService, TTL } from '../../common/cache/tenant-cache.service';
import { NotifyNextjsService } from '../../common/notify/notify-nextjs.service';
import { randomBytes } from 'crypto';
import { promises as dns } from 'dns';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly tenantCache: TenantCacheService,
    private readonly notify: NotifyNextjsService,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    const { adminEmail, adminPassword, ...tenantData } = createTenantDto;

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantData.slug },
    });

    if (existingTenant) {
      throw new ConflictException(`Tenant with slug '${tenantData.slug}' already exists`);
    }

    const passwordHash = await this.authService.hashPassword(adminPassword);

    return this.prisma.tenant.create({
      data: {
        ...tenantData,
        themeSettings: tenantData.themeSettings || {
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          fontFamily: 'Inter',
        },
        users: {
          create: {
            email: adminEmail.toLowerCase(),
            passwordHash,
            role: 'ADMIN',
          },
        },
        contactInfo: { create: {} },
      },
      include: {
        users: { select: { id: true, email: true, role: true } },
      },
    });
  }

  async findAll(): Promise<Tenant[]> {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { menuItems: true, gallery: true } } },
    });
  }

  async findBySlug(slug: string): Promise<Tenant & { contactInfo: any; _count: any }> {
    const cached = await this.tenantCache.get<any>(slug, 'profile');
    if (cached) return cached;

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      include: {
        contactInfo: true,
        _count: { select: { menuItems: true, gallery: true, categories: true } },
      },
    });

    if (!tenant) throw new NotFoundException(`Tenant '${slug}' not found`);

    await this.tenantCache.set(slug, 'profile', tenant, TTL.TENANT_PROFILE);
    return tenant;
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        contactInfo: true,
        _count: { select: { menuItems: true, gallery: true } },
      },
    });

    if (!tenant) throw new NotFoundException(`Tenant with ID '${id}' not found`);
    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const existing = await this.findById(id);

    const mergedTheme =
      updateTenantDto.themeSettings !== undefined
        ? { ...((existing.themeSettings as object) ?? {}), ...(updateTenantDto.themeSettings as object) }
        : undefined;

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...updateTenantDto,
        ...(mergedTheme !== undefined && { themeSettings: mergedTheme }),
      },
    });

    // Invalidate cache for this tenant
    await this.tenantCache.invalidate(existing.slug, 'profile', 'identity');
    this.notify.revalidate(existing.slug, ['tenant']);

    return updated;
  }

  async delete(id: string): Promise<void> {
    const tenant = await this.findById(id);
    await this.prisma.tenant.delete({ where: { id } });
    await this.tenantCache.invalidate(tenant.slug, 'profile', 'identity', 'menu', 'gallery', 'entries', 'contact', 'pages');
    if ((tenant as any).customDomain) {
      await this.tenantCache.deleteDomainSlug((tenant as any).customDomain);
    }
  }

  async getTenantStats(tenantId: string) {
    const [menuItemCount, categoryCount, galleryCount] = await Promise.all([
      this.prisma.menuItem.count({ where: { tenantId } }),
      this.prisma.category.count({ where: { tenantId } }),
      this.prisma.galleryImage.count({ where: { tenantId } }),
    ]);
    return { menuItems: menuItemCount, categories: categoryCount, galleryImages: galleryCount };
  }

  // ── Custom Domain ──────────────────────────────────────────────────────────

  /**
   * Step 1: Tenant submits their custom domain.
   * We generate a verification token and return DNS instructions.
   */
  async setCustomDomain(tenantId: string, domain: string): Promise<{ token: string; txtRecord: string }> {
    const normalised = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Check the domain isn't already taken by another tenant
    const conflict = await this.prisma.tenant.findFirst({
      where: { customDomain: normalised, NOT: { id: tenantId } },
    });
    if (conflict) {
      throw new ConflictException(`Domain '${normalised}' is already registered`);
    }

    const token = `srv-verify-${randomBytes(8).toString('hex')}`;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomain: normalised,
        customDomainStatus: 'pending',
        customDomainToken: token,
        customDomainVerifiedAt: null,
      },
    });

    return {
      token,
      txtRecord: `_servisite-verify.${normalised}`,
    };
  }

  /**
   * Step 2: Check DNS and activate the domain if TXT record matches.
   */
  async verifyCustomDomain(tenantId: string): Promise<{ verified: boolean; message: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { customDomain: true, customDomainToken: true, customDomainStatus: true, slug: true },
    });

    if (!tenant?.customDomain || !tenant.customDomainToken) {
      throw new BadRequestException('No custom domain pending verification');
    }
    if (tenant.customDomainStatus === 'active') {
      return { verified: true, message: 'Domain already active' };
    }

    const txtHost = `_servisite-verify.${tenant.customDomain}`;
    let found = false;

    try {
      const records = await dns.resolveTxt(txtHost);
      found = records.flat().includes(tenant.customDomainToken);
    } catch {
      // DNS resolution failed — record not yet propagated
    }

    if (!found) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { customDomainStatus: 'failed' },
      });
      return { verified: false, message: `TXT record not found at ${txtHost}. DNS changes can take up to 48 hours.` };
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomainStatus: 'active',
        customDomainVerifiedAt: new Date(),
      },
    });

    // Warm the domain→slug cache immediately
    await this.tenantCache.setDomainSlug(tenant.customDomain, tenant.slug);

    return { verified: true, message: `Domain ${tenant.customDomain} is now active!` };
  }

  /**
   * Remove a custom domain from the tenant.
   */
  async removeCustomDomain(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { customDomain: true },
    });

    if (tenant?.customDomain) {
      await this.tenantCache.deleteDomainSlug(tenant.customDomain);
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomain: null,
        customDomainStatus: null,
        customDomainToken: null,
        customDomainVerifiedAt: null,
      },
    });
  }
}
