import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DJ } from './dj.entity';

export interface CreateDJDto {
  name: string;
  vendorId: string;
}

export interface UpdateDJDto {
  name?: string;
  vendorId?: string;
  isActive?: boolean;
}

@Injectable()
export class DJService {
  constructor(
    @InjectRepository(DJ)
    private djRepository: Repository<DJ>,
  ) {}

  async create(createDJDto: CreateDJDto): Promise<DJ> {
    const dj = this.djRepository.create(createDJDto);
    return await this.djRepository.save(dj);
  }

  async findAll(): Promise<DJ[]> {
    return await this.djRepository.find({
      where: { isActive: true },
      relations: ['vendor', 'shows'],
    });
  }

  async findOne(id: string): Promise<DJ> {
    return await this.djRepository.findOne({
      where: { id, isActive: true },
      relations: ['vendor', 'shows'],
    });
  }

  async findByVendor(vendorId: string): Promise<DJ[]> {
    return await this.djRepository.find({
      where: { vendorId, isActive: true },
      relations: ['vendor', 'shows'],
    });
  }

  async update(id: string, updateDJDto: UpdateDJDto): Promise<DJ> {
    await this.djRepository.update(id, updateDJDto);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.djRepository.update(id, { isActive: false });
  }
}
