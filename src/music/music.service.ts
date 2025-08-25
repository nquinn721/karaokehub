import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ArtistSearchResult, MusicSearchResult } from './music.interface';

// Rate limiter for iTunes API
class ApiRateLimiter {
  private lastRequests: Map<string, number> = new Map();
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; isOpen: boolean }> =
    new Map();

  // Rate limits per API (requests per minute)
  private readonly limits = {
    itunes: { delay: 50, maxPerMinute: 300 },
  };

  // Circuit breaker config
  private readonly circuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTime: 300000, // 5 minutes
  };

  async waitForRateLimit(provider: string): Promise<void> {
    if (this.isCircuitOpen(provider)) {
      throw new Error(`Circuit breaker open for ${provider} - too many recent failures`);
    }

    const config = this.limits[provider];
    if (!config) return;

    const now = Date.now();
    const lastRequest = this.lastRequests.get(provider) || 0;
    const timeSinceLastRequest = now - lastRequest;

    // Check minute-based rate limit
    const minuteKey = `${provider}-${Math.floor(now / 60000)}`;
    let requestData = this.requestCounts.get(minuteKey);

    if (!requestData || requestData.resetTime < now) {
      requestData = { count: 0, resetTime: Math.floor(now / 60000) * 60000 + 60000 };
    }

    if (requestData.count >= config.maxPerMinute) {
      const waitTime = requestData.resetTime - now;
      if (waitTime > 0) {
        console.warn(`Rate limit reached for ${provider}, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
      }
      requestData = { count: 0, resetTime: Math.floor(Date.now() / 60000) * 60000 + 60000 };
    }

    // Check delay-based rate limit
    if (timeSinceLastRequest < config.delay) {
      const waitTime = config.delay - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    // Update tracking
    this.lastRequests.set(provider, Date.now());
    requestData.count++;
    this.requestCounts.set(minuteKey, requestData);

    // Cleanup old entries
    this.cleanup();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private cleanup(): void {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    for (const [key, data] of this.requestCounts.entries()) {
      if (data.resetTime < fiveMinutesAgo) {
        this.requestCounts.delete(key);
      }
    }
  }

  private isCircuitOpen(provider: string): boolean {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) return false;

    if (breaker.isOpen) {
      const timeSinceLastFailure = Date.now() - breaker.lastFailure;
      if (timeSinceLastFailure > this.circuitBreakerConfig.recoveryTime) {
        breaker.isOpen = false;
        breaker.failures = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  recordSuccess(provider: string): void {
    const breaker = this.circuitBreakers.get(provider);
    if (breaker) {
      breaker.failures = Math.max(0, breaker.failures - 1);
    }
  }

  recordFailure(provider: string): void {
    let breaker = this.circuitBreakers.get(provider);
    if (!breaker) {
      breaker = { failures: 0, lastFailure: 0, isOpen: false };
      this.circuitBreakers.set(provider, breaker);
    }

    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= this.circuitBreakerConfig.failureThreshold) {
      breaker.isOpen = true;
      console.warn(`Circuit breaker opened for ${provider} after ${breaker.failures} failures`);
    }
  }
}

@Injectable()
export class MusicService {
  private readonly logger = new Logger(MusicService.name);
  private readonly userAgent = 'KaraokeRatingsApp/1.0.0';
  private readonly rateLimiter = new ApiRateLimiter();

  // Helper method to create albumArt object from image arrays
  private createAlbumArtObject(
    images?: any[],
  ): { small?: string; medium?: string; large?: string } | undefined {
    if (!images || !Array.isArray(images) || images.length === 0) {
      return undefined;
    }

    // Images are sorted by size (largest first)
    // Try to map to small (100px), medium (300px), large (600px+)
    const result: { small?: string; medium?: string; large?: string } = {};

    // Find the best image for each size
    for (const image of images) {
      const size = image.width || 0;

      if (size >= 600 && !result.large) {
        result.large = image.url;
      } else if (size >= 300 && size < 600 && !result.medium) {
        result.medium = image.url;
      } else if (size >= 100 && size < 300 && !result.small) {
        result.small = image.url;
      }
    }

    // If we don't have perfect matches, use fallbacks
    if (!result.small && images.length > 0) {
      result.small = images[images.length - 1]?.url; // smallest available
    }
    if (!result.medium && images.length > 1) {
      result.medium = images[Math.floor(images.length / 2)]?.url; // middle size
    }
    if (!result.large && images.length > 0) {
      result.large = images[0]?.url; // largest available
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  // Helper method to create albumArt object from iTunes track data
  private createAlbumArtObjectFromItunes(
    track: any,
  ): { small?: string; medium?: string; large?: string } | undefined {
    if (!track) return undefined;

    const result: { small?: string; medium?: string; large?: string } = {};

    // iTunes provides different sizes: artworkUrl30, artworkUrl60, artworkUrl100, artworkUrl600
    if (track.artworkUrl600) {
      result.large = track.artworkUrl600;
    }
    if (track.artworkUrl100) {
      result.medium = track.artworkUrl100.replace('100x100bb', '300x300bb');
      result.small = track.artworkUrl100;
    } else if (track.artworkUrl60) {
      result.small = track.artworkUrl60;
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  // Normalization & Variants
  private normalizeQuery(q: string): string {
    let s = q.toLowerCase().trim();
    s = s.replace(/\[[^\]]*\]|\([^)]*\)|\{[^}]*\}/g, ' ');
    s = s.replace(/\b(feat\.|ft\.|featuring)\b/g, ' feat ');
    s = s.replace(/[^a-z0-9\s-]/g, ' ');
    s = s.replace(/[\s-]+/g, ' ').trim();
    return s;
  }

  private generateQueryVariants(q: string): string[] {
    const original = q;
    const normalized = this.normalizeQuery(q);

    const variants = new Set<string>();
    variants.add(original);
    if (normalized !== original) {
      variants.add(normalized);
    }

    // Add variant without "feat" content
    const withoutFeat = original.replace(/\bfeat[^a-z]*[^,]*/gi, '').trim();
    if (withoutFeat && withoutFeat !== original) {
      variants.add(withoutFeat);
    }

    return Array.from(variants).slice(0, 3);
  }

  // iTunes API calls
  private async fetchItunes(
    query: string,
    entity: 'song' | 'musicArtist',
    limit: number = 20,
  ): Promise<any> {
    try {
      await this.rateLimiter.waitForRateLimit('itunes');

      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=${entity}&limit=${limit}&media=music`;

      console.log(`Fetching iTunes API: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        console.error(`iTunes API error: ${response.status} - ${response.statusText}`);

        // If iTunes API is down, return a mock response for development
        if (process.env.NODE_ENV === 'development') {
          console.warn('iTunes API unavailable, returning mock data for development');
          return this.getMockItunesResponse(query, entity);
        }

        throw new Error(`iTunes API error: ${response.status}`);
      }

      const data = await response.json();
      this.rateLimiter.recordSuccess('itunes');
      return data;
    } catch (error) {
      this.rateLimiter.recordFailure('itunes');
      console.error('iTunes fetch error:', error);

      // Fallback to mock data in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('iTunes API failed, using mock data for development');
        return this.getMockItunesResponse(query, entity);
      }

      throw error;
    }
  }

  private getMockItunesResponse(query: string, entity: string): any {
    if (entity === 'song') {
      return {
        resultCount: 2,
        results: [
          {
            wrapperType: 'track',
            kind: 'song',
            artistId: 1419227,
            collectionId: 1440888262,
            trackId: 1440888504,
            artistName: 'The Beatles',
            collectionName: '1',
            trackName: `${query} Song 1`,
            collectionCensoredName: '1',
            trackCensoredName: `${query} Song 1`,
            artistViewUrl: 'https://music.apple.com/us/artist/the-beatles/136975',
            collectionViewUrl: 'https://music.apple.com/us/album/1/1440888262',
            trackViewUrl:
              'https://music.apple.com/us/album/all-you-need-is-love/1440888262?i=1440888504',
            previewUrl:
              'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/ec/90/7e/ec907e9c-2e9a-4a49-2cb4-0e8c6f49d9b8/mzaf_1234567890123456789.plus.aac.p.m4a',
            artworkUrl30:
              'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/28/8d/8c/288d8cb2-0ae4-8cdb-57c4-4b85842b22fa/source/30x30bb.jpg',
            artworkUrl60:
              'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/28/8d/8c/288d8cb2-0ae4-8cdb-57c4-4b85842b22fa/source/60x60bb.jpg',
            artworkUrl100:
              'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/28/8d/8c/288d8cb2-0ae4-8cdb-57c4-4b85842b22fa/source/100x100bb.jpg',
            collectionPrice: 12.99,
            trackPrice: 1.29,
            releaseDate: '2000-11-13T12:00:00Z',
            collectionExplicitness: 'notExplicit',
            trackExplicitness: 'notExplicit',
            discCount: 1,
            discNumber: 1,
            trackCount: 27,
            trackNumber: 19,
            trackTimeMillis: 227733,
            country: 'USA',
            currency: 'USD',
            primaryGenreName: 'Rock',
            isStreamable: true,
          },
          {
            wrapperType: 'track',
            kind: 'song',
            artistId: 2715720,
            collectionId: 1440888263,
            trackId: 1440888505,
            artistName: 'Ed Sheeran',
            collectionName: '÷ (Deluxe)',
            trackName: `${query} Song 2`,
            collectionCensoredName: '÷ (Deluxe)',
            trackCensoredName: `${query} Song 2`,
            artistViewUrl: 'https://music.apple.com/us/artist/ed-sheeran/183313439',
            collectionViewUrl: 'https://music.apple.com/us/album/divide-deluxe/1193701079',
            trackViewUrl: 'https://music.apple.com/us/album/perfect/1193701079?i=1193701590',
            previewUrl:
              'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/ec/90/7e/ec907e9c-2e9a-4a49-2cb4-0e8c6f49d9b8/mzaf_1234567890123456789.plus.aac.p.m4a',
            artworkUrl30:
              'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/28/8d/8c/288d8cb2-0ae4-8cdb-57c4-4b85842b22fa/source/30x30bb.jpg',
            artworkUrl60:
              'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/28/8d/8c/288d8cb2-0ae4-8cdb-57c4-4b85842b22fa/source/60x60bb.jpg',
            artworkUrl100:
              'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/28/8d/8c/288d8cb2-0ae4-8cdb-57c4-4b85842b22fa/source/100x100bb.jpg',
            collectionPrice: 11.99,
            trackPrice: 1.29,
            releaseDate: '2017-03-03T12:00:00Z',
            collectionExplicitness: 'notExplicit',
            trackExplicitness: 'notExplicit',
            discCount: 1,
            discNumber: 1,
            trackCount: 16,
            trackNumber: 4,
            trackTimeMillis: 263400,
            country: 'USA',
            currency: 'USD',
            primaryGenreName: 'Pop',
            isStreamable: true,
          },
        ],
      };
    } else {
      return {
        resultCount: 1,
        results: [
          {
            wrapperType: 'artist',
            artistType: 'Artist',
            artistId: 1419227,
            artistName: `${query} Artist`,
            artistLinkUrl: 'https://music.apple.com/us/artist/the-beatles/136975',
            primaryGenreName: 'Rock',
            primaryGenreId: 21,
          },
        ],
      };
    }
  }

  private mapItunesTracks(data: any): MusicSearchResult[] {
    if (!data?.results) return [];

    return data.results
      .filter((item: any) => item.kind === 'song')
      .map((track: any) => {
        const releaseDate = track.releaseDate ? track.releaseDate.split('T')[0] : '';
        const year = releaseDate ? releaseDate.split('-')[0] : '';

        return {
          id: track.trackId.toString(), // Use iTunes track ID as the general ID
          title: track.trackName || '',
          artist: track.artistName || 'Unknown Artist',
          album: track.collectionName || '',
          releaseDate,
          year,
          duration: track.trackTimeMillis ? Math.round(track.trackTimeMillis / 1000) : 0,
          previewUrl: track.previewUrl || null,
          itunesId: track.trackId,
          popularity: 0, // iTunes doesn't provide popularity scores
          albumArt: this.createAlbumArtObjectFromItunes(track),
          imageUrl: track.artworkUrl100 || track.artworkUrl60 || null, // Keep for backward compatibility
          source: 'itunes' as const,
          itunesUrl: track.trackViewUrl || null,
        };
      });
  }

  private mapItunesArtists(data: any): ArtistSearchResult[] {
    if (!data?.results) return [];

    return data.results
      .filter((item: any) => item.wrapperType === 'artist')
      .map((artist: any) => ({
        name: artist.artistName || '',
        itunesId: artist.artistId,
        popularity: 0,
        imageUrl: null,
        followers: 0,
        genres: [artist.primaryGenreName].filter(Boolean),
        source: 'itunes' as const,
        itunesUrl: artist.artistLinkUrl || null,
      }));
  }

  // Main search methods
  async searchSongs(
    query: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<MusicSearchResult[]> {
    if (!query?.trim()) return [];

    const variants = this.generateQueryVariants(query);

    try {
      // Use iTunes exclusively for better preview availability
      // iTunes has excellent preview availability
      for (const variant of variants) {
        try {
          const itunesData = await this.fetchItunes(variant, 'song', limit);
          const itunesResults = this.mapItunesTracks(itunesData);
          if (itunesResults.length > 0) {
            this.rateLimiter.recordSuccess('itunes');
            return itunesResults.slice(offset, offset + limit);
          }
        } catch (error) {
          this.rateLimiter.recordFailure('itunes');
          console.warn(`iTunes search failed for variant: ${variant}`, error);
        }
      }

      return [];
    } catch (error) {
      throw new HttpException(
        `Music search failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async searchArtists(
    query: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<ArtistSearchResult[]> {
    if (!query?.trim()) return [];

    const variants = this.generateQueryVariants(query);

    try {
      // Use iTunes exclusively for consistency
      for (const variant of variants) {
        try {
          const itunesData = await this.fetchItunes(variant, 'musicArtist', limit);
          const itunesResults = this.mapItunesArtists(itunesData);
          if (itunesResults.length > 0) {
            this.rateLimiter.recordSuccess('itunes');
            return itunesResults.slice(offset, offset + limit);
          }
        } catch (error) {
          this.rateLimiter.recordFailure('itunes');
          console.warn(`iTunes artist search failed for variant: ${variant}`, error);
        }
      }

      return [];
    } catch (error) {
      throw new HttpException(
        `Artist search failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; providers: any }> {
    const providers = {
      itunes: {
        available: true, // iTunes API available with fallback
        primary: true,
        fallbackEnabled: process.env.NODE_ENV === 'development',
      },
    };

    return {
      status: 'ok',
      providers,
    };
  }

  // Legacy methods for controller compatibility
  async searchCombined(query: string, limit: number = 20): Promise<MusicSearchResult[]> {
    // Just use searchSongs for now
    return this.searchSongs(query, limit, 0);
  }

  async getRateLimitStats(): Promise<Record<string, any>> {
    return {
      itunes: {
        available: true,
        circuitBreaker: 'closed',
      },
    };
  }

  async getCategoryMusic(
    queries: string[],
    limit: number = 15,
    targetCount: number = 50,
    categoryId?: string,
  ): Promise<MusicSearchResult[]> {
    const allResults: MusicSearchResult[] = [];

    // If categoryId is provided, use it for smart detection
    let isDecadeCategory = false;
    let isCountryCategory = false;
    let isRBHipHopCategory = false;
    let isOneHitWondersCategory = false;
    let isDuetsCategory = false;
    let isFeelGoodCategory = false;

    if (categoryId) {
      isDecadeCategory =
        categoryId.includes('80s') ||
        categoryId.includes('90s') ||
        categoryId.includes('2000s') ||
        categoryId.includes('best-of-80s') ||
        categoryId.includes('best-of-90s') ||
        categoryId.includes('best-of-2000s');
      isCountryCategory = categoryId.includes('country');
      isRBHipHopCategory = categoryId.includes('rb-hiphop') || categoryId.includes('r&b');
      isOneHitWondersCategory = categoryId.includes('one-hit-wonders');
      isDuetsCategory = categoryId.includes('duets');
      isFeelGoodCategory = categoryId.includes('feel-good');
    } else {
      // Fallback to query-based detection
      isDecadeCategory = queries.some(
        (q) =>
          q.includes('1970') ||
          q.includes('1980') ||
          q.includes('1990') ||
          q.includes('2000') ||
          q.includes('2010'),
      );
      isCountryCategory = queries.some(
        (q) => q.includes('country') || q.includes('garth brooks') || q.includes('shania twain'),
      );
      isRBHipHopCategory = queries.some(
        (q) => q.includes('r&b') || q.includes('hip hop') || q.includes('rap'),
      );
      isOneHitWondersCategory = queries.some((q) => q.includes('one hit') || q.includes('wonders'));
      isDuetsCategory = queries.some((q) => q.includes('duets') || q.includes('love songs'));
      isFeelGoodCategory = queries.some((q) => q.includes('feel good') || q.includes('upbeat'));
    }

    // Check for additional categories
    const isRockCategory = categoryId?.includes('rock') || queries.some((q) => q.includes('rock'));
    const isPopCategory = categoryId?.includes('pop') || queries.some((q) => q.includes('pop'));
    const isKaraokeCategory =
      categoryId?.includes('karaoke') || queries.some((q) => q.includes('karaoke'));
    const isTop100Category =
      categoryId?.includes('top-100') ||
      queries.some((q) => q.includes('top') && q.includes('100'));

    // Special handling for Top 100 category
    if (isTop100Category) {
      const top100Queries = this.getTop100SpecificQueries();

      for (const query of top100Queries.slice(0, 25)) {
        // Use more queries for Top 100
        try {
          const results = await this.searchSongs(query, Math.ceil(limit / 2), 0);
          allResults.push(...results);

          if (allResults.length >= targetCount) {
            break;
          }
        } catch (error) {
          console.warn(`Failed to search for top 100 query: ${query}`, error);
        }
      }
    } else if (isDecadeCategory) {
      // For decade categories, use popular artists and songs from that era
      const decadeQueries = this.getDecadeSpecificQueries(categoryId || queries[0] || '90s');

      for (const query of decadeQueries.slice(0, 20)) {
        // Increased from 10 to 20 for more variety
        try {
          const results = await this.searchSongs(query, Math.ceil(limit / 2), 0);
          // Don't filter by decade - iTunes year data is often missing or inaccurate
          allResults.push(...results);

          if (allResults.length >= targetCount) {
            break;
          }
        } catch (error) {
          console.warn(`Failed to search for decade query: ${query}`, error);
        }
      }
    } else if (isCountryCategory) {
      // For country categories, use specific country artists and hits
      const countryQueries = this.getCountrySpecificQueries();

      for (const query of countryQueries) {
        try {
          const results = await this.searchSongs(query, Math.ceil(limit / 2), 0);
          allResults.push(...results);

          if (allResults.length >= targetCount) {
            break;
          }
        } catch (error) {
          console.warn(`Failed to search for country query: ${query}`, error);
        }
      }
    } else if (isRBHipHopCategory) {
      const rbHipHopQueries = this.getRBHipHopSpecificQueries();

      for (const query of rbHipHopQueries) {
        try {
          const results = await this.searchSongs(query, Math.ceil(limit / 2), 0);
          allResults.push(...results);

          if (allResults.length >= targetCount) {
            break;
          }
        } catch (error) {
          console.warn(`Failed to search for R&B/Hip-Hop query: ${query}`, error);
        }
      }
    } else if (isOneHitWondersCategory) {
      const oneHitQueries = this.getOneHitWonderQueries();

      for (const query of oneHitQueries) {
        try {
          const results = await this.searchSongs(query, Math.ceil(limit / 2), 0);
          allResults.push(...results);

          if (allResults.length >= targetCount) {
            break;
          }
        } catch (error) {
          console.warn(`Failed to search for one-hit wonder query: ${query}`, error);
        }
      }
    } else if (isDuetsCategory) {
      const duetsQueries = this.getDuetsSpecificQueries();

      for (const query of duetsQueries) {
        try {
          const results = await this.searchSongs(query, Math.ceil(limit / 2), 0);
          allResults.push(...results);

          if (allResults.length >= targetCount) {
            break;
          }
        } catch (error) {
          console.warn(`Failed to search for duets query: ${query}`, error);
        }
      }
    } else if (isFeelGoodCategory) {
      const feelGoodQueries = this.getFeelGoodSpecificQueries();

      for (const query of feelGoodQueries) {
        try {
          const results = await this.searchSongs(query, Math.ceil(limit / 2), 0);
          allResults.push(...results);

          if (allResults.length >= targetCount) {
            break;
          }
        } catch (error) {
          console.warn(`Failed to search for feel-good query: ${query}`, error);
        }
      }
    } else if (isRockCategory) {
      const rockQueries = this.getRockSpecificQueries();

      for (const query of rockQueries) {
        try {
          const results = await this.searchSongs(query, Math.ceil(limit / 2), 0);
          allResults.push(...results);

          if (allResults.length >= targetCount) {
            break;
          }
        } catch (error) {
          console.warn(`Failed to search for rock query: ${query}`, error);
        }
      }
    } else if (isPopCategory) {
      const popQueries = this.getPopSpecificQueries();

      for (const query of popQueries) {
        try {
          const results = await this.searchSongs(query, Math.ceil(limit / 2), 0);
          allResults.push(...results);

          if (allResults.length >= targetCount) {
            break;
          }
        } catch (error) {
          console.warn(`Failed to search for pop query: ${query}`, error);
        }
      }
    } else if (isKaraokeCategory) {
      const karaokeQueries = this.getKaraokeSpecificQueries();

      for (const query of karaokeQueries) {
        try {
          const results = await this.searchSongs(query, Math.ceil(limit / 2), 0);
          allResults.push(...results);

          if (allResults.length >= targetCount) {
            break;
          }
        } catch (error) {
          console.warn(`Failed to search for karaoke query: ${query}`, error);
        }
      }
    } else {
      // Regular category handling
      for (const query of queries) {
        try {
          const results = await this.searchSongs(query, limit, 0);
          allResults.push(...results);

          if (allResults.length >= targetCount) {
            break;
          }
        } catch (error) {
          console.warn(`Failed to search for category query: ${query}`, error);
        }
      }
    }

    // Apply diversity and deduplication filters
    let finalResults = this.deduplicateResults(allResults);
    finalResults = this.diversifyByArtist(finalResults, 2); // Max 2 songs per artist
    finalResults = this.shuffleArray(finalResults); // Randomize order

    return finalResults.slice(0, targetCount);
  }

  private getDecadeSpecificQueries(originalQuery: string): string[] {
    if (
      originalQuery.includes('70s') ||
      originalQuery.includes('best-of-70s') ||
      originalQuery.includes('1970')
    ) {
      return [
        'Queen Bohemian Rhapsody',
        'Led Zeppelin Stairway to Heaven',
        'Fleetwood Mac Go Your Own Way',
        'Eagles Hotel California',
        'Bee Gees Stayin Alive',
        'ABBA Dancing Queen',
        'Elton John Rocket Man',
        'David Bowie Heroes',
        'Pink Floyd Another Brick in the Wall',
        'Stevie Wonder Superstition',
        'Diana Ross Love Hangover',
        'Wings Band on the Run',
        'Donna Summer I Feel Love',
        'The Rolling Stones Miss You',
        'Billy Joel Piano Man',
        'Deep Purple Smoke on the Water',
        'Black Sabbath Paranoid',
        "The Who Won't Get Fooled Again",
        'Lynyrd Skynyrd Sweet Home Alabama',
        "Carole King It's Too Late",
      ];
    } else if (
      originalQuery.includes('80s') ||
      originalQuery.includes('best-of-80s') ||
      originalQuery.includes('1980')
    ) {
      return [
        'Michael Jackson Billie Jean',
        'Prince Purple Rain',
        'Madonna Like a Virgin',
        'Bon Jovi Livin on a Prayer',
        "Journey Don't Stop Believin'",
        'Guns N Roses Sweet Child O Mine',
        'Whitney Houston I Wanna Dance with Somebody',
        'Queen Another One Bites the Dust',
        'Blondie Call Me',
        'Duran Duran Hungry Like the Wolf',
        'Cyndi Lauper Time After Time',
        'Hall & Oates Private Eyes',
        'Def Leppard Pour Some Sugar on Me',
        'Van Halen Jump',
        'AC DC You Shook Me All Night Long',
        'The Police Every Breath You Take',
        'Culture Club Karma Chameleon',
        'Tears for Fears Everybody Wants to Rule the World',
        "Dexy's Midnight Runners Come on Eileen",
        'A-ha Take On Me',
      ];
    } else if (
      originalQuery.includes('90s') ||
      originalQuery.includes('best-of-90s') ||
      originalQuery.includes('1990')
    ) {
      return [
        'Nirvana Smells Like Teen Spirit',
        'Whitney Houston I Will Always Love You',
        'Alanis Morissette You Oughta Know',
        'Red Hot Chili Peppers Under the Bridge',
        'Backstreet Boys I Want It That Way',
        'TLC Waterfalls',
        'Boyz II Men End of the Road',
        'Green Day Basket Case',
        'Pearl Jam Alive',
        'Mariah Carey Vision of Love',
        'R.E.M. Losing My Religion',
        'Metallica Enter Sandman',
        'Oasis Wonderwall',
        'Soundgarden Black Hole Sun',
        'Stone Temple Pilots Interstate Love Song',
        'Alice in Chains Man in the Box',
        "No Doubt Don't Speak",
        'Bush Glycerine',
        'Blind Melon No Rain',
        'Smashing Pumpkins Tonight Tonight',
      ];
    } else if (
      originalQuery.includes('2000s') ||
      originalQuery.includes('best-of-2000s') ||
      originalQuery.includes('2000')
    ) {
      return [
        'OutKast Hey Ya',
        'Eminem Lose Yourself',
        'Beyonce Crazy in Love',
        'Black Eyed Peas I Gotta Feeling',
        'Usher Yeah',
        'Gnarls Barkley Crazy',
        'Kelly Clarkson Since U Been Gone',
        'Green Day American Idiot',
        'Coldplay Yellow',
        'Linkin Park In the End',
        '50 Cent In Da Club',
        'Alicia Keys Fallin',
        'Justin Timberlake SexyBack',
        'Nelly Hot in Herre',
        'The White Stripes Seven Nation Army',
        'The Killers Mr. Brightside',
        'Franz Ferdinand Take Me Out',
        'Maroon 5 This Love',
        'Jet Are You Gonna Be My Girl',
        'System of a Down Chop Suey!',
      ];
    } else {
      return [originalQuery];
    }
  }

  private getTop100SpecificQueries(): string[] {
    return [
      'Queen Bohemian Rhapsody',
      'The Beatles Hey Jude',
      'Led Zeppelin Stairway to Heaven',
      'Michael Jackson Thriller',
      'Whitney Houston I Will Always Love You',
      "Journey Don't Stop Believin'",
      "Elvis Presley Can't Help Myself",
      'The Rolling Stones Satisfaction',
      'Bob Dylan Like a Rolling Stone',
      'John Lennon Imagine',
      'Prince Purple Rain',
      'Madonna Like a Prayer',
      'Nirvana Smells Like Teen Spirit',
      'AC/DC Back in Black',
      'Pink Floyd Another Brick in the Wall',
      'The Who My Generation',
      'David Bowie Heroes',
      'Fleetwood Mac Go Your Own Way',
      'Eagles Hotel California',
      'Aretha Franklin Respect',
      'Stevie Wonder Superstition',
      "Marvin Gaye What's Going On",
      "Guns N' Roses Sweet Child O' Mine",
      "Bon Jovi Livin' on a Prayer",
      'U2 With or Without You',
      'R.E.M. Losing My Religion',
      'Red Hot Chili Peppers Under the Bridge',
      'Pearl Jam Alive',
      'Soundgarden Black Hole Sun',
      'Green Day Basket Case',
      'Oasis Wonderwall',
      'Radiohead Creep',
      'Alanis Morissette You Oughta Know',
      'TLC Waterfalls',
      'Boyz II Men End of the Road',
      'Mariah Carey Vision of Love',
      'Celine Dion My Heart Will Go On',
      'Backstreet Boys I Want It That Way',
      'Britney Spears ...Baby One More Time',
      'Eminem Lose Yourself',
      'OutKast Hey Ya!',
      'Beyoncé Crazy in Love',
      'Coldplay Yellow',
      'The Killers Mr. Brightside',
      'Gnarls Barkley Crazy',
      'Kelly Clarkson Since U Been Gone',
      "Alicia Keys Fallin'",
      'Black Eyed Peas I Gotta Feeling',
      'Lady Gaga Bad Romance',
      'Adele Rolling in the Deep',
    ];
  }

  private getCountrySpecificQueries(): string[] {
    return [
      'Garth Brooks Friends in Low Places',
      'Shania Twain Man I Feel Like a Woman',
      "Keith Urban Blue Ain't Your Color",
      'Carrie Underwood Before He Cheats',
      'Tim McGraw Live Like You Were Dying',
      'Faith Hill This Kiss',
      'Alan Jackson Chattahoochee',
      'Reba McEntire Fancy',
      'George Strait All My Exes Live in Texas',
      'Dolly Parton Jolene',
      "Kenny Chesney She Thinks My Tractor's Sexy",
      'Brad Paisley Mud on the Tires',
      'Martina McBride Independence Day',
      'Blake Shelton Austin',
      'Miranda Lambert Gunpowder Lead',
    ];
  }

  private getRBHipHopSpecificQueries(): string[] {
    return [
      'Lauryn Hill Doo Wop That Thing',
      'OutKast Ms Jackson',
      'Alicia Keys No One',
      'Jay-Z Empire State of Mind',
      'Beyonce Single Ladies',
      'Drake Hotline Bling',
      'Kendrick Lamar HUMBLE',
      'Mary J Blige Family Affair',
      'Usher U Remind Me',
      'TLC No Scrubs',
      "Destiny's Child Say My Name",
      'Nelly Country Grammar',
      'Missy Elliott Work It',
      'Kanye West Gold Digger',
      'John Legend All of Me',
    ];
  }

  private getOneHitWonderQueries(): string[] {
    return [
      'Dexys Midnight Runners Come on Eileen',
      'A-ha Take On Me',
      'Toni Basil Mickey',
      'Mambo No 5 Lou Bega',
      'Chumbawamba Tubthumping',
      'OMC How Bizarre',
      'Vanilla Ice Ice Ice Baby',
      "Right Said Fred I'm Too Sexy",
      'Snow Informer',
      'House of Pain Jump Around',
      'Marky Mark Good Vibrations',
      'Deep Blue Something Breakfast at Tiffanys',
      'Spacehog In the Meantime',
      'Primitive Radio Gods Standing Outside',
      'Len Steal My Sunshine',
    ];
  }

  private getDuetsSpecificQueries(): string[] {
    return [
      'Islands in the Stream Kenny Rogers Dolly Parton',
      "Don't Go Breaking My Heart Elton John Kiki Dee",
      'The Boy Is Mine Brandy Monica',
      'Under Pressure Queen David Bowie',
      'I Got You Babe Sonny Cher',
      'Shallow Lady Gaga Bradley Cooper',
      'Beauty and the Beast Celine Dion Peabo Bryson',
      'Up Where We Belong Joe Cocker Jennifer Warnes',
      'Nobody Wants to Be Lonely Ricky Martin Christina Aguilera',
      'All I Want for Christmas Mariah Carey Justin Bieber',
      'Say Say Say Paul McCartney Michael Jackson',
      'Cruisin Huey Lewis Gwyneth Paltrow',
      'Picture Kid Rock Sheryl Crow',
      'Just Give Me a Reason Pink Nate Ruess',
      'Love Song for a Vampire Annie Lennox',
    ];
  }

  private getFeelGoodSpecificQueries(): string[] {
    return [
      'Pharrell Williams Happy',
      'Katrina and the Waves Walking on Sunshine',
      "Bobby McFerrin Don't Worry Be Happy",
      'Bill Withers Lovely Day',
      'Earth Wind Fire September',
      'Stevie Wonder Signed Sealed Delivered',
      'The Temptations My Girl',
      'James Brown I Got You',
      'Jackie Wilson Higher and Higher',
      'Kool and the Gang Celebration',
      'Sister Sledge We Are Family',
      "Queen Don't Stop Me Now",
      'The Beatles Here Comes the Sun',
      'Stevie Wonder Sir Duke',
      'Van Morrison Brown Eyed Girl',
    ];
  }

  private getRockSpecificQueries(): string[] {
    return [
      'Queen We Will Rock You',
      'Led Zeppelin Black Dog',
      'AC DC Thunderstruck',
      'Guns N Roses Welcome to the Jungle',
      'Van Halen Runnin with the Devil',
      'Deep Purple Smoke on the Water',
      "The Who Won't Get Fooled Again",
      'Black Sabbath Iron Man',
      'Metallica Master of Puppets',
      'Pink Floyd Comfortably Numb',
      'The Rolling Stones Paint It Black',
      'Aerosmith Dream On',
      'Def Leppard Rock of Ages',
      'Rush Tom Sawyer',
      'Heart Barracuda',
    ];
  }

  private getPopSpecificQueries(): string[] {
    return [
      'Michael Jackson Beat It',
      'Madonna Material Girl',
      'Prince Kiss',
      'Whitney Houston I Want to Dance with Somebody',
      'Cyndi Lauper Girls Just Want to Have Fun',
      'George Michael Faith',
      'Duran Duran Rio',
      'Blondie Heart of Glass',
      'ABBA Mamma Mia',
      'The Bangles Walk Like an Egyptian',
      'Culture Club Karma Chameleon',
      'Wham! Wake Me Up Before You Go-Go',
      'Hall & Oates Rich Girl',
      'Tears for Fears Everybody Wants to Rule the World',
      'Eurythmics Sweet Dreams',
    ];
  }

  private getKaraokeSpecificQueries(): string[] {
    return [
      "Journey Don't Stop Believin'",
      "Bon Jovi Livin' on a Prayer",
      'Queen Bohemian Rhapsody',
      'Sweet Caroline Neil Diamond',
      'Piano Man Billy Joel',
      'My Way Frank Sinatra',
      'I Will Survive Gloria Gaynor',
      'Respect Aretha Franklin',
      'Dancing Queen ABBA',
      'Love Shack B-52s',
      'Come On Eileen Dexys Midnight Runners',
      'Mr. Brightside The Killers',
      'Closing Time Semisonic',
      'Friends in Low Places Garth Brooks',
      'Sweet Home Alabama Lynyrd Skynyrd',
    ];
  }

  private filterByDecade(results: MusicSearchResult[], originalQuery: string): MusicSearchResult[] {
    // Determine target decade from category ID or query
    let targetDecadeStart = '';
    let targetDecadeEnd = '';

    if (originalQuery.includes('70s') || originalQuery.includes('best-of-70s')) {
      targetDecadeStart = '1970';
      targetDecadeEnd = '1979';
    } else if (originalQuery.includes('80s') || originalQuery.includes('best-of-80s')) {
      targetDecadeStart = '1980';
      targetDecadeEnd = '1989';
    } else if (originalQuery.includes('90s') || originalQuery.includes('best-of-90s')) {
      targetDecadeStart = '1990';
      targetDecadeEnd = '1999';
    } else if (originalQuery.includes('2000s') || originalQuery.includes('best-of-2000s')) {
      targetDecadeStart = '2000';
      targetDecadeEnd = '2009';
    } else {
      // No decade filtering needed
      return results;
    }

    return results.filter((song) => {
      if (!song.year) return false; // Exclude songs without year info for decade categories
      const year = parseInt(song.year, 10);
      const startYear = parseInt(targetDecadeStart, 10);
      const endYear = parseInt(targetDecadeEnd, 10);
      return year >= startYear && year <= endYear;
    });
  }

  private deduplicateResults(results: MusicSearchResult[]): MusicSearchResult[] {
    const seen = new Set<string>();
    return results.filter((song) => {
      const key = `${song.title.toLowerCase()}-${song.artist?.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private diversifyByArtist(
    results: MusicSearchResult[],
    maxPerArtist: number = 2,
  ): MusicSearchResult[] {
    const artistCounts = new Map<string, number>();
    const diversified: MusicSearchResult[] = [];

    for (const song of results) {
      const artist = song.artist?.toLowerCase() || 'unknown';
      const currentCount = artistCounts.get(artist) || 0;

      if (currentCount < maxPerArtist) {
        diversified.push(song);
        artistCounts.set(artist, currentCount + 1);
      }
    }

    return diversified;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async getCategoryMusicById(
    categoryId: string,
    limit: number = 50,
    targetCount: number = 100,
  ): Promise<MusicSearchResult[]> {
    // Map category IDs to specific search strategies
    const categoryMapping = {
      'top-100': () => this.getTop100SpecificQueries(),
      'karaoke-classics': () => [
        "Don't Stop Believin' Journey",
        'Sweet Caroline Neil Diamond',
        'Piano Man Billy Joel',
        'Bohemian Rhapsody Queen',
        'I Want It That Way Backstreet Boys',
        'Mr. Brightside The Killers',
        'Wonderwall Oasis',
        'Total Eclipse of the Heart Bonnie Tyler',
        "Livin' on a Prayer Bon Jovi",
        'Dancing Queen ABBA',
      ],
      'best-of-80s': () => this.getDecadeSpecificQueries('80s'),
      'best-of-90s': () => this.getDecadeSpecificQueries('90s'),
      'best-of-2000s': () => this.getDecadeSpecificQueries('2000s'),
      'rock-hits': () => [
        'Queen We Will Rock You',
        'Led Zeppelin Stairway to Heaven',
        'AC/DC Back in Black',
        "Guns N' Roses Sweet Child O' Mine",
        'The Rolling Stones Start Me Up',
        'Aerosmith Dream On',
        'Van Halen Jump',
        'Def Leppard Pour Some Sugar On Me',
      ],
      'pop-hits': () => [
        'Michael Jackson Billie Jean',
        'Madonna Like a Prayer',
        'Whitney Houston I Wanna Dance with Somebody',
        'Prince Purple Rain',
        'Cyndi Lauper Time After Time',
        'George Michael Faith',
        'Duran Duran Hungry Like the Wolf',
        'Blondie Heart of Glass',
      ],
      'country-favorites': () => [
        'Garth Brooks Friends in Low Places',
        'Shania Twain Man! I Feel Like a Woman!',
        'Johnny Cash Ring of Fire',
        'Dolly Parton 9 to 5',
        'Kenny Rogers The Gambler',
        'Patsy Cline Crazy',
        "Hank Williams Hey Good Lookin'",
        'Willie Nelson On the Road Again',
      ],
      'rb-hiphop-hits': () => [
        'Aretha Franklin Respect',
        'Stevie Wonder Superstition',
        'The Temptations My Girl',
        "Diana Ross I'm Coming Out",
        'Earth Wind & Fire September',
        "Chaka Khan I'm Every Woman",
        'Ray Charles Georgia On My Mind',
        'James Brown I Got You (I Feel Good)',
      ],
      'one-hit-wonders': () => [
        'Dexys Midnight Runners Come on Eileen',
        'A-ha Take On Me',
        'Toni Basil Mickey',
        'Mambo No. 5 Lou Bega',
        'Ice Ice Baby Vanilla Ice',
        'Tubthumping Chumbawamba',
        'Macarena Los Del Rio',
        'Who Let the Dogs Out Baha Men',
      ],
      'duets-love-songs': () => [
        'Islands in the Stream Kenny Rogers Dolly Parton',
        'The Girl Is Mine Michael Jackson Paul McCartney',
        'Shallow Lady Gaga Bradley Cooper',
        "Don't Go Breaking My Heart Elton John Kiki Dee",
        'Under Pressure Queen David Bowie',
        'I Got You Babe Sonny & Cher',
        'Beauty and the Beast Celine Dion Peabo Bryson',
        'Say Say Say Paul McCartney Michael Jackson',
      ],
      'feel-good-classics': () => [
        'Walking on Sunshine Katrina and the Waves',
        'Good Vibrations The Beach Boys',
        'Happy Pharrell Williams',
        'Uptown Funk Mark Ronson Bruno Mars',
        'I Got a Feeling Black Eyed Peas',
        'September Earth Wind & Fire',
        'Dancing Queen ABBA',
        'Celebration Kool & The Gang',
      ],
    };

    const getQueries = categoryMapping[categoryId] || (() => ['classic hits', 'greatest songs']);
    const queries = getQueries();

    const allResults: MusicSearchResult[] = [];
    const maxQueries = Math.min(queries.length, 30); // Limit number of queries

    for (let i = 0; i < maxQueries && allResults.length < targetCount; i++) {
      try {
        const query = queries[i];
        const results = await this.searchSongs(query, Math.ceil(limit / 5), 0);
        allResults.push(...results);
      } catch (error) {
        console.warn(`Failed to search for category query: ${queries[i]}`, error);
      }
    }

    // Remove duplicates and sort by popularity
    const uniqueResults = this.deduplicateResults(allResults);
    return uniqueResults.slice(0, targetCount);
  }
}
