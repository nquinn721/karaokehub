import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../entities/user.entity';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { StripeService } from './stripe.service';
import { SubscriptionPlan } from './subscription.entity';
import { SubscriptionService } from './subscription.service';

@Controller('subscription')
export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService,
    private stripeService: StripeService,
  ) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getSubscriptionStatus(@CurrentUser() user: User) {
    const subscription = await this.subscriptionService.getUserSubscription(user.id);
    const hasAdFree = await this.subscriptionService.hasAdFreeAccess(user.id);
    const hasPremium = await this.subscriptionService.hasPremiumAccess(user.id);

    // Get detailed feature limits
    const songPreviewsStatus = await this.subscriptionService.canUseSongPreviews(user.id, 0);
    const songFavoritesStatus = await this.subscriptionService.canFavoriteSongs(user.id, 0);
    const showFavoritesStatus = await this.subscriptionService.canFavoriteShows(user.id, 0);

    return {
      subscription,
      features: {
        adFree: hasAdFree,
        premium: hasPremium,
        songPreviews: {
          unlimited: songPreviewsStatus.limit === null,
          limit: songPreviewsStatus.limit,
        },
        songFavorites: {
          unlimited: songFavoritesStatus.limit === null,
          limit: songFavoritesStatus.limit,
        },
        showFavorites: {
          unlimited: showFavoritesStatus.limit === null,
          limit: showFavoritesStatus.limit,
        },
      },
    };
  }

  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @CurrentUser() user: User,
    @Body() body: CreateCheckoutSessionDto,
    @Req() req,
  ) {
    try {
      console.log('🛒 [SUBSCRIPTION] Create checkout session request:', {
        userId: user.id,
        userEmail: user.email,
        plan: body.plan,
        planType: typeof body.plan,
      });

      // Validate the plan (this should now be handled by the DTO validation)
      if (!Object.values(SubscriptionPlan).includes(body.plan)) {
        console.error('❌ [SUBSCRIPTION] Invalid subscription plan:', body.plan);
        throw new Error(
          `Invalid subscription plan: ${body.plan}. Valid plans: ${Object.values(SubscriptionPlan).join(', ')}`,
        );
      }

      // Check for mobile optimization preference
      const userAgent = req.headers['user-agent'];
      const isMobile = this.detectMobileDevice(userAgent);

      if (isMobile || body.mobileOptimized) {
        console.log('📱 [SUBSCRIPTION] Using mobile-optimized checkout');
        const session = await this.subscriptionService.createMobileOptimizedCheckoutSession(
          user.id,
          body.plan,
          userAgent,
        );
        return { url: session.url };
      }

      const session = await this.subscriptionService.createCheckoutSession(user.id, body.plan);

      console.log('✅ [SUBSCRIPTION] Checkout session created:', {
        sessionId: session.id,
        url: session.url?.substring(0, 50) + '...',
      });

      return { url: session.url };
    } catch (error) {
      console.error('❌ [SUBSCRIPTION] Checkout session creation failed:', {
        userId: user.id,
        plan: body.plan,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  private detectMobileDevice(userAgent?: string): boolean {
    if (!userAgent) return false;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(userAgent);
  }

  @Post('create-portal-session')
  @UseGuards(JwtAuthGuard)
  async createPortalSession(@CurrentUser() user: User) {
    const session = await this.subscriptionService.createPortalSession(user.id);
    return { url: session.url };
  }

  @Post('create-payment-intent')
  @UseGuards(JwtAuthGuard)
  async createPaymentIntent(@CurrentUser() user: User, @Body() body: CreateCheckoutSessionDto) {
    try {
      console.log('💳 [SUBSCRIPTION] Create payment intent request:', {
        userId: user.id,
        userEmail: user.email,
        plan: body.plan,
      });

      // Validate the plan
      if (!Object.values(SubscriptionPlan).includes(body.plan)) {
        console.error('❌ [SUBSCRIPTION] Invalid subscription plan:', body.plan);
        throw new Error(
          `Invalid subscription plan: ${body.plan}. Valid plans: ${Object.values(SubscriptionPlan).join(', ')}`,
        );
      }

      const paymentIntent = await this.subscriptionService.createPaymentIntent(user.id, body.plan);

      console.log('✅ [SUBSCRIPTION] Payment intent created:', {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret?.substring(0, 20) + '...',
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('❌ [SUBSCRIPTION] Payment intent creation failed:', {
        userId: user.id,
        plan: body.plan,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async syncSubscription(@CurrentUser() user: User) {
    // Manually sync subscription status from Stripe
    const synced = await this.subscriptionService.syncUserSubscription(user.id);
    return { success: true, subscription: synced };
  }

  @Post('webhook')
  async handleWebhook(@Req() req: Request & { body: Buffer }, @Res() res: Response) {
    const signature = req.headers['stripe-signature'] as string;
    let event;

    console.log('🎯 [WEBHOOK] General subscription webhook received');
    console.log('🎯 [WEBHOOK] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🎯 [WEBHOOK] Body type:', typeof req.body);
    console.log('🎯 [WEBHOOK] Body length:', req.body?.length || 'undefined');
    console.log('🎯 [WEBHOOK] Signature present:', !!signature);

    try {
      // req.body is now the raw buffer due to express.raw() middleware
      event = this.stripeService.constructWebhookEvent(req.body, signature);
      console.log('✅ [WEBHOOK] Event verified successfully:', event.type);
      console.log('✅ [WEBHOOK] Event ID:', event.id);
    } catch (err) {
      console.error('❌ [WEBHOOK] Signature verification failed:', err.message);
      console.error('❌ [WEBHOOK] Request details:', {
        bodyType: typeof req.body,
        bodyLength: req.body?.length,
        hasSignature: !!signature,
        signature: signature?.substring(0, 20) + '...',
      });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      await this.subscriptionService.handleWebhook(event);
      res.status(200).send('Webhook handled');
    } catch (error) {
      console.error('Webhook handling error:', error);
      res.status(500).send('Webhook handling failed');
    }
  }

  @Get('pricing')
  getPricing() {
    return {
      plans: [
        {
          id: SubscriptionPlan.FREE,
          name: 'Free',
          price: 0,
          features: ['Basic music search', 'View karaoke shows', 'Ads included'],
          priceId: null, // Free plan has no Stripe price ID
        },
        {
          id: SubscriptionPlan.AD_FREE,
          name: 'Ad-Free',
          price: 0.99,
          features: ['All free features', 'No advertisements', 'Clean browsing experience'],
          priceId: process.env.STRIPE_AD_FREE_PRICE_ID || 'price_1S08ls2lgQyeTycPCNCNAdxD',
        },
        {
          id: SubscriptionPlan.PREMIUM,
          name: 'Premium',
          price: 1.99,
          features: [
            'All ad-free features',
            'Favorite songs',
            'Play Music Snippets',
            'Priority support',
            'Advanced features',
          ],
          priceId: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_1S08lu2lgQyeTycPfKtS3gAp',
        },
      ],
      // Include environment info for debugging
      environment: {
        nodeEnv: process.env.NODE_ENV,
        stripeAdFreePriceId: process.env.STRIPE_AD_FREE_PRICE_ID,
        stripePremiumPriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('validate-customer/:customerId')
  async validateCustomer(@Param('customerId') customerId: string) {
    try {
      const customer = await this.stripeService.getCustomer(customerId);
      return {
        valid: true,
        customer: {
          id: customer.id,
          email: customer.email,
          created: customer.created,
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        customerId,
      };
    }
  }

  @Post('change-plan')
  @UseGuards(JwtAuthGuard)
  async changeSubscriptionPlan(
    @CurrentUser() user: User,
    @Body() body: { plan: SubscriptionPlan },
  ) {
    try {
      console.log('🔄 [SUBSCRIPTION] Change plan request:', {
        userId: user.id,
        newPlan: body.plan,
      });

      if (!Object.values(SubscriptionPlan).includes(body.plan)) {
        throw new Error(`Invalid subscription plan: ${body.plan}`);
      }

      const updatedSubscription = await this.subscriptionService.changeSubscriptionPlan(
        user.id,
        body.plan,
      );

      console.log('✅ [SUBSCRIPTION] Plan changed successfully:', {
        userId: user.id,
        newPlan: body.plan,
      });

      return updatedSubscription;
    } catch (error) {
      console.error('❌ [SUBSCRIPTION] Plan change failed:', {
        userId: user.id,
        plan: body.plan,
        error: error.message,
      });
      throw error;
    }
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(@CurrentUser() user: User, @Body() body: { immediately?: boolean }) {
    try {
      console.log('🚫 [SUBSCRIPTION] Cancel subscription request:', {
        userId: user.id,
        immediately: body.immediately || false,
      });

      const updatedSubscription = await this.subscriptionService.cancelSubscription(
        user.id,
        body.immediately || false,
      );

      console.log('✅ [SUBSCRIPTION] Subscription cancelled:', {
        userId: user.id,
        immediately: body.immediately || false,
      });

      return updatedSubscription;
    } catch (error) {
      console.error('❌ [SUBSCRIPTION] Cancellation failed:', {
        userId: user.id,
        error: error.message,
      });
      throw error;
    }
  }
}
