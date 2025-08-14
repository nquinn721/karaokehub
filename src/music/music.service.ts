import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ArtistSearchResult, MusicSearchResult } from './music.interface';

// Rate limiter for different API providers
class ApiRateLimiter {
  private lastRequests: Map<string, number> = new Map();
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; isOpen: boolean }> =
    new Map();

  // Rate limits per API (requests per minute)
  private readonly limits = {
    musicbrainz: { delay: 1000, maxPerMinute: 50 }, // Very conservative
    deezer: { delay: 100, maxPerMinute: 200 }, // More generous
    itunes: { delay: 50, maxPerMinute: 300 }, // Most generous
    lastfm: { delay: 200, maxPerMinute: 150 }, // Moderate
  };

  // Circuit breaker config
  private readonly circuitBreakerConfig = {
    failureThreshold: 5, // Number of failures before opening circuit
    recoveryTime: 300000, // 5 minutes before trying again
  };

  async waitForRateLimit(provider: string): Promise<void> {
    // Check circuit breaker first
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

  // Circuit breaker methods
  private isCircuitOpen(provider: string): boolean {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) return false;

    if (breaker.isOpen) {
      const timeSinceLastFailure = Date.now() - breaker.lastFailure;
      if (timeSinceLastFailure > this.circuitBreakerConfig.recoveryTime) {
        // Reset circuit breaker after recovery time
        breaker.isOpen = false;
        breaker.failures = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  recordSuccess(provider: string): void {
    // Reset failure count on successful request
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

  getStats(): Record<string, any> {
    const stats = {};
    for (const [provider, lastTime] of this.lastRequests.entries()) {
      const minuteKey = `${provider}-${Math.floor(Date.now() / 60000)}`;
      const requestData = this.requestCounts.get(minuteKey);
      const breaker = this.circuitBreakers.get(provider);

      stats[provider] = {
        lastRequest: Date.now() - lastTime,
        requestsThisMinute: requestData?.count || 0,
        maxPerMinute: this.limits[provider]?.maxPerMinute || 0,
        circuitBreaker: {
          isOpen: breaker?.isOpen || false,
          failures: breaker?.failures || 0,
          lastFailure: breaker?.lastFailure ? Date.now() - breaker.lastFailure : null,
        },
      };
    }
    return stats;
  }
}

@Injectable()
export class MusicService {
  private readonly baseURL = 'https://musicbrainz.org/ws/2';
  private readonly userAgent = 'KaraokeRatingsApp/1.0.0';
  private readonly rateLimiter = new ApiRateLimiter();

  // Legacy support - will be removed
  private lastRequestTime = 0;

  // ---------------- Normalization & Variants (simple, no-ML) ----------------
  private normalizeQuery(q: string): string {
    let s = q.toLowerCase().trim();
    // remove bracketed/parenthetical content often present in user input
    s = s.replace(/\[[^\]]*\]|\([^)]*\)|\{[^}]*\}/g, ' ');
    // unify featuring variants
    s = s.replace(/\b(feat\.|ft\.|featuring)\b/g, ' feat ');
    // keep letters, numbers and spaces
    s = s.replace(/[^a-z0-9\s-]/g, ' ');
    // collapse dashes/spaces
    s = s.replace(/[\s-]+/g, ' ').trim();
    return s;
  }

  private generateQueryVariants(q: string): string[] {
    const original = q;
    const normalized = this.normalizeQuery(q);

    const variants = new Set<string>();
    variants.add(original);
    variants.add(normalized);

    // Detect patterns like "song - artist" and flip
    const dashParts = normalized.split(' - ');
    if (dashParts.length === 2) {
      variants.add(`${dashParts[0]} ${dashParts[1]}`);
      variants.add(`${dashParts[1]} ${dashParts[0]}`);
    }

    // Detect "song by artist" and flip
    const byMatch = normalized.match(/^(.*)\s+by\s+(.*)$/);
    if (byMatch) {
      const song = byMatch[1].trim();
      const artist = byMatch[2].trim();
      variants.add(`${song} ${artist}`);
      variants.add(`${artist} ${song}`);
    }

    // Remove common noise words
    const stop = new Set(['the', 'a', 'official', 'lyrics', 'video', 'audio', 'remix']);
    const tokens = normalized.split(' ');
    const filtered = tokens.filter((t) => !stop.has(t));
    if (filtered.length && filtered.length !== tokens.length) {
      variants.add(filtered.join(' '));
    }

    return Array.from(variants)
      .filter((v) => v.length >= 2)
      .slice(0, 6);
  }

  // ---------- Deezer helpers (no API key, exposes popularity rank) ----------
  private async fetchDeezer(term: string, limit: number): Promise<any> {
    await this.rateLimiter.waitForRateLimit('deezer');

    try {
      const base = 'https://api.deezer.com/search';
      const url = `${base}?q=${encodeURIComponent(term)}&limit=${limit}&order=RANKING`;
      const res = await fetch(url);

      if (!res.ok) {
        this.rateLimiter.recordFailure('deezer');
        throw new HttpException(`Deezer API error: ${res.status}`, HttpStatus.BAD_GATEWAY);
      }

      this.rateLimiter.recordSuccess('deezer');
      return res.json();
    } catch (error) {
      this.rateLimiter.recordFailure('deezer');
      throw error;
    }
  }

  private mapDeezerSongs(json: any): MusicSearchResult[] {
    const items = Array.isArray(json?.data) ? json.data : [];
    // Deezer returns items with a numeric rank; results are already ranked desc by RANKING
    return items.map((r: any) => ({
      id: String(r.id),
      title: r.title,
      artist: r.artist?.name,
      album: r.album?.title,
      year: undefined,
      // Add album artwork from Deezer
      albumArt: r.album?.cover
        ? {
            small: r.album.cover_small || r.album.cover,
            medium: r.album.cover_medium || r.album.cover,
            large: r.album.cover_big || r.album.cover_xl || r.album.cover,
          }
        : undefined,
      // Add 30-second preview from Deezer
      previewUrl: r.preview || undefined,
    }));
  }

  // ---------- iTunes helpers (no API key required) ----------
  private async fetchItunes(term: string, params: Record<string, string>): Promise<any> {
    await this.rateLimiter.waitForRateLimit('itunes');

    try {
      const base = 'https://itunes.apple.com/search';
      const search = new URLSearchParams({ term, media: 'music', ...params });
      const url = `${base}?${search.toString()}`;

      const res = await fetch(url);

      if (!res.ok) {
        this.rateLimiter.recordFailure('itunes');
        throw new HttpException(`iTunes API error: ${res.status}`, HttpStatus.BAD_GATEWAY);
      }

      this.rateLimiter.recordSuccess('itunes');
      return res.json();
    } catch (error) {
      this.rateLimiter.recordFailure('itunes');
      throw error;
    }
  }

  private mapItunesSongs(json: any): MusicSearchResult[] {
    const items = Array.isArray(json?.results) ? json.results : [];
    return items
      .filter((r: any) => r.wrapperType === 'track' || r.kind === 'song')
      .map((r: any) => ({
        id: String(r.trackId ?? r.collectionId ?? r.artistId),
        title: r.trackName,
        artist: r.artistName,
        album: r.collectionName,
        year: r.releaseDate ? String(new Date(r.releaseDate).getFullYear()) : undefined,
        // Add album artwork from iTunes
        albumArt: r.artworkUrl100
          ? {
              small: r.artworkUrl100, // 100x100
              medium: r.artworkUrl100?.replace('100x100', '300x300'),
              large: r.artworkUrl100?.replace('100x100', '600x600'),
            }
          : undefined,
        // Add 30-second preview from iTunes
        previewUrl: r.previewUrl || undefined,
      }));
  }

  private mapItunesArtists(json: any): ArtistSearchResult[] {
    const items = Array.isArray(json?.results) ? json.results : [];
    return items
      .filter((r: any) => r.wrapperType === 'artist')
      .map((r: any) => ({
        id: String(r.artistId),
        name: r.artistName,
        disambiguation: r.primaryGenreName,
        country: undefined,
      }));
  }

  // ---------- MusicBrainz (with gentle rate limit) ----------
  private async makeRequest(url: string): Promise<any> {
    await this.rateLimiter.waitForRateLimit('musicbrainz');

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        this.rateLimiter.recordFailure('musicbrainz');
        throw new HttpException(
          `MusicBrainz API error: ${response.status}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      this.rateLimiter.recordSuccess('musicbrainz');
      return await response.json();
    } catch (error) {
      this.rateLimiter.recordFailure('musicbrainz');
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to fetch music data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ---------- Public search methods (Deezer -> iTunes -> MusicBrainz) ----------
  async searchSongs(query: string, limit = 10, offset = 0): Promise<MusicSearchResult[]> {
    if (query.length < 3) {
      return [];
    }

    const variants = this.generateQueryVariants(query);

    // For pagination, we'll use the MusicBrainz offset parameter
    const musicbrainzOffset = Math.floor(offset / 2); // Since we mix different sources

    // 1) Try Deezer first for popularity-ranked songs
    for (const v of variants) {
      try {
        const deezerJson = await this.fetchDeezer(v, limit);
        const deezerResults = this.mapDeezerSongs(deezerJson);
        if (deezerResults.length > 0) return deezerResults.slice(0, limit);
      } catch {
        // continue to next provider/variant
      }
    }

    // 2) Try iTunes next (good coverage)
    for (const v of variants) {
      try {
        const itunesJson = await this.fetchItunes(v, {
          entity: 'song',
          limit: String(limit),
        });
        const itunesResults = this.mapItunesSongs(itunesJson);
        if (itunesResults.length > 0) return itunesResults;
      } catch {
        // continue
      }
    }

    // 3) Fallback: MusicBrainz fuzzy query with offset
    try {
      const norm = this.normalizeQuery(query);
      const tokens = norm.split(' ').filter(Boolean);
      const fuzzy = tokens.map((t) => `recording:${t}~1`).join(' AND ');
      const encodedQuery = encodeURIComponent(fuzzy || norm);
      const url = `${this.baseURL}/recording?query=${encodedQuery}&fmt=json&limit=${limit}&offset=${musicbrainzOffset}`;
      const data = await this.makeRequest(url);
      return (
        data.recordings?.map((recording: any) => ({
          id: recording.id,
          title: recording.title,
          artist: recording['artist-credit']?.[0]?.name || 'Unknown Artist',
          album: recording.releases?.[0]?.title,
          year: recording.releases?.[0]?.date?.split('-')[0],
        })) || []
      );
    } catch (error) {
      console.error('Music search error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Music search failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async searchArtists(query: string, limit = 10, offset = 0): Promise<ArtistSearchResult[]> {
    if (query.length < 2) {
      return [];
    }

    const variants = this.generateQueryVariants(query);

    // For pagination, we'll use the MusicBrainz offset parameter
    const musicbrainzOffset = Math.floor(offset / 2);

    // iTunes artists across variants (Deezer artist search exists but iTunes is fine for this path)
    for (const v of variants) {
      try {
        const itunesJson = await this.fetchItunes(v, {
          entity: 'musicArtist',
          limit: String(limit),
        });
        const itunesArtists = this.mapItunesArtists(itunesJson);
        if (itunesArtists.length > 0) return itunesArtists;
      } catch {
        // continue
      }
    }

    // Fallback: MusicBrainz artists fuzzy with offset
    try {
      const norm = this.normalizeQuery(query);
      const tokens = norm.split(' ').filter(Boolean);
      const fuzzy = tokens.map((t) => `artist:${t}~1`).join(' AND ');
      const encodedQuery = encodeURIComponent(fuzzy || norm);
      const url = `${this.baseURL}/artist?query=${encodedQuery}&fmt=json&limit=${limit}&offset=${musicbrainzOffset}`;

      const data = await this.makeRequest(url);

      return (
        data.artists?.map((artist: any) => ({
          id: artist.id,
          name: artist.name,
          disambiguation: artist.disambiguation,
          country: artist.country,
        })) || []
      );
    } catch (error) {
      console.error('Artist search error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Artist search failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async searchCombined(query: string, limit = 10, offset = 0): Promise<MusicSearchResult[]> {
    if (query.length < 3) {
      return [];
    }

    const variants = this.generateQueryVariants(query);

    // For pagination, we'll use the MusicBrainz offset parameter
    const musicbrainzOffset = Math.floor(offset / 2);

    // 1) Deezer ranked songs across variants
    for (const v of variants) {
      try {
        const deezerJson = await this.fetchDeezer(v, limit);
        const deezerResults = this.mapDeezerSongs(deezerJson);
        if (deezerResults.length > 0) return deezerResults.slice(0, limit);
      } catch {
        // continue
      }
    }

    // 2) iTunes across variants
    for (const v of variants) {
      try {
        const itunesJson = await this.fetchItunes(v, {
          entity: 'song',
          limit: String(limit),
        });
        const itunesResults = this.mapItunesSongs(itunesJson);
        if (itunesResults.length > 0) return itunesResults;
      } catch {
        // continue
      }
    }

    // 3) Fallback: MusicBrainz combined fuzzy with offset
    try {
      const norm = this.normalizeQuery(query);
      const tokens = norm.split(' ').filter(Boolean);
      const fuzzy = tokens.map((t) => `(recording:${t}~1 OR artist:${t}~1)`).join(' AND ');
      const encodedQuery = encodeURIComponent(fuzzy || norm);
      const url = `${this.baseURL}/recording?query=${encodedQuery}&fmt=json&limit=${limit}&offset=${musicbrainzOffset}`;

      const data = await this.makeRequest(url);

      return (
        data.recordings?.map((recording: any) => ({
          id: recording.id,
          title: recording.title,
          artist: recording['artist-credit']?.[0]?.name || 'Unknown Artist',
          album: recording.releases?.[0]?.title,
          year: recording.releases?.[0]?.date?.split('-')[0],
        })) || []
      );
    } catch (error) {
      console.error('Combined search error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Music search failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get rate limiting statistics
  getRateLimitStats(): Record<string, any> {
    return {
      rateLimiting: this.rateLimiter.getStats(),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
