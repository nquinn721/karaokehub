export interface MusicSearchResult {
  title: string;
  artist: string;
  album?: string;
  releaseDate?: string;
  duration?: number;
  previewUrl?: string;
  spotifyId?: string;
  itunesId?: number;
  popularity?: number;
  imageUrl?: string;
  source: 'spotify' | 'itunes';
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
