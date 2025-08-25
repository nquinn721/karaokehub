import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { SongFavorite } from './song-favorite.entity';
import { Song } from './song.entity';
import { SongService } from './song.service';

@Injectable()
export class SongFavoriteService {
  constructor(
    @InjectRepository(SongFavorite)
    private readonly songFavoriteRepository: Repository<SongFavorite>,
    @InjectRepository(Song)
    private readonly songRepository: Repository<Song>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly songService: SongService,
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

  async addFavoriteWithData(userId: string, songId: string, songData?: any): Promise<SongFavorite> {
    // Check if user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    let song: Song;

    // First try to find song by internal ID
    song = await this.songRepository.findOne({ where: { id: songId } });

    // If still not found, create the song using the provided data
    if (!song && songData) {
      try {
        console.log('Creating new song with data:', songData);

        // Validate required fields
        if (!songData.title || !songData.artist) {
          console.error('Missing required song data:', {
            title: songData.title,
            artist: songData.artist,
          });
          throw new Error('Missing required song title or artist');
        }

        song = await this.songService.create({
          title: songData.title.trim(),
          artist: songData.artist.trim(),
          album: songData.album?.trim() || null,
          genre: songData.genre?.trim() || null,
          duration: songData.duration || null,
          itunesId: songData.itunesId || null,
          youtubeId: songData.youtubeId || null,
          previewUrl: songData.previewUrl || null,
          // Map from both old and new album art structures
          albumArtSmall:
            songData.albumArtSmall || songData.albumArt?.small || songData.imageUrl || null,
          albumArtMedium: songData.albumArtMedium || songData.albumArt?.medium || null,
          albumArtLarge: songData.albumArtLarge || songData.albumArt?.large || null,
        });

        console.log('Created song:', song);
      } catch (error) {
        console.error('Error creating song:', error);
        throw new NotFoundException(
          `Could not create or find song with ID ${songId}: ${error.message}`,
        );
      }
    }

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    // Check if favorite already exists
    const existingFavorite = await this.songFavoriteRepository.findOne({
      where: { userId, songId: song.id },
    });

    if (existingFavorite) {
      throw new ConflictException('Song is already in favorites');
    }

    // Create new favorite
    const favorite = this.songFavoriteRepository.create({
      userId,
      songId: song.id,
      user,
      song,
    });

    return await this.songFavoriteRepository.save(favorite);
  }

  async removeFavorite(userId: string, songId: string): Promise<void> {
    // Find by internal song ID
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

  async addFavoriteWithCategory(
    userId: string,
    songId: string,
    category?: string,
    songData?: any,
  ): Promise<SongFavorite> {
    // Check if user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    let song: Song;

    // First try to find song by internal ID
    song = await this.songRepository.findOne({ where: { id: songId } });

    // If still not found, create the song using the provided data
    if (!song && songData) {
      try {
        console.log('Creating new song with data:', songData);
        song = await this.songService.create({
          title: songData.title.trim(),
          artist: songData.artist.trim(),
          album: songData.album?.trim() || null,
          genre: songData.genre?.trim() || null,
          duration: songData.duration || null,
          itunesId: songData.itunesId || null,
          youtubeId: songData.youtubeId || null,
          previewUrl: songData.previewUrl || null,
          albumArtSmall:
            songData.albumArtSmall || songData.albumArt?.small || songData.imageUrl || null,
          albumArtMedium: songData.albumArtMedium || songData.albumArt?.medium || null,
          albumArtLarge: songData.albumArtLarge || songData.albumArt?.large || null,
        });
      } catch (error) {
        console.error('Error creating song:', error);
        throw new Error('Failed to create song');
      }
    }

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    // Check if favorite already exists for this user, song, and category
    const existingFavorite = await this.songFavoriteRepository.findOne({
      where: { userId, songId: song.id, category },
    });

    if (existingFavorite) {
      throw new ConflictException('Song is already in favorites for this category');
    }

    // Create new favorite with category
    const favorite = this.songFavoriteRepository.create({
      userId,
      songId: song.id,
      category: category || null,
      user,
      song,
    });

    return await this.songFavoriteRepository.save(favorite);
  }

  async getUserFavoritesByCategory(userId: string, category?: string): Promise<SongFavorite[]> {
    const whereCondition: any = { userId };

    if (category) {
      whereCondition.category = category;
    }

    return await this.songFavoriteRepository.find({
      where: whereCondition,
      relations: ['song'],
      order: { createdAt: 'DESC' },
    });
  }

  async removeFavoriteByCategory(userId: string, songId: string, category?: string): Promise<void> {
    const whereCondition: any = { userId, songId };

    if (category) {
      whereCondition.category = category;
    }

    const favorite = await this.songFavoriteRepository.findOne({
      where: whereCondition,
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.songFavoriteRepository.remove(favorite);
  }
}
