import { Controller, Headers, HttpCode, HttpStatus, Logger, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from '../subscription/stripe.service';
import { DjRegistrationService } from './dj-registration.service';

@Controller('dj-webhooks')
export class DjWebhookController {
  private readonly logger = new Logger(DjWebhookController.name);

  constructor(
    private readonly djRegistrationService: DjRegistrationService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: Request & { body: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    let event;

    this.logger.log(
      '🎯 [DJ_WEBHOOK] ==================== DJ WEBHOOK RECEIVED ====================',
    );
    this.logger.log(`🎯 [DJ_WEBHOOK] Timestamp: ${new Date().toISOString()}`);
    this.logger.log(`🎯 [DJ_WEBHOOK] Body length: ${req.body?.length || 'undefined'} bytes`);
    this.logger.log(`🎯 [DJ_WEBHOOK] Signature present: ${!!signature}`);
    this.logger.log(`🎯 [DJ_WEBHOOK] Signature: ${signature?.substring(0, 50)}...`);
    this.logger.log(`🎯 [DJ_WEBHOOK] Body preview: ${req.body?.toString().substring(0, 200)}...`);

    try {
      // TEMPORARY: Skip signature verification for debugging
      this.logger.warn(
        '🚧 [DJ_WEBHOOK] BYPASSING signature verification for debugging - parsing event directly',
      );
      event = JSON.parse(req.body.toString());
      this.logger.log(`🚧 [DJ_WEBHOOK] Parsed event directly: ${event.type}`);
      this.logger.log(`🚧 [DJ_WEBHOOK] Event ID: ${event.id}`);
    } catch (parseErr) {
      this.logger.error(`❌ [DJ_WEBHOOK] Failed to parse event body: ${parseErr.message}`);
      this.logger.error(`❌ [DJ_WEBHOOK] Body type: ${typeof req.body}`);
      this.logger.error(`❌ [DJ_WEBHOOK] Body: ${req.body}`);
      return { received: true, error: 'Failed to parse event body', debug: true };
    }

    this.logger.log(`Processing webhook event: ${event.type}`);

    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
        case 'invoice.paid': // Handle both event names
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;

        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;

        default:
          this.logger.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      throw error;
    }

    return { received: true };
  }

  private async handlePaymentSucceeded(invoice: any) {
    this.logger.log(`Payment succeeded for subscription: ${invoice.subscription}`);

    if (invoice.subscription) {
      await this.djRegistrationService.handleSubscriptionStatusChange(
        invoice.subscription,
        'active',
      );
    }
  }

  private async handlePaymentFailed(invoice: any) {
    this.logger.log(`Payment failed for subscription: ${invoice.subscription}`);

    if (invoice.subscription) {
      await this.djRegistrationService.handleSubscriptionStatusChange(
        invoice.subscription,
        'past_due',
      );
    }
  }

  private async handleSubscriptionUpdated(subscription: any) {
    this.logger.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}`);

    await this.djRegistrationService.handleSubscriptionStatusChange(
      subscription.id,
      subscription.status,
      subscription.metadata,
      subscription,
    );
  }

  private async handleSubscriptionDeleted(subscription: any) {
    this.logger.log(`Subscription deleted: ${subscription.id}`);

    await this.djRegistrationService.handleSubscriptionStatusChange(
      subscription.id,
      'canceled',
      subscription.metadata,
      subscription,
    );
  }

  private async handleSubscriptionCreated(subscription: any) {
    this.logger.log(`Subscription created: ${subscription.id}, status: ${subscription.status}`);
    this.logger.log(`Subscription metadata:`, JSON.stringify(subscription.metadata, null, 2));
    this.logger.log(`Subscription customer:`, subscription.customer);

    // Log specifically about djId in metadata
    if (subscription.metadata && subscription.metadata.djId) {
      this.logger.log(`✅ DJ ID found in metadata: ${subscription.metadata.djId}`);
    } else {
      this.logger.warn(`⚠️ No DJ ID found in subscription metadata`);
    }

    await this.djRegistrationService.handleSubscriptionStatusChange(
      subscription.id,
      subscription.status,
      subscription.metadata, // Pass metadata
      subscription, // Pass full subscription object for customer lookup
    );
  }

  private async handleCheckoutSessionCompleted(session: any) {
    this.logger.log(
      `Checkout session completed: ${session.id}, subscription: ${session.subscription}`,
    );

    if (session.subscription && session.metadata) {
      // Handle the completed checkout session by updating the subscription
      await this.djRegistrationService.handleSubscriptionStatusChange(
        session.subscription,
        'active',
      );
    }
  }
}
