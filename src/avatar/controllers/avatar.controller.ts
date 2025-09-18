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
  async updateMyAvatar(@Request() req, @Body() updateDto: UpdateUserAvatarDto) {
    return this.avatarService.updateUserAvatar(req.user.id, updateDto);
  }

  @Get('my-inventory')
  async getMyInventory(@Request() req) {
    return this.avatarService.getUserInventory(req.user.id);
  }

  @Post('add-item/:itemType/:itemId')
  async addItemToInventory(
    @Request() req,
    @Param('itemType') itemType: 'microphone' | 'outfit' | 'shoes',
    @Param('itemId') itemId: string,
  ) {
    return this.avatarService.addItemToInventory(req.user.id, itemType, itemId);
  }

  @Get('user/:userId')
  async getUserAvatar(@Param('userId') userId: string) {
    return this.avatarService.getUserAvatar(userId);
  }
}
