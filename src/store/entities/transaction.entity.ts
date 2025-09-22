import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Avatar } from '../../avatar/entities/avatar.entity';
import { Microphone } from '../../avatar/entities/microphone.entity';
import { User } from '../../entities/user.entity';
import { CoinPackage } from './coin-package.entity';

export enum TransactionType {
  COIN_PURCHASE = 'coin_purchase',
  MICROPHONE_PURCHASE = 'microphone_purchase',
  AVATAR_PURCHASE = 'avatar_purchase',
  REWARD = 'reward',
  REFUND = 'refund',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'int' })
  coinAmount: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  priceUSD: number;

  @Column({ nullable: true })
  stripePaymentIntentId: string;

  @Column({ nullable: true })
  stripeSessionId: string;

  @Column({ nullable: true })
  coinPackageId: string;

  @Column({ nullable: true })
  microphoneId: string;

  @Column({ nullable: true })
  avatarId: string;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => CoinPackage, { nullable: true })
  @JoinColumn({ name: 'coinPackageId' })
  coinPackage: CoinPackage;

  @ManyToOne(() => Microphone, { nullable: true })
  @JoinColumn({ name: 'microphoneId' })
  microphone: Microphone;

  @ManyToOne(() => Avatar, { nullable: true })
  @JoinColumn({ name: 'avatarId' })
  avatar: Avatar;
}
