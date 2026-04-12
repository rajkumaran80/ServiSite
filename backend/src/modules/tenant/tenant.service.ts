import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { BillingService } from '../billing/billing.service';
import { EmailService } from '../../common/notifications/email.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from '@prisma/client';
import { TenantCacheService, TTL } from '../../common/cache/tenant-cache.service';
import { NotifyNextjsService } from '../../common/notify/notify-nextjs.service';
import { CloudflareService } from './cloudflare.service';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { normalizeEmail, isDisposableEmail, isSuspiciousEmail } from '../../common/utils/email.util';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly tenantCache: TenantCacheService,
    private readonly notify: NotifyNextjsService,
    private readonly cloudflare: CloudflareService,
    private readonly billing: BillingService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  async create(createTenantDto: CreateTenantDto, clientIp?: string): Promise<{ message: string }> {
    const { adminEmail, adminPassword, ...tenantData } = createTenantDto;
    const emailLower = adminEmail.toLowerCase();

    // ── 1. Check if registrations are enabled ─────────────────────────────
    const regConfig = await this.prisma.appConfig.findUnique({
      where: { key: 'registrationEnabled' },
    });
    if (regConfig && regConfig.value === 'false') {
      throw new ForbiddenException('New registrations are temporarily disabled');
    }

    // ── 2. Slug uniqueness ─────────────────────────────────────────────────
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantData.slug },
    });
    if (existingTenant) {
      throw new ConflictException(`Subdomain '${tenantData.slug}' is already taken`);
    }

    // ── 3. Disposable email check ──────────────────────────────────────────
    if (isDisposableEmail(emailLower)) {
      await this.alertSuspicious(emailLower, clientIp ?? 'unknown', 'Disposable email domain');
      throw new BadRequestException('Please use a real email address. Temporary email services are not accepted.');
    }

    // ── 4. Suspicious email check ──────────────────────────────────────────
    if (isSuspiciousEmail(emailLower)) {
      await this.alertSuspicious(emailLower, clientIp ?? 'unknown', 'Suspicious email pattern');
      throw new BadRequestException('The email address does not look valid. Please use your real email.');
    }

    // ── 5. Normalized email uniqueness (prevents Gmail dot/plus tricks) ────
    const normalised = normalizeEmail(emailLower);
    const existingNorm = await this.prisma.user.findFirst({
      where: { normalizedEmail: normalised },
    });
    if (existingNorm) {
      throw new ConflictException('An account with this email address already exists.');
    }

    // ── 6. IP rate limiting: max 1 registration per IP per month ──────────
    if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentAttempts = await this.prisma.registrationAttempt.count({
        where: { ip: clientIp, createdAt: { gte: oneMonthAgo } },
      });
      if (recentAttempts >= 1) {
        await this.alertSuspicious(emailLower, clientIp, 'Multiple registrations from same IP within 30 days');
        throw new BadRequestException('Only one registration is allowed per IP address per month.');
      }
    }

    // ── 7. Create tenant + admin user ─────────────────────────────────────
    const passwordHash = await this.authService.hashPassword(adminPassword);

    const tenant = await this.prisma.tenant.create({
      data: {
        ...tenantData,
        currency: 'GBP',
        themeSettings: tenantData.themeSettings || {
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          fontFamily: 'Inter',
        },
        users: {
          create: {
            email: emailLower,
            normalizedEmail: normalised,
            passwordHash,
            role: 'ADMIN',
            emailVerified: false,
          },
        },
        contactInfo: { create: {} },
      },
      include: {
        users: { select: { id: true, email: true, role: true } },
      },
    });

    // ── 8. Record registration attempt for IP rate limiting ───────────────
    if (clientIp) {
      await this.prisma.registrationAttempt.create({
        data: { ip: clientIp, email: emailLower },
      }).catch(() => {}); // Non-critical
    }

    const adminUser = (tenant as any).users[0];

    // ── 9. Send verification email ────────────────────────────────────────
    await this.authService.sendVerificationEmail(adminUser.id).catch((err) => {
      this.logger.warn(`Failed to send verification email: ${err.message}`);
    });

    // ── 10. Fire-and-forget: start trial, create Stripe customer ─────────
    this.billing.onTenantCreated(tenant.id, emailLower, tenant.name).catch(() => {});

    return { message: 'Account created. Please check your email to verify your address before logging in.' };
  }

  private async alertSuspicious(email: string, ip: string, reason: string): Promise<void> {
    const alertEmail = this.config.get<string>('SUPERADMIN_ALERT_EMAIL');
    if (alertEmail) {
      this.emailService.suspiciousRegistrationAlert(alertEmail, email, ip, reason).catch(() => {});
    }
  }

  async findAll(): Promise<Tenant[]> {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { menuItems: true, gallery: true } } },
    });
  }

  async findBySlug(slug: string): Promise<Tenant & { contactInfo: any; _count: any }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      include: {
        contactInfo: true,
        _count: { select: { menuItems: true, gallery: true, categories: true } },
      },
    });

    if (!tenant) throw new NotFoundException(`Tenant '${slug}' not found`);

    if (!tenant.emailVerified) {
      throw new ForbiddenException('This website is not yet active. The owner needs to verify their email address.');
    }

    const cached = await this.tenantCache.get<any>(slug, 'profile');
    if (cached) return cached;

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
    this.notify.revalidate(tenant.slug, ['tenant', 'menu', 'gallery']);
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
   * Creates a Cloudflare custom hostname and returns the TXT record
   * the tenant must add at their registrar to prove ownership.
   */
  async setCustomDomain(
    tenantId: string,
    domain: string,
  ): Promise<{ txtName: string; txtValue: string; cname: string }> {
    const normalised = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Check the domain isn't already taken by another tenant
    const conflict = await this.prisma.tenant.findFirst({
      where: { customDomain: normalised, NOT: { id: tenantId } },
    });
    if (conflict) {
      throw new ConflictException(`Domain '${normalised}' is already registered`);
    }

    // Create Cloudflare custom hostname and get verification TXT record
    const { id, txtName, txtValue } = await this.cloudflare.createCustomHostname(normalised);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomain: normalised,
        customDomainStatus: 'pending',
        customDomainToken: id, // store Cloudflare hostname ID
        customDomainNsRecords: [],
        customDomainVerifiedAt: null,
      },
    });

    return {
      txtName,
      txtValue,
      cname: 'origin.servisite.co.uk',
    };
  }

  /**
   * Check whether Cloudflare has verified the custom hostname.
   * Activates the domain once Cloudflare reports it as active.
   */
  async verifyCustomDomain(tenantId: string): Promise<{ verified: boolean; message: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        customDomain: true,
        customDomainToken: true,
        customDomainStatus: true,
        slug: true,
      },
    });

    if (!tenant?.customDomain) {
      throw new BadRequestException('No custom domain set');
    }
    if (tenant.customDomainStatus === 'active') {
      return { verified: true, message: 'Domain already active' };
    }
    if (!tenant.customDomainToken) {
      throw new BadRequestException('Domain not registered with Cloudflare — please re-save the domain');
    }

    const { active, sslStatus, hostnameStatus } = await this.cloudflare.checkCustomHostname(tenant.customDomainToken);

    if (!active) {
      return {
        verified: false,
        message: `Domain not yet verified. Cloudflare status: hostname=${hostnameStatus}, ssl=${sslStatus}. Make sure you have added the CNAME and TXT records at your registrar.`,
      };
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { customDomainStatus: 'active', customDomainVerifiedAt: new Date() },
    });

    await this.tenantCache.setDomainSlug(tenant.customDomain, tenant.slug);

    return { verified: true, message: `Domain ${tenant.customDomain} is now active!` };
  }

  /**
   * Remove a custom domain from the tenant and delete it from Cloudflare.
   */
  async removeCustomDomain(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { customDomain: true, customDomainToken: true },
    });

    if (tenant?.customDomain) {
      await Promise.all([
        this.tenantCache.deleteDomainSlug(tenant.customDomain),
        tenant.customDomainToken
          ? this.cloudflare.deleteCustomHostname(tenant.customDomainToken)
          : Promise.resolve(),
      ]);
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomain: null,
        customDomainStatus: null,
        customDomainToken: null,
        customDomainNsRecords: [],
        customDomainVerifiedAt: null,
      },
    });
  }
}
