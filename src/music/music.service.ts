import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ArtistSearchResult, MusicSearchResult } from "./music.interface";

@Injectable()
export class MusicService {
  private readonly baseURL = "https://musicbrainz.org/ws/2";
  private readonly userAgent = "KaraokeRatingsApp/1.0.0";
  // Lower delay in dev to improve perceived latency; keep 1s in production
  private readonly rateLimit =
    process.env.NODE_ENV === "production" ? 1000 : 200;

  private lastRequestTime = 0;

  // ---------------- Normalization & Variants (simple, no-ML) ----------------
  private normalizeQuery(q: string): string {
    let s = q.toLowerCase().trim();
    // remove bracketed/parenthetical content often present in user input
    s = s.replace(/\[[^\]]*\]|\([^)]*\)|\{[^}]*\}/g, " ");
    // unify featuring variants
    s = s.replace(/\b(feat\.|ft\.|featuring)\b/g, " feat ");
    // keep letters, numbers and spaces
    s = s.replace(/[^a-z0-9\s-]/g, " ");
    // collapse dashes/spaces
    s = s.replace(/[\s-]+/g, " ").trim();
    return s;
  }

  private generateQueryVariants(q: string): string[] {
    const original = q;
    const normalized = this.normalizeQuery(q);

    const variants = new Set<string>();
    variants.add(original);
    variants.add(normalized);

    // Detect patterns like "song - artist" and flip
    const dashParts = normalized.split(" - ");
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
    const stop = new Set([
      "the",
      "a",
      "official",
      "lyrics",
      "video",
      "audio",
      "remix",
    ]);
    const tokens = normalized.split(" ");
    const filtered = tokens.filter((t) => !stop.has(t));
    if (filtered.length && filtered.length !== tokens.length) {
      variants.add(filtered.join(" "));
    }

    return Array.from(variants)
      .filter((v) => v.length >= 2)
      .slice(0, 6);
  }

  // ---------- Deezer helpers (no API key, exposes popularity rank) ----------
  private async fetchDeezer(term: string, limit: number): Promise<any> {
    const base = "https://api.deezer.com/search";
    const url = `${base}?q=${encodeURIComponent(term)}&limit=${limit}&order=RANKING`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new HttpException(
        `Deezer API error: ${res.status}`,
        HttpStatus.BAD_GATEWAY
      );
    }
    return res.json();
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
    }));
  }

  // ---------- iTunes helpers (no API key required) ----------
  private async fetchItunes(
    term: string,
    params: Record<string, string>
  ): Promise<any> {
    const base = "https://itunes.apple.com/search";
    const search = new URLSearchParams({ term, media: "music", ...params });
    const url = `${base}?${search.toString()}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new HttpException(
        `iTunes API error: ${res.status}`,
        HttpStatus.BAD_GATEWAY
      );
    }
    return res.json();
  }

  private mapItunesSongs(json: any): MusicSearchResult[] {
    const items = Array.isArray(json?.results) ? json.results : [];
    return items
      .filter((r: any) => r.wrapperType === "track" || r.kind === "song")
      .map((r: any) => ({
        id: String(r.trackId ?? r.collectionId ?? r.artistId),
        title: r.trackName,
        artist: r.artistName,
        album: r.collectionName,
        year: r.releaseDate
          ? String(new Date(r.releaseDate).getFullYear())
          : undefined,
      }));
  }

  private mapItunesArtists(json: any): ArtistSearchResult[] {
    const items = Array.isArray(json?.results) ? json.results : [];
    return items
      .filter((r: any) => r.wrapperType === "artist")
      .map((r: any) => ({
        id: String(r.artistId),
        name: r.artistName,
        disambiguation: r.primaryGenreName,
        country: undefined,
      }));
  }

  // ---------- MusicBrainz (with gentle rate limit) ----------
  private async makeRequest(url: string): Promise<any> {
    // Respect rate limit
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimit) {
      const waitTime = this.rateLimit - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": this.userAgent,
        },
      });

      if (!response.ok) {
        throw new HttpException(
          `MusicBrainz API error: ${response.status}`,
          HttpStatus.BAD_GATEWAY
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to fetch music data",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ---------- Public search methods (Deezer -> iTunes -> MusicBrainz) ----------
  async searchSongs(query: string, limit = 10): Promise<MusicSearchResult[]> {
    if (query.length < 3) {
      return [];
    }

    const variants = this.generateQueryVariants(query);

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
          entity: "song",
          limit: String(limit),
        });
        const itunesResults = this.mapItunesSongs(itunesJson);
        if (itunesResults.length > 0) return itunesResults;
      } catch {
        // continue
      }
    }

    // 3) Fallback: MusicBrainz fuzzy query
    try {
      const norm = this.normalizeQuery(query);
      const tokens = norm.split(" ").filter(Boolean);
      const fuzzy = tokens.map((t) => `recording:${t}~1`).join(" AND ");
      const encodedQuery = encodeURIComponent(fuzzy || norm);
      const url = `${this.baseURL}/recording?query=${encodedQuery}&fmt=json&limit=${limit}`;
      const data = await this.makeRequest(url);
      return (
        data.recordings?.map((recording: any) => ({
          id: recording.id,
          title: recording.title,
          artist: recording["artist-credit"]?.[0]?.name || "Unknown Artist",
          album: recording.releases?.[0]?.title,
          year: recording.releases?.[0]?.date?.split("-")[0],
        })) || []
      );
    } catch (error) {
      console.error("Music search error:", error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Music search failed",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async searchArtists(
    query: string,
    limit = 10
  ): Promise<ArtistSearchResult[]> {
    if (query.length < 2) {
      return [];
    }

    const variants = this.generateQueryVariants(query);

    // iTunes artists across variants (Deezer artist search exists but iTunes is fine for this path)
    for (const v of variants) {
      try {
        const itunesJson = await this.fetchItunes(v, {
          entity: "musicArtist",
          limit: String(limit),
        });
        const itunesArtists = this.mapItunesArtists(itunesJson);
        if (itunesArtists.length > 0) return itunesArtists;
      } catch {
        // continue
      }
    }

    // Fallback: MusicBrainz artists fuzzy
    try {
      const norm = this.normalizeQuery(query);
      const tokens = norm.split(" ").filter(Boolean);
      const fuzzy = tokens.map((t) => `artist:${t}~1`).join(" AND ");
      const encodedQuery = encodeURIComponent(fuzzy || norm);
      const url = `${this.baseURL}/artist?query=${encodedQuery}&fmt=json&limit=${limit}`;

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
      console.error("Artist search error:", error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Artist search failed",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async searchCombined(
    query: string,
    limit = 10
  ): Promise<MusicSearchResult[]> {
    if (query.length < 3) {
      return [];
    }

    const variants = this.generateQueryVariants(query);

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
          entity: "song",
          limit: String(limit),
        });
        const itunesResults = this.mapItunesSongs(itunesJson);
        if (itunesResults.length > 0) return itunesResults;
      } catch {
        // continue
      }
    }

    // 3) Fallback: MusicBrainz combined fuzzy
    try {
      const norm = this.normalizeQuery(query);
      const tokens = norm.split(" ").filter(Boolean);
      const fuzzy = tokens
        .map((t) => `(recording:${t}~1 OR artist:${t}~1)`)
        .join(" AND ");
      const encodedQuery = encodeURIComponent(fuzzy || norm);
      const url = `${this.baseURL}/recording?query=${encodedQuery}&fmt=json&limit=${limit}`;

      const data = await this.makeRequest(url);

      return (
        data.recordings?.map((recording: any) => ({
          id: recording.id,
          title: recording.title,
          artist: recording["artist-credit"]?.[0]?.name || "Unknown Artist",
          album: recording.releases?.[0]?.title,
          year: recording.releases?.[0]?.date?.split("-")[0],
        })) || []
      );
    } catch (error) {
      console.error("Combined search error:", error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Music search failed",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
