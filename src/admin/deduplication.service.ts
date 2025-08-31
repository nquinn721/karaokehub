import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getGeminiModel } from '../config/gemini.config';
import { DJ } from '../dj/dj.entity';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';
import { Venue } from '../venue/venue.entity';

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
    @InjectRepository(Venue)
    private venueRepository: Repository<Venue>,
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    @InjectRepository(DJ)
    private djRepository: Repository<DJ>,
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
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
      const venues = await this.venueRepository.find({
        select: ['id', 'name', 'address', 'city', 'state', 'zip', 'website', 'description'],
      });

      const prompt = `
        Analyze these venue records for duplicates. Look for these patterns:
        
        VENUE NAME SIMILARITIES:
        - "Oties" vs "Oties Tavern & Grill" → Keep the more descriptive one
        - "Joe's Bar" vs "Joe's Sports Bar & Grill" → Keep the more complete name
        - "Main Street Pub" vs "Main St Pub" → Keep "Main Street Pub" (full word)
        - Different formatting/capitalization of the same business
        
        ADDRESS SIMILARITIES:
        - "1234 Main St" vs "1234 Main Street" → Same venue, keep "Main Street" version
        - "123 Oak Ave" vs "123 Oak Avenue" → Same venue, keep "Oak Avenue" version
        - "456 1st St" vs "456 First Street" → Same venue, keep "First Street" version
        - Same address with different suite/unit numbers might be same venue
        
        PREFERENCE RULES:
        1. Keep records with MORE complete information (description, website, full address)
        2. Prefer full words over abbreviations (Street > St, Avenue > Ave, Boulevard > Blvd)
        3. Keep records with proper capitalization and formatting
        4. If two venues have similar addresses but different names, they might be the same business
        
        REJECT THESE AS DUPLICATES:
        - Different businesses at same address (chain locations, shopping centers)
        - Similar names but clearly different locations
        - Venues with clearly different purposes/types
        
        Venues data:
        ${JSON.stringify(venues, null, 2)}
        
        Return a JSON response with this exact structure:
        {
          "duplicatesFound": number,
          "groupedDuplicates": [
            {
              "keepRecord": {"id": "id_to_keep", "name": "better_name", "reason": "why this is better (e.g., 'has full street name and complete info')"},
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
        select: ['id', 'venueId', 'day', 'startTime', 'endTime', 'description'],
        where: { isActive: true },
        relations: ['venue', 'dj'],
      });

      const prompt = `
        Analyze these show records for duplicates. Shows are duplicates if they match these criteria:
        
        DUPLICATE DETECTION RULES:
        1. Same venue (venueId) AND same day of week AND overlapping time slots
        2. Same venue AND same DJ AND same day (even if times differ slightly)
        3. Very similar venue addresses AND same day AND same time
        4. Same description/title AND same day AND same time (even if different venues)
        
        TIME OVERLAP LOGIC:
        - Shows starting within 30 minutes of each other at same venue = likely duplicates
        - "7:00 PM" and "7:30 PM" same day same venue = check if same DJ or similar description
        - "Weekly" vs "Every Tuesday" same venue = likely same show with different frequency descriptions
        
        PREFERENCE RULES:
        1. Keep shows with MORE complete information (description, DJ info, proper venue linkage)
        2. Keep shows with better formatted times ("7:00 PM" > "7pm" > "19:00")
        3. Keep shows with linked venues over unlinked ones
        4. Keep shows with linked DJs over anonymous ones
        5. Prefer shows with clear frequency info ("Weekly", "Every Tuesday")
        
        DON'T MARK AS DUPLICATES:
        - Different days at same venue (Monday vs Tuesday shows)
        - Clearly different time slots (6 PM vs 9 PM) unless same DJ
        - Different show types (Open Mic vs Karaoke vs DJ Night)
        - One-time events vs recurring shows
        
        Shows data:
        ${JSON.stringify(shows, null, 2)}
        
        Return a JSON response with this exact structure:
        {
          "duplicatesFound": number,
          "groupedDuplicates": [
            {
              "keepRecord": {"id": "id_to_keep", "reason": "why this is the best record (e.g., 'has complete venue and DJ info')"},
              "deleteIds": ["id1", "id2", "id3"],
              "deletedNames": ["show1 description", "show2 description", "show3 description"],
              "duplicateInfo": "brief description of the duplicate group"
            }
          ],
          "summary": "Brief summary of deduplication results"
        }
        
        Only include records that are clearly duplicates based on venue + day + time + DJ criteria.
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
                  ? `${showToDelete.venue?.name || 'Unknown Venue'} - ${showToDelete.day} ${showToDelete.startTime}`
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
        select: ['id', 'name', 'vendorId'],
        relations: ['vendor'],
      });

      const prompt = `
        Analyze these DJ records for duplicates. Look for these patterns:
        
        NAME VARIATIONS (Same Person):
        - "DJ Mike", "Mike", "Michael", "Mike the DJ" → Keep the most professional/complete name
        - "Johnny B" vs "Johnny B. Good" vs "John B Good" → Same person, keep full name
        - "KJ Sarah" vs "Sarah" vs "Sarah M" → Keep "KJ Sarah" (shows professional role)
        - Stage names vs real names: "DJ Rockstar" vs "John Smith" → Keep stage name if clear DJ identity
        
        NICKNAME PATTERNS:
        - "Big Mike" vs "Michael Johnson" → Could be same person, check other details
        - "DJ Snake" vs "Thomas Wesley" → Check email/phone/vendor for confirmation
        - Common nicknames: "Bob/Robert", "Mike/Michael", "Dave/David", "Chris/Christopher"
        
        FORMATTING VARIATIONS:
        - "DJ MIKE" vs "Dj Mike" vs "dj mike" → Same person, keep proper capitalization
        - "Mike_DJ" vs "Mike (DJ)" vs "Mike - DJ" → Different formats, same person
        - Email-based: "mike.smith@email.com" vs "Mike Smith" → Likely same person
        
        PREFERENCE RULES:
        1. Keep records with MORE complete information (realName, email, phone, vendor)
        2. Prefer professional stage names over casual nicknames
        3. Keep proper capitalization over all caps or all lowercase
        4. Keep records with vendor associations
        5. Prefer records with contact information
        
        DON'T MARK AS DUPLICATES:
        - Clearly different people with common names ("Mike DJ" in different cities)
        - Different contact information (different emails/phones) unless other evidence
        - DJs from different vendors unless names are identical
        
        DJ data:
        ${JSON.stringify(djs, null, 2)}
        
        Return a JSON response with this exact structure:
        {
          "duplicatesFound": number,
          "groupedDuplicates": [
            {
              "keepRecord": {"id": "id_to_keep", "name": "better_name", "reason": "why this is better (e.g., 'professional name with complete contact info')"},
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

  async deduplicateVendors(): Promise<DeduplicationResult> {
    this.logger.log('Starting vendor deduplication process...');

    try {
      const vendors = await this.vendorRepository.find({
        select: ['id', 'name', 'owner', 'website', 'description', 'instagram', 'facebook'],
      });

      const prompt = `
        Analyze these vendor records for duplicates. Look for these patterns:
        
        BUSINESS NAME VARIATIONS:
        - "ABC Entertainment" vs "ABC Ent" vs "A.B.C. Entertainment" → Same business
        - "Mike's DJ Service" vs "Mike DJ Service" vs "Mikes DJ Services" → Same business
        - "Sound Solutions LLC" vs "Sound Solutions" → Same business, keep the LLC version
        - "DJ Pro" vs "DJ Pro Services" vs "DJ Pro Entertainment" → Keep the most descriptive
        
        OWNER/CONTACT SIMILARITIES:
        - Same owner name but different business names → Likely same person/business
        - Same website URL → Definitely same business
        - Same social media handles → Likely same business
        - Similar phone numbers or contact info → Check other details
        
        WEBSITE/SOCIAL MEDIA MATCHING:
        - Same Instagram handle → Same business
        - Same Facebook page → Same business  
        - Same website domain → Same business
        - Similar usernames across platforms → Likely same business
        
        PREFERENCE RULES:
        1. Keep records with MORE complete information (description, website, social media)
        2. Prefer official business names over casual names ("Johnson Entertainment LLC" > "Mike's DJ")
        3. Keep records with multiple social media links
        4. Prefer records with business descriptions
        5. Keep proper capitalization and formatting
        
        DON'T MARK AS DUPLICATES:
        - Different businesses with similar names in different cities
        - Chain/franchise locations (unless clearly same owner)
        - Generic names without other matching details
        - Different contact information unless names are identical
        
        Vendor data:
        ${JSON.stringify(vendors, null, 2)}
        
        Return a JSON response with this exact structure:
        {
          "duplicatesFound": number,
          "groupedDuplicates": [
            {
              "keepRecord": {"id": "id_to_keep", "name": "better_name", "reason": "why this is better (e.g., 'official business name with complete contact info')"},
              "deleteIds": ["id1", "id2", "id3"],
              "deletedNames": ["name1", "name2", "name3"]
            }
          ],
          "summary": "Brief summary of deduplication results"
        }
        
        Only include records that are clearly the same business. Be conservative.
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
            const vendorToDelete = vendors.find((vendor) => vendor.id === id);
            return {
              id,
              name:
                group.deletedNames?.[index] ||
                (vendorToDelete ? vendorToDelete.name : `Vendor ${id}`),
              _willBeDeleted: true,
            };
          }),
        ],
      }));

      this.logger.log(
        `Vendor deduplication completed. Found ${geminiResult.duplicatesFound} duplicates to remove.`,
      );

      return {
        duplicateGroups,
        summary: geminiResult.summary,
        totalFound: geminiResult.duplicatesFound,
      };
    } catch (error) {
      this.logger.error('Error in vendor deduplication:', error);
      throw new Error('Failed to deduplicate vendors: ' + error.message);
    }
  }

  async executeDeletion(
    type: 'venues' | 'shows' | 'djs' | 'vendors',
    idsToDelete: string[],
  ): Promise<{ deleted: number }> {
    this.logger.log(`Executing deletion of ${idsToDelete.length} ${type} records...`);

    try {
      let deleteResult;

      switch (type) {
        case 'venues':
          deleteResult = await this.venueRepository.delete(idsToDelete);
          break;
        case 'shows':
          deleteResult = await this.showRepository.delete(idsToDelete);
          break;
        case 'djs':
          deleteResult = await this.djRepository.delete(idsToDelete);
          break;
        case 'vendors':
          deleteResult = await this.vendorRepository.delete(idsToDelete);
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
