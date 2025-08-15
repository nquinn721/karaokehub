import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DayOfWeek } from './show.entity';
import { CreateShowDto, ShowService, UpdateShowDto } from './show.service';

@Controller('shows')
// @UseGuards(AuthGuard('jwt')) // Temporarily disabled for debugging
export class ShowController {
  constructor(private readonly showService: ShowService) {}

  @Post()
  create(@Body() createShowDto: CreateShowDto) {
    return this.showService.create(createShowDto);
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
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
    @Query('day') day?: DayOfWeek,
  ) {
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusMiles = radius ? parseFloat(radius) : 20;

    if (isNaN(userLat) || isNaN(userLng)) {
      throw new Error('Invalid latitude or longitude');
    }

    return this.showService.findNearby(userLat, userLng, radiusMiles, day);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.showService.findOne(id);
  }

  @Get('vendor/:vendorId')
  findByVendor(@Param('vendorId') vendorId: string) {
    return this.showService.findByVendor(vendorId);
  }

  @Get('dj/:djId')
  findByDJ(@Param('djId') djId: string) {
    return this.showService.findByDJ(djId);
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
}
