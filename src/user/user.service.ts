import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

export interface CreateUserDto {
  email: string;
  name: string;
  password?: string;
  avatar?: string;
  provider?: string;
  providerId?: string;
}

export interface UpdateUserDto {
  name?: string;
  stageName?: string;
  avatar?: string;
  isActive?: boolean;
  isAdmin?: boolean;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      where: { isActive: true },
      relations: ['favorites'],
    });
  }

  async findOne(id: string): Promise<User> {
    return await this.userRepository.findOne({
      where: { id, isActive: true },
      relations: ['favorites', 'favorites.show'],
    });
  }

  async findByEmail(email: string): Promise<User> {
    return await this.userRepository.findOne({
      where: { email, isActive: true },
    });
  }

  async findByProvider(provider: string, providerId: string): Promise<User> {
    return await this.userRepository.findOne({
      where: { provider, providerId, isActive: true },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    await this.userRepository.update(id, updateUserDto);
    return await this.findOne(id);
  }

  async updateAdminStatus(id: string, isAdmin: boolean): Promise<User> {
    await this.userRepository.update(id, { isAdmin });
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.userRepository.update(id, { isActive: false });
  }
}
