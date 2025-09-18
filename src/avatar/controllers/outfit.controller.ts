import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateOutfitDto } from '../dto/create-outfit.dto';
import { OutfitService } from '../services/outfit.service';

@Controller('outfits')
export class OutfitController {
  constructor(private readonly outfitService: OutfitService) {}

  @Get()
  async findAll() {
    return this.outfitService.findAll();
  }

  @Get('rarity/:rarity')
  async findByRarity(@Param('rarity') rarity: string) {
    return this.outfitService.findByRarity(rarity);
  }

  @Get('seasonal')
  async findSeasonal() {
    return this.outfitService.findSeasonal();
  }

  @Get('unlockable')
  async findUnlockable() {
    return this.outfitService.findUnlockable();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.outfitService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createOutfitDto: CreateOutfitDto) {
    return this.outfitService.create(createOutfitDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateData: Partial<CreateOutfitDto>) {
    return this.outfitService.update(id, updateData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    return this.outfitService.remove(id);
  }
}
