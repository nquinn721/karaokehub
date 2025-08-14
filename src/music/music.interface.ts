export interface MusicSearchResult {
  id: string;
  title: string;
  artist?: string;
  artistId?: string;
  album?: string;
  year?: string;
  duration?: number;
  country?: string;
  disambiguation?: string;
  tags?: string[];
  score?: number;
}

export interface ArtistSearchResult {
  id: string;
  name: string;
  type?: string;
  country?: string;
  area?: string;
  disambiguation?: string;
  tags?: string[];
  score?: number;
  beginDate?: string;
  endDate?: string;
}

export interface SearchResponse<T> {
  results: T[];
  count: number;
  offset: number;
}

export interface MusicBrainzResponse {
  recordings?: any[];
  artists?: any[];
  count: number;
  offset: number;
}
