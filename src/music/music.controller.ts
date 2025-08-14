import { Controller, Get, Query } from '@nestjs/common';
import { ArtistSearchResult, MusicSearchResult } from './music.interface';
import { MusicService } from './music.service';

@Controller('api/music')
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  @Get('search')
  async searchSongs(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<MusicSearchResult[]> {
    const searchLimit = limit ? parseInt(limit, 10) : 10;
    return this.musicService.searchSongs(query, searchLimit);
  }

  @Get('artists/search')
  async searchArtists(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<ArtistSearchResult[]> {
    const searchLimit = limit ? parseInt(limit, 10) : 10;
    return this.musicService.searchArtists(query, searchLimit);
  }

  @Get('search/combined')
  async searchCombined(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<MusicSearchResult[]> {
    const searchLimit = limit ? parseInt(limit, 10) : 10;
    return this.musicService.searchCombined(query, searchLimit);
  }
}
