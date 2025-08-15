import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSongDto, SongService, UpdateSongDto } from './song.service';

@Controller('songs')
export class SongController {
  constructor(private readonly songService: SongService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createSongDto: CreateSongDto) {
    const song = await this.songService.create(createSongDto);
    return {
      success: true,
      message: 'Song created successfully',
      data: song,
    };
  }

  @Get()
  async findAll(@Query('search') search?: string) {
    let songs;
    if (search) {
      songs = await this.songService.search(search);
    } else {
      songs = await this.songService.findAll();
    }

    return {
      success: true,
      data: songs,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const song = await this.songService.findById(id);
    return {
      success: true,
      data: song,
    };
  }

  @Get('spotify/:spotifyId')
  async findBySpotifyId(@Param('spotifyId') spotifyId: string) {
    const song = await this.songService.findBySpotifyId(spotifyId);
    return {
      success: true,
      data: song,
    };
  }

  @Get('youtube/:youtubeId')
  async findByYoutubeId(@Param('youtubeId') youtubeId: string) {
    const song = await this.songService.findByYoutubeId(youtubeId);
    return {
      success: true,
      data: song,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateSongDto: UpdateSongDto) {
    const song = await this.songService.update(id, updateSongDto);
    return {
      success: true,
      message: 'Song updated successfully',
      data: song,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    await this.songService.remove(id);
    return {
      success: true,
      message: 'Song deleted successfully',
    };
  }
}
