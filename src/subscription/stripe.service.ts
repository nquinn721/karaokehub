import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SubscriptionPlan } from './subscription.entity';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-07-30.basil',
    });
  }

  // Product and Price IDs (these should be set up in your Stripe Dashboard)
  private readonly PRICE_IDS = {
    [SubscriptionPlan.AD_FREE]: process.env.STRIPE_AD_FREE_PRICE_ID || 'price_ad_free',
    [SubscriptionPlan.PREMIUM]: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium',
  };

  async createCustomer(email: string, name: string): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email,
      name,
    });
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    return this.stripe.customers.retrieve(customerId) as Promise<Stripe.Customer>;
  }

  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<Stripe.Checkout.Session> {
    try {
      console.log('🛒 [STRIPE_SERVICE] Creating checkout session with parameters:', {
        customerId,
        priceId,
        successUrl,
        cancelUrl,
      });

      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        payment_method_types: ['card'], // Only use card payments for now
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        // Configure automatic tax calculation
        automatic_tax: {
          enabled: true,
        },
        // Configure customer updates to save address for tax calculation
        customer_update: {
          address: 'auto', // Automatically save the address entered in checkout
          shipping: 'auto', // Automatically save the shipping address
        },
      };

      // Add test mode enhancements for development
      if (process.env.NODE_ENV === 'development') {
        console.log('🧪 [STRIPE_SERVICE] Adding test mode enhancements...');

        // Pre-fill customer email for faster testing
        sessionConfig.customer_email = undefined; // Let customer ID handle this

        // Add metadata for test tracking
        sessionConfig.metadata = {
          environment: 'development',
          test_mode: 'true',
          created_at: new Date().toISOString(),
        };

        console.log('✅ [STRIPE_SERVICE] Test mode enhancements added');
      }

      console.log(
        '📝 [STRIPE_SERVICE] Session configuration:',
        JSON.stringify(sessionConfig, null, 2),
      );

      const session = await this.stripe.checkout.sessions.create(sessionConfig);

      console.log('✅ [STRIPE_SERVICE] Checkout session created successfully:', {
        sessionId: session.id,
        mode: session.mode,
        status: session.status,
        url: session.url?.substring(0, 80) + '...',
      });

      return session;
    } catch (error) {
      console.error('❌ [STRIPE_SERVICE] Error creating checkout session:', {
        customerId,
        priceId,
        error: error.message,
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack,
      });
      throw error;
    }
  }

  async createPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<Stripe.BillingPortal.Session> {
    return this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  async changeSubscriptionPlan(
    subscriptionId: string,
    newPriceId: string,
  ): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

    return this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'always_invoice',
    });
  }

  async cancelSubscriptionImmediately(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.cancel(subscriptionId);
  }

  async listSubscriptions(customerId: string): Promise<Stripe.ApiList<Stripe.Subscription>> {
    return this.stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });
  }

  getPriceId(plan: SubscriptionPlan): string {
    return this.PRICE_IDS[plan];
  }

  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    const endpointSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!endpointSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }
    return this.stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  }
}
