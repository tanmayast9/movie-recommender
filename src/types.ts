export interface Movie {
  id: number;
  title: string;
  original_title: string;
  genres: string[];
  genre_ids?: number[];
  original_language: string;
  language_name: string;
  origin_country: string[];
  country_name: string;
  vote_average: number;
  vote_count: number;
  rating_source: string; // e.g. "TMDB"
  release_date: string;
  runtime?: number;
  popularity: number;
  poster_path: string | null;
  backdrop_path: string | null;
  director: string;
  cast: string[];
  overview: string;
  similarity_score?: number;
  similarity_percentage?: number;
  similarity_reasons?: string[];
  why_recommended?: string;
}

export interface WatchProviderItem {
  provider_name: string;
  logo_path?: string;
}

export interface WatchProvidersData {
  movie_id: number;
  region: string;
  has_providers: boolean;
  attribution: string;
  message: string;
  flatrate: WatchProviderItem[];
  rent: WatchProviderItem[];
  buy: WatchProviderItem[];
}

export interface FilterState {
  genre: string;
  language: string;
  country: string;
  min_rating: number;
  max_rating?: number;
  year_from: string;
  year_to: string;
  sort: string;
  search: string;
  page: number;
  limit: number;
}

export interface UserAccount {
  id: number;
  username: string;
  email: string;
  theme_preference: 'dark' | 'light';
  created_at?: string;
}

export interface RecentSearchItem {
  id: string;
  query: string;
  filtersSummary: string;
  timestamp: number;
}
