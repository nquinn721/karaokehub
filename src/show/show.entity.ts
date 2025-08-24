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
import { FavoriteShow } from '../favorite/favorite.entity';

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

  @Column('uuid', { nullable: true })
  djId: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  zip: string;

  @Column({ nullable: true })
  venue: string;

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
  description: string;

  @Column({ nullable: true })
  venuePhone: string;

  @Column({ nullable: true })
  venueWebsite: string;

  @Column({ type: 'text', nullable: true })
  source: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  lng: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  isValid: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => DJ, (dj) => dj.shows)
  @JoinColumn({ name: 'djId' })
  dj: DJ;

  @OneToMany(() => FavoriteShow, (favoriteShow) => favoriteShow.show)
  favoriteShows: FavoriteShow[];
}
