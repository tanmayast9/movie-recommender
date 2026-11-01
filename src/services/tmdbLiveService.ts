import { Movie, FilterState } from '../types';
import { MOVIES_DATABASE } from '../data/movies';

export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE_W500 = 'https://image.tmdb.org/t/p/w500';
export const TMDB_IMAGE_BASE_W1280 = 'https://image.tmdb.org/t/p/w1280';
export const TMDB_SITE_URL = 'https://www.themoviedb.org';

const GENRE_MAP: Record<string, number> = {
  'action': 28,
  'adventure': 12,
  'animation': 16,
  'comedy': 35,
  'crime': 80,
  'documentary': 99,
  'drama': 18,
  'family': 10751,
  'fantasy': 14,
  'history': 36,
  'horror': 27,
  'music': 10402,
  'mystery': 9648,
  'romance': 10749,
  'sci-fi': 878,
  'science fiction': 878,
  'thriller': 53,
  'war': 10752,
  'western': 37,
};

const GENRE_ID_TO_NAME: Record<number, string> = Object.entries(GENRE_MAP).reduce((acc, [name, id]) => {
  if (!acc[id]) {
    acc[id] = name.charAt(0).toUpperCase() + name.slice(1);
  }
  return acc;
}, {} as Record<number, string>);

export function getActiveTmdbKey(): string {
  return (
    (typeof window !== 'undefined' && localStorage.getItem('cinematch_tmdb_key')) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_TMDB_API_KEY) ||
    ''
  );
}

export function setActiveTmdbKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cinematch_tmdb_key', key.trim());
  }
}

export async function validateTmdbKey(key: string): Promise<{ valid: boolean; message: string }> {
  if (!key.trim()) {
    return { valid: false, message: 'Please enter an API key.' };
  }
  try {
    const res = await fetch(`${TMDB_BASE_URL}/configuration?api_key=${encodeURIComponent(key.trim())}`);
    if (res.ok) {
      return { valid: true, message: 'Connected to TMDB (themoviedb.org) successfully!' };
    }
    if (res.status === 401) {
      return { valid: false, message: 'Invalid TMDB API key. Check your key from themoviedb.org/settings/api.' };
    }
    return { valid: false, message: `TMDB returned status ${res.status}.` };
  } catch (err: any) {
    return { valid: false, message: 'Network request to themoviedb.org failed.' };
  }
}

export function normalizeRawTmdbMovie(raw: any): Movie {
  const genres = raw.genres
    ? raw.genres.map((g: any) => g.name || g)
    : (raw.genre_ids || []).map((id: number) => GENRE_ID_TO_NAME[id] || 'Film');

  const credits = raw.credits || {};
  const crew = credits.crew || [];
  const cast = (credits.cast || []).slice(0, 5).map((c: any) => c.name);
  const director = crew.find((c: any) => c.job === 'Director')?.name || 'Information via TMDB';

  return {
    id: raw.id,
    title: raw.title || raw.original_title || 'Untitled',
    original_title: raw.original_title || raw.title || 'Untitled',
    genres: genres.length > 0 ? genres : ['Cinema'],
    genre_ids: raw.genre_ids,
    original_language: raw.original_language || 'en',
    language_name: (raw.original_language || 'en').toUpperCase(),
    origin_country: raw.origin_country || (raw.production_countries ? raw.production_countries.map((c: any) => c.iso_3166_1) : []),
    country_name: 'TMDB Live',
    vote_average: Number(raw.vote_average || 0),
    vote_count: raw.vote_count || 0,
    rating_source: 'TMDB (themoviedb.org)',
    release_date: raw.release_date || '',
    runtime: raw.runtime,
    popularity: raw.popularity || 0,
    poster_path: raw.poster_path ? `${TMDB_IMAGE_BASE_W500}${raw.poster_path}` : null,
    backdrop_path: raw.backdrop_path ? `${TMDB_IMAGE_BASE_W1280}${raw.backdrop_path}` : null,
    director,
    cast: cast.length > 0 ? cast : ['Cast data via themoviedb.org'],
    overview: raw.overview || 'Live metadata from themoviedb.org.',
  };
}

/**
 * Live Fetch Movies from themoviedb.org with full filter support.
 */
export async function fetchLiveMoviesFromTMDB(
  filters: FilterState
): Promise<{ results: Movie[]; total: number; isLive: boolean; suggestion?: string }> {
  const apiKey = getActiveTmdbKey();

  if (!apiKey) {
    return {
      results: [],
      total: 0,
      isLive: false,
    };
  }

  try {
    const isSearch = Boolean(filters.search && filters.search.trim());
    let url = '';
    const params = new URLSearchParams({
      api_key: apiKey,
      include_adult: 'false',
      page: filters.page.toString(),
    });

    if (isSearch) {
      url = `${TMDB_BASE_URL}/search/movie`;
      params.append('query', filters.search.trim());
    } else {
      url = `${TMDB_BASE_URL}/discover/movie`;
      
      // Sort mapping
      switch (filters.sort) {
        case 'rating':
          params.append('sort_by', 'vote_average.desc');
          params.append('vote_count.gte', '200');
          break;
        case 'rating_asc':
          params.append('sort_by', 'vote_average.asc');
          params.append('vote_count.gte', '50');
          break;
        case 'release_date':
          params.append('sort_by', 'primary_release_date.desc');
          break;
        case 'release_date_asc':
          params.append('sort_by', 'primary_release_date.asc');
          break;
        case 'title':
          params.append('sort_by', 'original_title.asc');
          break;
        default:
          params.append('sort_by', 'popularity.desc');
          params.append('vote_count.gte', '100');
      }

      if (filters.genre && filters.genre !== 'All Genres') {
        const gId = GENRE_MAP[filters.genre.toLowerCase()];
        if (gId) params.append('with_genres', gId.toString());
      }

      if (filters.language) {
        params.append('with_original_language', filters.language.toLowerCase());
      }

      if (filters.country) {
        params.append('with_origin_country', filters.country.toUpperCase());
      }

      if (filters.min_rating > 0) {
        params.append('vote_average.gte', filters.min_rating.toString());
      }

      if (filters.year_from) {
        params.append('primary_release_date.gte', `${filters.year_from}-01-01`);
      }

      if (filters.year_to) {
        params.append('primary_release_date.lte', `${filters.year_to}-12-31`);
      }
    }

    const res = await fetch(`${url}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`TMDB error status ${res.status}`);
    }

    const data = await res.json();
    const rawList = data.results || [];
    const total = data.total_results || rawList.length;
    const normalized = rawList.map(normalizeRawTmdbMovie);

    return {
      results: normalized,
      total,
      isLive: true,
      suggestion: total === 0 ? "TMDB returned no movies for this filter combination. Try relaxing your rating threshold or release year window." : undefined,
    };
  } catch (err) {
    console.warn('Live fetch from themoviedb.org failed, falling back', err);
    return {
      results: [],
      total: 0,
      isLive: false,
    };
  }
}

/**
 * Fetch Full Movie Details from themoviedb.org.
 */
export async function fetchLiveMovieDetails(movieId: number): Promise<Movie | null> {
  const apiKey = getActiveTmdbKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}?api_key=${apiKey}&append_to_response=credits,watch/providers,similar`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return normalizeRawTmdbMovie(data);
  } catch (err) {
    console.warn('Failed to fetch details from themoviedb.org', err);
    return null;
  }
}
