import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../entities/user.entity';
import { Avatar } from './avatar.entity';

@Entity('user_avatars')
@Index(['userId', 'avatarId'], { unique: true })
export class UserAvatar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
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
