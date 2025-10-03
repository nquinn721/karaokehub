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
  search<T>(
    items: T[],
    searchTerm: string,
    options: FuzzySearchOptions,
  ): FuzzySearchResult<T>[] {
    if (!searchTerm || !items.length) {
      return items.map(item => ({ item, score: 0 }));
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

    return results.map(result => ({
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
  filter<T>(
    items: T[],
    searchTerm: string,
    options: FuzzySearchOptions,
  ): T[] {
    const results = this.search(items, searchTerm, options);
    return results.map(result => result.item);
  }

  /**
   * Creates a SQL LIKE pattern from fuzzy search results
   * This helps bridge fuzzy search with database queries
   * @param searchTerm The original search term
   * @returns Array of potential LIKE patterns
   */
  createSqlPatterns(searchTerm: string): string[] {
    if (!searchTerm) return [];

    const patterns: string[] = [];
    
    // Original term with wildcards
    patterns.push(`%${searchTerm}%`);
    
    // Split the term and create patterns for each word
    const words = searchTerm.toLowerCase().split(/\s+/).filter(word => word.length > 1);
    
    words.forEach(word => {
      patterns.push(`%${word}%`);
      
      // Create character-level patterns for short words (fuzzy matching)
      if (word.length <= 4) {
        // Add patterns with single character differences
        for (let i = 0; i < word.length; i++) {
          const beforeChar = word.substring(0, i);
          const afterChar = word.substring(i + 1);
          patterns.push(`%${beforeChar}_${afterChar}%`); // Single character wildcard
          patterns.push(`%${beforeChar}%${afterChar}%`); // Skip one character
        }
      }
    });

    // Remove duplicates and return
    return [...new Set(patterns)];
  }
}