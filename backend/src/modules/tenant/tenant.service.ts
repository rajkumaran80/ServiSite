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
import { CloudflareService, CustomHostnameResult } from './cloudflare.service';
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
   * Full domain onboarding — Steps 1–5 of the agent plan.
   * Creates zone, adds CNAME records, creates Custom Hostnames for SSL,
   * adds DCV TXT records, saves everything to DB.
   */
  async setCustomDomain(
    tenantId: string,
    domain: string,
  ): Promise<{ nameservers: string[] }> {
    const normalised = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const apex = normalised.replace(/^www\./, '');

    const conflict = await this.prisma.tenant.findFirst({
      where: { customDomain: apex, NOT: { id: tenantId } },
    });
    if (conflict) {
      throw new ConflictException(`Domain '${apex}' is already registered`);
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    if (!tenant) throw new BadRequestException('Tenant not found');

    const baseDomain = this.config.get<string>('SERVISITE_BASE_DOMAIN', 'servisite.co.uk');
    const tenantSubdomain = `${tenant.slug}.${baseDomain}`;

    // Step 1: Create zone → get zone ID + nameservers
    let zoneId: string;
    let nameservers: string[];
    try {
      ({ zoneId, nameservers } = await this.cloudflare.createZone(apex));
    } catch (error) {
      this.logger.error('Failed to create Cloudflare zone:', error.message);
      throw new BadRequestException(`Failed to create Cloudflare zone: ${error.message}`);
    }

    // Step 2: Clean up any auto-imported conflicting records, then add ours
    try {
      await this.cloudflare.cleanupTenantZoneDnsRecords(zoneId);
      await this.cloudflare.addTenantZoneDnsRecords(zoneId, tenantSubdomain);
    } catch (error) {
      this.logger.error('Failed to set up DNS records in tenant zone:', error.message);
      // Non-fatal — continue
    }

    // Step 3: Add Custom Hostnames in servisite zone → get DCV tokens
    let rootHostname: CustomHostnameResult;
    let wwwHostname: CustomHostnameResult;
    try {
      const { root, www } = await this.cloudflare.createCustomHostnames(apex, tenantSubdomain);
      rootHostname = root;
      wwwHostname = www;
    } catch (error) {
      this.logger.error('Failed to create Custom Hostnames:', error.message);
      throw new BadRequestException(`Failed to create Custom Hostnames: ${error.message}`);
    }

    // Step 4: Add DCV TXT records in tenant zone
    this.logger.log(`Custom hostname tokens — root ownership: ${rootHostname.ownershipName ?? 'none'}, www ownership: ${wwwHostname.ownershipName ?? 'none'}`);
    try {
      await this.cloudflare.addDcvTxtRecords(zoneId, rootHostname, wwwHostname);
      this.logger.log(`DCV TXT records written to zone ${zoneId}`);
    } catch (error) {
      this.logger.error(`Failed to add DCV TXT records: ${error.message}`);
    }

    // Step 5: Save to DB
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomain: apex,
        customDomainStatus: 'pending',
        customDomainZoneId: zoneId,
        customDomainNsRecords: nameservers,
        customDomainToken: wwwHostname.id,       // www custom hostname ID
        customDomainApexToken: rootHostname.id,  // root custom hostname ID
        customDomainTxtName: null,
        customDomainTxtValue: null,
        customDomainVerifiedAt: null,
      },
    });

    return { nameservers };
  }

  /**
   * Manual check — tenant clicks "Check Status".
   * Checks both Custom Hostname statuses; marks active if both are live.
   */
  async verifyCustomDomain(tenantId: string): Promise<{ verified: boolean; message: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        customDomain: true,
        customDomainToken: true,
        customDomainApexToken: true,
        customDomainStatus: true,
        slug: true,
      },
    });

    if (!tenant?.customDomain) throw new BadRequestException('No custom domain set');
    if (tenant.customDomainStatus === 'active') {
      return { verified: true, message: 'Domain already active' };
    }
    if (!tenant.customDomainToken || !tenant.customDomainApexToken) {
      throw new BadRequestException('Domain setup incomplete — please remove and re-add the domain');
    }

    const bothActive = await this.cloudflare.areBothCustomHostnamesActive(
      tenant.customDomainApexToken,
      tenant.customDomainToken,
    );

    if (!bothActive) {
      const [rootStatus, wwwStatus] = await Promise.all([
        this.cloudflare.getCustomHostnameStatus(tenant.customDomainApexToken),
        this.cloudflare.getCustomHostnameStatus(tenant.customDomainToken),
      ]);
      return {
        verified: false,
        message: `Domain not active yet. Nameservers: update at your registrar if not done. SSL: root=${rootStatus.sslStatus}, www=${wwwStatus.sslStatus}. This can take 1–24 hours after nameserver change.`,
      };
    }

    await this.activateCustomDomain(tenantId, tenant.customDomain, tenant.slug);
    return { verified: true, message: `Domain ${tenant.customDomain} is now active!` };
  }

  async activateCustomDomain(tenantId: string, domain: string, slug: string): Promise<void> {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { customDomainStatus: 'active', customDomainVerifiedAt: new Date() },
    });
    await this.tenantCache.setDomainSlug(domain, slug);
    this.logger.log(`Custom domain activated: ${domain} → ${slug}`);
  }

  /**
   * Remove custom domain — deletes Custom Hostnames, zone, and clears DB.
   */
  async removeCustomDomain(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        customDomain: true,
        customDomainZoneId: true,
        customDomainToken: true,
        customDomainApexToken: true,
      },
    });

    const cleanups: Promise<any>[] = [];

    if (tenant?.customDomain) {
      cleanups.push(
        this.tenantCache.deleteDomainSlug(tenant.customDomain).catch(() => {}),
        this.tenantCache.deleteDomainSlug(`www.${tenant.customDomain}`).catch(() => {}),
      );
    }
    if (tenant?.customDomainToken) {
      cleanups.push(
        this.cloudflare.deleteCustomHostname(tenant.customDomainToken).catch((err) => {
          this.logger.warn(`Could not delete www custom hostname: ${err.message}`);
        }),
      );
    }
    if (tenant?.customDomainApexToken) {
      cleanups.push(
        this.cloudflare.deleteCustomHostname(tenant.customDomainApexToken).catch((err) => {
          this.logger.warn(`Could not delete root custom hostname: ${err.message}`);
        }),
      );
    }
    if (tenant?.customDomainZoneId) {
      cleanups.push(
        this.cloudflare.deleteZone(tenant.customDomainZoneId).catch((err) => {
          this.logger.warn(`Could not delete Cloudflare zone: ${err.message}`);
        }),
      );
    }

    await Promise.all(cleanups);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomain: null,
        customDomainStatus: null,
        customDomainZoneId: null,
        customDomainNsRecords: [],
        customDomainToken: null,
        customDomainApexToken: null,
        customDomainTxtName: null,
        customDomainTxtValue: null,
        customDomainVerifiedAt: null,
      },
    });
  }

  /**
   * Repair an existing custom domain setup:
   * - Patches both Custom Hostnames with custom_origin_sni_hostname (fixes Azure 404)
   * - Re-writes all DCV + ownership TXT records to the tenant zone
   */
  async purgeWorkerDomainCache(domain: string): Promise<void> {
    await this.cloudflare.purgeWorkerDomainCache(domain);
  }

  async repairCustomDomain(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        slug: true,
        customDomain: true,
        customDomainZoneId: true,
        customDomainToken: true,
        customDomainApexToken: true,
      },
    });

    if (!tenant?.customDomain) throw new BadRequestException('No custom domain configured');
    if (!tenant.customDomainZoneId || !tenant.customDomainToken || !tenant.customDomainApexToken) {
      throw new BadRequestException('Domain setup incomplete — remove and re-add the domain');
    }

    const baseDomain = this.config.get<string>('SERVISITE_BASE_DOMAIN', 'servisite.co.uk');
    const tenantSubdomain = `${tenant.slug}.${baseDomain}`;

    await this.cloudflare.repairCustomHostnames(
      tenant.customDomainZoneId,
      tenant.customDomainApexToken,
      tenant.customDomainToken,
      tenantSubdomain,
    );

    // If both CF custom hostnames are already active, mark domain active in DB now
    const bothActive = await this.cloudflare.areBothCustomHostnamesActive(
      tenant.customDomainApexToken,
      tenant.customDomainToken,
    ).catch(() => false);

    if (bothActive) {
      await this.activateCustomDomain(tenantId, tenant.customDomain, tenant.slug);
    }

    this.logger.log(`Custom domain repaired for tenant ${tenantId}: ${tenant.customDomain} → ${tenantSubdomain} (activated=${bothActive})`);
  }
}
