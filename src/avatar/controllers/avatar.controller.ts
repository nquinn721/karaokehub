import { Body, Controller, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UpdateUserAvatarDto } from '../dto/update-user-avatar.dto';
import { AvatarService } from '../services/avatar.service';

@Controller('avatar')
@UseGuards(JwtAuthGuard)
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Get('my-avatar')
  async getMyAvatar(@Request() req) {
    return this.avatarService.getUserAvatar(req.user.id);
  }

  @Put('my-avatar')
  async updateMyAvatarCustomization(@Request() req, @Body() updateDto: UpdateUserAvatarDto) {
    return this.avatarService.updateUserAvatar(req.user.id, updateDto);
  }

  @Get('my-inventory')
  async getMyInventory(@Request() req) {
    return this.avatarService.getUserInventory(req.user.id);
  }

  @Post('add-item/:itemType/:itemId')
  async addItemToInventory(
    @Request() req,
    @Param('itemType') itemType: 'avatar' | 'microphone',
    @Param('itemId') itemId: string,
  ) {
    return this.avatarService.addItemToInventory(req.user.id, itemType, itemId);
  }

  @Get('user/:userId')
  async getUserAvatar(@Param('userId') userId: string) {
    return this.avatarService.getUserAvatar(userId);
  }

  @Get('my-microphones')
  async getMyMicrophones(@Request() req) {
    return this.avatarService.getUserMicrophones(req.user.id);
  }

  @Put('my-microphone/:microphoneId')
  async updateMyMicrophone(@Request() req, @Param('microphoneId') microphoneId: string) {
    return this.avatarService.updateEquippedMicrophone(req.user.id, microphoneId);
  }

  @Get('my-avatars')
  async getMyAvatars(@Request() req) {
    return this.avatarService.getUserAvatars(req.user.id);
  }

  @Put('my-avatar-selection/:avatarId')
  async updateMyAvatarSelection(@Request() req, @Param('avatarId') avatarId: string) {
    return this.avatarService.updateEquippedAvatar(req.user.id, avatarId);
  }

  @Get('available-avatars')
  async getAvailableAvatars(@Request() req) {
    return this.avatarService.getAvailableAvatarsForUser(req.user.id);
  }

  @Get('available-microphones')
  async getAvailableMicrophones(@Request() req) {
    return this.avatarService.getAvailableMicrophonesForUser(req.user.id);
  }
}
