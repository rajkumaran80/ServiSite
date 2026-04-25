import { Module } from '@nestjs/common';
import { CloudflareController } from './cloudflare.controller';
import { CloudflareService } from './cloudflare.service';
import { CloudflarePollingService } from './cloudflare-polling.service';

@Module({
  controllers: [CloudflareController],
  providers: [CloudflareService, CloudflarePollingService],
  exports: [CloudflareService, CloudflarePollingService],
})
export class CloudflareModule {}
