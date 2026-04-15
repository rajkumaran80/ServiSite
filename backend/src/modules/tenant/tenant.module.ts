import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { CloudflareService } from './cloudflare.service';
import { AzureAppServiceService } from './azure-appservice.service';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../../common/notifications/notifications.module';

@Module({
  imports: [AuthModule, BillingModule, NotificationsModule],
  controllers: [TenantController],
  providers: [TenantService, CloudflareService, AzureAppServiceService],
  exports: [TenantService, CloudflareService],
})
export class TenantModule {}
