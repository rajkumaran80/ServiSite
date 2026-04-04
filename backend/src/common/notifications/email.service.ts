import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', 'smtp.gmail.com'),
      port: parseInt(config.get('SMTP_PORT', '587')),
      secure: config.get('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: config.get('SMTP_USER'),
        pass: config.get('SMTP_PASS'),
      },
    });
  }

  private fromAddress() {
    const name = this.config.get('EMAIL_FROM_NAME', 'ServiSite');
    const addr = this.config.get('EMAIL_FROM_ADDRESS', 'noreply@servisite.com');
    return `${name} <${addr}>`;
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.fromAddress(), to, subject, html });
    } catch (err) {
      this.logger.warn(`Email send failed to ${to}: ${err.message}`);
    }
  }

  // ── Billing templates ────────────────────────────────────────────────────

  registrationPaymentLink(tenantName: string, to: string, checkoutUrl: string): Promise<void> {
    return this.send(
      to,
      `Complete your ServiSite registration — ${tenantName}`,
      `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#1d4ed8">Welcome to ServiSite, ${tenantName}!</h2>
        <p>Your website is live and you have a <strong>7-day free trial</strong>.</p>
        <p>To keep your website running, complete your registration by paying the one-time setup fee of <strong>£299</strong>.</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${checkoutUrl}" style="background:#1d4ed8;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">
            Pay Registration Fee — £299
          </a>
        </p>
        <p style="color:#6b7280;font-size:14px">After registration you'll be on the <strong>£49/month Basic plan</strong>. You can upgrade to Ordering (£99/month) at any time.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px">ServiSite · support@servisite.com</p>
      </div>`,
    );
  }

  registrationReminder(tenantName: string, to: string, checkoutUrl: string, daysLeft: number): Promise<void> {
    const urgent = daysLeft <= 3;
    return this.send(
      to,
      urgent
        ? `⚠️ URGENT: ${daysLeft} day${daysLeft !== 1 ? 's' : ''} until your ServiSite account is disabled`
        : `Reminder: Complete your ServiSite registration (${daysLeft} days left)`,
      `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        ${urgent ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin-bottom:16px;color:#991b1b">&#9888;&#65039; Your account will be disabled in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> if payment is not received.</div>` : ''}
        <h2 style="color:#1d4ed8">Action required — ${tenantName}</h2>
        <p>Your ServiSite account needs a one-time registration payment of <strong>£299</strong> to continue running.</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${checkoutUrl}" style="background:#dc2626;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">
            Pay Now — £299
          </a>
        </p>
        <p style="color:#6b7280;font-size:14px">Once paid, your website continues uninterrupted and monthly billing of £49/month begins.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px">ServiSite · support@servisite.com</p>
      </div>`,
    );
  }

  accountSuspended(tenantName: string, to: string, checkoutUrl: string): Promise<void> {
    return this.send(
      to,
      `Your ServiSite account has been suspended — ${tenantName}`,
      `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#dc2626">Account Suspended — ${tenantName}</h2>
        <p>Your ServiSite website has been temporarily disabled because the registration fee has not been paid.</p>
        <p>To reactivate your website, please complete the payment now:</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${checkoutUrl}" style="background:#dc2626;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">
            Reactivate — £299
          </a>
        </p>
        <p style="color:#6b7280;font-size:14px">Your website and all data are safe. It will go live again immediately after payment.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px">ServiSite · support@servisite.com</p>
      </div>`,
    );
  }

  subscriptionPaymentFailed(tenantName: string, to: string, portalUrl: string): Promise<void> {
    return this.send(
      to,
      `Payment failed for your ServiSite subscription — ${tenantName}`,
      `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#d97706">Subscription Payment Failed — ${tenantName}</h2>
        <p>We were unable to charge your card for your monthly ServiSite subscription.</p>
        <p>Please update your payment details to avoid service interruption:</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${portalUrl}" style="background:#1d4ed8;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">
            Update Payment Details
          </a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px">ServiSite · support@servisite.com</p>
      </div>`,
    );
  }

  // ── Auth templates ───────────────────────────────────────────────────────

  emailVerification(to: string, tenantName: string, verificationUrl: string): Promise<void> {
    return this.send(
      to,
      `Verify your email — ${tenantName}`,
      `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#1d4ed8">Welcome to ServiSite!</h2>
        <p>Hi, thank you for creating <strong>${tenantName}</strong> on ServiSite.</p>
        <p>Please verify your email address to activate your account and make your website public:</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${verificationUrl}" style="background:#1d4ed8;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">
            Verify Email Address
          </a>
        </p>
        <p style="color:#6b7280;font-size:14px">This link expires in 24 hours. If you did not create this account, you can ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px">ServiSite · support@servisite.com</p>
      </div>`,
    );
  }

  suspiciousRegistrationAlert(to: string, email: string, ip: string, reason: string): Promise<void> {
    return this.send(
      to,
      `[ServiSite Alert] Suspicious registration blocked`,
      `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#dc2626">Suspicious Registration Blocked</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#6b7280;padding:4px 0">Email</td><td style="font-weight:bold">${email}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">IP</td><td style="font-weight:bold">${ip}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">Reason</td><td style="font-weight:bold;color:#dc2626">${reason}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">Time</td><td>${new Date().toISOString()}</td></tr>
        </table>
      </div>`,
    );
  }

  // ── Order templates ──────────────────────────────────────────────────────

  newOrderToAdmin(
    businessName: string,
    to: string,
    orderId: string,
    dashboardUrl: string,
    customerName: string,
    total: string,
    itemSummary: string,
  ): Promise<void> {
    return this.send(
      to,
      `🛒 New order received — ${businessName}`,
      `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#1d4ed8">New Order #${orderId.slice(-6).toUpperCase()}</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#6b7280;padding:4px 0">Customer</td><td style="font-weight:bold">${customerName}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">Total</td><td style="font-weight:bold;color:#059669">${total}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0;vertical-align:top">Items</td><td>${itemSummary}</td></tr>
        </table>
        <p style="text-align:center;margin:24px 0">
          <a href="${dashboardUrl}" style="background:#1d4ed8;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
            View Order in Dashboard
          </a>
        </p>
      </div>`,
    );
  }

  orderStatusToCustomer(
    businessName: string,
    to: string,
    orderId: string,
    status: string,
    statusEmoji: string,
  ): Promise<void> {
    const statusMessages: Record<string, string> = {
      CONFIRMED: 'Your order has been confirmed and will be prepared shortly.',
      PREPARING: 'Your order is now being prepared.',
      READY: 'Your order is ready! Please collect it.',
      COMPLETED: 'Your order has been completed. Thank you!',
      CANCELLED: 'Unfortunately your order has been cancelled. Please contact us for more information.',
    };
    return this.send(
      to,
      `${statusEmoji} Order update from ${businessName}`,
      `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2>${statusEmoji} Order #${orderId.slice(-6).toUpperCase()} — ${status}</h2>
        <p>${statusMessages[status] ?? 'Your order status has been updated.'}</p>
        <p style="color:#6b7280;font-size:14px">Thank you for ordering from <strong>${businessName}</strong>.</p>
      </div>`,
    );
  }
}
