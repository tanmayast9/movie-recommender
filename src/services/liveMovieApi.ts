import { Movie } from '../types';
import { MOVIES_DATABASE, getWatchProviders } from '../data/movies';
import { ClientRecommendationEngine } from './recommender';
import { normalizeRawTmdbMovie } from './tmdbLiveService';

export interface LiveSuggestionParams {
  mood?: string;
  genre?: string;
  language?: string;
  min_rating?: number;
}

export interface LiveSuggestionResult {
  movie: Movie;
  source: string;
  isLiveNetwork: boolean;
  whySuggested: string;
  mood?: string;
  watchProviders: ReturnType<typeof getWatchProviders>;
  warning?: string;
}

export async function fetchLiveMovieSuggestion(
  params: LiveSuggestionParams
): Promise<LiveSuggestionResult> {
  const query = new URLSearchParams();
  if (params.mood) query.set('mood', params.mood);
  if (params.genre) query.set('genre', params.genre);
  if (params.language) query.set('language', params.language);
  if (params.min_rating !== undefined) query.set('min_rating', params.min_rating.toString());

  try {
    const response = await fetch(`/api/suggest-live?${query.toString()}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Movie service returned status ${response.status}.`);
    }

    return {
      movie: normalizeRawTmdbMovie(data.movie),
      source: data.source,
      isLiveNetwork: Boolean(data.is_live_network),
      whySuggested: data.why_suggested,
      mood: data.mood,
      watchProviders: data.watch_providers || getWatchProviders(data.movie.id, 'IN'),
      warning: data.warning,
    };
  } catch (error) {
    console.warn('Movie suggestion API unavailable; using the local curated catalogue.', error);
    return getCuratedSuggestion(params);
  }
}

function getCuratedSuggestion(params: LiveSuggestionParams): LiveSuggestionResult {
  const moodToGenre: Record<string, string> = {
    'mind-bending': 'Sci-Fi',
    adrenaline: 'Action',
    chills: 'Horror',
    emotional: 'Drama',
    'feel-good': 'Comedy',
    mythological: 'Fantasy',
    suspense: 'Thriller',
  };
  const targetGenre = params.genre || (params.mood ? moodToGenre[params.mood] : undefined);
  const engine = new ClientRecommendationEngine(MOVIES_DATABASE);
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
  const pool = filtered.results.length > 0 ? filtered.results : MOVIES_DATABASE;
  const selected = pool[Math.floor(Math.random() * Math.min(pool.length, 4))] || pool[0];
  const explanation = params.mood
    ? `Tailored for your '${params.mood}' vibe with high audience acclaim and matching narrative pacing.`
    : `Selected based on your ${targetGenre || 'cinematic'} preference with a ${selected.vote_average.toFixed(1)}/10 rating.`;

  return {
    movie: selected,
    source: 'CineMatch Curated Catalogue',
    isLiveNetwork: false,
    whySuggested: explanation,
    mood: params.mood,
    watchProviders: getWatchProviders(selected.id, 'IN'),
    warning: 'The movie service is unavailable. Showing a suggestion from the local catalogue.',
  };
}
