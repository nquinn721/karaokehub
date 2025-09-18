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
import { AvatarGender, AvatarRarity } from './user-avatar.entity';

export enum OutfitCategory {
  CASUAL = 'casual',
  FORMAL = 'formal',
  STAGE = 'stage',
  COSTUME = 'costume',
  VINTAGE = 'vintage',
  MODERN = 'modern',
  FANTASY = 'fantasy',
}

export enum OutfitType {
  FULL_OUTFIT = 'full_outfit',
  TOP = 'top',
  BOTTOM = 'bottom',
  DRESS = 'dress',
  SUIT = 'suit',
  JACKET = 'jacket',
}

@Entity('outfits')
export class Outfit {
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
    enum: OutfitCategory,
    default: OutfitCategory.CASUAL,
  })
  category: OutfitCategory;

  @Column({
    type: 'enum',
    enum: OutfitCategory,
    default: OutfitCategory.CASUAL,
  })
  type: OutfitCategory;

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
  styleBonus: number; // Percentage bonus to style score

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  purchasePrice: number;

  @Column({ nullable: true })
  unlockLevel: number;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ type: 'simple-array', nullable: true })
  colors: string[]; // Available color variations

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('user_outfits')
export class UserOutfit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  outfitId: number;

  @Column({ default: false })
  isActive: boolean;

  @Column({ default: false })
  isFavorite: boolean;

  @Column({ length: 20, nullable: true })
  selectedColor: string;

  @CreateDateColumn()
  purchasedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.outfits)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Outfit)
  @JoinColumn({ name: 'outfitId' })
  outfit: Outfit;
}
