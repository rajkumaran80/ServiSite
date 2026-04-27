import { Module } from '@nestjs/common';
import { SuperAdminController } from './superadmin.controller';
import { SuperAdminService } from './superadmin.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { CacheModule } from '../../common/cache/cache.module';
import { NotifyModule } from '../../common/notify/notify.module';
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../tenant/tenant.module';
import { NavigationModule } from '../navigation/navigation.module';
import { CloudflareModule } from '../cloudflare/cloudflare.module';

@Module({
  imports: [PrismaModule, BillingModule, CacheModule, NotifyModule, AuthModule, TenantModule, NavigationModule, CloudflareModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
