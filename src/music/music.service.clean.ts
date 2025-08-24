import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ArtistSearchResult, MusicSearchResult } from './music.interface';

// Rate limiter for iTunes and Spotify APIs
class ApiRateLimiter {
  private lastRequests: Map<string, number> = new Map();
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; isOpen: boolean }> =
    new Map();

  // Rate limits per API (requests per minute)
  private readonly limits = {
    itunes: { delay: 50, maxPerMinute: 300 },
    spotify: { delay: 100, maxPerMinute: 500 },
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
  private readonly userAgent = 'KaraokeRatingsApp/1.0.0';
  private readonly rateLimiter = new ApiRateLimiter();

  // Music API Strategy:
  // - localhost/development: Use iTunes (Spotify doesn't support localhost callbacks)
  // - Cloud Run/production: Use Spotify as primary, iTunes as fallback
  // - Automatically detects based on SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET presence

  // Spotify configuration (only available in production/Cloud Run)
  private readonly spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
  private readonly spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  private spotifyAccessToken: string | null = null;
  private spotifyTokenExpiry: number = 0;

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

  // Spotify Authentication
  private async getSpotifyAccessToken(): Promise<string> {
    if (this.spotifyAccessToken && Date.now() < this.spotifyTokenExpiry) {
      return this.spotifyAccessToken;
    }

    if (!this.spotifyClientId || !this.spotifyClientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${this.spotifyClientId}:${this.spotifyClientSecret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`Spotify auth failed: ${response.status}`);
      }

      const data = await response.json();
      this.spotifyAccessToken = data.access_token;
      this.spotifyTokenExpiry = Date.now() + data.expires_in * 1000 - 60000; // 1 minute buffer

      return this.spotifyAccessToken;
    } catch (error) {
      console.error('Failed to get Spotify access token:', error);
      throw error;
    }
  }

  // Spotify API calls
  private async fetchSpotify(
    query: string,
    type: 'track' | 'artist',
    limit: number = 20,
  ): Promise<any> {
    try {
      await this.rateLimiter.waitForRateLimit('spotify');
      const token = await this.getSpotifyAccessToken();

      const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status}`);
      }

      const data = await response.json();
      this.rateLimiter.recordSuccess('spotify');
      return data;
    } catch (error) {
      this.rateLimiter.recordFailure('spotify');
      console.error('Spotify fetch error:', error);
      throw error;
    }
  }

  private mapSpotifyTracks(data: any): MusicSearchResult[] {
    if (!data?.tracks?.items) return [];

    return data.tracks.items.map((track: any) => {
      const releaseDate = track.album?.release_date || '';
      const year = releaseDate ? releaseDate.split('-')[0] : '';

      return {
        id: track.id, // Use Spotify track ID as the general ID
        title: track.name,
        artist: track.artists?.[0]?.name || 'Unknown Artist',
        album: track.album?.name || '',
        releaseDate,
        year,
        duration: track.duration_ms ? Math.round(track.duration_ms / 1000) : 0,
        previewUrl: track.preview_url || null,
        spotifyId: track.id,
        popularity: track.popularity || 0,
        imageUrl: track.album?.images?.[0]?.url || null, // Backward compatibility
        albumArt: {
          small:
            track.album?.images?.[2]?.url ||
            track.album?.images?.[1]?.url ||
            track.album?.images?.[0]?.url ||
            null,
          medium: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || null,
          large: track.album?.images?.[0]?.url || null,
        },
        source: 'spotify' as const,
        spotifyUrl: track.external_urls?.spotify || null,
      };
    });
  }

  private mapSpotifyArtists(data: any): ArtistSearchResult[] {
    if (!data?.artists?.items) return [];

    return data.artists.items.map((artist: any) => ({
      name: artist.name,
      spotifyId: artist.id,
      popularity: artist.popularity || 0,
      imageUrl: artist.images?.[0]?.url || null,
      followers: artist.followers?.total || 0,
      genres: artist.genres || [],
      source: 'spotify' as const,
      spotifyUrl: artist.external_urls?.spotify || null,
    }));
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

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        throw new Error(`iTunes API error: ${response.status}`);
      }

      const data = await response.json();
      this.rateLimiter.recordSuccess('itunes');
      return data;
    } catch (error) {
      this.rateLimiter.recordFailure('itunes');
      console.error('iTunes fetch error:', error);
      throw error;
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
          imageUrl: track.artworkUrl100 || track.artworkUrl60 || null, // Backward compatibility
          albumArt: {
            small: track.artworkUrl60 || null,
            medium: track.artworkUrl100 || null,
            large:
              track.artworkUrl100?.replace('100x100bb', '600x600bb') ||
              track.artworkUrl100?.replace('100x100bb', '300x300bb') ||
              null,
          },
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
      // Primary: Use Spotify when credentials are available (production/Cloud Run)
      // Note: Spotify doesn't support localhost, so this only works in production
      if (this.spotifyClientId && this.spotifyClientSecret) {
        // Try Spotify first
        for (const variant of variants) {
          try {
            const spotifyData = await this.fetchSpotify(variant, 'track', limit);
            const spotifyResults = this.mapSpotifyTracks(spotifyData);
            if (spotifyResults.length > 0) {
              return spotifyResults.slice(offset, offset + limit);
            }
          } catch (error) {
            console.warn(`Spotify search failed for variant: ${variant}`, error);
          }
        }
      }

      // Fallback: Use iTunes (works on localhost and production)
      // This is the primary source for localhost development
      for (const variant of variants) {
        try {
          const itunesData = await this.fetchItunes(variant, 'song', limit);
          const itunesResults = this.mapItunesTracks(itunesData);
          if (itunesResults.length > 0) {
            return itunesResults.slice(offset, offset + limit);
          }
        } catch (error) {
          console.warn(`iTunes search failed for variant: ${variant}`, error);
        }
      }

      return [];
    } catch (error) {
      console.error('Song search error:', error);
      throw new HttpException(
        'Music search service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
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
      // Primary: Use Spotify when credentials are available (production/Cloud Run)
      if (this.spotifyClientId && this.spotifyClientSecret) {
        // Try Spotify first
        for (const variant of variants) {
          try {
            const spotifyData = await this.fetchSpotify(variant, 'artist', limit);
            const spotifyResults = this.mapSpotifyArtists(spotifyData);
            if (spotifyResults.length > 0) {
              return spotifyResults.slice(offset, offset + limit);
            }
          } catch (error) {
            console.warn(`Spotify artist search failed for variant: ${variant}`, error);
          }
        }
      }

      // Fallback to iTunes when Spotify is not available or fails
      for (const variant of variants) {
        try {
          const itunesData = await this.fetchItunes(variant, 'musicArtist', limit);
          const itunesResults = this.mapItunesArtists(itunesData);
          if (itunesResults.length > 0) {
            return itunesResults.slice(offset, offset + limit);
          }
        } catch (error) {
          console.warn(`iTunes artist search failed for variant: ${variant}`, error);
        }
      }

      return [];
    } catch (error) {
      console.error('Artist search error:', error);
      throw new HttpException(
        'Music search service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; providers: any }> {
    const providers = {
      spotify: {
        available: !!(this.spotifyClientId && this.spotifyClientSecret),
        authenticated: !!this.spotifyAccessToken,
      },
      itunes: {
        available: true, // iTunes API doesn't require authentication
      },
    };

    return {
      status: 'ok',
      providers,
    };
  }
}
