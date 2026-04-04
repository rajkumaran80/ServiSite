import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  Headers,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Extend Express Request to include rawBody from NestJS rawBody option
interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { WebPushService } from '../../common/notifications/webpush.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/roles.decorator';

class SubscribeDto {
  endpoint: string;
  p256dh: string;
  auth: string;
}

class UnsubscribeDto {
  endpoint: string;
}

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private billing: BillingService,
    private stripe: StripeService,
    private webpush: WebPushService,
  ) {}

  // ── Public webhook endpoint ──────────────────────────────────────────────
  // IMPORTANT: raw body required for Stripe signature verification

  @Public()
  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ): Promise<void> {
    try {
      const rawBody = req.rawBody;
      if (!rawBody) {
        res.status(400).json({ error: 'Raw body not available' });
        return;
      }
      const event = this.stripe.verifyWebhookSignature(rawBody, signature);
      await this.billing.handleWebhookEvent(event);
      res.json({ received: true });
    } catch (err) {
      this.logger.error(`Webhook error: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  }

  // ── Authenticated endpoints ──────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('status')
  async getStatus(@Tenant('id') tenantId: string) {
    return { data: await this.billing.getStatus(tenantId), success: true };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('checkout/registration')
  async registrationCheckout(@Tenant('id') tenantId: string) {
    const url = await this.billing.getRegistrationCheckoutUrl(tenantId);
    return { data: { url }, success: true };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('checkout/subscription')
  async subscriptionCheckout(
    @Tenant('id') tenantId: string,
    @Body('plan') plan: 'basic' | 'ordering',
  ) {
    if (!['basic', 'ordering'].includes(plan)) throw new BadRequestException('Invalid plan');
    const url = await this.billing.getSubscriptionCheckoutUrl(tenantId, plan);
    return { data: { url }, success: true };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('portal')
  async portal(@Tenant('id') tenantId: string) {
    const url = await this.billing.getPortalUrl(tenantId);
    return { data: { url }, success: true };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('connect/onboard')
  async connectOnboard(@Tenant('id') tenantId: string) {
    const url = await this.billing.getConnectOnboardingUrl(tenantId);
    return { data: { url }, success: true };
  }

  /**
   * Change active subscription plan.
   * Upgrade (basic → ordering) during trial: extends trial by 7 days.
   * Downgrade (ordering → basic): keeps current trial end, prorates outside trial.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('subscription/change-plan')
  async changePlan(@Tenant('id') tenantId: string, @Body('plan') plan: 'basic' | 'ordering') {
    if (!['basic', 'ordering'].includes(plan)) throw new BadRequestException('Invalid plan — must be basic or ordering');
    await this.billing.changePlan(tenantId, plan);
    return { success: true, message: `Plan changed to ${plan}` };
  }

  // ── Web Push subscription management ────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('push/subscribe')
  async pushSubscribe(@CurrentUser('sub') userId: string, @Body() dto: SubscribeDto) {
    await this.webpush.subscribe(userId, dto.endpoint, dto.p256dh, dto.auth);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('push/unsubscribe')
  async pushUnsubscribe(@Body() dto: UnsubscribeDto) {
    await this.webpush.unsubscribe(dto.endpoint);
    return { success: true };
  }

  @Public()
  @Get('push/vapid-public-key')
  getVapidPublicKey() {
    const key = process.env.VAPID_PUBLIC_KEY ?? '';
    return { data: { key }, success: true };
  }
}
