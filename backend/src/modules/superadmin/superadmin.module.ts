import { Module } from '@nestjs/common';
import { SuperAdminController } from './superadmin.controller';
import { SuperAdminService } from './superadmin.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { CacheModule } from '../../common/cache/cache.module';
import { NotifyModule } from '../../common/notify/notify.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, BillingModule, CacheModule, NotifyModule, AuthModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
