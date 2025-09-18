import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateMicrophoneDto } from '../dto/create-microphone.dto';
import { MicrophoneService } from '../services/microphone.service';

@Controller('microphones')
export class MicrophoneController {
  constructor(private readonly microphoneService: MicrophoneService) {}

  @Get()
  async findAll() {
    return this.microphoneService.findAll();
  }

  @Get('rarity/:rarity')
  async findByRarity(@Param('rarity') rarity: string) {
    return this.microphoneService.findByRarity(rarity);
  }

  @Get('unlockable')
  async findUnlockable() {
    return this.microphoneService.findUnlockable();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.microphoneService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createMicrophoneDto: CreateMicrophoneDto) {
    return this.microphoneService.create(createMicrophoneDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateData: Partial<CreateMicrophoneDto>) {
    return this.microphoneService.update(id, updateData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    return this.microphoneService.remove(id);
  }
}
