import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { AvatarRarity } from './user-avatar.entity';

export enum MicrophoneType {
  BASIC = 'basic',
  VINTAGE = 'vintage',
  MODERN = 'modern',
  WIRELESS = 'wireless',
  PREMIUM = 'premium',
  GOLDEN = 'golden',
}

@Entity('microphones')
export class Microphone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 200 })
  description: string;

  @Column({ length: 255 })
  imagePath: string;

  @Column({
    type: 'enum',
    enum: MicrophoneType,
    default: MicrophoneType.BASIC,
  })
  type: MicrophoneType;

  @Column({
    type: 'enum',
    enum: AvatarRarity,
    default: AvatarRarity.COMMON,
  })
  rarity: AvatarRarity;

  @Column({ type: 'int', default: 0 })
  performanceBonus: number; // Percentage bonus to performance score

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  purchasePrice: number;

  @Column({ nullable: true })
  unlockLevel: number;

  @Column({ default: true })
  isAvailable: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('user_microphones')
export class UserMicrophone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  microphoneId: number;

  @Column({ default: false })
  isActive: boolean;

  @Column({ default: false })
  isFavorite: boolean;

  @CreateDateColumn()
  purchasedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.microphones)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Microphone)
  @JoinColumn({ name: 'microphoneId' })
  microphone: Microphone;
}
