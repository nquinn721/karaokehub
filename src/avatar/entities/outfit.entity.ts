import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OutfitType {
  CASUAL = 'casual',
  FORMAL = 'formal',
  STAGE = 'stage',
  VINTAGE = 'vintage',
  MODERN = 'modern',
  THEMED = 'themed',
  SEASONAL = 'seasonal',
}

export enum OutfitRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

@Entity('outfits')
export class Outfit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: OutfitType,
    default: OutfitType.CASUAL,
  })
  type: OutfitType;

  @Column({
    type: 'enum',
    enum: OutfitRarity,
    default: OutfitRarity.COMMON,
  })
  rarity: OutfitRarity;

  @Column()
  imageUrl: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ default: false })
  isUnlockable: boolean; // Can be unlocked through achievements

  @Column({ nullable: true })
  unlockRequirement: string; // Description of unlock requirement

  @Column({ nullable: true })
  seasonalStart: Date; // For seasonal outfits

  @Column({ nullable: true })
  seasonalEnd: Date; // For seasonal outfits

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
