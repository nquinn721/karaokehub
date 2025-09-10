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
import { User } from '../entities/user.entity';
import { FavoriteShow } from '../favorite/favorite.entity';
import { Venue } from '../venue/venue.entity';

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

  @Column('uuid', { nullable: true })
  venueId: string;

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

  @Column({ type: 'text', nullable: true })
  source: string;

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

  @ManyToOne(() => DJ, (dj) => dj.shows)
  @JoinColumn({ name: 'djId' })
  dj: DJ;

  @ManyToOne(() => Venue, (venue) => venue.shows)
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  @OneToMany(() => FavoriteShow, (favoriteShow) => favoriteShow.show)
  favoriteShows: FavoriteShow[];

  // Helper methods for accessing venue data
  getVenueName(): string {
    return this.venue?.name || 'Unknown Venue';
  }

  getVenueAddress(): string {
    return this.venue?.address || '';
  }

  getVenueCity(): string {
    return this.venue?.city || '';
  }

  getVenueState(): string {
    return this.venue?.state || '';
  }

  getVenueZip(): string {
    return this.venue?.zip || '';
  }

  getVenuePhone(): string {
    return this.venue?.phone || '';
  }

  getVenueWebsite(): string {
    return this.venue?.website || '';
  }

  getVenueCoordinates(): { lat: number; lng: number } | null {
    if (this.venue?.lat && this.venue?.lng) {
      return { lat: this.venue.lat, lng: this.venue.lng };
    }
    return null;
  }

  getFullVenueAddress(): string {
    const parts = [
      this.venue?.address,
      this.venue?.city,
      this.venue?.state,
      this.venue?.zip,
    ].filter(Boolean);
    return parts.join(', ');
  }

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
