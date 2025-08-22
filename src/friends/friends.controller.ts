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
    return this.friendsService.searchUsers(req.user.userId, searchDto);
  }

  @Post('request')
  async sendFriendRequest(@Request() req, @Body() createDto: CreateFriendRequestDto) {
    return this.friendsService.sendFriendRequest(req.user.userId, createDto);
  }

  @Get('requests/pending')
  async getPendingFriendRequests(@Request() req) {
    return this.friendsService.getPendingFriendRequests(req.user.userId);
  }

  @Get('requests/sent')
  async getSentFriendRequests(@Request() req) {
    return this.friendsService.getSentFriendRequests(req.user.userId);
  }

  @Put('requests/:requestId/accept')
  async acceptFriendRequest(@Request() req, @Param('requestId') requestId: string) {
    return this.friendsService.acceptFriendRequest(req.user.userId, requestId);
  }

  @Put('requests/:requestId/decline')
  async declineFriendRequest(@Request() req, @Param('requestId') requestId: string) {
    return this.friendsService.declineFriendRequest(req.user.userId, requestId);
  }

  @Get()
  async getFriends(@Request() req) {
    return this.friendsService.getFriends(req.user.userId);
  }

  @Delete(':friendId')
  async removeFriend(@Request() req, @Param('friendId') friendId: string) {
    return this.friendsService.removeFriend(req.user.userId, friendId);
  }

  @Get('stats')
  async getFriendsStats(@Request() req) {
    const [friendsCount, pendingRequestsCount] = await Promise.all([
      this.friendsService.getFriendsCount(req.user.userId),
      this.friendsService.getPendingRequestsCount(req.user.userId),
    ]);

    return {
      friendsCount,
      pendingRequestsCount,
    };
  }

  @Post(':userId/block')
  async blockUser(@Request() req, @Param('userId') userId: string) {
    return this.friendsService.blockUser(req.user.userId, userId);
  }
}
