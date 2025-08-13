import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateFavoriteDto, FavoriteService } from './favorite.service';

@Controller('favorites')
@UseGuards(AuthGuard('jwt'))
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post()
  create(@Body() createFavoriteDto: CreateFavoriteDto, @Req() req: any) {
    return this.favoriteService.create({
      ...createFavoriteDto,
      userId: req.user.id,
    });
  }

  @Get()
  findAll() {
    return this.favoriteService.findAll();
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.favoriteService.findByUser(userId);
  }

  @Get('my')
  findMyFavorites(@Req() req: any) {
    return this.favoriteService.findByUser(req.user.id);
  }

  @Get('show/:showId')
  findByShow(@Param('showId') showId: string) {
    return this.favoriteService.findByShow(showId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.favoriteService.remove(id);
  }

  @Delete('show/:showId')
  removeByShow(@Param('showId') showId: string, @Req() req: any) {
    return this.favoriteService.removeByUserAndShow(req.user.id, showId);
  }
}
