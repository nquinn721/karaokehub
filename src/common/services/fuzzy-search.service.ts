import { Injectable } from '@nestjs/common';
import Fuse from 'fuse.js';

export interface FuzzySearchOptions {
  keys: string[];
  threshold?: number;
  includeScore?: boolean;
  minMatchCharLength?: number;
}

export interface FuzzySearchResult<T> {
  item: T;
  score: number;
  matches?: readonly any[];
}

@Injectable()
export class FuzzySearchService {
  /**
   * Performs fuzzy search on an array of objects
   * @param items Array of items to search through
   * @param searchTerm The search term
   * @param options Fuzzy search configuration
   * @returns Array of matching items with scores
   */
  search<T>(items: T[], searchTerm: string, options: FuzzySearchOptions): FuzzySearchResult<T>[] {
    if (!searchTerm || !items.length) {
      return items.map((item) => ({ item, score: 0 }));
    }

    const fuseOptions = {
      keys: options.keys,
      threshold: options.threshold || 0.6, // 0 = perfect match, 1 = match anything
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: options.minMatchCharLength || 2,
      // Additional options for better fuzzy matching
      findAllMatches: true,
      ignoreLocation: true, // Don't care about position in string
      ignoreFieldNorm: true, // Don't normalize field length
    };

    const fuse = new Fuse(items, fuseOptions);
    const results = fuse.search(searchTerm);

    return results.map((result) => ({
      item: result.item,
      score: result.score || 0,
      matches: result.matches,
    }));
  }

  /**
   * Filters items that match the fuzzy search criteria
   * @param items Array of items to search through
   * @param searchTerm The search term
   * @param options Fuzzy search configuration
   * @returns Array of matching items
   */
  filter<T>(items: T[], searchTerm: string, options: FuzzySearchOptions): T[] {
    const results = this.search(items, searchTerm, options);
    return results.map((result) => result.item);
  }

  /**
   * Creates a SQL LIKE pattern from search term
   * Simple and efficient - no excessive fuzzy matching
   * @param searchTerm The original search term
   * @returns Array of LIKE patterns (much more conservative)
   */
  createSqlPatterns(searchTerm: string): string[] {
    if (!searchTerm || searchTerm.trim().length === 0) return [];

    const cleanTerm = searchTerm.trim().toLowerCase();
    const patterns: string[] = [];

    // Always add the full term
    patterns.push(`%${cleanTerm}%`);

    // Only split into words if there are multiple words
    if (cleanTerm.includes(' ')) {
      const words = cleanTerm.split(/\s+/).filter((word) => word.length >= 2);

      // Add each word individually (only if 2+ characters)
      words.forEach((word) => {
        if (word.length >= 2) {
          patterns.push(`%${word}%`);
        }
      });
    }

    // Remove duplicates and return (should be max 1-4 patterns now)
    return [...new Set(patterns)];
  }
}
