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

  async findUnapproved(): Promise<UrlToParse[]> {
    return await this.urlToParseRepository.find({
      where: { isApproved: false },
      order: { createdAt: 'ASC' },
    });
  }

  async findApproved(): Promise<UrlToParse[]> {
    return await this.urlToParseRepository.find({
      where: { isApproved: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findUnparsed(): Promise<UrlToParse[]> {
    return await this.urlToParseRepository.find({
      where: { hasBeenParsed: false },
      order: { createdAt: 'ASC' },
    });
  }

  async findApprovedAndUnparsed(): Promise<UrlToParse[]> {
    return await this.urlToParseRepository.find({
      where: { isApproved: true, hasBeenParsed: false },
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

  async approve(id: number): Promise<UrlToParse | null> {
    const urlToParse = await this.findById(id);
    if (!urlToParse) {
      return null;
    }
    urlToParse.isApproved = true;
    return await this.urlToParseRepository.save(urlToParse);
  }

  async unapprove(id: number): Promise<UrlToParse | null> {
    const urlToParse = await this.findById(id);
    if (!urlToParse) {
      return null;
    }
    urlToParse.isApproved = false;
    return await this.urlToParseRepository.save(urlToParse);
  }

  async markAsParsed(id: number): Promise<UrlToParse | null> {
    const urlToParse = await this.findById(id);
    if (!urlToParse) {
      return null;
    }
    urlToParse.hasBeenParsed = true;
    return await this.urlToParseRepository.save(urlToParse);
  }

  async markAsUnparsed(id: number): Promise<UrlToParse | null> {
    const urlToParse = await this.findById(id);
    if (!urlToParse) {
      return null;
    }
    urlToParse.hasBeenParsed = false;
    return await this.urlToParseRepository.save(urlToParse);
  }

  async update(
    id: number,
    updateData: { name?: string; city?: string; state?: string },
  ): Promise<UrlToParse | null> {
    const urlToParse = await this.findById(id);
    if (!urlToParse) {
      return null;
    }

    // Update only provided fields
    if (updateData.name !== undefined) {
      urlToParse.name = updateData.name;
    }
    if (updateData.city !== undefined) {
      urlToParse.city = updateData.city;
    }
    if (updateData.state !== undefined) {
      urlToParse.state = updateData.state;
    }

    return await this.urlToParseRepository.save(urlToParse);
  }
}
