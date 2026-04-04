import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { NotificationsService } from '../../common/notifications/notifications.service';
import { TenantStatus, TenantPlan } from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
    private notifications: NotificationsService,
  ) {}

  // ── Setup ──────────────────────────────────────────────────────────────

  /** Called when superadmin creates a new tenant. */
  async onTenantCreated(tenantId: string, adminEmail: string, tenantName: string): Promise<void> {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const gracePeriodEndsAt = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

    // Create Stripe customer
    let stripeCustomerId: string | undefined;
    try {
      stripeCustomerId = await this.stripe.ensureCustomer(tenantId, adminEmail, tenantName);
    } catch (err) {
      this.logger.warn(`Failed to create Stripe customer for tenant ${tenantId}: ${err.message}`);
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: TenantStatus.TRIAL,
        trialEndsAt,
        gracePeriodEndsAt,
        ...(stripeCustomerId ? { stripeCustomerId } : {}),
      },
    });

    // Send welcome email with payment link
    if (stripeCustomerId) {
      try {
        const checkoutUrl = await this.stripe.createRegistrationCheckout(stripeCustomerId, tenantId);
        await this.notifications.sendRegistrationLink(tenantId, checkoutUrl);
      } catch (err) {
        this.logger.warn(`Failed to send registration link for ${tenantId}: ${err.message}`);
      }
    }
  }

  // ── Checkout session endpoints ─────────────────────────────────────────

  async getRegistrationCheckoutUrl(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.registrationFeePaid) throw new BadRequestException('Registration fee already paid');

    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const user = await this.prisma.user.findFirst({ where: { tenantId, role: 'ADMIN' } });
      customerId = await this.stripe.ensureCustomer(tenantId, user?.email ?? '', tenant.name);
      await this.prisma.tenant.update({ where: { id: tenantId }, data: { stripeCustomerId: customerId } });
    }

    return this.stripe.createRegistrationCheckout(customerId, tenantId);
  }

  async getSubscriptionCheckoutUrl(tenantId: string, plan: 'basic' | 'ordering'): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!tenant.registrationFeePaid) throw new BadRequestException('Registration fee must be paid first');
    if (tenant.stripeSubscriptionId) throw new BadRequestException('Subscription already active — use change-plan instead');

    // Give 7 days free trial on first subscription
    return this.stripe.createSubscriptionCheckout(tenant.stripeCustomerId!, tenantId, plan, 7);
  }

  /**
   * Change an active subscription to a different plan.
   * Rules:
   *  - Upgrade (basic → ordering) during Stripe trial: extend trial by 7 days from now
   *  - Downgrade (ordering → basic) during trial: keep current trial end unchanged
   *  - Outside trial: prorate immediately (Stripe default)
   */
  async changePlan(tenantId: string, newPlan: 'basic' | 'ordering'): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!tenant.stripeSubscriptionId) throw new BadRequestException('No active subscription — subscribe first');
    if (tenant.plan === TenantPlan[newPlan.toUpperCase() as keyof typeof TenantPlan]) {
      throw new BadRequestException(`Already on the ${newPlan} plan`);
    }

    const isUpgrade = newPlan === 'ordering';
    let trialEnd: Date | undefined;

    // Check if currently in Stripe trial period
    const sub = await this.stripe.getSubscription(tenant.stripeSubscriptionId);
    const inTrial = sub.status === 'trialing';

    if (inTrial && isUpgrade) {
      // Extend trial by 7 days from now on upgrade
      trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      this.logger.log(`Tenant ${tenantId} upgrading during trial — extending trial to ${trialEnd.toISOString()}`);
    }
    // Downgrade during trial: trialEnd remains undefined → Stripe keeps existing trial_end

    await this.stripe.updateSubscriptionPlan(tenant.stripeSubscriptionId, newPlan, trialEnd);

    // Update DB immediately (webhook will confirm later)
    const planEnum = newPlan === 'ordering' ? TenantPlan.ORDERING : TenantPlan.BASIC;
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: planEnum },
    });

    await this.prisma.billingEvent.create({
      data: {
        tenantId,
        type: isUpgrade ? 'plan_upgraded' : 'plan_downgraded',
        metadata: {
          from: tenant.plan,
          to: newPlan,
          trialExtended: isUpgrade && inTrial,
          newTrialEnd: trialEnd?.toISOString(),
        },
      },
    });

    this.logger.log(`Tenant ${tenantId} plan changed from ${tenant.plan} to ${newPlan}`);
  }

  async getPortalUrl(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.stripeCustomerId) throw new BadRequestException('No Stripe customer found');
    return this.stripe.createPortalSession(tenant.stripeCustomerId);
  }

  async getConnectOnboardingUrl(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.plan !== TenantPlan.ORDERING) throw new BadRequestException('Ordering plan required for Connect');

    let connectId = tenant.stripeConnectId;
    if (!connectId) {
      const user = await this.prisma.user.findFirst({ where: { tenantId, role: 'ADMIN' } });
      connectId = await this.stripe.createConnectAccount(tenantId, user?.email ?? '');
      await this.prisma.tenant.update({ where: { id: tenantId }, data: { stripeConnectId: connectId } });
    }

    return this.stripe.createConnectOnboardingLink(connectId, tenantId);
  }

  // ── Status query ───────────────────────────────────────────────────────

  async getStatus(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const now = new Date();
    const daysInTrial = tenant.trialEndsAt
      ? Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - now.getTime()) / 86400000))
      : 0;
    const daysUntilSuspension = tenant.gracePeriodEndsAt
      ? Math.max(0, Math.ceil((tenant.gracePeriodEndsAt.getTime() - now.getTime()) / 86400000))
      : 0;

    return {
      status: tenant.status,
      plan: tenant.plan ? tenant.plan.toLowerCase() : null,
      registrationFeePaid: tenant.registrationFeePaid,
      trialEndsAt: tenant.trialEndsAt,
      gracePeriodEndsAt: tenant.gracePeriodEndsAt,
      currentPeriodEnd: tenant.currentPeriodEnd,
      suspendedAt: tenant.suspendedAt,
      daysInTrial,
      daysUntilSuspension,
      stripeConnectId: tenant.stripeConnectId,
      stripeSubscriptionId: tenant.stripeSubscriptionId,
      hasSubscription: !!tenant.stripeSubscriptionId,
    };
  }

  // ── Webhook handler ────────────────────────────────────────────────────

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    // Idempotency: skip if already processed
    const existing = await this.prisma.billingEvent.findUnique({ where: { stripeEvent: event.id } });
    if (existing) return;

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
          break;
        case 'customer.subscription.updated':
        case 'customer.subscription.created':
          await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoiceFailed(event.data.object as Stripe.Invoice);
          break;
        case 'account.updated':
          await this.handleConnectAccountUpdated(event.data.object as Stripe.Account);
          break;
        default:
          break;
      }

      // Log processed event — only when we have a valid tenantId
      const tenantId = (event.data.object as any)?.metadata?.tenantId
        ?? (event.data.object as any)?.customer
          ? await this.prisma.tenant.findFirst({
              where: { stripeCustomerId: (event.data.object as any).customer },
              select: { id: true },
            }).then(t => t?.id)
          : undefined;

      if (tenantId) {
        await this.prisma.billingEvent.create({
          data: {
            tenantId,
            type: event.type,
            stripeEvent: event.id,
            metadata: event.data.object as any,
          },
        });
      }
    } catch (err) {
      this.logger.error(`Webhook handler error for ${event.type}: ${err.message}`);
      throw err;
    }
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const tenantId = session.metadata?.tenantId;
    if (!tenantId) return;

    if (session.metadata?.type === 'registration' && session.mode === 'payment') {
      // Registration fee paid
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          registrationFeePaid: true,
          registrationFeePaymentIntent: session.payment_intent as string,
          status: TenantStatus.ACTIVE,
        },
      });
      this.logger.log(`Registration fee paid for tenant ${tenantId}`);

    } else if (session.mode === 'subscription' && session.subscription) {
      // Subscription started via Checkout
      const plan = (session.metadata?.plan === 'ordering') ? TenantPlan.ORDERING : TenantPlan.BASIC;
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          stripeSubscriptionId: session.subscription as string,
          status: TenantStatus.ACTIVE,
          plan,
        },
      });
    }
  }

  private async handleSubscriptionUpdate(sub: Stripe.Subscription): Promise<void> {
    const tenantId = sub.metadata?.tenantId;
    if (!tenantId) return;

    const currentPeriodEnd = new Date((sub as any).current_period_end * 1000);
    const plan = sub.metadata?.plan === 'ordering' ? TenantPlan.ORDERING : TenantPlan.BASIC;
    const isActive = ['active', 'trialing'].includes(sub.status);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        stripeSubscriptionId: sub.id,
        plan,
        currentPeriodEnd,
        status: isActive ? TenantStatus.ACTIVE : TenantStatus.SUSPENDED,
      },
    });
  }

  private async handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
    const tenantId = sub.metadata?.tenantId;
    if (!tenantId) return;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        stripeSubscriptionId: null,
        status: TenantStatus.CANCELLED,
      },
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const tenant = await this.prisma.tenant.findFirst({ where: { stripeCustomerId: customerId } });
    if (!tenant) return;

    if (tenant.status === TenantStatus.SUSPENDED) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: TenantStatus.ACTIVE },
      });
    }
  }

  private async handleInvoiceFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const tenant = await this.prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId },
      include: { users: { where: { role: 'ADMIN' }, take: 1 } },
    });
    if (!tenant || !tenant.users[0]) return;

    try {
      const portalUrl = await this.stripe.createPortalSession(customerId);
      await this.notifications.sendPaymentFailedNotice(tenant.id, portalUrl);
    } catch {}
  }

  private async handleConnectAccountUpdated(account: Stripe.Account): Promise<void> {
    if (!account.charges_enabled) return;
    const tenant = await this.prisma.tenant.findFirst({ where: { stripeConnectId: account.id } });
    if (!tenant) return;
    // Connect account is now fully onboarded — we could store this status if needed
    this.logger.log(`Stripe Connect account ${account.id} is now active for tenant ${tenant.id}`);
  }

  // ── Scheduler helpers ──────────────────────────────────────────────────

  /** Process trial expirations — called daily by scheduler. */
  async processTrialExpirations(): Promise<void> {
    const now = new Date();
    const expired = await this.prisma.tenant.findMany({
      where: {
        status: TenantStatus.TRIAL,
        registrationFeePaid: false,
        trialEndsAt: { lt: now },
      },
      include: { users: { where: { role: 'ADMIN' }, take: 1 } },
    });

    for (const tenant of expired) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: TenantStatus.GRACE },
      });
      await this.prisma.billingEvent.create({
        data: { tenantId: tenant.id, type: 'grace_started', metadata: {} },
      });
      this.logger.log(`Tenant ${tenant.id} moved to GRACE period`);

      if (tenant.stripeCustomerId) {
        try {
          const url = await this.stripe.createRegistrationCheckout(tenant.stripeCustomerId, tenant.id);
          const daysLeft = tenant.gracePeriodEndsAt
            ? Math.max(0, Math.ceil((tenant.gracePeriodEndsAt.getTime() - now.getTime()) / 86400000))
            : 14;
          await this.notifications.sendRegistrationReminder(tenant.id, url, daysLeft);
        } catch {}
      }
    }
  }

  /** Send periodic reminders during GRACE period — called daily. */
  async processGraceReminders(): Promise<void> {
    const now = new Date();
    const graceTenants = await this.prisma.tenant.findMany({
      where: {
        status: TenantStatus.GRACE,
        registrationFeePaid: false,
        gracePeriodEndsAt: { gt: now },
      },
    });

    for (const tenant of graceTenants) {
      const daysLeft = Math.max(
        0,
        Math.ceil((tenant.gracePeriodEndsAt!.getTime() - now.getTime()) / 86400000),
      );
      // Remind at 14 days, 7 days, 3 days, 1 day remaining
      const reminderThresholds = [14, 7, 3, 1];
      if (!reminderThresholds.includes(daysLeft)) continue;

      // Avoid sending duplicate reminders on the same day
      const lastReminder = tenant.lastReminderSentAt;
      if (lastReminder && now.getTime() - lastReminder.getTime() < 23 * 60 * 60 * 1000) continue;

      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { lastReminderSentAt: now, reminderCount: { increment: 1 } },
      });

      if (tenant.stripeCustomerId) {
        try {
          const url = await this.stripe.createRegistrationCheckout(tenant.stripeCustomerId, tenant.id);
          await this.notifications.sendRegistrationReminder(tenant.id, url, daysLeft);
        } catch {}
      }
    }
  }

  /**
   * Poll Stripe every 6 hours for subscription statuses that may have been missed by webhooks.
   * Handles:
   *  - past_due / unpaid → suspend tenant
   *  - active subscriptions for currently SUSPENDED tenants → reinstate
   *  - canceled subscriptions → mark CANCELLED
   */
  async pollSubscriptionStatuses(): Promise<void> {
    const now = new Date();

    try {
      // 1. Find all tenants with a subscription ID in our DB
      const tenants = await this.prisma.tenant.findMany({
        where: { stripeSubscriptionId: { not: null } },
        select: { id: true, stripeSubscriptionId: true, status: true, plan: true, stripeCustomerId: true },
      });

      if (tenants.length === 0) return;

      // 2. Batch-fetch current subscription statuses from Stripe
      const [pastDueSubs, unpaidSubs, canceledSubs, activeSubs] = await Promise.all([
        this.stripe.listSubscriptionsByStatus('past_due'),
        this.stripe.listSubscriptionsByStatus('unpaid'),
        this.stripe.listSubscriptionsByStatus('canceled'),
        this.stripe.listSubscriptionsByStatus('active'),
      ]);

      const pastDueIds = new Set(pastDueSubs.map((s) => s.id));
      const unpaidIds = new Set(unpaidSubs.map((s) => s.id));
      const canceledIds = new Set(canceledSubs.map((s) => s.id));
      const activeIds = new Set(activeSubs.map((s) => s.id));

      for (const tenant of tenants) {
        const subId = tenant.stripeSubscriptionId!;

        if (canceledIds.has(subId) && tenant.status !== TenantStatus.CANCELLED) {
          // Subscription was canceled — mark in DB
          await this.prisma.tenant.update({
            where: { id: tenant.id },
            data: { status: TenantStatus.CANCELLED, stripeSubscriptionId: null },
          });
          await this.prisma.billingEvent.create({
            data: { tenantId: tenant.id, type: 'subscription_canceled_detected', metadata: { subId, detectedAt: now } },
          });
          this.logger.warn(`Poll: tenant ${tenant.id} subscription ${subId} canceled — marked CANCELLED`);

        } else if ((pastDueIds.has(subId) || unpaidIds.has(subId)) && tenant.status === TenantStatus.ACTIVE) {
          // Payment failed and not yet suspended
          await this.prisma.tenant.update({
            where: { id: tenant.id },
            data: { status: TenantStatus.SUSPENDED, suspendedAt: now },
          });
          await this.prisma.billingEvent.create({
            data: { tenantId: tenant.id, type: 'suspended_payment_failed_poll', metadata: { subId, stripeStatus: pastDueIds.has(subId) ? 'past_due' : 'unpaid', detectedAt: now } },
          });
          this.logger.warn(`Poll: tenant ${tenant.id} suspended — subscription ${subId} is ${pastDueIds.has(subId) ? 'past_due' : 'unpaid'}`);

          // Notify admin
          if (tenant.stripeCustomerId) {
            try {
              const portalUrl = await this.stripe.createPortalSession(tenant.stripeCustomerId);
              await this.notifications.sendPaymentFailedNotice(tenant.id, portalUrl);
            } catch {}
          }

        } else if (activeIds.has(subId) && tenant.status === TenantStatus.SUSPENDED) {
          // Subscription is active in Stripe but we have it suspended — reinstate (missed payment_succeeded webhook)
          await this.prisma.tenant.update({
            where: { id: tenant.id },
            data: { status: TenantStatus.ACTIVE, suspendedAt: null },
          });
          await this.prisma.billingEvent.create({
            data: { tenantId: tenant.id, type: 'reinstated_poll', metadata: { subId, detectedAt: now } },
          });
          this.logger.log(`Poll: tenant ${tenant.id} reinstated — subscription ${subId} is active in Stripe`);
        }
      }

      this.logger.log(`Poll complete. Checked ${tenants.length} subscriptions.`);
    } catch (err) {
      this.logger.error(`Subscription poll failed: ${err.message}`);
    }
  }

  /** Suspend tenants whose grace period has ended — called daily. */
  async processGraceExpirations(): Promise<void> {
    const now = new Date();
    const toSuspend = await this.prisma.tenant.findMany({
      where: {
        status: TenantStatus.GRACE,
        registrationFeePaid: false,
        gracePeriodEndsAt: { lt: now },
      },
    });

    for (const tenant of toSuspend) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: TenantStatus.SUSPENDED, suspendedAt: now },
      });
      await this.prisma.billingEvent.create({
        data: { tenantId: tenant.id, type: 'suspended', metadata: {} },
      });
      this.logger.warn(`Tenant ${tenant.id} suspended — grace period expired`);

      if (tenant.stripeCustomerId) {
        try {
          const url = await this.stripe.createRegistrationCheckout(tenant.stripeCustomerId, tenant.id);
          await this.notifications.sendSuspensionNotice(tenant.id, url);
        } catch {}
      }
    }
  }
}
