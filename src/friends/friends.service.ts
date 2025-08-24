import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { FriendRequest, FriendRequestStatus } from './friend-request.entity';
import { Friendship } from './friendship.entity';

export interface CreateFriendRequestDto {
  recipientId: string;
  message?: string;
}

export interface FriendSearchDto {
  query: string;
  limit?: number;
}

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(FriendRequest)
    private friendRequestRepository: Repository<FriendRequest>,
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
  ) {}

  // Search for users by email or stage name
  async searchUsers(userId: string, searchDto: FriendSearchDto) {
    const { query, limit = 10 } = searchDto;

    if (!query || query.length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }

    // Get current user's friends and pending requests to exclude them from results
    const [friends, sentRequests, receivedRequests] = await Promise.all([
      this.getFriends(userId),
      this.friendRequestRepository.find({
        where: { requesterId: userId, status: FriendRequestStatus.PENDING },
        select: ['recipientId'],
      }),
      this.friendRequestRepository.find({
        where: { recipientId: userId, status: FriendRequestStatus.PENDING },
        select: ['requesterId'],
      }),
    ]);

    const excludeIds = [
      userId, // Exclude self
      ...friends.map((f) => f.id),
      ...sentRequests.map((r) => r.recipientId),
      ...receivedRequests.map((r) => r.requesterId),
    ];

    // Create fuzzy search query with multiple field matching
    const fuzzyQuery = `%${query.toLowerCase()}%`;
    
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere(
        '(LOWER(COALESCE(user.stageName, \'\')) LIKE :query OR ' +
        'LOWER(COALESCE(user.name, \'\')) LIKE :query OR ' +
        'LOWER(COALESCE(user.email, \'\')) LIKE :query OR ' +
        // Add fuzzy matching for partial word matches
        'LOWER(COALESCE(user.stageName, \'\')) LIKE :startQuery OR ' +
        'LOWER(COALESCE(user.name, \'\')) LIKE :startQuery)',
        { 
          query: fuzzyQuery,
          startQuery: `${query.toLowerCase()}%` // Match from start of words
        }
      )
      .select(['user.id', 'user.email', 'user.name', 'user.stageName', 'user.avatar'])
      // Order by relevance: exact matches first, then partial matches
      .orderBy('CASE WHEN LOWER(COALESCE(user.stageName, \'\')) = :exactQuery THEN 0 ' +
               'WHEN LOWER(COALESCE(user.name, \'\')) = :exactQuery THEN 1 ' +
               'WHEN LOWER(COALESCE(user.stageName, \'\')) LIKE :startQuery THEN 2 ' +
               'WHEN LOWER(COALESCE(user.name, \'\')) LIKE :startQuery THEN 3 ' +
               'ELSE 4 END', 'ASC')
      .addOrderBy('user.stageName', 'ASC')
      .limit(limit);

    // Add exact query parameter for ordering
    queryBuilder.setParameter('exactQuery', query.toLowerCase());

    // Only add the excludeIds condition if there are IDs to exclude
    if (excludeIds.length > 0) {
      queryBuilder.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds });
    }

    const users = await queryBuilder.getMany();

    return users;
  }

  // Send friend request
  async sendFriendRequest(requesterId: string, createDto: CreateFriendRequestDto) {
    const { recipientId, message } = createDto;

    if (requesterId === recipientId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if recipient exists
    const recipient = await this.userRepository.findOne({
      where: { id: recipientId, isActive: true },
    });

    if (!recipient) {
      throw new NotFoundException('User not found');
    }

    // Check if friendship already exists
    const existingFriendship = await this.friendshipRepository.findOne({
      where: [
        { userId: requesterId, friendId: recipientId },
        { userId: recipientId, friendId: requesterId },
      ],
    });

    if (existingFriendship) {
      throw new ConflictException('Already friends with this user');
    }

    // Check if request already exists
    const existingRequest = await this.friendRequestRepository.findOne({
      where: [
        { requesterId, recipientId },
        { requesterId: recipientId, recipientId: requesterId },
      ],
    });

    if (existingRequest) {
      if (existingRequest.status === FriendRequestStatus.PENDING) {
        throw new ConflictException('Friend request already exists');
      }
      if (existingRequest.status === FriendRequestStatus.BLOCKED) {
        throw new ConflictException('Cannot send request to this user');
      }
    }

    // Create new friend request
    const friendRequest = this.friendRequestRepository.create({
      requesterId,
      recipientId,
      message,
      status: FriendRequestStatus.PENDING,
    });

    return this.friendRequestRepository.save(friendRequest);
  }

  // Get pending friend requests (received)
  async getPendingFriendRequests(userId: string) {
    return this.friendRequestRepository.find({
      where: { recipientId: userId, status: FriendRequestStatus.PENDING },
      relations: ['requester'],
      order: { createdAt: 'DESC' },
    });
  }

  // Get sent friend requests
  async getSentFriendRequests(userId: string) {
    return this.friendRequestRepository.find({
      where: { requesterId: userId, status: FriendRequestStatus.PENDING },
      relations: ['recipient'],
      order: { createdAt: 'DESC' },
    });
  }

  // Accept friend request
  async acceptFriendRequest(userId: string, requestId: string) {
    const friendRequest = await this.friendRequestRepository.findOne({
      where: { id: requestId, recipientId: userId, status: FriendRequestStatus.PENDING },
    });

    if (!friendRequest) {
      throw new NotFoundException('Friend request not found');
    }

    // Create bidirectional friendship
    const friendships = [
      this.friendshipRepository.create({
        userId: friendRequest.requesterId,
        friendId: friendRequest.recipientId,
      }),
      this.friendshipRepository.create({
        userId: friendRequest.recipientId,
        friendId: friendRequest.requesterId,
      }),
    ];

    // Update request status and create friendships
    await Promise.all([
      this.friendRequestRepository.update(requestId, { status: FriendRequestStatus.ACCEPTED }),
      this.friendshipRepository.save(friendships),
    ]);

    return { success: true, message: 'Friend request accepted' };
  }

  // Decline friend request
  async declineFriendRequest(userId: string, requestId: string) {
    const friendRequest = await this.friendRequestRepository.findOne({
      where: { id: requestId, recipientId: userId, status: FriendRequestStatus.PENDING },
    });

    if (!friendRequest) {
      throw new NotFoundException('Friend request not found');
    }

    await this.friendRequestRepository.update(requestId, { status: FriendRequestStatus.DECLINED });
    return { success: true, message: 'Friend request declined' };
  }

  // Remove friend
  async removeFriend(userId: string, friendId: string) {
    const friendships = await this.friendshipRepository.find({
      where: [
        { userId, friendId },
        { userId: friendId, friendId: userId },
      ],
    });

    if (friendships.length === 0) {
      throw new NotFoundException('Friendship not found');
    }

    await this.friendshipRepository.remove(friendships);
    return { success: true, message: 'Friend removed' };
  }

  // Get user's friends
  async getFriends(userId: string) {
    const friendships = await this.friendshipRepository.find({
      where: { userId },
      relations: ['friend'],
    });

    return friendships.map((friendship) => ({
      id: friendship.friend.id,
      email: friendship.friend.email,
      name: friendship.friend.name,
      stageName: friendship.friend.stageName,
      avatar: friendship.friend.avatar,
      friendedAt: friendship.createdAt,
    }));
  }

  // Get friends count
  async getFriendsCount(userId: string): Promise<number> {
    return this.friendshipRepository.count({ where: { userId } });
  }

  // Get pending requests count
  async getPendingRequestsCount(userId: string): Promise<number> {
    return this.friendRequestRepository.count({
      where: { recipientId: userId, status: FriendRequestStatus.PENDING },
    });
  }

  // Block user (prevents future friend requests)
  async blockUser(userId: string, userToBlockId: string) {
    if (userId === userToBlockId) {
      throw new BadRequestException('Cannot block yourself');
    }

    // Remove existing friendship if any
    const friendships = await this.friendshipRepository.find({
      where: [
        { userId, friendId: userToBlockId },
        { userId: userToBlockId, friendId: userId },
      ],
    });

    if (friendships.length > 0) {
      await this.friendshipRepository.remove(friendships);
    }

    // Update or create blocked request
    const existingRequest = await this.friendRequestRepository.findOne({
      where: [
        { requesterId: userId, recipientId: userToBlockId },
        { requesterId: userToBlockId, recipientId: userId },
      ],
    });

    if (existingRequest) {
      await this.friendRequestRepository.update(existingRequest.id, {
        status: FriendRequestStatus.BLOCKED,
      });
    } else {
      const blockRequest = this.friendRequestRepository.create({
        requesterId: userId,
        recipientId: userToBlockId,
        status: FriendRequestStatus.BLOCKED,
      });
      await this.friendRequestRepository.save(blockRequest);
    }

    return { success: true, message: 'User blocked' };
  }
}
