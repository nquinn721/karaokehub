import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../../../../src/entities/user.entity';
import { AvatarGender, AvatarRarity } from './user-avatar.entity';

export enum ShoeType {
  SNEAKERS = 'sneakers',
  DRESS = 'dress',
  BOOTS = 'boots',
  HEELS = 'heels',
  PLATFORM = 'platform',
  SANDALS = 'sandals',
  PERFORMANCE = 'performance',
  DANCE = 'dance',
  VINTAGE = 'vintage',
}

export enum ShoeStyle {
  CASUAL = 'casual',
  FORMAL = 'formal',
  ATHLETIC = 'athletic',
  STAGE = 'stage',
  DESIGNER = 'designer',
}

@Entity('shoes')
export class Shoe {
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
    enum: ShoeType,
    default: ShoeType.SNEAKERS,
  })
  type: ShoeType;

  @Column({
    type: 'enum',
    enum: ShoeStyle,
    default: ShoeStyle.CASUAL,
  })
  style: ShoeStyle;

  @Column({
    type: 'enum',
    enum: AvatarGender,
    default: AvatarGender.UNISEX,
  })
  gender: AvatarGender;

  @Column({
    type: 'enum',
    enum: AvatarRarity,
    default: AvatarRarity.COMMON,
  })
  rarity: AvatarRarity;

  @Column({ type: 'int', default: 0 })
  comfortBonus: number; // Percentage bonus to performance duration

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  purchasePrice: number;

  @Column({ nullable: true })
  unlockLevel: number;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ type: 'simple-array', nullable: true })
  colors: string[]; // Available color variations

  @Column({ type: 'simple-array', nullable: true })
  sizes: string[]; // Available sizes

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('user_shoes')
export class UserShoe {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  shoeId: number;

  @Column({ default: false })
  isActive: boolean;

  @Column({ default: false })
  isFavorite: boolean;

  @Column({ length: 20, nullable: true })
  selectedColor: string;

  @Column({ length: 10, nullable: true })
  selectedSize: string;

  @CreateDateColumn()
  purchasedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.shoes)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Shoe)
  @JoinColumn({ name: 'shoeId' })
  shoe: Shoe;
}
