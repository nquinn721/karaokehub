import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './vendor.entity';

export interface CreateVendorDto {
  name: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  userSubmitted?: boolean;
}

export interface UpdateVendorDto {
  name?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  isActive?: boolean;
  userSubmitted?: boolean;
}

@Injectable()
export class VendorService {
  constructor(
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
  ) {}

  async create(createVendorDto: CreateVendorDto): Promise<Vendor> {
    const vendor = this.vendorRepository.create({
      ...createVendorDto,
      userSubmitted: createVendorDto.userSubmitted || false,
    });
    return await this.vendorRepository.save(vendor);
  }

  async findAll(): Promise<Vendor[]> {
    return await this.vendorRepository.find({
      where: { isActive: true },
      relations: ['djs'],
    });
  }

  async findOne(id: string): Promise<Vendor> {
    return await this.vendorRepository.findOne({
      where: { id, isActive: true },
      relations: ['djs'],
    });
  }

  async update(id: string, updateVendorDto: UpdateVendorDto): Promise<Vendor> {
    await this.vendorRepository.update(id, updateVendorDto);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.vendorRepository.update(id, { isActive: false });
  }
}
