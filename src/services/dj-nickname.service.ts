import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DJ } from '../dj/dj.entity';
import { DJNickname } from '../entities/dj-nickname.entity';

@Injectable()
export class DJNicknameService {
  private readonly logger = new Logger(DJNicknameService.name);

  constructor(
    @InjectRepository(DJNickname)
    private djNicknameRepository: Repository<DJNickname>,
    @InjectRepository(DJ)
    private djRepository: Repository<DJ>,
  ) {}

  /**
   * Find a DJ by any of their nicknames (including real name, stage name, social handles)
   */
  async findDJByNickname(nickname: string): Promise<DJ | null> {
    // Clean the nickname (remove @ symbol, trim whitespace, normalize case)
    const cleanNickname = nickname.replace(/^@/, '').trim();

    // Try exact match first
    const djNickname = await this.djNicknameRepository.findOne({
      where: [
        { nickname: cleanNickname, isActive: true },
        { nickname: `@${cleanNickname}`, isActive: true },
        { nickname: nickname, isActive: true },
      ],
      relations: ['dj'],
    });

    if (djNickname) {
      return djNickname.dj;
    }

    // Try partial/fuzzy matching for common patterns
    const partialMatches = await this.djNicknameRepository
      .createQueryBuilder('nickname')
      .innerJoinAndSelect('nickname.dj', 'dj')
      .where('nickname.isActive = :isActive', { isActive: true })
      .andWhere(
        'LOWER(nickname.nickname) LIKE :pattern OR LOWER(nickname.nickname) LIKE :atPattern',
        {
          pattern: `%${cleanNickname.toLowerCase()}%`,
          atPattern: `%@${cleanNickname.toLowerCase()}%`,
        },
      )
      .getMany();

    // Return the best match (prioritize exact matches over partial)
    if (partialMatches.length > 0) {
      // Find exact case-insensitive match first
      const exactMatch = partialMatches.find(
        (match) =>
          match.nickname.toLowerCase() === cleanNickname.toLowerCase() ||
          match.nickname.toLowerCase() === `@${cleanNickname.toLowerCase()}`,
      );
      if (exactMatch) {
        return exactMatch.dj;
      }
      // Otherwise return first partial match
      return partialMatches[0].dj;
    }

    // Finally, try to match against the main DJ name
    const dj = await this.djRepository
      .createQueryBuilder('dj')
      .where('LOWER(dj.name) LIKE :pattern', {
        pattern: `%${cleanNickname.toLowerCase()}%`,
      })
      .getOne();

    return dj || null;
  }

  /**
   * Add a new nickname for a DJ
   */
  async addNickname(
    djId: string,
    nickname: string,
    type: 'stage_name' | 'alias' | 'social_handle' | 'real_name' = 'alias',
    platform?: string,
  ): Promise<DJNickname> {
    // Check if nickname already exists for this DJ
    const existing = await this.djNicknameRepository.findOne({
      where: { djId, nickname, isActive: true },
    });

    if (existing) {
      return existing;
    }

    const djNickname = this.djNicknameRepository.create({
      djId,
      nickname,
      type,
      platform,
      isActive: true,
    });

    return await this.djNicknameRepository.save(djNickname);
  }

  /**
   * Get all nicknames for a DJ
   */
  async getDJNicknames(djId: string): Promise<DJNickname[]> {
    return await this.djNicknameRepository.find({
      where: { djId, isActive: true },
      order: { type: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * Smart DJ name matching with confidence scoring
   */
  async smartDJMatch(nameFromImage: string): Promise<{
    dj: DJ | null;
    confidence: number;
    matchType: string;
  }> {
    if (!nameFromImage) {
      return { dj: null, confidence: 0, matchType: 'no_input' };
    }

    // Clean the input
    const cleanName = nameFromImage.replace(/^@/, '').trim();

    // Try exact match first (highest confidence)
    let dj = await this.findDJByNickname(cleanName);
    if (dj) {
      return { dj, confidence: 0.95, matchType: 'exact_nickname' };
    }

    // Try variations with common DJ prefixes/suffixes
    const djVariations = [
      `DJ ${cleanName}`,
      `dj ${cleanName}`,
      `KJ ${cleanName}`,
      `kj ${cleanName}`,
      cleanName.replace(/^(dj|kj)\s*/i, ''),
    ];

    for (const variation of djVariations) {
      dj = await this.findDJByNickname(variation);
      if (dj) {
        return { dj, confidence: 0.85, matchType: 'dj_prefix_variation' };
      }
    }

    // Try partial matching on main DJ names
    dj = await this.djRepository
      .createQueryBuilder('dj')
      .where('LOWER(dj.name) LIKE :pattern', {
        pattern: `%${cleanName.toLowerCase()}%`,
      })
      .getOne();

    if (dj) {
      return { dj, confidence: 0.7, matchType: 'partial_main_name' };
    }

    return { dj: null, confidence: 0, matchType: 'no_match' };
  }

  /**
   * Extract DJ names from various text patterns commonly found in social media
   */
  extractDJNames(text: string): string[] {
    const djNames: string[] = [];

    // Pattern 1: @username mentions
    const atMentions = text.match(/@[\w\d_]+/g);
    if (atMentions) {
      djNames.push(...atMentions);
    }

    // Pattern 2: "with DJ/KJ [Name]" or "hosted by [Name]"
    const djPatterns = [
      /(?:with|by|dj|kj|host(?:ed)?\s*by)\s+([a-zA-Z\s\d_@]+?)(?:\s|$|[,.!?])/gi,
      /dj\s*([a-zA-Z\s\d_@]+?)(?:\s|$|[,.!?])/gi,
      /kj\s*([a-zA-Z\s\d_@]+?)(?:\s|$|[,.!?])/gi,
    ];

    for (const pattern of djPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          djNames.push(match[1].trim());
        }
      }
    }

    // Clean and deduplicate
    return [...new Set(djNames.map((name) => name.trim()).filter((name) => name.length > 0))];
  }
}
