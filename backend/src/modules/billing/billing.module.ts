import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingScheduler } from './billing-scheduler.service';
import { StripeService } from './stripe.service';
import { NotificationsModule } from '../../common/notifications/notifications.module';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  controllers: [BillingController],
  providers: [BillingService, BillingScheduler, StripeService],
  exports: [BillingService, StripeService],
})
export class BillingModule {}
