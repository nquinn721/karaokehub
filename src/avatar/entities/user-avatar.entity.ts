import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../entities/user.entity';
import { Avatar } from './avatar.entity';
import { Microphone } from './microphone.entity';
import { Outfit } from './outfit.entity';
import { Shoes } from './shoes.entity';

@Entity('user_avatars')
export class UserAvatar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  avatarId: string;

  @CreateDateColumn()
  acquiredAt: Date;

  // Relationships
  @ManyToOne(() => User, (user) => user.userAvatars, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Avatar, (avatar) => avatar.userAvatars, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'avatarId' })
  avatar: Avatar;
}
