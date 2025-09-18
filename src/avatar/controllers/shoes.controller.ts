import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateShoesDto } from '../dto/create-shoes.dto';
import { ShoesService } from '../services/shoes.service';

@Controller('shoes')
export class ShoesController {
  constructor(private readonly shoesService: ShoesService) {}

  @Get()
  async findAll() {
    return this.shoesService.findAll();
  }

  @Get('rarity/:rarity')
  async findByRarity(@Param('rarity') rarity: string) {
    return this.shoesService.findByRarity(rarity);
  }

  @Get('unlockable')
  async findUnlockable() {
    return this.shoesService.findUnlockable();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.shoesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createShoesDto: CreateShoesDto) {
    return this.shoesService.create(createShoesDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateData: Partial<CreateShoesDto>) {
    return this.shoesService.update(id, updateData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    return this.shoesService.remove(id);
  }
}
