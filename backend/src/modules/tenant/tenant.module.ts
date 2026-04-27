import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { CloudflareService } from './cloudflare.service';
import { AzureAppServiceService } from './azure-appservice.service';
import { DomainPollerService } from './domain-poller.service';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../../common/notifications/notifications.module';
import { NavigationModule } from '../navigation/navigation.module';

@Module({
  imports: [ScheduleModule.forRoot(), AuthModule, BillingModule, NotificationsModule, NavigationModule],
  controllers: [TenantController],
  providers: [TenantService, CloudflareService, AzureAppServiceService, DomainPollerService],
  exports: [TenantService, CloudflareService],
})
export class TenantModule {}
