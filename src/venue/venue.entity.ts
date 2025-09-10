import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../entities/user.entity';
import { Show } from '../show/show.entity';

@Entity('venues')
export class Venue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  zip: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  lng: number;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  instagram: string;

  @Column({ nullable: true })
  facebook: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  isValid: boolean;

  @Column({ default: false })
  isFlagged: boolean;

  @Column({ nullable: true })
  submittedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'submittedBy' })
  submittedByUser: User;

  @OneToMany(() => Show, (show) => show.venue)
  shows: Show[];

  // Computed properties for location display
  get fullAddress(): string {
    const parts = [this.address, this.city, this.state, this.zip].filter(Boolean);
    return parts.join(', ');
  }

  get cityState(): string {
    if (this.city && this.state) {
      return `${this.city}, ${this.state}`;
    }
    return this.city || this.state || '';
  }
}
