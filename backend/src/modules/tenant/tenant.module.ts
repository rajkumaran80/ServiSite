import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { AzureDnsService } from './azure-dns.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TenantController],
  providers: [TenantService, AzureDnsService],
  exports: [TenantService],
})
export class TenantModule {}
