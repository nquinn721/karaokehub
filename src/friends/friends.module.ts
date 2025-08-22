import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { FriendRequest } from './friend-request.entity';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { Friendship } from './friendship.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, FriendRequest, Friendship])],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}
