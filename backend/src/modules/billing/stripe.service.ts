import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private _client: Stripe | null = null;
  private readonly logger = new Logger(StripeService.name);

  constructor(private config: ConfigService) {}

  get client(): Stripe {
    if (!this._client) {
      const key = this.config.get<string>('STRIPE_SECRET_KEY', '');
      if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
      this._client = new Stripe(key, { apiVersion: '2024-06-20' as any });
    }
    return this._client;
  }

  webhookSecret(): string {
    return this.config.get('STRIPE_WEBHOOK_SECRET', '');
  }

  appUrl(): string {
    return this.config.get('APP_URL', 'https://servisite.com');
  }

  /** Create or retrieve a Stripe customer for a tenant. */
  async ensureCustomer(tenantId: string, email: string, name: string): Promise<string> {
    const cust = await this.client.customers.create({
      email,
      name,
      metadata: { tenantId },
    });
    return cust.id;
  }

  /** Registration fee Checkout Session (one-time £299). */
  async createRegistrationCheckout(
    stripeCustomerId: string,
    tenantId: string,
    returnPath = '/dashboard/billing',
  ): Promise<string> {
    const session = await this.client.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: 29900, // £299.00 in pence
          product_data: {
            name: 'ServiSite — One-time Registration Fee',
            description: 'Covers domain setup, onboarding, and first month of service.',
          },
        },
      }],
      metadata: { tenantId, type: 'registration' },
      success_url: `${this.appUrl()}${returnPath}?payment=success`,
      cancel_url: `${this.appUrl()}${returnPath}?payment=cancel`,
    });
    return session.url!;
  }

  /** Monthly subscription Checkout Session. */
  async createSubscriptionCheckout(
    stripeCustomerId: string,
    tenantId: string,
    plan: 'basic' | 'ordering',
    trialDays = 0,
  ): Promise<string> {
    const planConfig = plan === 'ordering'
      ? { amount: 9900, name: 'ServiSite Ordering Plan', description: 'Website + full online ordering system — £99/month' }
      : { amount: 4900, name: 'ServiSite Basic Plan', description: 'Professional website with menu, gallery & contact — £49/month' };

    const session = await this.client.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: planConfig.amount,
          recurring: { interval: 'month' },
          product_data: {
            name: planConfig.name,
            description: planConfig.description,
          },
        },
      }],
      metadata: { tenantId, plan },
      subscription_data: {
        trial_period_days: trialDays > 0 ? trialDays : undefined,
        metadata: { tenantId, plan },
      },
      success_url: `${this.appUrl()}/dashboard/billing?sub=success`,
      cancel_url: `${this.appUrl()}/dashboard/billing?sub=cancel`,
    });
    return session.url!;
  }

  /** Stripe Customer Portal session for self-service. */
  async createPortalSession(stripeCustomerId: string, returnPath = '/dashboard/billing'): Promise<string> {
    const session = await this.client.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${this.appUrl()}${returnPath}`,
    });
    return session.url;
  }

  /** Create a Stripe Connect Express account for ordering payouts. */
  async createConnectAccount(tenantId: string, email: string): Promise<string> {
    const account = await this.client.accounts.create({
      type: 'express',
      email,
      metadata: { tenantId },
      capabilities: { transfers: { requested: true } },
    });
    return account.id;
  }

  /** Stripe Connect onboarding link. */
  async createConnectOnboardingLink(connectAccountId: string, tenantId: string): Promise<string> {
    const link = await this.client.accountLinks.create({
      account: connectAccountId,
      type: 'account_onboarding',
      return_url: `${this.appUrl()}/dashboard/billing?connect=success`,
      refresh_url: `${this.appUrl()}/dashboard/billing?connect=refresh&tenantId=${tenantId}`,
    });
    return link.url;
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): Stripe.Event {
    return this.client.webhooks.constructEvent(rawBody, signature, this.webhookSecret());
  }

  /**
   * List all Stripe subscriptions with a given status.
   * Used by the 6-hour poll to detect missed webhooks.
   */
  async listSubscriptionsByStatus(status: 'active' | 'past_due' | 'unpaid' | 'canceled'): Promise<Stripe.Subscription[]> {
    const results: Stripe.Subscription[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const page = await this.client.subscriptions.list({
        status,
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      results.push(...page.data);
      hasMore = page.has_more;
      if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id;
    }

    return results;
  }

  /**
   * Retrieve a single subscription.
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.client.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Change the plan on an existing subscription.
   * Creates or reuses a Stripe Price for the target plan then swaps it in.
   * If trialEndTimestamp is provided, extends the trial to that date.
   */
  async updateSubscriptionPlan(
    subscriptionId: string,
    plan: 'basic' | 'ordering',
    trialEnd?: Date,
  ): Promise<Stripe.Subscription> {
    const sub = await this.client.subscriptions.retrieve(subscriptionId);
    const existingItemId = sub.items.data[0]?.id;
    if (!existingItemId) throw new Error('Subscription has no items');

    const planConfig = plan === 'ordering'
      ? { amount: 9900, name: 'ServiSite Ordering Plan' }
      : { amount: 4900, name: 'ServiSite Basic Plan' };

    // Create a new Price for this plan (Stripe recommends one price per period)
    const price = await this.client.prices.create({
      currency: 'gbp',
      unit_amount: planConfig.amount,
      recurring: { interval: 'month' },
      product_data: { name: planConfig.name },
    });

    const updateData: Stripe.SubscriptionUpdateParams = {
      items: [{ id: existingItemId, price: price.id }],
      proration_behavior: 'always_invoice',
      metadata: { plan },
      ...(trialEnd ? { trial_end: Math.floor(trialEnd.getTime() / 1000) } : {}),
    };

    return this.client.subscriptions.update(subscriptionId, updateData);
  }

  /** Cancel a subscription immediately. */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.client.subscriptions.cancel(subscriptionId);
  }
}
