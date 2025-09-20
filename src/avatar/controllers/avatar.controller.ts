import { Body, Controller, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UpdateUserAvatarDto } from '../dto/update-user-avatar.dto';
import { AvatarService } from '../services/avatar.service';

@Controller('avatar')
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @UseGuards(JwtAuthGuard)
  @Get('my-avatar')
  async getMyAvatar(@Request() req) {
    return this.avatarService.getUserAvatar(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('my-avatar')
  async updateMyAvatarCustomization(@Request() req, @Body() updateDto: UpdateUserAvatarDto) {
    return this.avatarService.updateUserAvatar(req.user.id, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-inventory')
  async getMyInventory(@Request() req) {
    return this.avatarService.getUserInventory(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('add-item/:itemType/:itemId')
  async addItemToInventory(
    @Request() req,
    @Param('itemType') itemType: 'avatar' | 'microphone',
    @Param('itemId') itemId: string,
  ) {
    return this.avatarService.addItemToInventory(req.user.id, itemType, itemId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  async getUserAvatar(@Param('userId') userId: string) {
    return this.avatarService.getUserAvatar(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-microphones')
  async getMyMicrophones(@Request() req) {
    return this.avatarService.getUserMicrophones(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('my-microphone/:microphoneId')
  async updateMyMicrophone(@Request() req, @Param('microphoneId') microphoneId: string) {
    return this.avatarService.updateEquippedMicrophone(req.user.id, microphoneId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-avatars')
  async getMyAvatars(@Request() req) {
    return this.avatarService.getUserAvatars(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('my-avatar-selection/:avatarId')
  async updateMyAvatarSelection(@Request() req, @Param('avatarId') avatarId: string) {
    return this.avatarService.updateEquippedAvatar(req.user.id, avatarId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('available-avatars')
  async getAvailableAvatars(@Request() req) {
    return this.avatarService.getAvailableAvatarsForUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('available-microphones')
  async getAvailableMicrophones(@Request() req) {
    return this.avatarService.getAvailableMicrophonesForUser(req.user.id);
  }

  // Public endpoints for admin store generator (no authentication required)
  @Get('all-avatars')
  async getAllAvatars() {
    return this.avatarService.getAllAvatars();
  }

  @Get('all-outfits')
  async getAllOutfits() {
    return this.avatarService.getAllOutfits();
  }

  @Get('all-shoes')
  async getAllShoes() {
    return this.avatarService.getAllShoes();
  }

  @Get('all-microphones')
  async getAllMicrophones() {
    return this.avatarService.getAllMicrophones();
  }

  @Get('all-accessories')
  async getAllAccessories() {
    return this.avatarService.getAllAccessories();
  }
}
