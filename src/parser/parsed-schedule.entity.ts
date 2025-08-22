import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Vendor } from '../vendor/vendor.entity';

export enum ParseStatus {
  PENDING = 'pending',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_REVIEW = 'needs_review',
}

@Entity('parsed_schedules')
export class ParsedSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  url: string;

  @Column('json', { nullable: true })
  aiAnalysis: any;

  @Column({
    type: 'enum',
    enum: ParseStatus,
    default: ParseStatus.PENDING,
  })
  status: ParseStatus;

  @Column({ nullable: true })
  rejectionReason?: string;

  @Column({ type: 'text', nullable: true })
  reviewComments?: string;

  @Column('json', { nullable: true })
  parsingLogs?: Array<{
    timestamp: Date;
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
  }>;

  @Column('json', { nullable: true })
  rawData?: any; // TODO: Deprecated - remove after migrating to aiAnalysis

  @Column('uuid', { nullable: true })
  vendorId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Vendor, (vendor) => vendor.parsedSchedules, { nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor?: Vendor;
}
