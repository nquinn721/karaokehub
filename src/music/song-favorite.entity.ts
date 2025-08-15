import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../entities/user.entity';
import { Song } from './song.entity';

@Entity('song_favorites')
export class SongFavorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  songId: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relationships
  @ManyToOne(() => User, (user) => user.songFavorites)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Song, (song) => song.favorites)
  @JoinColumn({ name: 'songId' })
  song: Song;
}
