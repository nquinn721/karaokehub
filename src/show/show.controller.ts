import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DayOfWeek } from './show.entity';
import { CreateShowDto, ShowService, UpdateShowDto } from './show.service';

@Controller('shows')
@UseGuards(AuthGuard('jwt'))
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
}
