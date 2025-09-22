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
      apiVersion: '2025-08-27.basil',
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
        payment_method_types: [
          'card', // Credit/debit cards
          'link', // Stripe Link (1-click payments)
          // Note: Apple Pay and Google Pay are automatically enabled for 'card'
          // when the browser/device supports them
        ],
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

  async createPaymentIntent(
    customerId: string,
    amount: number,
    currency: string = 'usd',
    metadata: Record<string, string> = {},
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      customer: customerId,
      amount,
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });
  }

  async createOneTimeCheckoutSession(
    customerId: string,
    amount: number,
    currency: string = 'usd',
    productName: string,
    successUrl: string,
    cancelUrl: string,
    metadata: Record<string, string> = {},
  ): Promise<Stripe.Checkout.Session> {
    try {
      console.log('🛒 [STRIPE_SERVICE] Creating one-time checkout session:', {
        customerId,
        amount,
        currency,
        productName,
      });

      // Check if customer has saved payment methods for simplified checkout
      const customer = await this.stripe.customers.retrieve(customerId);
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency,
              unit_amount: amount,
              product_data: {
                name: productName,
              },
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        billing_address_collection: 'auto',
      };

      // If customer has saved payment methods, enable faster checkout
      if (paymentMethods.data.length > 0) {
        console.log(
          '💳 [STRIPE_SERVICE] Customer has saved payment methods, enabling simplified checkout',
        );
        sessionConfig.payment_intent_data = {
          setup_future_usage: 'off_session', // Save for future use
        };
      } else {
        console.log('💳 [STRIPE_SERVICE] New customer, will save payment method for future use');
        sessionConfig.payment_intent_data = {
          setup_future_usage: 'off_session', // Save for future use
        };
      }

      const session = await this.stripe.checkout.sessions.create(sessionConfig);

      console.log('✅ [STRIPE_SERVICE] One-time checkout session created:', {
        sessionId: session.id,
        url: session.url?.substring(0, 80) + '...',
      });

      return session;
    } catch (error) {
      console.error('❌ [STRIPE_SERVICE] Error creating one-time checkout session:', error);
      throw error;
    }
  }

  async getCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return paymentMethods.data;
  }

  async createPaymentWithSavedMethod(
    customerId: string,
    paymentMethodId: string,
    amount: number,
    currency: string = 'usd',
    metadata: Record<string, string> = {},
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      customer: customerId,
      payment_method: paymentMethodId,
      amount,
      currency,
      confirmation_method: 'manual',
      confirm: true,
      return_url: metadata.return_url || 'https://your-app.com/return',
      metadata,
    });
  }

  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }

  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    const endpointSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!endpointSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }
    return this.stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  }
}
