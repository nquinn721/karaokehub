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
import { Favorite } from '../../favorite/favorite.entity';
import { KJ } from '../kj/kj.entity';
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
  kjId: string;

  @Column()
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

  @ManyToOne(() => KJ, (kj) => kj.shows)
  @JoinColumn({ name: 'kjId' })
  kj: KJ;

  @OneToMany(() => Favorite, (favorite) => favorite.show)
  favorites: Favorite[];
}
