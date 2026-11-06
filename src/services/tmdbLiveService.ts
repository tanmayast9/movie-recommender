import { Movie, FilterState } from '../types';
import { WatchProvidersData } from '../types';

export const TMDB_IMAGE_BASE_W500 = 'https://image.tmdb.org/t/p/w500';
export const TMDB_IMAGE_BASE_W1280 = 'https://image.tmdb.org/t/p/w1280';

async function fetchApi<T>(path: string, params?: URLSearchParams): Promise<T> {
  const query = params?.toString();
  const response = await fetch(`/api/${path}${query ? `?${query}` : ''}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Movie service returned status ${response.status}.`);
  }
  return data as T;
}

export function normalizeRawTmdbMovie(raw: Record<string, any>): Movie {
  const genres = raw.genres
    ? raw.genres.map((genre: any) => genre.name || genre)
    : [];

  const credits = raw.credits || {};
  const crew = credits.crew || [];
  const cast = raw.cast || (credits.cast || []).slice(0, 5).map((member: any) => member.name);
  const director = crew.find((c: any) => c.job === 'Director')?.name || 'Information via TMDB';
  const posterPath = raw.poster_path || null;
  const backdropPath = raw.backdrop_path || null;

  return {
    id: raw.id,
    title: raw.title || raw.original_title || 'Untitled',
    original_title: raw.original_title || raw.title || 'Untitled',
    genres: genres.length > 0 ? genres : ['Cinema'],
    genre_ids: raw.genre_ids,
    original_language: raw.original_language || 'en',
    language_name: raw.language_name || (raw.original_language || 'en').toUpperCase(),
    origin_country: raw.origin_country || (raw.production_countries ? raw.production_countries.map((c: any) => c.iso_3166_1) : []),
    country_name: raw.country_name || 'TMDB',
    vote_average: Number(raw.vote_average || 0),
    vote_count: raw.vote_count || 0,
    rating_source: raw.rating_source || 'TMDB',
    release_date: raw.release_date || '',
    runtime: raw.runtime,
    popularity: raw.popularity || 0,
    poster_path: posterPath ? (posterPath.startsWith('http') ? posterPath : `${TMDB_IMAGE_BASE_W500}${posterPath}`) : null,
    backdrop_path: backdropPath ? (backdropPath.startsWith('http') ? backdropPath : `${TMDB_IMAGE_BASE_W1280}${backdropPath}`) : null,
    director: raw.director || director,
    cast: cast.length > 0 ? cast : ['Cast data via themoviedb.org'],
    overview: raw.overview || 'Live metadata from themoviedb.org.',
  };
}

export async function fetchLiveMoviesFromTMDB(
  filters: FilterState
): Promise<{ results: Movie[]; total: number; isLive: boolean; available: boolean; suggestion?: string }> {
  try {
    const params = new URLSearchParams({
      page: filters.page.toString(),
      limit: filters.limit.toString(),
      sort: filters.sort,
    });
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.genre && filters.genre !== 'All Genres') params.set('genre', filters.genre);
    if (filters.language) params.set('language', filters.language);
    if (filters.country) params.set('country', filters.country);
    if (filters.min_rating > 0) params.set('min_rating', filters.min_rating.toString());
    if (filters.year_from) params.set('year_from', filters.year_from);
    if (filters.year_to) params.set('year_to', filters.year_to);

    const data = await fetchApi<{
      results: Record<string, any>[];
      total_results: number;
      source: string;
      warning?: string;
      suggestion?: string;
    }>('movies', params);
    return {
      results: data.results.map(normalizeRawTmdbMovie),
      total: data.total_results,
      isLive: data.source === 'tmdb',
      available: true,
      suggestion: data.suggestion || data.warning,
    };
  } catch (error) {
    console.warn('Movie API unavailable; using the local curated catalogue.', error);
    return { results: [], total: 0, isLive: false, available: false };
  }
}

export async function fetchMovieGenres(): Promise<string[] | null> {
  try {
    const data = await fetchApi<{ genres: { name: string }[] }>('genres');
    return data.genres.map((genre) => genre.name);
  } catch (error) {
    console.warn('Could not load genres from the movie API.', error);
    return null;
  }
}

export async function fetchLiveMovieDetails(movieId: number): Promise<Movie | null> {
  try {
    const data = await fetchApi<{ movie: Record<string, any> }>(`movies/${movieId}`);
    return normalizeRawTmdbMovie(data.movie);
  } catch (error) {
    console.warn('Could not load movie details from the movie API.', error);
    return null;
  }
}

export async function fetchSimilarMovies(movieId: number, limit = 4): Promise<Movie[] | null> {
  try {
    const data = await fetchApi<{ results: Record<string, any>[] }>(
      `movies/${movieId}/similar`,
      new URLSearchParams({ limit: limit.toString() }),
    );
    return data.results.map(normalizeRawTmdbMovie);
  } catch (error) {
    console.warn('Could not load similar movies from the movie API.', error);
    return null;
  }
}

export async function fetchWatchProviders(movieId: number, region: string): Promise<WatchProvidersData | null> {
  try {
    return await fetchApi<WatchProvidersData>(
      `movies/${movieId}/watch-providers`,
      new URLSearchParams({ region }),
    );
  } catch (error) {
    console.warn('Could not load watch providers from the movie API.', error);
    return null;
  }
}
