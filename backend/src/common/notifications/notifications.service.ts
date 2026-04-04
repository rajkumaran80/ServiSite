import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from './email.service';
import { WhatsAppService } from './whatsapp.service';
import { WebPushService } from './webpush.service';

function formatPrice(val: any, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(parseFloat(String(val)));
}

@Injectable()
export class NotificationsService {
  constructor(
    private email: EmailService,
    private whatsapp: WhatsAppService,
    private webpush: WebPushService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private appUrl() {
    return this.config.get('APP_URL', 'https://servisite.com');
  }

  // ── Billing notifications ────────────────────────────────────────────────

  async sendRegistrationLink(tenantId: string, checkoutUrl: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { role: 'ADMIN' }, take: 1 } },
    });
    if (!tenant || !tenant.users[0]) return;

    const adminEmail = tenant.users[0].email;
    await this.email.registrationPaymentLink(tenant.name, adminEmail, checkoutUrl);

    if (tenant.whatsappNumber) {
      await this.whatsapp.registrationReminder(tenant.whatsappNumber, tenant.name, checkoutUrl, 7);
    }
  }

  async sendRegistrationReminder(tenantId: string, checkoutUrl: string, daysLeft: number): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { role: 'ADMIN' }, take: 1 } },
    });
    if (!tenant || !tenant.users[0]) return;

    const adminEmail = tenant.users[0].email;
    await this.email.registrationReminder(tenant.name, adminEmail, checkoutUrl, daysLeft);

    if (tenant.whatsappNumber) {
      await this.whatsapp.registrationReminder(tenant.whatsappNumber, tenant.name, checkoutUrl, daysLeft);
    }
  }

  async sendSuspensionNotice(tenantId: string, checkoutUrl: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { role: 'ADMIN' }, take: 1 } },
    });
    if (!tenant || !tenant.users[0]) return;

    await this.email.accountSuspended(tenant.name, tenant.users[0].email, checkoutUrl);
    if (tenant.whatsappNumber) {
      await this.whatsapp.accountSuspended(tenant.whatsappNumber, tenant.name, checkoutUrl);
    }
  }

  async sendPaymentFailedNotice(tenantId: string, portalUrl: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { role: 'ADMIN' }, take: 1 } },
    });
    if (!tenant || !tenant.users[0]) return;
    await this.email.subscriptionPaymentFailed(tenant.name, tenant.users[0].email, portalUrl);
  }

  // ── Order notifications ──────────────────────────────────────────────────

  async notifyNewOrder(tenantId: string, order: any): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { role: 'ADMIN' } } },
    });
    if (!tenant) return;

    const dashUrl = `${this.appUrl()}/dashboard/ordering`;
    const total = formatPrice(order.total, order.currency);
    const customer = order.customerName || 'Walk-in';
    const itemSummary = (order.lines || [])
      .map((l: any) => `${l.quantity}× ${l.menuItem?.name ?? l.bundle?.name ?? '—'}`)
      .join(', ');

    // Web push to all admin browsers
    await this.webpush.notifyTenantAdmins(tenantId, {
      title: `New order at ${tenant.name}`,
      body: `${customer} · ${total} · ${itemSummary.slice(0, 60)}`,
      url: dashUrl,
    });

    // Email all admins
    for (const user of tenant.users) {
      await this.email.newOrderToAdmin(
        tenant.name, user.email, order.id, dashUrl, customer, total, itemSummary,
      );
    }

    // WhatsApp to business WhatsApp number
    if (tenant.whatsappNumber) {
      await this.whatsapp.newOrder(tenant.whatsappNumber, tenant.name, order.id, customer, total);
    }
  }

  async notifyOrderStatus(tenantId: string, order: any, status: string): Promise<void> {
    const emojiMap: Record<string, string> = {
      CONFIRMED: '✅', PREPARING: '👨‍🍳', READY: '🎉', COMPLETED: '✅', CANCELLED: '❌',
    };
    const emoji = emojiMap[status] ?? '📋';

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return;

    // Notify customer if contact details provided
    if (order.customerEmail) {
      await this.email.orderStatusToCustomer(tenant.name, order.customerEmail, order.id, status, emoji);
    }
    if (order.customerPhone) {
      await this.whatsapp.orderStatus(order.customerPhone, tenant.name, order.id, status);
    }
  }
}
