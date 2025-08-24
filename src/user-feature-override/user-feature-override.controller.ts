import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
  CreateFeatureOverrideDto,
  UpdateFeatureOverrideDto,
  UserFeatureOverrideService,
} from './user-feature-override.service';

@Controller('admin/user-feature-overrides')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class UserFeatureOverrideController {
  constructor(private readonly overrideService: UserFeatureOverrideService) {}

  @Post()
  async createOverride(@Body() dto: CreateFeatureOverrideDto) {
    return await this.overrideService.createOverride(dto);
  }

  @Put(':id')
  async updateOverride(@Param('id') id: string, @Body() dto: UpdateFeatureOverrideDto) {
    return await this.overrideService.updateOverride(id, dto);
  }

  @Delete(':id')
  async deleteOverride(@Param('id') id: string) {
    await this.overrideService.deleteOverride(id);
    return { success: true };
  }

  @Get()
  async getAllOverrides(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
  ) {
    return await this.overrideService.getAllOverrides(+page, +limit, search);
  }

  @Get('user/:userId')
  async getUserOverrides(@Param('userId') userId: string) {
    return await this.overrideService.getUserOverrides(userId);
  }

  @Post('cleanup-expired')
  async cleanupExpiredOverrides() {
    await this.overrideService.cleanupExpiredOverrides();
    return { success: true, message: 'Expired overrides cleaned up' };
  }
}
