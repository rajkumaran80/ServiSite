import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { AzureDnsService } from './azure-dns.service';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../../common/notifications/notifications.module';

@Module({
  imports: [AuthModule, BillingModule, NotificationsModule],
  controllers: [TenantController],
  providers: [TenantService, AzureDnsService],
  exports: [TenantService],
})
export class TenantModule {}
