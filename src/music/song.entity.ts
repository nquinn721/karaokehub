import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SongFavorite } from './song-favorite.entity';

@Entity('songs')
export class Song {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  artist: string;

  @Column({ nullable: true })
  album: string;

  @Column({ nullable: true })
  genre: string;

  @Column({ type: 'int', nullable: true })
  duration: number; // in seconds

  @Column({ nullable: true })
  spotifyId: string;

  @Column({ nullable: true })
  youtubeId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany(() => SongFavorite, (favorite) => favorite.song)
  favorites: SongFavorite[];
}
