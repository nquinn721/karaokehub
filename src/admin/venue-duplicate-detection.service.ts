/**
 * Venue Duplicate Detection Service
 * Uses Gemini AI to identify and resolve duplicate venues with similar names
 * Handles venue merging and cleanup of related data
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getGeminiModel } from '../config/gemini.config';
import { Show } from '../show/show.entity';
import { Venue } from '../venue/venue.entity';

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
          (total, group) => total + group.duplicates.filter((d) => d.shouldDelete).length,
          0,
        ),
        conflictsRequiringManualReview: duplicateGroups.filter((group) =>
          group.duplicates.every((d) => !d.isCorrectName),
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
${venueList.map((v) => `${v.index}. "${v.name}" - ${v.address}, ${v.city}, ${v.state} [ID: ${v.id}]`).join('\n')}

IDENTIFICATION CRITERIA:
1. **Name Variations**: Look for venues with similar names that could be the same business
   
   EXAMPLES OF CORRECT DUPLICATE DETECTION:
   - "Club 20" vs "O'Connor's Club 20" → KEEP "O'Connor's Club 20" (more complete), DELETE "Club 20"
   - "Joe's Bar" vs "Joe's Bar & Grill" → KEEP "Joe's Bar & Grill" (more complete), DELETE "Joe's Bar"  
   - "The Blue Moon" vs "Blue Moon Bar" → KEEP "Blue Moon Bar" (includes venue type), DELETE "The Blue Moon"
   - "Murphy's" vs "Murphy's Irish Pub" → KEEP "Murphy's Irish Pub" (more descriptive), DELETE "Murphy's"

2. **Address Matching**: Same or very similar street addresses in the same city
   - "123 Main St" vs "123 Main Street" (same address, different format)
   - Missing address info vs complete address (likely same if names are very similar)

3. **Business Research**: For each potential duplicate group, determine which name is more accurate/complete
   - Research the actual business name online using search engines
   - ALWAYS prefer more complete/official names over abbreviated versions
   - Consider local business registration names and official websites

CRITICAL NAME PREFERENCE RULES (FOLLOW THESE EXACTLY):
- **Complete names ALWAYS win over partial names**: "O'Connor's Club 20" beats "Club 20"
- **Official business names beat shortened versions**: "Joe's Bar & Grill" beats "Joe's"
- **Names with possessives/articles are usually more official**: "O'Malley's" beats "O Malley"
- **Longer descriptive names are typically more accurate**: "The Blue Moon Tavern" beats "Blue Moon"
- **When names include establishment type, they're usually more complete**: "Murphy's Pub" beats "Murphy's"

VERIFICATION PROCESS:
1. For each duplicate group, research which name appears on official websites, Google Business listings, etc.
2. The venue with the MOST COMPLETE and OFFICIAL name should be marked as primary
3. All shorter/abbreviated versions should be marked for deletion
4. If unsure which is official, prefer the longer, more descriptive name

IMPORTANT RULES:
- Only group venues that are clearly the same physical business
- When in doubt, DO NOT group venues (false negatives are better than false positives)
- ALWAYS choose the most complete/official name as the primary venue
- Research actual business names before making decisions

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
   * Validate and correct primary venue selection to ensure most complete name is chosen
   */
  private validatePrimaryVenueSelection(group: any, venueList: any[]): any {
    // Get all venues in this group (primary + duplicates)
    const allVenuesInGroup = [group.primaryVenue, ...group.duplicates];
    const venueDetails = allVenuesInGroup.map((v) => {
      const venue = venueList.find((vl) => vl.id === v.id);
      return {
        ...v,
        fullName: venue?.name || v.name,
        nameLength: (venue?.name || v.name).length,
        hasApostrophe: (venue?.name || v.name).includes("'"),
        hasArticles: /^(the|a|an)\s/i.test(venue?.name || v.name),
        hasVenueType: /\b(bar|pub|grill|tavern|lounge|club|restaurant|cafe)\b/i.test(
          venue?.name || v.name,
        ),
      };
    });

    // Score each venue name for completeness (higher score = more complete)
    const scoredVenues = venueDetails.map((v) => ({
      ...v,
      completenessScore: this.calculateNameCompleteness(v.fullName),
    }));

    // Find the venue with the highest completeness score
    const mostCompleteVenue = scoredVenues.reduce((best, current) =>
      current.completenessScore > best.completenessScore ? current : best,
    );

    // If the current primary is not the most complete, correct it
    if (mostCompleteVenue.id !== group.primaryVenue.id) {
      this.logger.warn(
        `🔧 Correcting duplicate detection: AI chose "${group.primaryVenue.name}" (score: ${scoredVenues.find((v) => v.id === group.primaryVenue.id)?.completenessScore}) but "${mostCompleteVenue.fullName}" is more complete (score: ${mostCompleteVenue.completenessScore})`,
      );

      // Reconstruct the group with corrected primary
      const newDuplicates = scoredVenues
        .filter((v) => v.id !== mostCompleteVenue.id)
        .map((v) => ({
          id: v.id,
          name: v.fullName,
          similarity: v.similarity || 0.8,
          reason: `Incomplete name, should be "${mostCompleteVenue.fullName}"`,
        }));

      return {
        primaryVenue: {
          id: mostCompleteVenue.id,
          name: mostCompleteVenue.fullName,
          confidence: group.primaryVenue.confidence || 0.9,
        },
        duplicates: newDuplicates,
      };
    }

    return group; // No correction needed
  }

  /**
   * Calculate name completeness score (higher = more complete)
   */
  private calculateNameCompleteness(name: string): number {
    let score = name.length; // Base score on length

    // Bonus points for completeness indicators
    if (name.includes("'")) score += 10; // Possessive apostrophes usually indicate official names
    if (/\b(bar|pub|grill|tavern|lounge|club|restaurant|cafe|house)\b/i.test(name)) score += 15; // Venue type
    if (/^(the|a|an)\s/i.test(name)) score += 5; // Articles
    if (/\b(and|&)\b/i.test(name)) score += 10; // Conjunctions indicate fuller descriptions
    if (name.includes(',')) score += 5; // Commas often indicate additional info

    // Penalty for obviously abbreviated names
    if (name.length < 8) score -= 5; // Very short names are often abbreviated
    if (!/[aeiou]/i.test(name.slice(-3))) score -= 3; // Names ending in consonant clusters might be abbreviated

    return score;
  }

  /**
   * Convert Gemini response format to our VenueDuplicate format
   * Includes validation to ensure the most complete name is selected as primary
   */
  private convertGeminiResponseToDuplicates(
    geminiResponse: any,
    venueList: any[],
  ): VenueDuplicate[] {
    const duplicateGroups: VenueDuplicate[] = [];

    for (const group of geminiResponse.duplicateGroups || []) {
      // Validate and potentially correct the primary venue selection
      const correctedGroup = this.validatePrimaryVenueSelection(group, venueList);
      const primaryVenue = venueList.find((v) => v.id === correctedGroup.primaryVenue.id);
      if (!primaryVenue) continue;

      const duplicates = group.duplicates.map((dup: any) => {
        const duplicateVenue = venueList.find((v) => v.id === dup.id);
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

    this.logger.log(`Converted ${duplicateGroups.length} duplicate groups from Gemini AI response`);
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
        const primaryVenue = group.duplicates.find((d) => d.isCorrectName);
        const venuesToDelete = group.duplicates.filter((d) => d.shouldDelete);

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
        const deleteIds = venuesToDelete.map((v) => v.id);
        if (deleteIds.length > 0) {
          await this.venueRepository.delete(deleteIds);
          result.deletedVenues += deleteIds.length;
          this.logger.log(`Deleted ${deleteIds.length} duplicate venues for: ${group.name}`);
        }
      }

      this.logger.log(
        `Cleanup completed: ${result.deletedVenues} venues deleted, ${result.mergedShows} shows merged`,
      );
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
    await this.showRepository.update({ venueId: duplicateVenueId }, { venueId: primaryVenueId });

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
