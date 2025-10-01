import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Fuse from 'fuse.js';
import { Repository } from 'typeorm';
import { DJ } from './dj.entity';

export interface CreateDJDto {
  name: string;
  vendorId: string;
  submittedBy?: string;
}

export interface UpdateDJDto {
  name?: string;
  vendorId?: string;
  isActive?: boolean;
  submittedBy?: string;
}

@Injectable()
export class DJService {
  constructor(
    @InjectRepository(DJ)
    private djRepository: Repository<DJ>,
  ) {}

  async create(createDJDto: CreateDJDto): Promise<DJ> {
    const dj = this.djRepository.create({
      ...createDJDto,
    });
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

  async searchDjs(query: string, limit: number = 10): Promise<DJ[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    // Get all active DJs from database
    const allDjs = await this.djRepository.find({
      where: { isActive: true },
      relations: ['vendor'],
    });

    // Configure Fuse.js for fuzzy searching
    const fuse = new Fuse(allDjs, {
      keys: [
        {
          name: 'name',
          weight: 1.0,
        },
        {
          name: 'vendor.name',
          weight: 0.5,
        },
      ],
      threshold: 0.4, // Lower = more strict matching, higher = more fuzzy
      includeScore: true,
      minMatchCharLength: 2,
    });

    // Perform fuzzy search
    const searchResults = fuse.search(query.trim());

    // Return the DJ objects, limited by the limit parameter
    return searchResults.slice(0, limit).map((result) => result.item);
  }

  async findByName(name: string): Promise<DJ | null> {
    return this.djRepository.findOne({
      where: { name, isActive: true },
      relations: ['vendor'],
    });
  }
}
