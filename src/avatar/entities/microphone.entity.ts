import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MicrophoneType {
  BASIC = 'basic',
  VINTAGE = 'vintage',
  MODERN = 'modern',
  WIRELESS = 'wireless',
  PREMIUM = 'premium',
  GOLDEN = 'golden',
}

export enum MicrophoneRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

@Entity('microphones')
export class Microphone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: MicrophoneType,
    default: MicrophoneType.BASIC,
  })
  type: MicrophoneType;

  @Column({
    type: 'enum',
    enum: MicrophoneRarity,
    default: MicrophoneRarity.COMMON,
  })
  rarity: MicrophoneRarity;

  @Column()
  imageUrl: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number; // USD price for direct purchase

  @Column({ type: 'int', default: 0 })
  coinPrice: number; // Coin price for in-game purchase

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ default: false })
  isFree: boolean;

  @Column({ default: false })
  isUnlockable: boolean; // Can be unlocked through achievements

  @Column({ nullable: true })
  unlockRequirement: string; // Description of unlock requirement

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
