import { Controller, Get, Param, Query } from '@nestjs/common';
import { ArtistSearchResult, MusicSearchResult } from './music.interface';
import { MusicService } from './music.service';

@Controller('music')
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  @Get('search')
  async searchSongs(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<MusicSearchResult[]> {
    const searchLimit = limit ? parseInt(limit, 10) : 10;
    const searchOffset = offset ? parseInt(offset, 10) : 0;
    return this.musicService.searchSongs(query, searchLimit, searchOffset);
  }

  @Get('artists/search')
  async searchArtists(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ArtistSearchResult[]> {
    const searchLimit = limit ? parseInt(limit, 10) : 10;
    const searchOffset = offset ? parseInt(offset, 10) : 0;
    return this.musicService.searchArtists(query, searchLimit, searchOffset);
  }

  @Get('search/combined')
  async searchCombined(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<MusicSearchResult[]> {
    const searchLimit = limit ? parseInt(limit, 10) : 10;
    const searchOffset = offset ? parseInt(offset, 10) : 0;
    return this.musicService.searchCombined(query, searchLimit);
  }

  @Get('rate-limit/stats')
  async getRateLimitStats(): Promise<Record<string, any>> {
    return this.musicService.getRateLimitStats();
  }

  @Get('debug/config')
  async getDebugConfig(): Promise<Record<string, any>> {
    return {
      nodeEnv: process.env.NODE_ENV,
      musicProvider: 'iTunes',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('category')
  async getCategoryMusic(
    @Query('queries') queries: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('targetCount') targetCount?: string,
  ): Promise<MusicSearchResult[]> {
    const searchLimit = limit ? parseInt(limit, 10) : 15;
    const targetSongCount = targetCount ? parseInt(targetCount, 10) : 50;
    const queryArray = queries.split(',').map((q) => q.trim());
    return this.musicService.getCategoryMusic(queryArray, searchLimit, targetSongCount, category);
  }

  @Get('category/:categoryId')
  async getCategoryMusicById(
    @Param('categoryId') categoryId: string,
    @Query('limit') limit?: string,
    @Query('targetCount') targetCount?: string,
  ): Promise<MusicSearchResult[]> {
    const searchLimit = limit ? parseInt(limit, 10) : 50;
    const targetSongCount = targetCount ? parseInt(targetCount, 10) : 100;
    return this.musicService.getCategoryMusicById(categoryId, searchLimit, targetSongCount);
  }
}
