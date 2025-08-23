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

export enum FeatureType {
  SONG_PREVIEWS = 'song_previews',
  SONG_FAVORITES = 'song_favorites',
  SHOW_FAVORITES = 'show_favorites',
  AD_FREE = 'ad_free',
  PREMIUM_ACCESS = 'premium_access',
}

@Entity('user_feature_overrides')
export class UserFeatureOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: FeatureType,
  })
  featureType: FeatureType;

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ type: 'int', nullable: true })
  customLimit: number | null; // For features with limits (e.g., unlimited = null, custom number = value)

  @Column({ type: 'text', nullable: true })
  notes: string | null; // Admin notes about why this override was granted

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null; // Optional expiration date

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
