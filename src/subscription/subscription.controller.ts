import { Body, Controller, Get, Post, RawBodyRequest, Req, Res, UseGuards } from '@nestjs/common';
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
  async createCheckoutSession(@CurrentUser() user: User, @Body() body: CreateCheckoutSessionDto) {
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

  @Post('create-portal-session')
  @UseGuards(JwtAuthGuard)
  async createPortalSession(@CurrentUser() user: User) {
    const session = await this.subscriptionService.createPortalSession(user.id);
    return { url: session.url };
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async syncSubscription(@CurrentUser() user: User) {
    // Manually sync subscription status from Stripe
    const synced = await this.subscriptionService.syncUserSubscription(user.id);
    return { success: true, subscription: synced };
  }

  @Post('webhook')
  async handleWebhook(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    const signature = req.headers['stripe-signature'] as string;
    let event;

    try {
      event = this.stripeService.constructWebhookEvent(req.rawBody, signature);
    } catch (err) {
      console.log(`Webhook signature verification failed.`, err.message);
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
        },
        {
          id: SubscriptionPlan.AD_FREE,
          name: 'Ad-Free',
          price: 0.99,
          features: ['All free features', 'No advertisements', 'Clean browsing experience'],
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
        },
      ],
    };
  }
}
