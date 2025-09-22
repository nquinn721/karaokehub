import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StoreService } from './store.service';

@Controller('store')
@UseGuards(JwtAuthGuard)
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('coin-packages')
  async getCoinPackages() {
    return this.storeService.getCoinPackages();
  }

  @Get('microphones')
  async getStoreMicrophones() {
    return this.storeService.getStoreMicrophones();
  }

  @Get('my-microphones')
  async getUserMicrophones(@Request() req) {
    return this.storeService.getUserMicrophones(req.user.id);
  }

  @Get('avatars')
  async getStoreAvatars() {
    return this.storeService.getStoreAvatars();
  }

  @Get('my-avatars')
  async getUserAvatars(@Request() req) {
    return this.storeService.getUserAvatars(req.user.id);
  }

  @Get('my-coins')
  async getUserCoins(@Request() req) {
    const coins = await this.storeService.getUserCoins(req.user.id);
    return { coins };
  }

  @Post('purchase-microphone')
  async purchaseMicrophone(@Request() req, @Body() body: { microphoneId: string }) {
    return this.storeService.purchaseMicrophoneWithCoins(req.user.id, body.microphoneId);
  }

  @Post('purchase-avatar')
  async purchaseAvatar(@Request() req, @Body() body: { avatarId: string }) {
    return this.storeService.purchaseAvatarWithCoins(req.user.id, body.avatarId);
  }

  @Post('equip-avatar')
  async equipAvatar(@Request() req, @Body() body: { avatarId: string }) {
    return this.storeService.equipAvatar(req.user.id, body.avatarId);
  }

  @Get('transactions')
  async getUserTransactions(@Request() req) {
    return this.storeService.getUserTransactions(req.user.id);
  }

  @Post('add-coins')
  async addCoins(@Request() req, @Body() body: { amount: number; description?: string }) {
    return this.storeService.addCoinsToUser(req.user.id, body.amount, body.description);
  }

  @Post('purchase-coins')
  async purchaseCoins(@Request() req, @Body() body: { coinPackageId: string }) {
    return this.storeService.createCoinPurchaseSession(req.user.id, body.coinPackageId);
  }

  @Post('purchase-coins/success')
  async purchaseCoinsSuccess(
    @Body() body: { transactionId: string; stripePaymentIntentId?: string },
  ) {
    return this.storeService.processCoinPurchaseSuccess(
      body.transactionId,
      body.stripePaymentIntentId,
    );
  }
}
