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
import { DJ } from '../dj/dj.entity';
import { Favorite } from '../favorite/favorite.entity';
import { Vendor } from '../vendor/vendor.entity';

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

@Entity('shows')
export class Show {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  vendorId: string;

  @Column('uuid', { nullable: true })
  djId: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  venue: string;

  @Column({ type: 'date', nullable: true })
  date: Date;

  @Column({ nullable: true })
  time: string;

  @Column({
    type: 'enum',
    enum: DayOfWeek,
    nullable: true,
  })
  day: DayOfWeek;

  @Column({ type: 'time', nullable: true })
  startTime: string;

  @Column({ type: 'time', nullable: true })
  endTime: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  venuePhone: string;

  @Column({ nullable: true })
  venueWebsite: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  lng: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Vendor, (vendor) => vendor.shows)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @ManyToOne(() => DJ, (dj) => dj.shows)
  @JoinColumn({ name: 'djId' })
  dj: DJ;

  @OneToMany(() => Favorite, (favorite) => favorite.show)
  favorites: Favorite[];
}
