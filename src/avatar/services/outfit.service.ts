import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOutfitDto } from '../dto/create-outfit.dto';
import { Outfit } from '../entities/outfit.entity';

@Injectable()
export class OutfitService {
  constructor(
    @InjectRepository(Outfit)
    private outfitRepository: Repository<Outfit>,
  ) {}

  async findAll(): Promise<Outfit[]> {
    return this.outfitRepository.find({
      where: { isAvailable: true },
      order: { rarity: 'ASC', price: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Outfit> {
    return this.outfitRepository.findOne({ where: { id } });
  }

  async create(createOutfitDto: CreateOutfitDto): Promise<Outfit> {
    const outfit = this.outfitRepository.create(createOutfitDto);
    return this.outfitRepository.save(outfit);
  }

  async update(id: string, updateData: Partial<CreateOutfitDto>): Promise<Outfit> {
    await this.outfitRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.outfitRepository.delete(id);
  }

  async findByRarity(rarity: string): Promise<Outfit[]> {
    return this.outfitRepository.find({
      where: { rarity: rarity as any, isAvailable: true },
      order: { price: 'ASC' },
    });
  }

  async findSeasonal(): Promise<Outfit[]> {
    const now = new Date();
    return this.outfitRepository
      .createQueryBuilder('outfit')
      .where('outfit.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('(outfit.seasonalStart IS NULL OR outfit.seasonalStart <= :now)', { now })
      .andWhere('(outfit.seasonalEnd IS NULL OR outfit.seasonalEnd >= :now)', { now })
      .orderBy('outfit.rarity', 'ASC')
      .addOrderBy('outfit.price', 'ASC')
      .getMany();
  }

  async findUnlockable(): Promise<Outfit[]> {
    return this.outfitRepository.find({
      where: { isUnlockable: true, isAvailable: true },
      order: { rarity: 'ASC' },
    });
  }
}
