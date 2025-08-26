import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getGeminiModel } from '../config/gemini.config';
import { DJ } from '../dj/dj.entity';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';

export interface DeduplicationResult {
  duplicateGroups: Array<{
    records: Array<{
      id: string;
      name: string;
      [key: string]: any;
    }>;
  }>;
  summary: string;
  totalFound: number;
}

@Injectable()
export class DeduplicationService {
  private readonly logger = new Logger(DeduplicationService.name);
  private genAI: GoogleGenerativeAI;

  constructor(
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    @InjectRepository(DJ)
    private djRepository: Repository<DJ>,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async deduplicateVenues(): Promise<DeduplicationResult> {
    this.logger.log('Starting venue deduplication process...');

    try {
      const venues = await this.vendorRepository.find({
        select: ['id', 'name', 'website', 'description'],
      });

      const prompt = `
        Analyze these venue records for duplicates. Focus on similar names that represent the same business:
        - "Oties" vs "Oties Tavern & Grill" (keep the more descriptive one)
        - Similar addresses or slight name variations
        - Different formatting of the same business name
        
        Venues data:
        ${JSON.stringify(venues, null, 2)}
        
        Return a JSON response with this exact structure:
        {
          "duplicatesFound": number,
          "groupedDuplicates": [
            {
              "keepRecord": {"id": "id_to_keep", "name": "better_name", "reason": "why this is better"},
              "deleteIds": ["id1", "id2", "id3"],
              "deletedNames": ["name1", "name2", "name3"]
            }
          ],
          "summary": "Brief summary of deduplication results"
        }
        
        Only include records that are clearly duplicates. Be conservative - when in doubt, don't mark as duplicate.
      `;

      const model = this.genAI.getGenerativeModel({ model: getGeminiModel('text') });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse Gemini response
      const geminiResult = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));

      // Transform the response to match frontend expectations
      const duplicateGroups = geminiResult.groupedDuplicates.map((group) => ({
        records: [
          group.keepRecord,
          ...group.deleteIds.map((id, index) => {
            const venueToDelete = venues.find((venue) => venue.id === id);
            return {
              id,
              name:
                group.deletedNames?.[index] || (venueToDelete ? venueToDelete.name : `Venue ${id}`),
              _willBeDeleted: true,
            };
          }),
        ],
      }));

      this.logger.log(
        `Venue deduplication completed. Found ${geminiResult.duplicatesFound} duplicates to remove.`,
      );

      return {
        duplicateGroups,
        summary: geminiResult.summary,
        totalFound: geminiResult.duplicatesFound,
      };
    } catch (error) {
      this.logger.error('Error in venue deduplication:', error);
      throw new Error('Failed to deduplicate venues: ' + error.message);
    }
  }

  async deduplicateShows(): Promise<DeduplicationResult> {
    this.logger.log('Starting show deduplication process...');

    try {
      const shows = await this.showRepository.find({
        select: ['id', 'venue', 'address', 'day', 'startTime', 'endTime'],
        where: { isActive: true },
      });

      const prompt = `
        Analyze these show records for duplicates. Shows are duplicates if they have:
        - Same or very similar address
        - Same day of week 
        - Same or very similar start time
        
        Shows data:
        ${JSON.stringify(shows, null, 2)}
        
        Return a JSON response with this exact structure:
        {
          "duplicatesFound": number,
          "groupedDuplicates": [
            {
              "keepRecord": {"id": "id_to_keep", "reason": "why this is the best record"},
              "deleteIds": ["id1", "id2", "id3"],
              "deletedNames": ["show1 description", "show2 description", "show3 description"],
              "duplicateInfo": "brief description of the duplicate group"
            }
          ],
          "summary": "Brief summary of deduplication results"
        }
        
        Only include records that are clearly duplicates based on address + day + time criteria.
      `;

      const model = this.genAI.getGenerativeModel({ model: getGeminiModel('text') });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const geminiResult = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));

      // Transform the response to match frontend expectations
      const duplicateGroups = geminiResult.groupedDuplicates.map((group) => ({
        records: [
          group.keepRecord,
          ...group.deleteIds.map((id, index) => {
            const showToDelete = shows.find((show) => show.id === id);
            return {
              id,
              name:
                group.deletedNames?.[index] ||
                (showToDelete
                  ? `${showToDelete.venue} - ${showToDelete.day} ${showToDelete.startTime}`
                  : `Show ${id}`),
              _willBeDeleted: true,
            };
          }),
        ],
      }));

      this.logger.log(
        `Show deduplication completed. Found ${geminiResult.duplicatesFound} duplicates to remove.`,
      );

      return {
        duplicateGroups,
        summary: geminiResult.summary,
        totalFound: geminiResult.duplicatesFound,
      };
    } catch (error) {
      this.logger.error('Error in show deduplication:', error);
      throw new Error('Failed to deduplicate shows: ' + error.message);
    }
  }

  async deduplicateDJs(): Promise<DeduplicationResult> {
    this.logger.log('Starting DJ deduplication process...');

    try {
      const djs = await this.djRepository.find({
        select: ['id', 'name'],
      });

      const prompt = `
        Analyze these DJ records for duplicates. Look for:
        - Same person with different name formats (e.g., "DJ Mike", "Mike", "Michael")
        - Different nicknames for the same person
        - Typos or variations in spelling
        
        DJ data:
        ${JSON.stringify(djs, null, 2)}
        
        Return a JSON response with this exact structure:
        {
          "duplicatesFound": number,
          "groupedDuplicates": [
            {
              "keepRecord": {"id": "id_to_keep", "name": "better_name", "reason": "why this is better"},
              "deleteIds": ["id1", "id2", "id3"],
              "deletedNames": ["name1", "name2", "name3"]
            }
          ],
          "summary": "Brief summary of deduplication results"
        }
        
        Only include records that are clearly the same person. Be conservative.
      `;

      const model = this.genAI.getGenerativeModel({ model: getGeminiModel('text') });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const geminiResult = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));

      // Transform the response to match frontend expectations
      const duplicateGroups = geminiResult.groupedDuplicates.map((group) => ({
        records: [
          group.keepRecord,
          ...group.deleteIds.map((id, index) => {
            const djToDelete = djs.find((dj) => dj.id === id);
            return {
              id,
              name: group.deletedNames?.[index] || (djToDelete ? djToDelete.name : `DJ ${id}`),
              _willBeDeleted: true,
            };
          }),
        ],
      }));

      this.logger.log(
        `DJ deduplication completed. Found ${geminiResult.duplicatesFound} duplicates to remove.`,
      );

      return {
        duplicateGroups,
        summary: geminiResult.summary,
        totalFound: geminiResult.duplicatesFound,
      };
    } catch (error) {
      this.logger.error('Error in DJ deduplication:', error);
      throw new Error('Failed to deduplicate DJs: ' + error.message);
    }
  }

  async executeDeletion(
    type: 'venues' | 'shows' | 'djs',
    idsToDelete: string[],
  ): Promise<{ deleted: number }> {
    this.logger.log(`Executing deletion of ${idsToDelete.length} ${type} records...`);

    try {
      let deleteResult;

      switch (type) {
        case 'venues':
          deleteResult = await this.vendorRepository.delete(idsToDelete);
          break;
        case 'shows':
          deleteResult = await this.showRepository.delete(idsToDelete);
          break;
        case 'djs':
          deleteResult = await this.djRepository.delete(idsToDelete);
          break;
        default:
          throw new Error(`Unknown type: ${type}`);
      }

      const deletedCount = deleteResult.affected || 0;
      this.logger.log(`Successfully deleted ${deletedCount} ${type} records`);

      return { deleted: deletedCount };
    } catch (error) {
      this.logger.error(`Error deleting ${type} records:`, error);
      throw new Error(`Failed to delete ${type} records: ` + error.message);
    }
  }
}
