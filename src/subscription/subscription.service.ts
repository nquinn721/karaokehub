import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UrlService } from '../config/url.service';
import { User } from '../entities/user.entity';
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
  ) {}

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async createCheckoutSession(userId: string, plan: SubscriptionPlan) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create Stripe customer if not exists
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripeService.createCustomer(user.email, user.name);
      stripeCustomerId = customer.id;
      await this.userRepository.update(userId, { stripeCustomerId });
    }

    const priceId = this.stripeService.getPriceId(plan);
    const subscriptionUrls = this.urlService.getSubscriptionUrls();

    const session = await this.stripeService.createCheckoutSession(
      stripeCustomerId,
      priceId,
      subscriptionUrls.success,
      subscriptionUrls.cancel,
    );

    return session;
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

  private async handleCheckoutSessionCompleted(session: any) {
    const stripeCustomerId = session.customer;
    const subscriptionId = session.subscription;

    const user = await this.userRepository.findOne({
      where: { stripeCustomerId },
    });

    if (!user) return;

    const stripeSubscription = await this.stripeService.getSubscription(subscriptionId);
    const plan = this.getPlanFromPriceId(stripeSubscription.items.data[0].price.id);

    // Create or update subscription record
    await this.upsertSubscription(user.id, stripeSubscription, plan);
  }

  private async handleSubscriptionUpdated(subscription: any) {
    const user = await this.userRepository.findOne({
      where: { stripeCustomerId: subscription.customer },
    });

    if (!user) return;

    const plan = this.getPlanFromPriceId(subscription.items.data[0].price.id);
    await this.upsertSubscription(user.id, subscription, plan);
  }

  private async handleSubscriptionDeleted(subscription: any) {
    await this.subscriptionRepository.update(
      { stripeSubscriptionId: subscription.id },
      {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
      },
    );
  }

  private async handlePaymentSucceeded(invoice: any) {
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
    return subscription?.status === SubscriptionStatus.ACTIVE || false;
  }

  async hasAdFreeAccess(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    return (
      subscription?.status === SubscriptionStatus.ACTIVE &&
      (subscription.plan === SubscriptionPlan.AD_FREE ||
        subscription.plan === SubscriptionPlan.PREMIUM)
    );
  }

  async hasPremiumAccess(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    return (
      subscription?.status === SubscriptionStatus.ACTIVE &&
      subscription.plan === SubscriptionPlan.PREMIUM
    );
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
}
