import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BillingService } from './billing.service';

@Injectable()
export class BillingScheduler {
  private readonly logger = new Logger(BillingScheduler.name);

  constructor(private billing: BillingService) {}

  /** Run every day at 08:00 UTC — move expired trials to GRACE period. */
  @Cron('0 8 * * *', { name: 'trial-expiration', timeZone: 'UTC' })
  async handleTrialExpiration(): Promise<void> {
    this.logger.log('Running trial expiration check...');
    await this.billing.processTrialExpirations();
  }

  /** Run every day at 09:00 UTC — send reminders to GRACE period tenants. */
  @Cron('0 9 * * *', { name: 'grace-reminders', timeZone: 'UTC' })
  async handleGraceReminders(): Promise<void> {
    this.logger.log('Running grace period reminders...');
    await this.billing.processGraceReminders();
  }

  /** Run every day at 10:00 UTC — suspend tenants whose grace period expired. */
  @Cron('0 10 * * *', { name: 'grace-expiration', timeZone: 'UTC' })
  async handleGraceExpiration(): Promise<void> {
    this.logger.log('Running grace expiration check...');
    await this.billing.processGraceExpirations();
  }

  /**
   * Poll Stripe every 6 hours for subscription statuses that may have missed webhooks.
   * Catches: past_due, unpaid, canceled subscriptions + reinstates accidentally-suspended active ones.
   * Runs at :00 of 00, 06, 12, 18 UTC.
   */
  @Cron('0 0,6,12,18 * * *', { name: 'subscription-poll', timeZone: 'UTC' })
  async handleSubscriptionPoll(): Promise<void> {
    this.logger.log('Running 6-hour Stripe subscription status poll...');
    await this.billing.pollSubscriptionStatuses();
  }
}
