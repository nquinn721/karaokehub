import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateKJDto, KJService, UpdateKJDto } from './kj.service';

@Controller('kjs')
@UseGuards(AuthGuard('jwt'))
export class KJController {
  constructor(private readonly kjService: KJService) {}

  @Post()
  create(@Body() createKJDto: CreateKJDto) {
    return this.kjService.create(createKJDto);
  }

  @Get()
  findAll() {
    return this.kjService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.kjService.findOne(id);
  }

  @Get('vendor/:vendorId')
  findByVendor(@Param('vendorId') vendorId: string) {
    return this.kjService.findByVendor(vendorId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateKJDto: UpdateKJDto) {
    return this.kjService.update(id, updateKJDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.kjService.remove(id);
  }
}
