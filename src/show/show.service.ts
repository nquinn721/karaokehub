import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DayOfWeek, Show } from './show.entity';

export interface CreateShowDto {
  vendorId: string;
  djId: string;
  address: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface UpdateShowDto {
  vendorId?: string;
  djId?: string;
  address?: string;
  day?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  description?: string;
  isActive?: boolean;
}

@Injectable()
export class ShowService {
  constructor(
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
  ) {}

  async create(createShowDto: CreateShowDto): Promise<Show> {
    const show = this.showRepository.create(createShowDto);
    return await this.showRepository.save(show);
  }

  async findAll(): Promise<Show[]> {
    return await this.showRepository.find({
      where: { isActive: true },
      relations: ['vendor', 'dj', 'favorites'],
    });
  }

  async findOne(id: string): Promise<Show> {
    return await this.showRepository.findOne({
      where: { id, isActive: true },
      relations: ['vendor', 'dj', 'favorites'],
    });
  }

  async findByVendor(vendorId: string): Promise<Show[]> {
    return await this.showRepository.find({
      where: { vendorId, isActive: true },
      relations: ['vendor', 'dj', 'favorites'],
    });
  }

  async findByDJ(djId: string): Promise<Show[]> {
    return await this.showRepository.find({
      where: { djId, isActive: true },
      relations: ['vendor', 'dj', 'favorites'],
    });
  }

  async findByDay(day: DayOfWeek): Promise<Show[]> {
    return await this.showRepository.find({
      where: { day, isActive: true },
      relations: ['vendor', 'dj', 'favorites'],
    });
  }

  async update(id: string, updateShowDto: UpdateShowDto): Promise<Show> {
    await this.showRepository.update(id, updateShowDto);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.showRepository.update(id, { isActive: false });
  }
}
