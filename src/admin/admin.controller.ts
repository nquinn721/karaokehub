import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('statistics')
  async getStatistics() {
    return await this.adminService.getStatistics();
  }

  @Get('recent-activity')
  async getRecentActivity() {
    return await this.adminService.getRecentActivity();
  }

  @Get('system-health')
  async getSystemHealth() {
    return await this.adminService.getSystemHealth();
  }

  // Data Tables Endpoints
  @Get('users')
  async getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    return await this.adminService.getUsers(+page, +limit, search);
  }

  @Get('venues')
  async getVenues(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    return await this.adminService.getVenues(+page, +limit, search);
  }

  @Get('shows')
  async getShows(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    return await this.adminService.getShows(+page, +limit, search);
  }

  @Get('djs')
  async getDjs(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    return await this.adminService.getDjs(+page, +limit, search);
  }

  @Get('favorites')
  async getFavorites(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    return await this.adminService.getFavorites(+page, +limit, search);
  }

  @Get('songs')
  async getSongs(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    return await this.adminService.getSongs(+page, +limit, search);
  }

  @Get('parser/status')
  async getParserStatus() {
    return await this.adminService.getParserStatus();
  }
}
