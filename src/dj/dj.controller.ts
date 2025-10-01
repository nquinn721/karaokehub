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
import { CreateDJDto, DJService, UpdateDJDto } from './dj.service';

@Controller('djs')
@UseGuards(AuthGuard('jwt'))
export class DJController {
  constructor(private readonly djService: DJService) {}

  @Post()
  create(@Body() createDJDto: CreateDJDto) {
    return this.djService.create(createDJDto);
  }

  @Get('search')
  searchDjs(@Query('q') query: string, @Query('limit') limit?: string) {
    const searchLimit = limit ? parseInt(limit, 10) : 10;
    return this.djService.searchDjs(query, searchLimit);
  }

  @Get()
  findAll() {
    return this.djService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.djService.findOne(id);
  }

  @Get('vendor/:vendorId')
  findByVendor(@Param('vendorId') vendorId: string) {
    return this.djService.findByVendor(vendorId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDJDto: UpdateDJDto) {
    return this.djService.update(id, updateDJDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.djService.remove(id);
  }
}
