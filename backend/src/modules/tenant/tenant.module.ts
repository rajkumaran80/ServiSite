import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { AzureAppServiceService } from './azure-appservice.service';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../../common/notifications/notifications.module';
import { NavigationModule } from '../navigation/navigation.module';

@Module({
  imports: [AuthModule, BillingModule, NotificationsModule, NavigationModule],
  controllers: [TenantController],
  providers: [TenantService, CloudflareService, AzureAppServiceService],
  exports: [TenantService, CloudflareService],
})
export class TenantModule {}
