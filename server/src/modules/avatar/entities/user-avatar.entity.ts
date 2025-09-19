import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../../../src/entities/user.entity';

export enum AvatarRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export enum AvatarGender {
  MALE = 'male',
  FEMALE = 'female',
  UNISEX = 'unisex',
}

@Entity('user_avatars')
export class UserAvatar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 200 })
  description: string;

  @Column({ length: 255 })
  imagePath: string;

  @Column({
    type: 'enum',
    enum: AvatarGender,
    default: AvatarGender.UNISEX,
  })
  gender: AvatarGender;

  @Column({ length: 50 })
  ethnicity: string;

  @Column({
    type: 'enum',
    enum: AvatarRarity,
    default: AvatarRarity.COMMON,
  })
  rarity: AvatarRarity;

  @Column({ default: false })
  isActive: boolean;

  @Column({ default: true })
  isUnlocked: boolean;

  @Column({ nullable: true })
  unlockLevel: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  purchasePrice: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.avatars)
  @JoinColumn({ name: 'userId' })
  user: User;
}
