import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Song } from './song.entity';

export interface CreateSongDto {
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  duration?: number;
  spotifyId?: string;
  youtubeId?: string;
  previewUrl?: string;
  albumArtSmall?: string;
  albumArtMedium?: string;
  albumArtLarge?: string;
}

export interface UpdateSongDto {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  duration?: number;
  spotifyId?: string;
  youtubeId?: string;
  previewUrl?: string;
  albumArtSmall?: string;
  albumArtMedium?: string;
  albumArtLarge?: string;
}

@Injectable()
export class SongService {
  constructor(
    @InjectRepository(Song)
    private readonly songRepository: Repository<Song>,
  ) {}

  async create(createSongDto: CreateSongDto): Promise<Song> {
    const song = this.songRepository.create(createSongDto);
    return await this.songRepository.save(song);
  }

  async findAll(): Promise<Song[]> {
    return await this.songRepository.find({
      relations: ['favorites'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Song> {
    const song = await this.songRepository.findOne({
      where: { id },
      relations: ['favorites'],
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${id} not found`);
    }

    return song;
  }

  async findBySpotifyId(spotifyId: string): Promise<Song | null> {
    return await this.songRepository.findOne({
      where: { spotifyId },
      relations: ['favorites'],
    });
  }

  async findByYoutubeId(youtubeId: string): Promise<Song | null> {
    return await this.songRepository.findOne({
      where: { youtubeId },
      relations: ['favorites'],
    });
  }

  async search(query: string): Promise<Song[]> {
    return await this.songRepository
      .createQueryBuilder('song')
      .where('song.title ILIKE :query OR song.artist ILIKE :query OR song.album ILIKE :query', {
        query: `%${query}%`,
      })
      .orderBy('song.title', 'ASC')
      .limit(50)
      .getMany();
  }

  async update(id: string, updateSongDto: UpdateSongDto): Promise<Song> {
    const song = await this.findById(id);
    Object.assign(song, updateSongDto);
    return await this.songRepository.save(song);
  }

  async remove(id: string): Promise<void> {
    const song = await this.findById(id);
    await this.songRepository.remove(song);
  }
}
