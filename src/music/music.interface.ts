export interface AlbumArt {
  small?: string;
  medium?: string;
  large?: string;
}

export interface MusicSearchResult {
  id: string; // General unique identifier (spotifyId for Spotify, itunesId for iTunes)
  title: string;
  artist: string;
  album?: string;
  releaseDate?: string;
  year?: string; // Extracted from releaseDate for easier frontend use
  duration?: number;
  previewUrl?: string; // 30-second preview URL (Spotify/iTunes) - availability varies by track
  spotifyId?: string;
  itunesId?: number;
  popularity?: number;
  imageUrl?: string; // Backward compatibility
  albumArt?: AlbumArt; // Structured album art with different sizes
  source: 'spotify' | 'itunes'; // Auto-selected: Spotify (production), iTunes (localhost/fallback)
  spotifyUrl?: string;
  itunesUrl?: string;
}

export interface ArtistSearchResult {
  name: string;
  spotifyId?: string;
  itunesId?: number;
  popularity?: number;
  imageUrl?: string;
  followers?: number;
  genres?: string[];
  source: 'spotify' | 'itunes';
  spotifyUrl?: string;
  itunesUrl?: string;
}

export interface SearchResponse<T> {
  results: T[];
  count: number;
  offset: number;
}
