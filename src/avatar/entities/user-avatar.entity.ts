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
  baseAvatarId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  microphoneId?: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  outfitId?: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  shoesId?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, (user) => user.userAvatars, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Avatar, (avatar) => avatar.userAvatars, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'baseAvatarId' })
  baseAvatar: Avatar;

  @ManyToOne(() => Microphone, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'microphoneId' })
  microphone?: Microphone;

  @ManyToOne(() => Outfit, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'outfitId' })
  outfit?: Outfit;

  @ManyToOne(() => Shoes, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'shoesId' })
  shoes?: Shoes;
}
