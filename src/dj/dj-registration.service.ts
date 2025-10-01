import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { DJ } from '../dj/dj.entity';
import { User } from '../entities/user.entity';
import { StripeService } from '../subscription/stripe.service';
import { DJService } from './dj.service';

export interface RegisterDjDto {
  djId: string;
  paymentMethodId: string; // Stripe payment method ID from frontend
}

export interface DjSubscriptionStatus {
  isDjSubscriptionActive: boolean;
  djId?: string;
  dj?: DJ;
  stripeSubscriptionId?: string;
  subscriptionStatus?: string;
  cancelledAt?: Date;
  expiresAt?: Date;
  isCancelled?: boolean;
}

@Injectable()
export class DjRegistrationService {
  private readonly logger = new Logger(DjRegistrationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly djService: DJService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  async registerUserAsDj(
    userId: string,
    registerDjDto: RegisterDjDto,
  ): Promise<DjSubscriptionStatus> {
    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['dj'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has a DJ subscription
    if (user.isDjSubscriptionActive && user.djId) {
      throw new BadRequestException('User already has an active DJ subscription');
    }

    // Validate DJ exists
    const dj = await this.djService.findOne(registerDjDto.djId);
    if (!dj) {
      throw new NotFoundException('DJ not found');
    }

    try {
      // Create or get Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await this.stripeService.createCustomerWithMetadata({
          email: user.email,
          name: user.name,
          metadata: {
            userId: user.id,
            userType: 'dj_subscriber',
          },
        });
        stripeCustomerId = customer.id;
      }

      // Attach payment method to customer
      await this.stripeService.attachPaymentMethod(registerDjDto.paymentMethodId, stripeCustomerId);

      // Create subscription
      const djPriceId = this.configService.get('STRIPE_DJ_SUBSCRIPTION_PRICE_ID');
      const subscription = await this.stripeService.createSubscription({
        customer: stripeCustomerId,
        items: [{ price: djPriceId }],
        default_payment_method: registerDjDto.paymentMethodId,
        metadata: {
          userId: user.id,
          djId: dj.id,
          subscriptionType: 'dj_access',
        },
      });

      // Update user with DJ info
      await this.userRepository.update(user.id, {
        djId: dj.id,
        isDjSubscriptionActive: true,
        djStripeSubscriptionId: subscription.id,
        stripeCustomerId,
      });

      return {
        isDjSubscriptionActive: true,
        djId: dj.id,
        dj,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
      };
    } catch (error) {
      console.error('Error registering DJ subscription:', error);
      throw new BadRequestException('Failed to create DJ subscription: ' + error.message);
    }
  }

  async cancelDjSubscription(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.djStripeSubscriptionId) {
      throw new NotFoundException('No active DJ subscription found');
    }

    try {
      // Cancel Stripe subscription at period end
      const cancelledSubscription = await this.stripeService.cancelSubscription(
        user.djStripeSubscriptionId,
      );

      // Update user to track cancellation but keep active until period end
      await this.userRepository.update(user.id, {
        djSubscriptionCancelledAt: new Date(),
        djSubscriptionExpiresAt: new Date((cancelledSubscription as any).current_period_end * 1000),
        // Keep isDjSubscriptionActive: true until period end
        // Keep djStripeSubscriptionId for tracking until expiry
      });
    } catch (error) {
      console.error('Error cancelling DJ subscription:', error);
      throw new BadRequestException('Failed to cancel DJ subscription: ' + error.message);
    }
  }

  async getDjSubscriptionStatus(userId: string): Promise<DjSubscriptionStatus> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['dj', 'dj.vendor'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isDjSubscriptionActive) {
      return {
        isDjSubscriptionActive: false,
      };
    }

    let subscriptionStatus = 'unknown';
    let isExpired = false;

    // Check if subscription is past its expiry date
    if (user.djSubscriptionExpiresAt && new Date() > user.djSubscriptionExpiresAt) {
      isExpired = true;
      subscriptionStatus = 'expired';
    }

    // Determine subscription status based on cancellation and expiry
    const isCancelled = !!user.djSubscriptionCancelledAt;
    if (isCancelled && !isExpired) {
      subscriptionStatus = 'cancelled_with_access'; // Cancelled but still has access until expiry
    } else if (isCancelled && isExpired) {
      subscriptionStatus = 'cancelled_and_expired';
    }

    if (user.djStripeSubscriptionId && !isExpired) {
      try {
        const subscription = await this.stripeService.getSubscription(user.djStripeSubscriptionId);
        subscriptionStatus = subscription.status;

        // If subscription is cancelled in Stripe, update our records
        if (subscription.cancel_at_period_end && !user.djSubscriptionCancelledAt) {
          await this.userRepository.update(user.id, {
            djSubscriptionCancelledAt: new Date(),
            djSubscriptionExpiresAt: new Date((subscription as any).current_period_end * 1000),
          });
        }
      } catch (error) {
        // Handle subscription not found in Stripe
        if (error.code === 'resource_missing') {
          console.warn(
            `Stripe subscription ${user.djStripeSubscriptionId} not found, marking as expired`,
          );
          subscriptionStatus = 'not_found';
          isExpired = true;

          // Update user to reflect subscription no longer exists
          await this.userRepository.update(user.id, {
            isDjSubscriptionActive: false,
            djStripeSubscriptionId: null,
            djSubscriptionExpiresAt: new Date(), // Expire immediately
          });
        } else {
          console.error('Error fetching subscription status:', error);
          subscriptionStatus = 'error';
        }
      }
    }

    // If expired, deactivate the subscription and remove DJ assignment
    if (isExpired && user.isDjSubscriptionActive) {
      await this.userRepository.update(user.id, {
        isDjSubscriptionActive: false,
        djId: null, // Remove DJ assignment when subscription expires
      });
      this.logger.log(
        `Subscription expired for user ${user.id} - removed DJ access and assignment`,
      );
    }

    return {
      isDjSubscriptionActive: user.isDjSubscriptionActive && !isExpired,
      djId: user.djId,
      dj: user.dj,
      stripeSubscriptionId: user.djStripeSubscriptionId,
      subscriptionStatus,
      cancelledAt: user.djSubscriptionCancelledAt,
      expiresAt: user.djSubscriptionExpiresAt,
      isCancelled: !!user.djSubscriptionCancelledAt,
    };
  }

  async handleSubscriptionStatusChange(
    stripeSubscriptionId: string,
    status: string,
    metadata?: any,
    subscription?: any,
  ): Promise<void> {
    this.logger.log(`Processing subscription ${stripeSubscriptionId} with status: ${status}`);

    // First try to find user by existing subscription ID
    let user = await this.userRepository.findOne({
      where: { djStripeSubscriptionId: stripeSubscriptionId },
    });

    // If user not found, this is a new subscription - find user by customer
    if (!user && subscription && subscription.customer) {
      this.logger.log(
        `New subscription detected, finding user by Stripe customer ID: ${subscription.customer}`,
      );

      try {
        // Get customer details from Stripe to find email
        const customer = await this.stripeService.getCustomer(subscription.customer);
        if (customer && customer.email) {
          this.logger.log(`Found customer email from Stripe: ${customer.email}`);

          // Find user by email
          user = await this.userRepository.findOne({ where: { email: customer.email } });
          if (user) {
            this.logger.log(`Found user by email: ${user.id}`);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to get customer from Stripe: ${error.message}`);
      }
    }

    if (!user) {
      this.logger.warn(`User not found for subscription ${stripeSubscriptionId}`);
      return;
    }

    const isActive = ['active', 'trialing'].includes(status);

    // Build update data
    const updateData: any = {
      djStripeSubscriptionId: stripeSubscriptionId,
      isDjSubscriptionActive: isActive,
    };

    // Only set djId if subscription is becoming active and we have djId in metadata
    if (isActive && metadata && metadata.djId) {
      updateData.djId = metadata.djId;
      this.logger.log(`✅ Activating DJ subscription for user ${user.id} with DJ ${metadata.djId}`);
    } else if (isActive) {
      this.logger.warn(`⚠️ Subscription ${stripeSubscriptionId} is active but no djId in metadata`);
      this.logger.warn(`Metadata received:`, JSON.stringify(metadata, null, 2));
    }

    // Set expiration date from Stripe's current_period_end (for both active and cancelled subscriptions)
    if (subscription && subscription.current_period_end) {
      updateData.djSubscriptionExpiresAt = new Date(subscription.current_period_end * 1000);
      this.logger.log(
        `Set subscription expiry to: ${updateData.djSubscriptionExpiresAt.toISOString()}`,
      );
    }

    // Set cancellation date if subscription is cancelled, but maintain access until expiry
    if (status === 'canceled' || status === 'cancelled') {
      updateData.djSubscriptionCancelledAt = new Date();
      // Keep isDjSubscriptionActive = true until the expiry date
      // The getDjSubscriptionStatus method will handle expiry checking
      this.logger.log(
        `Subscription cancelled, but access maintained until: ${updateData.djSubscriptionExpiresAt?.toISOString() || 'unknown'}`,
      );
    }

    await this.userRepository.update(user.id, updateData);

    this.logger.log(
      `Updated DJ subscription for user ${user.id}: ${status} (active: ${isActive})${updateData.djId ? `, DJ: ${updateData.djId}` : ''}`,
    );
  }

  async createDjCheckoutSession(userId: string, djId: string): Promise<{ url: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has a DJ subscription
    if (user.isDjSubscriptionActive && user.djId) {
      throw new BadRequestException('User already has an active DJ subscription');
    }

    // Verify DJ exists
    const dj = await this.djService.findOne(djId);
    if (!dj) {
      throw new NotFoundException('DJ not found');
    }

    try {
      const djPriceId = this.configService.get('STRIPE_DJ_SUBSCRIPTION_PRICE_ID');

      // Get or create Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await this.stripeService.createCustomer(user.email, user.name);
        stripeCustomerId = customer.id;
        await this.userRepository.update(user.id, { stripeCustomerId });
      }

      const successUrl = `${this.configService.get('FRONTEND_URL')}/profile?dj_success=true`;
      const cancelUrl = `${this.configService.get('FRONTEND_URL')}/profile?dj_cancelled=true`;

      // Store djId in metadata for webhook processing, but don't save to user yet
      const checkoutSession = await this.stripeService.createCheckoutSession(
        stripeCustomerId,
        djPriceId,
        successUrl,
        cancelUrl,
        {
          userId: user.id,
          djId: dj.id,
          subscriptionType: 'dj_access',
        },
      );

      this.logger.log(
        `Created checkout session for user ${userId} with DJ ${djId} - will activate only on successful payment`,
      );

      return { url: checkoutSession.url };
    } catch (error) {
      console.error('Error creating DJ checkout session:', error);
      throw new BadRequestException('Failed to create checkout session: ' + error.message);
    }
  }

  async simulateSuccessfulSubscription(
    userId: string,
    djId: string,
    subscriptionId: string,
  ): Promise<void> {
    // Update user with DJ subscription details
    await this.userRepository.update(userId, {
      djId: djId,
      isDjSubscriptionActive: true,
      djStripeSubscriptionId: subscriptionId,
      djSubscriptionCancelledAt: null,
      djSubscriptionExpiresAt: null,
    });

    console.log(`Simulated successful DJ subscription for user ${userId}: ${subscriptionId}`);
  }

  async cleanupExpiredSubscriptions(): Promise<{ cleanedUp: number; details: string[] }> {
    const expiredUsers = await this.userRepository.find({
      where: {
        isDjSubscriptionActive: true,
        djSubscriptionExpiresAt: LessThan(new Date()),
      },
    });

    const details: string[] = [];

    for (const user of expiredUsers) {
      await this.userRepository.update(user.id, {
        isDjSubscriptionActive: false,
        djId: null, // Remove DJ assignment
      });

      details.push(
        `User ${user.email} (${user.id}): Expired ${user.djSubscriptionExpiresAt?.toISOString()}`,
      );
      this.logger.log(`Cleaned up expired subscription for user ${user.email}`);
    }

    this.logger.log(`Cleanup completed: ${expiredUsers.length} expired subscriptions processed`);

    return {
      cleanedUp: expiredUsers.length,
      details,
    };
  }
}
