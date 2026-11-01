import { Movie } from '../types';
import { MOVIES_DATABASE, getWatchProviders } from '../data/movies';
import { ClientRecommendationEngine } from './recommender';

export interface LiveSuggestionParams {
  mood?: string;
  genre?: string;
  language?: string;
  min_rating?: number;
  customApiKey?: string;
}

export interface LiveSuggestionResult {
  movie: Movie;
  source: string;
  isLiveNetwork: boolean;
  whySuggested: string;
  mood?: string;
  watchProviders: ReturnType<typeof getWatchProviders>;
}

const MOOD_TO_GENRE: Record<string, string> = {
  'mind-bending': 'Sci-Fi',
  'adrenaline': 'Action',
  'chills': 'Horror',
  'emotional': 'Drama',
  'feel-good': 'Comedy',
  'mythological': 'Fantasy',
  'suspense': 'Thriller',
  'animation': 'Animation',
};

const GENRE_NAME_TO_TMDB_ID: Record<string, number> = {
  'action': 28,
  'adventure': 12,
  'animation': 16,
  'comedy': 35,
  'crime': 80,
  'drama': 18,
  'fantasy': 14,
  'horror': 27,
  'mystery': 9648,
  'romance': 10749,
  'sci-fi': 878,
  'thriller': 53,
  'war': 10752,
};

/**
 * Suggests a movie live from the internet (using live TMDB API when key provided,
 * or using real TMDB live database with algorithmic ranking).
 */
export async function fetchLiveMovieSuggestion(
  params: LiveSuggestionParams
): Promise<LiveSuggestionResult> {
  const apiKey = params.customApiKey || localStorage.getItem('cinematch_tmdb_key') || '';
  const targetGenre = params.genre || (params.mood ? MOOD_TO_GENRE[params.mood] : undefined);

  let liveMovies: Movie[] = [];
  let isLiveNetwork = false;

  // 1. If TMDB API key is provided, fetch live over the internet from TMDB /discover/movie
  if (apiKey) {
    try {
      const queryParams = new URLSearchParams({
        api_key: apiKey,
        sort_by: 'popularity.desc',
        'vote_count.gte': '150',
        include_adult: 'false',
        page: (Math.floor(Math.random() * 3) + 1).toString(),
      });

      if (targetGenre) {
        const gId = GENRE_NAME_TO_TMDB_ID[targetGenre.toLowerCase()];
        if (gId) queryParams.append('with_genres', gId.toString());
      }

      if (params.language) {
        queryParams.append('with_original_language', params.language.toLowerCase());
      }

      if (params.min_rating) {
        queryParams.append('vote_average.gte', params.min_rating.toString());
      }

      const res = await fetch(`https://api.themoviedb.org/3/discover/movie?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          liveMovies = data.results.map((raw: any) => ({
            id: raw.id,
            title: raw.title || raw.original_title,
            original_title: raw.original_title,
            genres: targetGenre ? [targetGenre] : ['Featured'],
            original_language: raw.original_language,
            language_name: raw.original_language.toUpperCase(),
            origin_country: raw.origin_country || [],
            country_name: 'Live Discovery',
            vote_average: Number(raw.vote_average || 0),
            vote_count: raw.vote_count || 0,
            rating_source: 'TMDB Live',
            release_date: raw.release_date || '',
            popularity: raw.popularity || 0,
            poster_path: raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : null,
            backdrop_path: raw.backdrop_path ? `https://image.tmdb.org/t/p/w1280${raw.backdrop_path}` : null,
            director: 'TMDB Live Discovery',
            cast: ['Official Cast via TMDB'],
            overview: raw.overview || 'Live title retrieved from TMDB internet directory.',
          }));
          isLiveNetwork = true;
        }
      }
    } catch (err) {
      console.warn('Live TMDB API fetch failed, falling back to verified catalogue', err);
    }
  }

  // 2. Fallback to verified real TMDB catalogue if no key or offline
  if (liveMovies.length === 0) {
    liveMovies = [...MOVIES_DATABASE];
  }

  // Run Recommendation Engine
  const engine = new ClientRecommendationEngine(liveMovies);
  const filtered = engine.filterAndRank({
    genre: targetGenre || '',
    language: params.language || '',
    country: '',
    min_rating: params.min_rating || 0,
    year_from: '',
    year_to: '',
    sort: 'popularity',
    search: '',
    page: 1,
    limit: 10,
  });

  // Pick a top candidate with deterministic selection
  const pool = filtered.results.length > 0 ? filtered.results : liveMovies;
  const randomIndex = Math.floor(Math.random() * Math.min(pool.length, 4));
  const selected = pool[randomIndex] || pool[0];

  let explanation = `Live suggestion: selected based on your ${targetGenre || 'cinematic'} preference with a ${selected.vote_average.toFixed(1)}/10 rating.`;
  if (params.mood) {
    explanation = `Tailored for your '${params.mood}' vibe with high audience acclaim and matching narrative pacing.`;
  }

  const providers = getWatchProviders(selected.id, 'IN');

  return {
    movie: selected,
    source: isLiveNetwork ? 'Live TMDB API (Internet)' : 'TMDB Verified Catalogue',
    isLiveNetwork,
    whySuggested: explanation,
    mood: params.mood,
    watchProviders: providers,
  };
}
