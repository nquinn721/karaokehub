import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UrlToParse } from './url-to-parse.entity';

@Injectable()
export class UrlToParseService {
  constructor(
    @InjectRepository(UrlToParse)
    private readonly urlToParseRepository: Repository<UrlToParse>,
  ) {}

  async findAll(): Promise<UrlToParse[]> {
    return await this.urlToParseRepository.find({
      order: { createdAt: 'ASC' },
    });
  }

  async create(url: string): Promise<UrlToParse> {
    const urlToParse = this.urlToParseRepository.create({ url });
    return await this.urlToParseRepository.save(urlToParse);
  }

  async delete(id: number): Promise<void> {
    await this.urlToParseRepository.delete(id);
  }

  async findById(id: number): Promise<UrlToParse | null> {
    return await this.urlToParseRepository.findOne({ where: { id } });
  }

  async exists(url: string): Promise<boolean> {
    const count = await this.urlToParseRepository.count({ where: { url } });
    return count > 0;
  }
}
