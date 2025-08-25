export interface AlbumArt {
  small?: string;
  medium?: string;
  large?: string;
}

export interface MusicSearchResult {
  id: string; // iTunes track ID
  title: string;
  artist: string;
  album?: string;
  releaseDate?: string;
  year?: string; // Extracted from releaseDate for easier frontend use
  duration?: number;
  previewUrl?: string; // 30-second preview URL from iTunes
  itunesId?: number;
  popularity?: number;
  imageUrl?: string; // Backward compatibility
  albumArt?: AlbumArt; // Structured album art with different sizes
  source: 'itunes'; // Using iTunes API for music search
  itunesUrl?: string;
}

export interface ArtistSearchResult {
  name: string;
  itunesId?: number;
  popularity?: number;
  imageUrl?: string;
  followers?: number;
  genres?: string[];
  source: 'itunes';
  itunesUrl?: string;
}

export interface SearchResponse<T> {
  results: T[];
  count: number;
  offset: number;
}
