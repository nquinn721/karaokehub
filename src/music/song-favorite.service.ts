import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { SongFavorite } from './song-favorite.entity';
import { Song } from './song.entity';

@Injectable()
export class SongFavoriteService {
  constructor(
    @InjectRepository(SongFavorite)
    private readonly songFavoriteRepository: Repository<SongFavorite>,
    @InjectRepository(Song)
    private readonly songRepository: Repository<Song>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async addFavorite(userId: string, songId: string): Promise<SongFavorite> {
    // Check if user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if song exists
    const song = await this.songRepository.findOne({ where: { id: songId } });
    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    // Check if favorite already exists
    const existingFavorite = await this.songFavoriteRepository.findOne({
      where: { userId, songId },
    });

    if (existingFavorite) {
      throw new ConflictException('Song is already in favorites');
    }

    // Create new favorite
    const favorite = this.songFavoriteRepository.create({
      userId,
      songId,
      user,
      song,
    });

    return await this.songFavoriteRepository.save(favorite);
  }

  async removeFavorite(userId: string, songId: string): Promise<void> {
    const favorite = await this.songFavoriteRepository.findOne({
      where: { userId, songId },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.songFavoriteRepository.remove(favorite);
  }

  async getUserFavorites(userId: string): Promise<SongFavorite[]> {
    return await this.songFavoriteRepository.find({
      where: { userId },
      relations: ['song'],
      order: { createdAt: 'DESC' },
    });
  }

  async getUserFavoriteSongs(userId: string): Promise<Song[]> {
    const favorites = await this.getUserFavorites(userId);
    return favorites.map((favorite) => favorite.song);
  }

  async isFavorite(userId: string, songId: string): Promise<boolean> {
    const favorite = await this.songFavoriteRepository.findOne({
      where: { userId, songId },
    });

    return !!favorite;
  }

  async getSongFavoriteCount(songId: string): Promise<number> {
    return await this.songFavoriteRepository.count({
      where: { songId },
    });
  }

  async getFavoritesWithCounts(
    userId: string,
  ): Promise<Array<{ song: Song; favoriteCount: number }>> {
    const favorites = await this.getUserFavorites(userId);
    const result = [];

    for (const favorite of favorites) {
      const count = await this.getSongFavoriteCount(favorite.songId);
      result.push({
        song: favorite.song,
        favoriteCount: count,
      });
    }

    return result;
  }
}
