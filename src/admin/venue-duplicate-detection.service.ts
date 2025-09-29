/**
 * Venue Duplicate Detection Service
 * Uses Gemini AI to identify and resolve duplicate venues with similar names
 * Handles venue merging and cleanup of related data
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from '../venue/venue.entity';
import { Show } from '../show/show.entity';
import { getGeminiModel } from '../config/gemini.config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

export interface VenueDuplicate {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  confidence: number;
  duplicates: {
    id: string;
    name: string;
    address?: string;
    similarity: number;
    isCorrectName: boolean;
    shouldDelete: boolean;
  }[];
}

export interface DuplicateDetectionResult {
  success: boolean;
  totalVenues: number;
  duplicateGroups: VenueDuplicate[];
  summary: {
    duplicatesFound: number;
    venuesMarkedForDeletion: number;
    conflictsRequiringManualReview: number;
  };
  processingTime: number;
}

export interface VenueCleanupResult {
  success: boolean;
  deletedVenues: number;
  mergedShows: number;
  updatedRelationships: number;
  errors: string[];
}

@Injectable()
export class VenueDuplicateDetectionService {
  private readonly logger = new Logger(VenueDuplicateDetectionService.name);

  constructor(
    @InjectRepository(Venue)
    private venueRepository: Repository<Venue>,
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    private configService: ConfigService,
  ) {}

  /**
   * Detect duplicate venues across the entire database
   */
  async detectAllDuplicates(): Promise<DuplicateDetectionResult> {
    const startTime = Date.now();
    this.logger.log('Starting venue duplicate detection...');

    try {
      // Get all venues with their basic info
      const venues = await this.venueRepository.find({
        select: ['id', 'name', 'address', 'city', 'state', 'zip', 'phone', 'website'],
      });

      this.logger.log(`Analyzing ${venues.length} venues for duplicates...`);

      // Use Gemini to analyze venue similarities
      const duplicateGroups = await this.analyzeVenuesForDuplicates(venues);

      const summary = {
        duplicatesFound: duplicateGroups.length,
        venuesMarkedForDeletion: duplicateGroups.reduce(
          (total, group) => total + group.duplicates.filter(d => d.shouldDelete).length,
          0
        ),
        conflictsRequiringManualReview: duplicateGroups.filter(
          group => group.duplicates.every(d => !d.isCorrectName)
        ).length,
      };

      const processingTime = Date.now() - startTime;

      this.logger.log(`Duplicate detection completed in ${processingTime}ms`);
      this.logger.log(`Found ${summary.duplicatesFound} duplicate groups`);

      return {
        success: true,
        totalVenues: venues.length,
        duplicateGroups,
        summary,
        processingTime,
      };
    } catch (error) {
      this.logger.error('Failed to detect duplicates:', error.stack);
      throw new Error(`Duplicate detection failed: ${error.message}`);
    }
  }

  /**
   * Use Gemini AI to analyze venues and identify duplicates
   */
  private async analyzeVenuesForDuplicates(venues: any[]): Promise<VenueDuplicate[]> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: getGeminiModel('text') });

    // Create venue data for analysis
    const venueList = venues.map((v, index) => ({
      index,
      id: v.id,
      name: v.name,
      address: v.address || 'Unknown',
      city: v.city || 'Unknown',
      state: v.state || 'Unknown',
    }));

    const prompt = `You are an expert at identifying duplicate business venues. Analyze this list of venues and identify groups of venues that represent the same physical location but have different names.

VENUES TO ANALYZE:
${venueList.map(v => `${v.index}. "${v.name}" - ${v.address}, ${v.city}, ${v.state} [ID: ${v.id}]`).join('\n')}

IDENTIFICATION CRITERIA:
1. **Name Variations**: Look for venues with similar names that could be the same business
   - "Club 20" vs "O'Connor's Club 20" (same venue, one has more complete name)
   - "Joe's Bar" vs "Joe's Bar & Grill" (same business, different level of detail)
   - "The Blue Moon" vs "Blue Moon Bar" (same business, different formatting)

2. **Address Matching**: Same or very similar street addresses in the same city
   - "123 Main St" vs "123 Main Street" (same address, different format)
   - Missing address info vs complete address (likely same if names are very similar)

3. **Business Research**: For each potential duplicate group, determine which name is more accurate/complete
   - Research the actual business name online
   - Prefer more complete/official names over abbreviated versions
   - Consider local business registration names

IMPORTANT RULES:
- Only group venues that are clearly the same physical business
- When in doubt, DO NOT group venues (false negatives are better than false positives)
- For each group, identify which venue has the correct/preferred name
- Mark other venues in the group for deletion

Return a JSON response with this structure:

{
  "duplicateGroups": [
    {
      "primaryVenue": {
        "id": "venue_id_to_keep",
        "name": "Correct/preferred name",
        "confidence": 0.8-1.0
      },
      "duplicates": [
        {
          "id": "venue_id_to_delete",
          "name": "Duplicate name",
          "similarity": 0.7-1.0,
          "reason": "Why this is a duplicate and should be deleted"
        }
      ]
    }
  ],
  "reasoning": "Explanation of analysis approach and key decisions"
}

Only include groups where you are confident (>70%) that venues are duplicates.`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      
      // Convert Gemini response to our format
      return this.convertGeminiResponseToDuplicates(parsedData, venueList);
    } catch (error) {
      this.logger.error('Gemini analysis failed:', error.stack);
      throw new Error(`Venue analysis failed: ${error.message}`);
    }
  }

  /**
   * Convert Gemini response format to our VenueDuplicate format
   */
  private convertGeminiResponseToDuplicates(
    geminiResponse: any,
    venueList: any[]
  ): VenueDuplicate[] {
    const duplicateGroups: VenueDuplicate[] = [];

    for (const group of geminiResponse.duplicateGroups || []) {
      const primaryVenue = venueList.find(v => v.id === group.primaryVenue.id);
      if (!primaryVenue) continue;

      const duplicates = group.duplicates.map((dup: any) => {
        const duplicateVenue = venueList.find(v => v.id === dup.id);
        return {
          id: dup.id,
          name: duplicateVenue?.name || dup.name,
          address: duplicateVenue?.address,
          similarity: dup.similarity || 0.8,
          isCorrectName: false, // Only primary venue has correct name
          shouldDelete: true,
        };
      });

      // Add primary venue to duplicates list but mark it as correct
      duplicates.unshift({
        id: primaryVenue.id,
        name: primaryVenue.name,
        address: primaryVenue.address,
        similarity: 1.0,
        isCorrectName: true,
        shouldDelete: false,
      });

      duplicateGroups.push({
        id: primaryVenue.id,
        name: primaryVenue.name,
        address: primaryVenue.address,
        city: primaryVenue.city,
        state: primaryVenue.state,
        confidence: group.primaryVenue.confidence || 0.8,
        duplicates,
      });
    }

    return duplicateGroups;
  }

  /**
   * Clean up duplicate venues by deleting marked venues and transferring their relationships
   */
  async cleanupDuplicateVenues(duplicateGroups: VenueDuplicate[]): Promise<VenueCleanupResult> {
    this.logger.log('Starting venue cleanup process...');

    const result: VenueCleanupResult = {
      success: true,
      deletedVenues: 0,
      mergedShows: 0,
      updatedRelationships: 0,
      errors: [],
    };

    try {
      for (const group of duplicateGroups) {
        const primaryVenue = group.duplicates.find(d => d.isCorrectName);
        const venuesToDelete = group.duplicates.filter(d => d.shouldDelete);

        if (!primaryVenue) {
          result.errors.push(`No primary venue found for group: ${group.name}`);
          continue;
        }

        for (const venueToDelete of venuesToDelete) {
          await this.mergeVenueRelationships(venueToDelete.id, primaryVenue.id);
          result.mergedShows += await this.countVenueShows(venueToDelete.id);
          result.updatedRelationships++;
        }

        // Delete the duplicate venues
        const deleteIds = venuesToDelete.map(v => v.id);
        if (deleteIds.length > 0) {
          await this.venueRepository.delete(deleteIds);
          result.deletedVenues += deleteIds.length;
          this.logger.log(`Deleted ${deleteIds.length} duplicate venues for: ${group.name}`);
        }
      }

      this.logger.log(`Cleanup completed: ${result.deletedVenues} venues deleted, ${result.mergedShows} shows merged`);
      return result;
    } catch (error) {
      this.logger.error('Venue cleanup failed:', error.stack);
      result.success = false;
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Transfer all relationships from duplicate venue to primary venue
   */
  private async mergeVenueRelationships(duplicateVenueId: string, primaryVenueId: string) {
    // Transfer shows to primary venue
    await this.showRepository.update(
      { venueId: duplicateVenueId },
      { venueId: primaryVenueId }
    );

    // TODO: Add other relationship transfers as needed
    // - User favorites
    // - Reviews/ratings
    // - Event history
    // - Analytics data
  }

  /**
   * Count shows for a venue (for reporting)
   */
  private async countVenueShows(venueId: string): Promise<number> {
    return await this.showRepository.count({ where: { venueId } });
  }
}