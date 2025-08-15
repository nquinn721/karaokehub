import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SongFavoriteService } from './song-favorite.service';
import { SongService } from './song.service';

@Controller('api/song-favorites')
@UseGuards(JwtAuthGuard)
export class SongFavoriteController {
  constructor(
    private readonly songFavoriteService: SongFavoriteService,
    private readonly songService: SongService,
  ) {}

  @Post(':songId')
  @HttpCode(HttpStatus.CREATED)
  async addFavorite(@Request() req, @Param('songId') songId: string) {
    const userId = req.user.id;
    const favorite = await this.songFavoriteService.addFavorite(userId, songId);
    return {
      success: true,
      message: 'Song added to favorites',
      data: favorite,
    };
  }

  @Delete(':songId')
  @HttpCode(HttpStatus.OK)
  async removeFavorite(@Request() req, @Param('songId') songId: string) {
    const userId = req.user.id;
    await this.songFavoriteService.removeFavorite(userId, songId);
    return {
      success: true,
      message: 'Song removed from favorites',
    };
  }

  @Get()
  async getUserFavorites(@Request() req) {
    const userId = req.user.id;
    const favorites = await this.songFavoriteService.getUserFavoriteSongs(userId);
    return {
      success: true,
      data: favorites,
    };
  }

  @Get('with-counts')
  async getUserFavoritesWithCounts(@Request() req) {
    const userId = req.user.id;
    const favorites = await this.songFavoriteService.getFavoritesWithCounts(userId);
    return {
      success: true,
      data: favorites,
    };
  }

  @Get('check/:songId')
  async checkIfFavorite(@Request() req, @Param('songId') songId: string) {
    const userId = req.user.id;
    const isFavorite = await this.songFavoriteService.isFavorite(userId, songId);
    return {
      success: true,
      data: { isFavorite },
    };
  }
}
