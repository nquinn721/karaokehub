import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ShoesType {
  SNEAKERS = 'sneakers',
  DRESS = 'dress',
  BOOTS = 'boots',
  SANDALS = 'sandals',
  HEELS = 'heels',
  PLATFORM = 'platform',
  ATHLETIC = 'athletic',
  VINTAGE = 'vintage',
  STAGE = 'stage',
}

export enum ShoesRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

@Entity('shoes')
export class Shoes {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ShoesType,
    default: ShoesType.SNEAKERS,
  })
  type: ShoesType;

  @Column({
    type: 'enum',
    enum: ShoesRarity,
    default: ShoesRarity.COMMON,
  })
  rarity: ShoesRarity;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
