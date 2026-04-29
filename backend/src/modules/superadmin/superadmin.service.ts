import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { TenantCacheService } from '../../common/cache/tenant-cache.service';
import { NotifyNextjsService } from '../../common/notify/notify-nextjs.service';
import { AuthService } from '../auth/auth.service';
import { NavigationService } from '../navigation/navigation.service';
import { TenantService } from '../tenant/tenant.service';
import { StripeService } from '../billing/stripe.service';
import { MENU_TEMPLATE_DATA, MENU_TEMPLATE_THEMES } from '../menu/menu-templates';
import { TenantType, TenantStatus, UserRole, ServiceProfile } from '@prisma/client';

function deriveServiceProfile(type: TenantType): ServiceProfile {
  return type === TenantType.RESTAURANT || type === TenantType.CAFE
    ? ServiceProfile.FOOD_SERVICE
    : ServiceProfile.GENERAL_SERVICE;
}
import * as bcrypt from 'bcrypt';



// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly tenantCache: TenantCacheService,
    private readonly notify: NotifyNextjsService,
    private readonly auth: AuthService,
    private readonly navigation: NavigationService,
    private readonly tenantService: TenantService,
    private readonly stripe: StripeService,
  ) {}

  async impersonateTenant(tenantId: string, superAdmin: { id: string; email: string }) {
    return this.auth.impersonateTenant(tenantId, superAdmin);
  }

  async repairTenantDomain(tenantId: string): Promise<void> {
    return this.tenantService.repairCustomDomain(tenantId);
  }

  async purgeDomainCache(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { customDomain: true },
    });
    if (!tenant?.customDomain) throw new NotFoundException('No custom domain configured for this tenant');
    await this.tenantService.purgeWorkerDomainCache(tenant.customDomain);
  }

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      where: { slug: { not: 'platform' } },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, menuItems: true } },
        users: {
          where: { role: UserRole.ADMIN },
          select: { email: true, createdAt: true },
          take: 1,
        },
      },
    });
    return tenants;
  }

  async changeCategory(tenantId: string, serviceProfile: ServiceProfile) {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { serviceProfile },
    });
  }

  async createTenant(dto: {
    name: string;
    slug: string;
    type: TenantType;
    currency: string;
    adminEmail: string;
    adminPassword: string;
  }) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug '${dto.slug}' already taken`);

    const emailLower = dto.adminEmail.toLowerCase();
    const existingUser = await this.prisma.user.findFirst({ where: { email: emailLower } });
    if (existingUser) throw new ConflictException(`An account with email '${emailLower}' already exists`);

    const theme = MENU_TEMPLATE_THEMES[dto.type] || MENU_TEMPLATE_THEMES.OTHER;

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        type: dto.type,
        serviceProfile: deriveServiceProfile(dto.type),
        currency: dto.currency,
        themeSettings: theme,
        emailVerified: true, // superadmin-created tenants are pre-verified
      },
    });

    await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: emailLower,
        normalizedEmail: emailLower.replace(/\./g, '').replace(/\+.*@/, '@'),
        passwordHash: await bcrypt.hash(dto.adminPassword, 12),
        role: UserRole.ADMIN,
        emailVerified: true, // superadmin-created users are pre-verified
      },
    });

    try {
      await this.applyTemplate(tenant.id, dto.type);
    } catch (err) {
      this.logger.error(`applyTemplate failed for tenant ${tenant.id} (${dto.type}): ${err.message}`);
    }

    this.navigation.seedDefaults(tenant.id, deriveServiceProfile(dto.type)).catch(() => {});

    // Fire-and-forget: set trial, create Stripe customer, send registration email
    this.billing.onTenantCreated(tenant.id, dto.adminEmail, dto.name).catch(() => {});

    return tenant;
  }

  private async applyTemplate(tenantId: string, type: TenantType) {
    const groups = MENU_TEMPLATE_DATA[type];
    if (!groups || groups.length === 0) return;

    for (let gi = 0; gi < groups.length; gi++) {
      const groupDef = groups[gi];
      const group = await this.prisma.menuGroup.create({
        data: {
          tenantId,
          name: groupDef.name,
          icon: groupDef.icon,
          sortOrder: gi,
          isActive: true,
          ...(groupDef.servedFrom && { servedFrom: groupDef.servedFrom }),
          ...(groupDef.servedUntil && { servedUntil: groupDef.servedUntil }),
        },
      });

      for (let ci = 0; ci < groupDef.categories.length; ci++) {
        const catDef = groupDef.categories[ci];
        const category = await this.prisma.category.create({
          data: {
            tenantId,
            menuGroupId: group.id,
            name: catDef.name,
            sortOrder: ci,
          },
        });

        for (let ii = 0; ii < catDef.items.length; ii++) {
          const itemDef = catDef.items[ii];
          await this.prisma.menuItem.create({
            data: {
              tenantId,
              name: itemDef.name,
              price: itemDef.price,
              description: itemDef.description || null,
              isPopular: itemDef.isPopular || false,
              isAvailable: true,
              sortOrder: ii,
              categories: { connect: { id: category.id } },
            },
          });
        }
      }
    }
  }

  async deleteTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.slug === 'platform') throw new ConflictException('Cannot delete platform tenant');

    // Cancel Stripe subscription so billing stops immediately
    if (tenant.stripeSubscriptionId) {
      await this.stripe.cancelSubscription(tenant.stripeSubscriptionId).catch((err) =>
        this.logger.warn(`Failed to cancel Stripe subscription for tenant ${id}: ${err.message}`),
      );
    }

    // Remove custom domain from Cloudflare + Azure before deleting the tenant record
    if (tenant.customDomain) {
      await this.tenantService.removeCustomDomain(id).catch((err) =>
        this.logger.warn(`Failed to remove custom domain for tenant ${id}: ${err.message}`),
      );
    }

    // Delete tenant — all child rows cascade via FK constraints
    await this.prisma.tenant.delete({ where: { id } });

    await this.tenantCache.invalidate(tenant.slug, 'profile', 'identity', 'menu', 'gallery', 'entries', 'contact', 'pages', 'nav');
    this.notify.revalidate(tenant.slug, ['tenant', 'menu', 'gallery', 'nav', 'pages']);
  }

  async resetAdminPassword(tenantId: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, role: UserRole.ADMIN },
    });
    if (!user) throw new NotFoundException('Admin user not found');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
  }

  async changeAdminEmail(tenantId: string, newEmail: string) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, role: UserRole.ADMIN },
    });
    if (!user) throw new NotFoundException('Admin user not found');

    const emailLower = newEmail.toLowerCase();
    const conflict = await this.prisma.user.findFirst({
      where: { email: emailLower, id: { not: user.id } },
    });
    if (conflict) throw new ConflictException(`Email '${emailLower}' is already in use`);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: emailLower,
        normalizedEmail: emailLower.replace(/\./g, '').replace(/\+.*@/, '@'),
        emailVerified: true,
      },
    });
  }

  async changeTenantPlan(tenantId: string, plan: 'BASIC' | 'ORDERING') {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.slug === 'platform') throw new ConflictException('Cannot modify platform tenant');

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: plan as any },
    });

    // Update Stripe subscription if one exists
    if (tenant.stripeSubscriptionId) {
      try {
        await this.billing.changePlan(tenantId, plan === 'ORDERING' ? 'ordering' : 'basic');
      } catch (err) {
        this.logger.warn(`Failed to update Stripe subscription for tenant ${tenantId}: ${err.message}`);
      }
    }
  }

  async applyTemplateToTenant(tenantId: string, clearExisting = false) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (clearExisting) {
      await this.prisma.menuItem.deleteMany({ where: { tenantId } });
      await this.prisma.category.deleteMany({ where: { tenantId } });
      await this.prisma.menuGroup.deleteMany({ where: { tenantId } });
    } else {
      const existing = await this.prisma.menuGroup.count({ where: { tenantId } });
      if (existing > 0) throw new ConflictException('Tenant already has menu groups. Use clearExisting=true to overwrite.');
    }

    await this.applyTemplate(tenantId, tenant.type);
    this.navigation.seedDefaults(tenantId).catch(() => {});
  }

  async setTenantStatus(tenantId: string, status: TenantStatus) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.slug === 'platform') throw new ConflictException('Cannot modify platform tenant');
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { status } });
  }

  async extendGracePeriod(tenantId: string, days: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.slug === 'platform') throw new ConflictException('Cannot modify platform tenant');

    const base = tenant.gracePeriodEndsAt && tenant.gracePeriodEndsAt > new Date()
      ? tenant.gracePeriodEndsAt
      : new Date();
    const newEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        gracePeriodEndsAt: newEnd,
        status: tenant.status === 'SUSPENDED' ? 'GRACE' : tenant.status,
      },
    });
    return { gracePeriodEndsAt: newEnd };
  }

  async getPricing() {
    const platform = await this.prisma.tenant.findUnique({ where: { slug: 'platform' } });
    const settings = (platform?.themeSettings as any) || {};
    return {
      registrationFee: settings.registrationFee ?? 299,
      basicMonthly: settings.basicMonthly ?? 49,
      orderingMonthly: settings.orderingMonthly ?? 99,
    };
  }

  async setPricing(registrationFee: number, basicMonthly: number, orderingMonthly: number) {
    const platform = await this.prisma.tenant.findUnique({ where: { slug: 'platform' } });
    if (!platform) throw new NotFoundException('Platform tenant not found');
    const existing = (platform.themeSettings as any) || {};
    await this.prisma.tenant.update({
      where: { slug: 'platform' },
      data: {
        themeSettings: { ...existing, registrationFee, basicMonthly, orderingMonthly },
      },
    });
  }

  async getTenantPricingOverride(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const settings = (tenant.themeSettings as any) || {};
    return settings.pricingOverride ?? null;
  }

  async setTenantPricingOverride(
    tenantId: string,
    override: { registrationFee?: number; basicMonthly?: number; orderingMonthly?: number } | null,
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const existing = (tenant.themeSettings as any) || {};
    if (override === null) {
      delete existing.pricingOverride;
    } else {
      existing.pricingOverride = override;
    }
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { themeSettings: existing },
    });
  }

  async getStats() {
    const [tenantCount, userCount, itemCount] = await Promise.all([
      this.prisma.tenant.count({ where: { slug: { not: 'platform' } } }),
      this.prisma.user.count({ where: { role: { not: UserRole.SUPER_ADMIN } } }),
      this.prisma.menuItem.count(),
    ]);
    return { tenantCount, userCount, itemCount };
  }
}
