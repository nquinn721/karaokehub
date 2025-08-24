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

  // Computed properties
  get readableSource(): string {
    if (!this.source) return 'Unknown';

    const url = this.source.toLowerCase();

    if (url.includes('facebook.com') || url.includes('fbcdn.net') || url.includes('scontent')) {
      return 'Facebook CDN';
    } else if (url.includes('instagram.com') || url.includes('cdninstagram.com')) {
      return 'Instagram';
    } else if (url.includes('twitter.com') || url.includes('t.co')) {
      return 'Twitter/X';
    } else if (url.includes('googleapis.com')) {
      return 'Google APIs';
    } else if (url.includes('cloudinary.com')) {
      return 'Cloudinary';
    } else if (url.includes('amazonaws.com') || url.includes('s3.')) {
      return 'Amazon S3';
    } else if (url.includes('dropbox.com')) {
      return 'Dropbox';
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'YouTube';
    } else if (url.includes('vimeo.com')) {
      return 'Vimeo';
    } else if (url.includes('eventbrite.com')) {
      return 'Eventbrite';
    } else if (url.includes('meetup.com')) {
      return 'Meetup';
    } else if (url.includes('bandsintown.com')) {
      return 'Bandsintown';
    } else if (url.includes('songkick.com')) {
      return 'Songkick';
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      // Extract domain name for unknown URLs
      try {
        const domain = new URL(this.source).hostname.replace('www.', '');
        return domain.charAt(0).toUpperCase() + domain.slice(1);
      } catch {
        return 'Web Source';
      }
    } else {
      return 'Manual Entry';
    }
  }
}
