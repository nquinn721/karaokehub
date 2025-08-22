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

  @Get(':id')
  findOne(@Param('id') id: string) {
    // This could find by favorite ID if needed
    return this.favoriteService.findByUserAndShow(id, '');
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.favoriteService.remove(id);
  }

  @Delete('user/:userId/show/:showId')
  removeByUserAndShow(@Param('userId') userId: string, @Param('showId') showId: string) {
    return this.favoriteService.removeByUserAndShow(userId, showId);
  }

  @Delete('my/show/:showId')
  removeMyFavorite(@Param('showId') showId: string, @Req() req: any) {
    return this.favoriteService.removeByUserAndShow(req.user.id, showId);
  }
}
