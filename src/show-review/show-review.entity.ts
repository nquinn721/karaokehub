import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../entities/user.entity';
import { Show } from '../show/show.entity';

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DECLINED = 'declined',
}

@Entity('show_reviews')
export class ShowReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  showId: string;

  @Column('uuid', { nullable: true })
  submittedByUserId: string;

  @Column({ type: 'text', nullable: true })
  djName: string;

  @Column({ type: 'text', nullable: true })
  vendorName: string;

  @Column({ type: 'text', nullable: true })
  venueName: string;

  @Column({ type: 'text', nullable: true })
  venuePhone: string;

  @Column({ type: 'text', nullable: true })
  venueWebsite: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  comments: string; // User comments about the submission

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
  })
  status: ReviewStatus;

  @Column({ type: 'text', nullable: true })
  adminNotes: string; // Admin notes when reviewing

  @Column('uuid', { nullable: true })
  reviewedByUserId: string; // Admin who reviewed it

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Show, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'showId' })
  show: Show;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'submittedByUserId' })
  submittedByUser: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedByUserId' })
  reviewedByUser: User;
}
