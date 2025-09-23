import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('coin_packages')
export class CoinPackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ type: 'int' })
  coinAmount: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  priceUSD: number;

  @Column({ type: 'int', default: 0 })
  bonusCoins: number; // Extra coins for larger packages

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  // Redemption and expiry features
  @Column({ name: 'maxRedemptions', type: 'int', nullable: true })
  maxRedemptions: number; // null = unlimited, number = max redemptions allowed

  @Column({ name: 'currentRedemptions', type: 'int', default: 0 })
  currentRedemptions: number; // Track how many times this package has been redeemed

  @Column({ name: 'expiryDate', type: 'timestamp', nullable: true })
  expiryDate: Date; // null = never expires, date = expires at this time

  @Column({ name: 'isLimitedTime', default: false })
  isLimitedTime: boolean; // Flag to indicate this is a limited-time offer

  @Column({ name: 'isOneTimeUse', default: false })
  isOneTimeUse: boolean; // Flag to indicate this is a one-time redemption package

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
