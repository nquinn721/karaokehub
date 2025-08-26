import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../entities/user.entity';
import { Show } from '../show/show.entity';

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

@Entity('favorite_shows')
export class FavoriteShow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  showId: string;

  @Column({
    type: 'enum',
    enum: DayOfWeek,
    nullable: true,
  })
  day: DayOfWeek;

  @CreateDateColumn()
  createdAt: Date;

  // Relationships
  @ManyToOne(() => User, (user) => user.favoriteShows)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Show, (show) => show.favoriteShows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'showId' })
  show: Show;
}
