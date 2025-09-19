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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
