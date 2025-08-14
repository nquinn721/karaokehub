import { Controller, Get, Query } from '@nestjs/common';
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
    // Note: offset is not supported by the searchArtists method yet
    return this.musicService.searchArtists(query, searchLimit);
  }

  @Get('search/combined')
  async searchCombined(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<MusicSearchResult[]> {
    const searchLimit = limit ? parseInt(limit, 10) : 10;
    // Note: offset is not supported by the searchCombined method yet
    return this.musicService.searchCombined(query, searchLimit);
  }

  @Get('rate-limit/stats')
  async getRateLimitStats(): Promise<Record<string, any>> {
    return this.musicService.getRateLimitStats();
  }
}
