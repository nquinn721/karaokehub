import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KJ } from './kj.entity';

export interface CreateKJDto {
  name: string;
  vendorId: string;
}

export interface UpdateKJDto {
  name?: string;
  vendorId?: string;
  isActive?: boolean;
}

@Injectable()
export class KJService {
  constructor(
    @InjectRepository(KJ)
    private kjRepository: Repository<KJ>,
  ) {}

  async create(createKJDto: CreateKJDto): Promise<KJ> {
    const kj = this.kjRepository.create(createKJDto);
    return await this.kjRepository.save(kj);
  }

  async findAll(): Promise<KJ[]> {
    return await this.kjRepository.find({
      where: { isActive: true },
      relations: ['vendor', 'shows'],
    });
  }

  async findOne(id: string): Promise<KJ> {
    return await this.kjRepository.findOne({
      where: { id, isActive: true },
      relations: ['vendor', 'shows'],
    });
  }

  async findByVendor(vendorId: string): Promise<KJ[]> {
    return await this.kjRepository.find({
      where: { vendorId, isActive: true },
      relations: ['vendor', 'shows'],
    });
  }

  async update(id: string, updateKJDto: UpdateKJDto): Promise<KJ> {
    await this.kjRepository.update(id, updateKJDto);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.kjRepository.update(id, { isActive: false });
  }
}
