import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Avatar } from '../avatar/entities/avatar.entity';
import { Microphone } from '../avatar/entities/microphone.entity';
import { UserAvatar } from '../avatar/entities/user-avatar.entity';
import { UserMicrophone } from '../avatar/entities/user-microphone.entity';
import { FavoriteShow } from '../favorite/favorite.entity';
import { FriendRequest } from '../friends/friend-request.entity';
import { Friendship } from '../friends/friendship.entity';
import { SongFavorite } from '../music/song-favorite.entity';
import { Subscription } from '../subscription/subscription.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true, unique: true })
  stageName: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  provider: string;

  @Column({ nullable: true })
  providerId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isAdmin: boolean;

  // Subscription fields
  @Column({ nullable: true })
  stripeCustomerId: string;

  // Coin system
  @Column({ type: 'int', default: 0 })
  coins: number;

  // Equipped items (can be free or owned)
  @Column({ nullable: true })
  equippedAvatarId: string;

  @Column({ nullable: true })
  equippedMicrophoneId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany(() => UserAvatar, (userAvatar) => userAvatar.user)
  userAvatars: UserAvatar[];

  @OneToMany(() => UserMicrophone, (userMicrophone) => userMicrophone.user)
  userMicrophones: UserMicrophone[];

  // Equipped item relationships
  @ManyToOne(() => Avatar, { nullable: true })
  @JoinColumn({ name: 'equippedAvatarId' })
  equippedAvatar: Avatar;

  @ManyToOne(() => Microphone, { nullable: true })
  @JoinColumn({ name: 'equippedMicrophoneId' })
  equippedMicrophone: Microphone;

  @OneToMany(() => FavoriteShow, (favoriteShow) => favoriteShow.user)
  favoriteShows: FavoriteShow[];

  @OneToMany(() => Subscription, (subscription) => subscription.user)
  subscriptions: Subscription[];

  @OneToMany(() => SongFavorite, (songFavorite) => songFavorite.user)
  songFavorites: SongFavorite[];

  // Friends relationships
  @OneToMany(() => FriendRequest, (friendRequest) => friendRequest.requester)
  sentFriendRequests: FriendRequest[];

  @OneToMany(() => FriendRequest, (friendRequest) => friendRequest.recipient)
  receivedFriendRequests: FriendRequest[];

  @OneToMany(() => Friendship, (friendship) => friendship.user)
  friendships: Friendship[];

  @OneToMany(() => Friendship, (friendship) => friendship.friend)
  friendsOf: Friendship[];
}
