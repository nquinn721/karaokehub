import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UrlService } from '../config/url.service';
import { User } from '../entities/user.entity';
import { UserFeatureOverrideService } from '../user-feature-override/user-feature-override.service';
import { StripeService } from './stripe.service';
import { Subscription, SubscriptionPlan, SubscriptionStatus } from './subscription.entity';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private stripeService: StripeService,
    private urlService: UrlService,
    private userFeatureOverrideService: UserFeatureOverrideService,
  ) {}

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async createCheckoutSession(userId: string, plan: SubscriptionPlan) {
    try {
      console.log('🔄 [SUBSCRIPTION_SERVICE] Creating checkout session:', { userId, plan });

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        console.error('❌ [SUBSCRIPTION_SERVICE] User not found:', userId);
        throw new NotFoundException('User not found');
      }

      console.log('👤 [SUBSCRIPTION_SERVICE] User found:', {
        userId: user.id,
        email: user.email,
        stripeCustomerId: user.stripeCustomerId,
      });

      // Create Stripe customer if not exists or validate existing customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        console.log('🆕 [SUBSCRIPTION_SERVICE] Creating new Stripe customer...');
        const customer = await this.stripeService.createCustomer(user.email, user.name);
        stripeCustomerId = customer.id;
        await this.userRepository.update(userId, { stripeCustomerId });
        console.log('✅ [SUBSCRIPTION_SERVICE] Stripe customer created:', stripeCustomerId);
      } else {
        // Validate existing customer ID - it might be from test mode or different account
        console.log('🔍 [SUBSCRIPTION_SERVICE] Validating existing customer:', stripeCustomerId);
        try {
          await this.stripeService.getCustomer(stripeCustomerId);
          console.log('✅ [SUBSCRIPTION_SERVICE] Existing customer validated:', stripeCustomerId);
        } catch (error) {
          console.warn('⚠️ [SUBSCRIPTION_SERVICE] Invalid customer ID detected:', {
            customerId: stripeCustomerId,
            error: error.message,
          });
          console.log('🔄 [SUBSCRIPTION_SERVICE] Creating new customer to replace invalid one...');

          // Create new customer and update database
          const customer = await this.stripeService.createCustomer(user.email, user.name);
          stripeCustomerId = customer.id;
          await this.userRepository.update(userId, { stripeCustomerId });

          console.log(
            '✅ [SUBSCRIPTION_SERVICE] Replaced invalid customer with new one:',
            stripeCustomerId,
          );
        }
      }

      console.log('💰 [SUBSCRIPTION_SERVICE] Getting price ID for plan:', plan);
      const priceId = this.stripeService.getPriceId(plan);
      console.log('💰 [SUBSCRIPTION_SERVICE] Price ID:', priceId);

      const subscriptionUrls = this.urlService.getSubscriptionUrls();
      console.log('🔗 [SUBSCRIPTION_SERVICE] Subscription URLs:', subscriptionUrls);

      console.log('🛒 [SUBSCRIPTION_SERVICE] Creating Stripe checkout session...');
      const session = await this.stripeService.createCheckoutSession(
        stripeCustomerId,
        priceId,
        subscriptionUrls.success,
        subscriptionUrls.cancel,
        {
          userId: user.id,
          subscriptionType: 'premium_or_ad_free',
          plan: plan,
        },
      );

      console.log('✅ [SUBSCRIPTION_SERVICE] Checkout session created successfully:', {
        sessionId: session.id,
        url: session.url?.substring(0, 50) + '...',
      });

      return session;
    } catch (error) {
      console.error('❌ [SUBSCRIPTION_SERVICE] Error creating checkout session:', {
        userId,
        plan,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async createMobileOptimizedCheckoutSession(userId: string, plan: SubscriptionPlan, userAgent?: string) {
    try {
      console.log('📱 [SUBSCRIPTION_SERVICE] Creating mobile-optimized checkout session:', { 
        userId, 
        plan,
        userAgent: userAgent?.substring(0, 50) + '...'
      });

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        console.error('❌ [SUBSCRIPTION_SERVICE] User not found:', userId);
        throw new NotFoundException('User not found');
      }

      // Create Stripe customer if not exists or validate existing customer (same logic as regular checkout)
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        console.log('🆕 [SUBSCRIPTION_SERVICE] Creating new Stripe customer...');
        const customer = await this.stripeService.createCustomer(user.email, user.name);
        stripeCustomerId = customer.id;
        await this.userRepository.update(userId, { stripeCustomerId });
        console.log('✅ [SUBSCRIPTION_SERVICE] Stripe customer created:', stripeCustomerId);
      } else {
        // Validate existing customer ID
        try {
          await this.stripeService.getCustomer(stripeCustomerId);
          console.log('✅ [SUBSCRIPTION_SERVICE] Existing customer validated:', stripeCustomerId);
        } catch (error) {
          // Create new customer if invalid
          const customer = await this.stripeService.createCustomer(user.email, user.name);
          stripeCustomerId = customer.id;
          await this.userRepository.update(userId, { stripeCustomerId });
          console.log('✅ [SUBSCRIPTION_SERVICE] Replaced invalid customer:', stripeCustomerId);
        }
      }

      const priceId = this.stripeService.getPriceId(plan);
      const subscriptionUrls = this.urlService.getSubscriptionUrls();

      console.log('📱 [SUBSCRIPTION_SERVICE] Creating mobile-optimized Stripe checkout session...');
      const session = await this.stripeService.createMobileOptimizedCheckoutSession(
        stripeCustomerId,
        priceId,
        subscriptionUrls.success,
        subscriptionUrls.cancel,
        userAgent,
        {
          userId: user.id,
          subscriptionType: 'premium_or_ad_free',
          plan: plan,
          mobileOptimized: 'true',
        },
      );

      console.log('✅ [SUBSCRIPTION_SERVICE] Mobile checkout session created:', {
        sessionId: session.id,
        url: session.url?.substring(0, 50) + '...',
      });

      return session;
    } catch (error) {
      console.error('❌ [SUBSCRIPTION_SERVICE] Error creating mobile checkout session:', {
        userId,
        plan,
        error: error.message,
      });
      throw error;
    }
  }

  async createPortalSession(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.stripeCustomerId) {
      throw new NotFoundException('User not found or no subscription');
    }

    const returnUrl = this.urlService.getSubscriptionUrls().manage;
    const session = await this.stripeService.createPortalSession(user.stripeCustomerId, returnUrl);

    return session;
  }

  async createPaymentIntent(userId: string, plan: SubscriptionPlan) {
    try {
      console.log('💳 [SUBSCRIPTION_SERVICE] Creating payment intent:', { userId, plan });

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        console.error('❌ [SUBSCRIPTION_SERVICE] User not found:', userId);
        throw new NotFoundException('User not found');
      }

      // Create Stripe customer if not exists or validate existing customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        console.log('🆕 [SUBSCRIPTION_SERVICE] Creating new Stripe customer...');
        const customer = await this.stripeService.createCustomer(user.email, user.name);
        stripeCustomerId = customer.id;
        await this.userRepository.update(userId, { stripeCustomerId });
        console.log('✅ [SUBSCRIPTION_SERVICE] Stripe customer created:', stripeCustomerId);
      } else {
        // Validate existing customer ID
        try {
          await this.stripeService.getCustomer(stripeCustomerId);
          console.log('✅ [SUBSCRIPTION_SERVICE] Existing customer validated:', stripeCustomerId);
        } catch (error) {
          // Create new customer if invalid
          const customer = await this.stripeService.createCustomer(user.email, user.name);
          stripeCustomerId = customer.id;
          await this.userRepository.update(userId, { stripeCustomerId });
          console.log('✅ [SUBSCRIPTION_SERVICE] Replaced invalid customer:', stripeCustomerId);
        }
      }

      const priceId = this.stripeService.getPriceId(plan);

      console.log('💳 [SUBSCRIPTION_SERVICE] Creating Stripe payment intent...');
      const paymentIntent = await this.stripeService.createSubscriptionPaymentIntent(
        stripeCustomerId,
        priceId,
        {
          userId: user.id,
          subscriptionType: 'premium_or_ad_free',
          plan: plan,
          inApp: 'true',
        },
      );

      console.log('✅ [SUBSCRIPTION_SERVICE] Payment intent created:', {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret?.substring(0, 20) + '...',
      });

      return paymentIntent;
    } catch (error) {
      console.error('❌ [SUBSCRIPTION_SERVICE] Error creating payment intent:', {
        userId,
        plan,
        error: error.message,
      });
      throw error;
    }
  }

  async handleWebhook(event: any) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
    }
  }

  /**
   * Check if a subscription is a DJ subscription based on metadata
   */
  private isDjSubscription(subscription: any): boolean {
    const metadata = subscription.metadata || {};
    return (
      metadata.subscriptionType === 'dj_access' ||
      !!metadata.djId ||
      !!metadata.isDjSubscription
    );
  }

  /**
   * Check if an invoice belongs to a DJ subscription
   */
  private async isInvoiceForDjSubscription(invoice: any): Promise<boolean> {
    if (!invoice.subscription) return false;
    
    try {
      const subscription = await this.stripeService.getSubscription(invoice.subscription);
      return this.isDjSubscription(subscription);
    } catch (error) {
      console.warn('Could not fetch subscription for invoice:', invoice.id);
      return false;
    }
  }

  private async handleCheckoutSessionCompleted(session: any) {
    const stripeCustomerId = session.customer;
    const subscriptionId = session.subscription;

    const user = await this.userRepository.findOne({
      where: { stripeCustomerId },
    });

    if (!user) return;

    const stripeSubscription = await this.stripeService.getSubscription(subscriptionId);
    
    // Skip DJ subscriptions - they're handled by the DJ webhook
    if (this.isDjSubscription(stripeSubscription)) {
      console.log(`⏭️ Skipping DJ subscription in general webhook: ${subscriptionId}`);
      return;
    }

    const plan = this.getPlanFromPriceId(stripeSubscription.items.data[0].price.id);

    // Create or update subscription record
    await this.upsertSubscription(user.id, stripeSubscription, plan);
  }

  private async handleSubscriptionUpdated(subscription: any) {
    // Skip DJ subscriptions - they're handled by the DJ webhook
    if (this.isDjSubscription(subscription)) {
      console.log(`⏭️ Skipping DJ subscription update in general webhook: ${subscription.id}`);
      return;
    }

    const user = await this.userRepository.findOne({
      where: { stripeCustomerId: subscription.customer },
    });

    if (!user) return;

    const plan = this.getPlanFromPriceId(subscription.items.data[0].price.id);
    await this.upsertSubscription(user.id, subscription, plan);
  }

  private async handleSubscriptionDeleted(subscription: any) {
    // Skip DJ subscriptions - they're handled by the DJ webhook
    if (this.isDjSubscription(subscription)) {
      console.log(`⏭️ Skipping DJ subscription deletion in general webhook: ${subscription.id}`);
      return;
    }

    await this.subscriptionRepository.update(
      { stripeSubscriptionId: subscription.id },
      {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
      },
    );
  }

  private async handlePaymentSucceeded(invoice: any) {
    // Skip DJ subscription invoices - they're handled by the DJ webhook
    if (await this.isInvoiceForDjSubscription(invoice)) {
      console.log(`⏭️ Skipping DJ subscription payment in general webhook: ${invoice.subscription}`);
      return;
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: invoice.subscription },
    });

    if (subscription) {
      await this.subscriptionRepository.update(subscription.id, {
        status: SubscriptionStatus.ACTIVE,
      });
    }
  }

  private async handlePaymentFailed(invoice: any) {
    // Skip DJ subscription invoices - they're handled by the DJ webhook
    if (await this.isInvoiceForDjSubscription(invoice)) {
      console.log(`⏭️ Skipping DJ subscription payment failure in general webhook: ${invoice.subscription}`);
      return;
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: invoice.subscription },
    });

    if (subscription) {
      await this.subscriptionRepository.update(subscription.id, {
        status: SubscriptionStatus.PAST_DUE,
      });
    }
  }

  private async upsertSubscription(
    userId: string,
    stripeSubscription: any,
    plan: SubscriptionPlan,
  ) {
    const subscriptionData = {
      userId,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: stripeSubscription.customer,
      plan,
      status: stripeSubscription.status as SubscriptionStatus,
      pricePerMonth: stripeSubscription.items.data[0].price.unit_amount / 100,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      canceledAt: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000)
        : null,
    };

    const existing = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (existing) {
      await this.subscriptionRepository.update(existing.id, subscriptionData);
    } else {
      await this.subscriptionRepository.save(subscriptionData);
    }
  }

  private getPlanFromPriceId(priceId: string): SubscriptionPlan {
    if (priceId === process.env.STRIPE_AD_FREE_PRICE_ID) {
      return SubscriptionPlan.AD_FREE;
    }
    if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
      return SubscriptionPlan.PREMIUM;
    }
    return SubscriptionPlan.FREE;
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    return (
      subscription?.status === SubscriptionStatus.ACTIVE ||
      subscription?.status === SubscriptionStatus.TRIALING ||
      false
    );
  }

  async hasAdFreeAccess(userId: string): Promise<boolean> {
    // Check for admin override first
    const hasOverride = await this.userFeatureOverrideService.hasAdFreeOverride(userId);
    if (hasOverride) return true;

    // Check subscription
    const subscription = await this.getUserSubscription(userId);
    return (
      (subscription?.status === SubscriptionStatus.ACTIVE ||
        subscription?.status === SubscriptionStatus.TRIALING) &&
      (subscription.plan === SubscriptionPlan.AD_FREE ||
        subscription.plan === SubscriptionPlan.PREMIUM)
    );
  }

  async hasPremiumAccess(userId: string): Promise<boolean> {
    // Check for admin override first
    const hasOverride = await this.userFeatureOverrideService.hasPremiumOverride(userId);
    if (hasOverride) return true;

    // Check subscription
    const subscription = await this.getUserSubscription(userId);
    return (
      (subscription?.status === SubscriptionStatus.ACTIVE ||
        subscription?.status === SubscriptionStatus.TRIALING) &&
      subscription.plan === SubscriptionPlan.PREMIUM
    );
  }

  // New methods for feature-specific checks with overrides
  async canUseSongPreviews(
    userId: string,
    currentCount: number,
  ): Promise<{ allowed: boolean; limit: number | null }> {
    // Check for unlimited override
    const hasUnlimited = await this.userFeatureOverrideService.hasUnlimitedSongPreviews(userId);
    if (hasUnlimited) {
      return { allowed: true, limit: null }; // unlimited
    }

    // Check for custom limit override
    const customLimit = await this.userFeatureOverrideService.getSongPreviewLimit(userId);
    if (customLimit !== null) {
      return { allowed: currentCount < customLimit, limit: customLimit };
    }

    // Check premium subscription
    if (await this.hasPremiumAccess(userId)) {
      return { allowed: true, limit: null }; // unlimited
    }

    // Default free tier limit
    const defaultLimit = 10;
    return { allowed: currentCount < defaultLimit, limit: defaultLimit };
  }

  async canFavoriteSongs(
    userId: string,
    currentCount: number,
  ): Promise<{ allowed: boolean; limit: number | null }> {
    // Check for unlimited override
    const hasUnlimited = await this.userFeatureOverrideService.hasUnlimitedSongFavorites(userId);
    if (hasUnlimited) {
      return { allowed: true, limit: null }; // unlimited
    }

    // Check for custom limit override
    const customLimit = await this.userFeatureOverrideService.getSongFavoriteLimit(userId);
    if (customLimit !== null) {
      return { allowed: currentCount < customLimit, limit: customLimit };
    }

    // Check premium subscription
    if (await this.hasPremiumAccess(userId)) {
      return { allowed: true, limit: null }; // unlimited
    }

    // Default free tier limit
    const defaultLimit = 5;
    return { allowed: currentCount < defaultLimit, limit: defaultLimit };
  }

  async canFavoriteShows(
    userId: string,
    currentCount: number,
  ): Promise<{ allowed: boolean; limit: number | null }> {
    // Check for unlimited override
    const hasUnlimited = await this.userFeatureOverrideService.hasUnlimitedShowFavorites(userId);
    if (hasUnlimited) {
      return { allowed: true, limit: null }; // unlimited
    }

    // Check for custom limit override
    const customLimit = await this.userFeatureOverrideService.getShowFavoriteLimit(userId);
    if (customLimit !== null) {
      return { allowed: currentCount < customLimit, limit: customLimit };
    }

    // Check premium subscription
    if (await this.hasPremiumAccess(userId)) {
      return { allowed: true, limit: null }; // unlimited
    }

    // Default free tier limit
    const defaultLimit = 3;
    return { allowed: currentCount < defaultLimit, limit: defaultLimit };
  }

  async syncUserSubscription(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user?.stripeCustomerId) {
      return null;
    }

    try {
      // Get all subscriptions for this customer from Stripe
      const subscriptions = await this.stripeService.listSubscriptions(user.stripeCustomerId);

      // Find the most recent active subscription
      const activeSubscription =
        subscriptions.data.find((sub) => sub.status === 'active' || sub.status === 'trialing') ||
        subscriptions.data[0];

      if (activeSubscription) {
        const plan = this.getPlanFromPriceId(activeSubscription.items.data[0].price.id);
        await this.upsertSubscription(userId, activeSubscription, plan);
        return await this.getUserSubscription(userId);
      }

      return null;
    } catch (error) {
      console.error('Error syncing subscription:', error);
      throw error;
    }
  }

  async changeSubscriptionPlan(userId: string, newPlan: SubscriptionPlan) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const subscription = await this.getUserSubscription(userId);
    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new NotFoundException('No active subscription found');
    }

    const newPriceId = this.stripeService.getPriceId(newPlan);

    // Update subscription in Stripe
    const updatedStripeSubscription = await this.stripeService.changeSubscriptionPlan(
      subscription.stripeSubscriptionId,
      newPriceId,
    );

    // Update local subscription record
    await this.upsertSubscription(userId, updatedStripeSubscription, newPlan);

    return await this.getUserSubscription(userId);
  }

  async cancelSubscription(userId: string, immediately: boolean = false) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const subscription = await this.getUserSubscription(userId);
    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new NotFoundException('No active subscription found');
    }

    let updatedStripeSubscription;

    if (immediately) {
      // Cancel immediately
      updatedStripeSubscription = await this.stripeService.cancelSubscriptionImmediately(
        subscription.stripeSubscriptionId,
      );
    } else {
      // Cancel at period end
      updatedStripeSubscription = await this.stripeService.cancelSubscription(
        subscription.stripeSubscriptionId,
      );
    }

    // Update local subscription record
    const plan = this.getPlanFromPriceId(updatedStripeSubscription.items.data[0].price.id);
    await this.upsertSubscription(userId, updatedStripeSubscription, plan);

    return await this.getUserSubscription(userId);
  }
}
