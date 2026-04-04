import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as webpush from 'web-push';

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private enabled = false;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const publicKey = config.get('VAPID_PUBLIC_KEY');
    const privateKey = config.get('VAPID_PRIVATE_KEY');
    const subject = config.get('VAPID_SUBJECT', 'mailto:admin@servisite.com');

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.enabled = true;
    } else {
      this.logger.warn('VAPID keys not configured — Web Push notifications disabled');
    }
  }

  async subscribe(userId: string, endpoint: string, p256dh: string, auth: string): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh, auth },
      update: { userId, p256dh, auth },
    });
  }

  async unsubscribe(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  async notifyTenantAdmins(tenantId: string, payload: { title: string; body: string; url?: string }): Promise<void> {
    if (!this.enabled) return;

    const users = await this.prisma.user.findMany({
      where: { tenantId, role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      include: { pushSubscriptions: true },
    });

    const subscriptions = users.flatMap((u) => u.pushSubscriptions);
    const payloadStr = JSON.stringify(payload);

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payloadStr,
          );
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired — remove it
            await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            this.logger.warn(`Web push failed: ${err.message}`);
          }
        }
      }),
    );
  }
}
