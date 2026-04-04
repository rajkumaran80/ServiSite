import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TwilioLib from 'twilio';
const Twilio = (TwilioLib as any).default ?? TwilioLib;

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private client: any = null;
  private from: string;

  constructor(private config: ConfigService) {
    const sid = config.get('TWILIO_ACCOUNT_SID');
    const token = config.get('TWILIO_AUTH_TOKEN');
    this.from = config.get('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886'); // Twilio sandbox default

    if (sid && token) {
      try {
        this.client = Twilio(sid, token);
      } catch (err) {
        this.logger.warn(`Twilio init failed — WhatsApp notifications disabled: ${err.message}`);
      }
    } else {
      this.logger.warn('Twilio credentials not configured — WhatsApp notifications disabled');
    }
  }

  async send(to: string, body: string): Promise<void> {
    if (!this.client) return;

    // Normalise UK numbers
    const formatted = to.startsWith('+') ? `whatsapp:${to}` : `whatsapp:+44${to.replace(/^0/, '')}`;

    try {
      await this.client.messages.create({ from: this.from, to: formatted, body });
    } catch (err) {
      this.logger.warn(`WhatsApp send failed to ${to}: ${err.message}`);
    }
  }

  // Pre-built messages

  registrationReminder(phone: string, businessName: string, checkoutUrl: string, daysLeft: number): Promise<void> {
    return this.send(
      phone,
      daysLeft <= 3
        ? `⚠️ URGENT: ${businessName}'s ServiSite account will be suspended in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.\n\nPay the £299 registration fee now to keep your website live:\n${checkoutUrl}`
        : `📣 Reminder: ${businessName}'s ServiSite free trial has ended.\n\nComplete your £299 registration to continue — ${daysLeft} days remaining:\n${checkoutUrl}`,
    );
  }

  accountSuspended(phone: string, businessName: string, checkoutUrl: string): Promise<void> {
    return this.send(
      phone,
      `🚫 ${businessName}'s ServiSite website has been suspended.\n\nPay the £299 registration fee to reactivate your site immediately:\n${checkoutUrl}`,
    );
  }

  newOrder(
    phone: string,
    businessName: string,
    orderId: string,
    customerName: string,
    total: string,
  ): Promise<void> {
    return this.send(
      phone,
      `🛒 New order at ${businessName}!\n\nOrder #${orderId.slice(-6).toUpperCase()}\nCustomer: ${customerName}\nTotal: ${total}\n\nLog in to your dashboard to manage this order.`,
    );
  }

  orderStatus(
    phone: string,
    businessName: string,
    orderId: string,
    status: string,
  ): Promise<void> {
    const msgs: Record<string, string> = {
      CONFIRMED: `✅ Your order #${orderId.slice(-6).toUpperCase()} from ${businessName} has been confirmed!`,
      PREPARING: `👨‍🍳 Your order #${orderId.slice(-6).toUpperCase()} is being prepared at ${businessName}.`,
      READY: `🎉 Your order #${orderId.slice(-6).toUpperCase()} is ready for collection at ${businessName}!`,
      COMPLETED: `✅ Order #${orderId.slice(-6).toUpperCase()} complete. Thank you for choosing ${businessName}!`,
      CANCELLED: `❌ Your order #${orderId.slice(-6).toUpperCase()} from ${businessName} has been cancelled. Please contact us for help.`,
    };
    return this.send(phone, msgs[status] ?? `Order #${orderId.slice(-6).toUpperCase()} updated to ${status}.`);
  }
}
