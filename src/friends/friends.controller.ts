import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFriendRequestDto, FriendSearchDto, FriendsService } from './friends.service';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get('search')
  async searchUsers(@Request() req, @Query() searchDto: FriendSearchDto) {
    return this.friendsService.searchUsers(req.user.id, searchDto);
  }

  @Post('request')
  async sendFriendRequest(@Request() req, @Body() createDto: CreateFriendRequestDto) {
    return this.friendsService.sendFriendRequest(req.user.id, createDto);
  }

  @Get('requests/pending')
  async getPendingFriendRequests(@Request() req) {
    return this.friendsService.getPendingFriendRequests(req.user.id);
  }

  @Get('requests/sent')
  async getSentFriendRequests(@Request() req) {
    return this.friendsService.getSentFriendRequests(req.user.id);
  }

  @Put('requests/:requestId/accept')
  async acceptFriendRequest(@Request() req, @Param('requestId') requestId: string) {
    return this.friendsService.acceptFriendRequest(req.user.id, requestId);
  }

  @Put('requests/:requestId/decline')
  async declineFriendRequest(@Request() req, @Param('requestId') requestId: string) {
    return this.friendsService.declineFriendRequest(req.user.id, requestId);
  }

  @Get()
  async getFriends(@Request() req) {
    return this.friendsService.getFriends(req.user.id);
  }

  @Delete(':friendId')
  async removeFriend(@Request() req, @Param('friendId') friendId: string) {
    return this.friendsService.removeFriend(req.user.id, friendId);
  }

  @Get('stats')
  async getFriendsStats(@Request() req) {
    const [friendsCount, pendingRequestsCount] = await Promise.all([
      this.friendsService.getFriendsCount(req.user.id),
      this.friendsService.getPendingRequestsCount(req.user.id),
    ]);

    return {
      friendsCount,
      pendingRequestsCount,
    };
  }

  @Post(':userId/block')
  async blockUser(@Request() req, @Param('userId') userId: string) {
    return this.friendsService.blockUser(req.user.id, userId);
  }
}
