import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../entities/user.entity';
import { Microphone } from './microphone.entity';
import { Outfit } from './outfit.entity';
import { Shoes } from './shoes.entity';

@Entity('user_avatars')
export class UserAvatar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  baseAvatarId: string; // Reference to the base avatar image (avatar_1.png, etc.)

  @Column({ nullable: true })
  microphoneId: string;

  @Column({ nullable: true })
  outfitId: string;

  @Column({ nullable: true })
  shoesId: string;

  @Column({ default: true })
  isActive: boolean; // Current active avatar for the user

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Microphone, { nullable: true })
  @JoinColumn({ name: 'microphoneId' })
  microphone: Microphone;

  @ManyToOne(() => Outfit, { nullable: true })
  @JoinColumn({ name: 'outfitId' })
  outfit: Outfit;

  @ManyToOne(() => Shoes, { nullable: true })
  @JoinColumn({ name: 'shoesId' })
  shoes: Shoes;
}
