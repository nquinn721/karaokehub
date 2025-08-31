import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { DeduplicationService } from './deduplication.service';

@Controller('admin')
// @UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly deduplicationService: DeduplicationService,
  ) {}

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

  @Get('djs')
  async getDjs(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    return await this.adminService.getDjs(+page, +limit, search);
  }

  @Get('shows')
  async getShows(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    return await this.adminService.getShows(+page, +limit, search);
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

  @Get('vendors')
  async getVendors(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    return await this.adminService.getVendors(+page, +limit, search);
  }

  @Get('parser/status')
  async getParserStatus() {
    return await this.adminService.getParserStatus();
  }

  // Delete Endpoints
  @Delete('venues/:id')
  async deleteVenue(@Param('id') id: string) {
    try {
      return await this.adminService.deleteVenue(id);
    } catch (error) {
      console.error('Controller error in deleteVenue:', error);
      throw error;
    }
  }

  @Delete('shows/:id')
  async deleteShow(@Param('id') id: string) {
    return await this.adminService.deleteShow(id);
  }

  @Delete('djs/:id')
  async deleteDj(@Param('id') id: string) {
    return await this.adminService.deleteDj(id);
  }

  @Delete('vendors/:id')
  async deleteVendor(@Param('id') id: string) {
    try {
      return await this.adminService.deleteVendor(id);
    } catch (error) {
      console.error('Controller error in deleteVendor:', error);
      throw error;
    }
  }

  // Update Endpoints
  @Put('venues/:id')
  async updateVenue(@Param('id') id: string, @Body() updateData: any) {
    return await this.adminService.updateVenue(id, updateData);
  }

  @Put('shows/:id')
  async updateShow(@Param('id') id: string, @Body() updateData: any) {
    return await this.adminService.updateShow(id, updateData);
  }

  @Put('djs/:id')
  async updateDj(@Param('id') id: string, @Body() updateData: any) {
    return await this.adminService.updateDj(id, updateData);
  }

  @Put('vendors/:id')
  async updateVendor(@Param('id') id: string, @Body() updateData: any) {
    return await this.adminService.updateVendor(id, updateData);
  }

  @Get('feedback')
  async getFeedback(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    return await this.adminService.getFeedback(+page, +limit, search);
  }

  @Put('feedback/:id')
  async updateFeedback(@Param('id') id: string, @Body() updateData: any) {
    return await this.adminService.updateFeedback(id, updateData);
  }

  @Delete('feedback/:id')
  async deleteFeedback(@Param('id') id: string) {
    return await this.adminService.deleteFeedback(id);
  }

  @Get('show-reviews')
  async getShowReviews(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    return await this.adminService.getShowReviews(+page, +limit, search);
  }

  @Put('show-reviews/:id')
  async updateShowReview(@Param('id') id: string, @Body() updateData: any) {
    return await this.adminService.updateShowReview(id, updateData);
  }

  @Delete('show-reviews/:id')
  async deleteShowReview(@Param('id') id: string) {
    return await this.adminService.deleteShowReview(id);
  }

  // Get relationships that will be affected by deletion
  @Get('venues/:id/relationships')
  async getVenueRelationships(@Param('id') id: string) {
    return await this.adminService.getVenueRelationships(id);
  }

  @Get('djs/:id/relationships')
  async getDjRelationships(@Param('id') id: string) {
    return await this.adminService.getDjRelationships(id);
  }

  // Deduplication endpoints
  @Post('deduplicate/venues/analyze')
  async analyzeVenueDuplicates() {
    return await this.deduplicationService.deduplicateVenues();
  }

  @Post('deduplicate/shows/analyze')
  async analyzeShowDuplicates() {
    return await this.deduplicationService.deduplicateShows();
  }

  @Post('deduplicate/djs/analyze')
  async analyzeDjDuplicates() {
    return await this.deduplicationService.deduplicateDJs();
  }

  @Post('deduplicate/vendors/analyze')
  async analyzeVendorDuplicates() {
    return await this.deduplicationService.deduplicateVendors();
  }

  @Post('deduplicate/:type/execute')
  async executeDuplicateDeletion(
    @Param('type') type: 'venues' | 'shows' | 'djs' | 'vendors',
    @Body() body: { idsToDelete: string[] },
  ) {
    return await this.deduplicationService.executeDeletion(type, body.idsToDelete);
  }
}
