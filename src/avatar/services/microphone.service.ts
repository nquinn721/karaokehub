import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMicrophoneDto } from '../dto/create-microphone.dto';
import { Microphone } from '../entities/microphone.entity';

@Injectable()
export class MicrophoneService {
  constructor(
    @InjectRepository(Microphone)
    private microphoneRepository: Repository<Microphone>,
  ) {}

  async findAll(): Promise<Microphone[]> {
    return this.microphoneRepository.find({
      where: { isAvailable: true },
      order: { rarity: 'ASC', price: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Microphone> {
    return this.microphoneRepository.findOne({ where: { id } });
  }

  async create(createMicrophoneDto: CreateMicrophoneDto): Promise<Microphone> {
    const microphone = this.microphoneRepository.create(createMicrophoneDto);
    return this.microphoneRepository.save(microphone);
  }

  async update(id: string, updateData: Partial<CreateMicrophoneDto>): Promise<Microphone> {
    await this.microphoneRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.microphoneRepository.delete(id);
  }

  async findByRarity(rarity: string): Promise<Microphone[]> {
    return this.microphoneRepository.find({
      where: { rarity: rarity as any, isAvailable: true },
      order: { price: 'ASC' },
    });
  }

  async findUnlockable(): Promise<Microphone[]> {
    return this.microphoneRepository.find({
      where: { isUnlockable: true, isAvailable: true },
      order: { rarity: 'ASC' },
    });
  }
}
