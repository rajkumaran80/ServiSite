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
import { Tenant, TenantType, ServiceProfile } from '@prisma/client';
import { TenantCacheService, TTL } from '../../common/cache/tenant-cache.service';
import { NotifyNextjsService } from '../../common/notify/notify-nextjs.service';
import { CloudflareService } from './cloudflare.service';
import { AzureAppServiceService } from './azure-appservice.service';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { normalizeEmail, isDisposableEmail, isSuspiciousEmail } from '../../common/utils/email.util';
import { NavigationService } from '../navigation/navigation.service';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly tenantCache: TenantCacheService,
    private readonly notify: NotifyNextjsService,
    private readonly cloudflare: CloudflareService,
    private readonly azureAppService: AzureAppServiceService,
    private readonly billing: BillingService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
    private readonly navigation: NavigationService,
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

    // ── 5. Email uniqueness: exact match + normalized (dots/plus tricks) ──
    const normalised = normalizeEmail(emailLower);
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: emailLower },
          { normalizedEmail: normalised },
        ],
      },
    });
    if (existingUser) {
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

    const derivedServiceProfile =
      tenantData.type === TenantType.RESTAURANT || tenantData.type === TenantType.CAFE
        ? ServiceProfile.FOOD_SERVICE
        : ServiceProfile.GENERAL_SERVICE;

    const tenant = await this.prisma.tenant.create({
      data: {
        ...tenantData,
        serviceProfile: derivedServiceProfile,
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

    // ── 11. Seed default nav items ────────────────────────────────────────
    try {
      await this.navigation.seedDefaults(tenant.id, derivedServiceProfile);
      this.logger.log(`Default navigation seeded for tenant ${tenant.slug} (profile: ${derivedServiceProfile})`);
    } catch (error) {
      this.logger.error(`Failed to seed default navigation for tenant ${tenant.slug}:`, error);
    }

    return { message: 'Account created. Please check your email to verify your address before logging in.' };
  }

  private async alertSuspicious(email: string, ip: string, reason: string): Promise<void> {
    const alertEmail = this.config.get<string>('SUPERADMIN_ALERT_EMAIL');
    if (alertEmail) {
      this.emailService.suspiciousRegistrationAlert(alertEmail, email, ip, reason).catch(() => {});
    }
  }

  async findByDomain(domain: string): Promise<{ slug: string } | null> {
    const normalised = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').split(':')[0];

    // Check Redis first
    const cached = await this.tenantCache.getDomainSlug(normalised);
    if (cached === '__NOT_FOUND__') return null;
    if (cached) return { slug: cached };

    // Build candidate list: try exact match, then www↔bare fallback
    const candidates = [normalised];
    if (normalised.startsWith('www.')) {
      candidates.push(normalised.slice(4)); // www.la-cafe.co.uk → la-cafe.co.uk
    } else {
      candidates.push(`www.${normalised}`); // la-cafe.co.uk → www.la-cafe.co.uk
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { customDomain: { in: candidates }, customDomainStatus: 'active' },
      select: { slug: true },
    });

    if (tenant) {
      await this.tenantCache.setDomainSlug(normalised, tenant.slug);
      return { slug: tenant.slug };
    }

    await this.tenantCache.setDomainNotFound(normalised);
    return null;
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
    if (!tenant) throw new NotFoundException('Tenant not found');
    
    // Exclude inactive tenants from normal operations
    if (tenant.status === 'CANCELLED' || tenant.status === 'SUSPENDED') {
      throw new NotFoundException('Tenant not found or inactive');
    }
    
    await this.tenantCache.set(slug, 'profile', tenant, TTL.TENANT_PROFILE);
    return tenant as Tenant & { contactInfo: any; _count: any };
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
    
    // First, soft delete by marking as CANCELLED
    await this.prisma.tenant.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    
    // Invalidate all cache entries
    await this.tenantCache.invalidate(tenant.slug, 'profile', 'identity', 'menu', 'gallery', 'entries', 'contact', 'pages');
    
    // Remove custom domain mappings
    if ((tenant as any).customDomain) {
      await this.tenantCache.deleteDomainSlug((tenant as any).customDomain);
    }
    
    // Clean up custom domain resources
    if ((tenant as any).customDomain) {
      await this.removeCustomDomain(id);
    }
    
    // Notify frontend to clear cache
    this.notify.revalidate(tenant.slug, ['tenant', 'menu', 'gallery']);
    
    this.logger.log(`Tenant ${tenant.slug} marked as CANCELLED (soft deleted)`);
  }

  async hardDelete(id: string): Promise<void> {
    const tenant = await this.findById(id);
    
    // Clean up custom domain resources first
    if ((tenant as any).customDomain) {
      await this.removeCustomDomain(id);
    }
    
    // Perform hard delete - this will cascade delete all related data due to onDelete: Cascade
    await this.prisma.tenant.delete({ where: { id } });
    
    // Clean up any remaining cache entries
    await this.tenantCache.invalidate(tenant.slug, 'profile', 'identity', 'menu', 'gallery', 'entries', 'contact', 'pages');
    
    if ((tenant as any).customDomain) {
      await this.tenantCache.deleteDomainSlug((tenant as any).customDomain);
    }
    
    // Notify frontend to clear cache
    this.notify.revalidate(tenant.slug, ['tenant', 'menu', 'gallery']);
    
    this.logger.log(`Tenant ${tenant.slug} permanently deleted (hard delete)`);
  }

  async disable(id: string): Promise<void> {
    const tenant = await this.findById(id);
    
    await this.prisma.tenant.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });
    
    // Invalidate cache to make changes take effect immediately
    await this.tenantCache.invalidate(tenant.slug, 'profile', 'identity', 'menu', 'gallery', 'entries', 'contact', 'pages');
    
    // Notify frontend to clear cache
    this.notify.revalidate(tenant.slug, ['tenant', 'menu', 'gallery']);
    
    this.logger.log(`Tenant ${tenant.slug} disabled (status: SUSPENDED)`);
  }

  async enable(id: string): Promise<void> {
    const tenant = await this.findById(id);
    
    await this.prisma.tenant.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
    
    // Invalidate cache to make changes take effect immediately
    await this.tenantCache.invalidate(tenant.slug, 'profile', 'identity', 'menu', 'gallery', 'entries', 'contact', 'pages');
    
    // Notify frontend to clear cache
    this.notify.revalidate(tenant.slug, ['tenant', 'menu', 'gallery']);
    
    this.logger.log(`Tenant ${tenant.slug} enabled (status: ACTIVE)`);
  }

  async getTenantStats(tenantId: string) {
    const [menuItemCount, categoryCount, galleryCount] = await Promise.all([
      this.prisma.menuItem.count({ where: { tenantId } }),
      this.prisma.category.count({ where: { tenantId } }),
      this.prisma.galleryImage.count({ where: { tenantId } }),
    ]);
    return { menuItems: menuItemCount, categories: categoryCount, galleryImages: galleryCount };
  }

  // ── Home Page Sections ─────────────────────────────────────────────────────

  async getHomeSections(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { themeSettings: true }
    });
    
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const settings = tenant.themeSettings as any || {};
    return settings.homeSections || [];
  }

  async updateHomeSections(tenantId: string, sections: any[]) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId }
    });
    
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const settings = (tenant.themeSettings as any) || {};
    settings.homeSections = sections;

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { themeSettings: settings }
    });

    // Revalidate tenant pages to reflect changes
    this.notify.revalidate(tenant.slug, ['tenant', 'home-sections']);

    return (updated.themeSettings as any).homeSections || [];
  }

  async getHomeSectionsBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { themeSettings: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return (tenant.themeSettings as any)?.homeSections || [];
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
  ): Promise<{ cname: string }> {
    const normalised = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const apex = normalised.replace(/^www\./, '');

    // Check the domain isn't already taken by another tenant
    const conflict = await this.prisma.tenant.findFirst({
      where: { customDomain: apex, NOT: { id: tenantId } },
    });
    if (conflict) {
      throw new ConflictException(`Domain '${apex}' is already registered`);
    }

    // Register both www and apex in Cloudflare so SSL is provisioned for both.
    // Azure App Service also needs bindings for both to accept incoming requests.
    const wwwHostname = `www.${apex}`;
    const [{ id: wwwId }, { id: apexId }] = await Promise.all([
      this.cloudflare.createCustomHostname(wwwHostname),
      this.cloudflare.createCustomHostname(apex),
    ]);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomain: apex,
        customDomainStatus: 'pending',
        customDomainToken: wwwId,
        customDomainApexToken: apexId,
        customDomainZoneId: null,
        customDomainNsRecords: [],
        customDomainVerifiedAt: null,
        customDomainTxtName: null,
        customDomainTxtValue: null,
      },
    });

    // Add hostname bindings to Azure App Service for both www and apex
    await Promise.all([
      this.azureAppService.addHostnameBinding(wwwHostname),
      this.azureAppService.addHostnameBinding(apex),
    ]);

    return { cname: 'origin.servisite.co.uk' };
  }

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
        message: `Not yet active. Status: hostname=${hostnameStatus}, ssl=${sslStatus}. Make sure you have added the CNAME record and try again in a few minutes.`,
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
      select: { customDomain: true, customDomainToken: true, customDomainApexToken: true, customDomainZoneId: true },
    });

    if (tenant?.customDomain) {
      const wwwHostname = `www.${tenant.customDomain}`;
      await Promise.all([
        // Clear domain→slug cache for both variants
        this.tenantCache.deleteDomainSlug(tenant.customDomain),
        this.tenantCache.deleteDomainSlug(wwwHostname),
        // Delete Cloudflare custom hostnames (www token + apex token)
        tenant.customDomainZoneId
          ? this.cloudflare.deleteZone(tenant.customDomainZoneId)
          : Promise.all([
              tenant.customDomainToken
                ? this.cloudflare.deleteCustomHostname(tenant.customDomainToken)
                : Promise.resolve(),
              tenant.customDomainApexToken
                ? this.cloudflare.deleteCustomHostname(tenant.customDomainApexToken)
                : Promise.resolve(),
            ]),
        // Remove Azure App Service hostname bindings for both www and apex
        this.azureAppService.removeHostnameBinding(wwwHostname).catch(() => {}),
        this.azureAppService.removeHostnameBinding(tenant.customDomain).catch(() => {}),
      ]);
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomain: null,
        customDomainStatus: null,
        customDomainToken: null,
        customDomainApexToken: null,
        customDomainZoneId: null,
        customDomainNsRecords: [],
        customDomainVerifiedAt: null,
      },
    });
  }
}
