import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DayOfWeek } from './show.entity';
import { CreateShowDto, ShowService, UpdateShowDto } from './show.service';

@Controller('shows')
// @UseGuards(AuthGuard('jwt')) // Temporarily disabled for debugging
export class ShowController {
  constructor(private readonly showService: ShowService) {}

  @Post()
  create(@Body() createShowDto: CreateShowDto) {
    // Mark shows created through the API as user submitted
    const showData = { ...createShowDto, userSubmitted: true };
    return this.showService.create(showData);
  }

  @Get()
  findAll(@Query('day') day?: DayOfWeek) {
    if (day) {
      return this.showService.findByDay(day);
    }
    return this.showService.findAll();
  }

  @Get('nearby')
  findNearby(
    @Query('centerLat') centerLat: string,
    @Query('centerLng') centerLng: string,
    @Query('radius') radius?: string,
    @Query('day') day?: DayOfWeek,
  ) {
    const mapCenterLat = parseFloat(centerLat);
    const mapCenterLng = parseFloat(centerLng);
    const radiusMiles = radius ? parseFloat(radius) : 35; // Default to 35 miles

    if (isNaN(mapCenterLat) || isNaN(mapCenterLng)) {
      throw new Error('Invalid map center latitude or longitude');
    }

    return this.showService.findNearby(mapCenterLat, mapCenterLng, radiusMiles, day);
  }

  @Get('city-summary')
  getCitySummary(@Query('day') day?: DayOfWeek) {
    return this.showService.getCitySummary(day);
  }

  @Get('search')
  search(@Query('query') query: string, @Query('limit') limit?: string) {
    const searchLimit = limit ? parseInt(limit) : 20;
    return this.showService.searchShows(query, searchLimit);
  }

  @Get('vendor/:vendorId')
  findByVendor(@Param('vendorId') vendorId: string) {
    return this.showService.findByVendor(vendorId);
  }

  @Get('dj/:djId')
  findByDJ(@Param('djId') djId: string) {
    return this.showService.findByDJ(djId);
  }

  @Get('venue/:venueName')
  findByVenue(@Param('venueName') venueName: string) {
    console.log('🏢 Venue endpoint hit with venueName:', venueName);
    const decodedVenueName = decodeURIComponent(venueName);
    console.log('🏢 Decoded venue name:', decodedVenueName);
    return this.showService.findByVenue(decodedVenueName);
  }

  @Get('venue-test/:venueName')
  testVenueRoute(@Param('venueName') venueName: string) {
    console.log('🧪 Test venue endpoint hit with:', venueName);
    return {
      message: 'Venue test route working',
      venueName,
      decoded: decodeURIComponent(venueName),
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.showService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateShowDto: UpdateShowDto) {
    return this.showService.update(id, updateShowDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.showService.remove(id);
  }

  @Post('geocode')
  geocodeExistingShows() {
    return this.showService.geocodeExistingShows();
  }

  @Post('re-geocode-invalid')
  reGeocodeInvalidShows() {
    return this.showService.reGeocodeInvalidShows();
  }

  @Patch(':id/mark-invalid')
  markAsInvalid(@Param('id') id: string) {
    return this.showService.markAsInvalid(id);
  }

  @Patch(':id/mark-valid')
  markAsValid(@Param('id') id: string) {
    return this.showService.markAsValid(id);
  }

  @Get('invalid/list')
  getInvalidShows() {
    return this.showService.findInvalidShows();
  }

  @Patch(':id/flag')
  flagShow(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.showService.flagShow(id, body.userId);
  }

  @Patch(':id/unflag')
  unflagShow(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.showService.unflagShow(id, body.userId);
  }
}
