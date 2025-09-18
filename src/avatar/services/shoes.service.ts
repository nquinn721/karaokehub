import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateShoesDto } from '../dto/create-shoes.dto';
import { Shoes } from '../entities/shoes.entity';

@Injectable()
export class ShoesService {
  constructor(
    @InjectRepository(Shoes)
    private shoesRepository: Repository<Shoes>,
  ) {}

  async findAll(): Promise<Shoes[]> {
    return this.shoesRepository.find({
      where: { isAvailable: true },
      order: { rarity: 'ASC', price: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Shoes> {
    return this.shoesRepository.findOne({ where: { id } });
  }

  async create(createShoesDto: CreateShoesDto): Promise<Shoes> {
    const shoes = this.shoesRepository.create(createShoesDto);
    return this.shoesRepository.save(shoes);
  }

  async update(id: string, updateData: Partial<CreateShoesDto>): Promise<Shoes> {
    await this.shoesRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.shoesRepository.delete(id);
  }

  async findByRarity(rarity: string): Promise<Shoes[]> {
    return this.shoesRepository.find({
      where: { rarity: rarity as any, isAvailable: true },
      order: { price: 'ASC' },
    });
  }

  async findUnlockable(): Promise<Shoes[]> {
    return this.shoesRepository.find({
      where: { isUnlockable: true, isAvailable: true },
      order: { rarity: 'ASC' },
    });
  }
}
