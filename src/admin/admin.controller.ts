import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { AdminService, VenueVerificationResult } from './admin.service';
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
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'ASC',
  ) {
    return await this.adminService.getUsers(+page, +limit, search, sortBy, sortOrder);
  }

  @Get('venues')
  async getVenues(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'ASC',
  ) {
    return await this.adminService.getVenues(+page, +limit, search, sortBy, sortOrder);
  }

  @Get('djs')
  async getDjs(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'ASC',
  ) {
    return await this.adminService.getDjs(+page, +limit, search, sortBy, sortOrder);
  }

  @Get('shows')
  async getShows(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'ASC',
  ) {
    return await this.adminService.getShows(+page, +limit, search, sortBy, sortOrder);
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

  @Post('deduplicate/shows/cleanup')
  async cleanupShowsSimple() {
    return await this.deduplicationService.cleanupInvalidShowsSimple();
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

  // Venue geo verification endpoint
  @Post('venues/:id/verify-location')
  async verifyVenueLocation(@Param('id') id: string): Promise<VenueVerificationResult> {
    return await this.adminService.verifyVenueLocation(id);
  }

  // Validate all venues with Gemini AI
  @Post('venues/validate-all')
  async validateAllVenues() {
    return await this.adminService.validateAllVenuesWithGemini();
  }

  // Transaction Management Endpoints
  @Get('transactions')
  async getTransactions(
    @Query('page') page = 1,
    @Query('limit') limit = 25,
    @Query('search') search?: string,
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy = 'createdAt',
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    return await this.adminService.getTransactions(
      +page,
      +limit,
      search,
      userId,
      type as any,
      status as any,
      sortBy,
      sortOrder,
    );
  }

  @Get('transactions/statistics')
  async getTransactionStatistics() {
    return await this.adminService.getTransactionStatistics();
  }

  @Get('users/:id/transactions')
  async getUserWithTransactions(@Param('id') userId: string) {
    return await this.adminService.getUserWithTransactions(userId);
  }

  @Get('users/search')
  async searchUsers(@Query('q') searchTerm: string, @Query('all') all?: string) {
    return await this.adminService.searchUsers(searchTerm, all === 'true');
  }

  @Post('users/:id/add-coins')
  async addCoinsToUser(
    @Param('id') userId: string,
    @Body() body: { amount: number; description?: string },
  ) {
    return await this.adminService.addCoinsToUser(userId, body.amount, body.description);
  }

  @Post('users/:id/add-reward')
  async addRewardToUser(
    @Param('id') userId: string,
    @Body() body: { amount: number; description?: string },
  ) {
    return await this.adminService.addRewardToUser(userId, body.amount, body.description);
  }

  @Put('users/:id/coins')
  async updateUserCoins(
    @Param('id') userId: string,
    @Body() body: { coins: number; description?: string },
  ) {
    return await this.adminService.updateUserCoins(userId, body.coins, body.description);
  }

  // Avatar Management
  @Post('users/:id/assign-avatar')
  async assignAvatarToUser(@Param('id') userId: string, @Body() body: { avatarId: string }) {
    return await this.adminService.assignAvatarToUser(userId, body.avatarId);
  }

  @Get('avatars')
  async getAvailableAvatars() {
    return await this.adminService.getAvailableAvatars();
  }
}
