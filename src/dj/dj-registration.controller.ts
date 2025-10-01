import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DjRegistrationService, RegisterDjDto } from './dj-registration.service';

@Controller('dj-registration')
@UseGuards(AuthGuard('jwt'))
export class DjRegistrationController {
  constructor(private readonly djRegistrationService: DjRegistrationService) {}

  @Post('register')
  async registerAsDj(@Request() req: any, @Body() registerDjDto: RegisterDjDto) {
    if (!req.user?.id) {
      throw new BadRequestException('User ID not found in request');
    }

    return this.djRegistrationService.registerUserAsDj(req.user.id, registerDjDto);
  }

  @Get('status')
  async getDjStatus(@Request() req: any, @Body() body: any, @Response() res: any) {
    if (!req.user?.id) {
      throw new BadRequestException('User ID not found in request');
    }

    // Set cache control headers to prevent caching of DJ status
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    const status = await this.djRegistrationService.getDjSubscriptionStatus(req.user.id);
    return res.json(status);
  }

  @Delete('cancel')
  async cancelSubscription(@Request() req: any) {
    if (!req.user?.id) {
      throw new BadRequestException('User ID not found in request');
    }

    await this.djRegistrationService.cancelDjSubscription(req.user.id);
    return { message: 'DJ subscription cancelled successfully' };
  }

  @Post('checkout-session')
  async createCheckoutSession(@Request() req: any, @Body() body: { djId: string }) {
    if (!req.user?.id) {
      throw new BadRequestException('User ID not found in request');
    }

    if (!body.djId) {
      throw new BadRequestException('DJ ID is required');
    }

    return this.djRegistrationService.createDjCheckoutSession(req.user.id, body.djId);
  }

  @Post('simulate-success')
  async simulateSuccess(@Request() req: any, @Body() body: { djId: string }) {
    if (!req.user?.id) {
      throw new BadRequestException('User ID not found in request');
    }

    if (!body.djId) {
      throw new BadRequestException('DJ ID is required');
    }

    // For testing: simulate a successful subscription
    const mockSubscriptionId = `sub_test_${Date.now()}`;

    await this.djRegistrationService.simulateSuccessfulSubscription(
      req.user.id,
      body.djId,
      mockSubscriptionId,
    );

    return {
      success: true,
      message: 'DJ subscription activated successfully',
      subscriptionId: mockSubscriptionId,
    };
  }

  @Post('cleanup-expired')
  async cleanupExpiredSubscriptions(@Request() req: any) {
    if (!req.user?.id) {
      throw new BadRequestException('User ID not found in request');
    }

    // Only allow admin users to trigger cleanup
    if (!req.user?.isAdmin) {
      throw new BadRequestException('Admin access required');
    }

    const result = await this.djRegistrationService.cleanupExpiredSubscriptions();

    return {
      success: true,
      message: `Cleaned up ${result.cleanedUp} expired subscriptions`,
      details: result.details,
    };
  }
}
