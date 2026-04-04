import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { WhatsAppService } from './whatsapp.service';
import { WebPushService } from './webpush.service';
import { NotificationsService } from './notifications.service';

@Module({
  providers: [EmailService, WhatsAppService, WebPushService, NotificationsService],
  exports: [NotificationsService, WebPushService, EmailService],
})
export class NotificationsModule {}
