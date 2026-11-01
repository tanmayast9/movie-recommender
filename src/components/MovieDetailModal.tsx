import React, { useState, useMemo } from 'react';
import { X, Star, Heart, Bookmark, ArrowLeft, Tv, Lightbulb, ExternalLink, Film, CheckCircle2 } from 'lucide-react';
import { Movie, WatchProvidersData } from '../types';
import { getWatchProviders } from '../data/movies';
import { ClientRecommendationEngine } from '../services/recommender';
import { MovieCard } from './MovieCard';

interface MovieDetailModalProps {
  movie: Movie;
  allMovies: Movie[];
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
  isFavorite: boolean;
  onToggleFavorite: (movie: Movie) => void;
  isWatchlist: boolean;
  onToggleWatchlist: (movie: Movie) => void;
  userFavorites: Set<number>;
  userWatchlist: Set<number>;
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({
  movie,
  allMovies,
  onClose,
  onSelectMovie,
  isFavorite,
  onToggleFavorite,
  isWatchlist,
  onToggleWatchlist,
  userFavorites,
  userWatchlist,
}) => {
  const [selectedRegion, setSelectedRegion] = useState('IN');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Compute Where to Watch data (default India)
  const watchData: WatchProvidersData = useMemo(() => {
    return getWatchProviders(movie.id, selectedRegion);
  }, [movie.id, selectedRegion]);

  // Compute Content-Based Similar Movies using TF-IDF Engine
  const engine = useMemo(() => new ClientRecommendationEngine(allMovies), [allMovies]);
  const similarMovies = useMemo(() => {
    return engine.computeSimilarity(movie, 4);
  }, [engine, movie]);

  const releaseYear = (movie.release_date || '').slice(0, 4);
  const backdropUrl = movie.backdrop_path || movie.poster_path || '';

  const handleFavoriteClick = () => {
    onToggleFavorite(movie);
    setFeedbackMessage(isFavorite ? 'Removed from your favorites' : 'Saved to your favorites');
    setTimeout(() => setFeedbackMessage(null), 2500);
  };

  const handleWatchlistClick = () => {
    onToggleWatchlist(movie);
    setFeedbackMessage(isWatchlist ? 'Removed from your watchlist' : 'Added to your watchlist');
    setTimeout(() => setFeedbackMessage(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      
      <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl text-zinc-100 my-auto light:bg-white light:border-zinc-200 light:text-zinc-900">
        
        {/* Close Button Top-Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer border border-zinc-700/60 light:bg-zinc-100 light:text-zinc-700 light:border-zinc-300"
          aria-label="Close details"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Large Backdrop Hero with Scrim */}
        <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden bg-zinc-900">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('${backdropUrl}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent light:from-white light:via-white/70" />
          
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 text-xs font-semibold text-zinc-300 hover:text-white border border-zinc-700/60 cursor-pointer light:bg-white/90 light:text-zinc-800 light:border-zinc-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="relative z-10 px-6 sm:px-10 pb-12 -mt-24 sm:-mt-32 space-y-8">
          
          {/* Movie Header Split: Poster + Metadata */}
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            
            {/* Poster (Standard 2:3) */}
            <div className="w-36 sm:w-48 md:w-56 shrink-0 aspect-[2/3] rounded-xl overflow-hidden border-2 border-zinc-700/80 shadow-2xl bg-zinc-900 light:border-zinc-200">
              {movie.poster_path ? (
                <img
                  src={movie.poster_path}
                  alt={movie.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center p-4 text-center bg-zinc-900 text-zinc-500">
                  <Film className="h-8 w-8 mb-2 text-amber-500" />
                  <span className="text-xs">Poster Unavailable</span>
                </div>
              )}
            </div>

            {/* Info Column */}
            <div className="flex-1 space-y-3">
              
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-zinc-100 light:text-zinc-900">
                {movie.title}
              </h1>

              {/* Zero-Pill Clean Metadata Row with Dot Separators */}
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-400 light:text-zinc-600">
                <span>{releaseYear}</span>
                <span aria-hidden="true">&middot;</span>
                <span>{movie.runtime ? `${movie.runtime} min` : 'Runtime N/A'}</span>
                <span aria-hidden="true">&middot;</span>
                <span className="uppercase font-medium">{movie.language_name || movie.original_language}</span>
                <span aria-hidden="true">&middot;</span>
                <span>{movie.origin_country ? movie.origin_country.join(', ') : 'Global'}</span>
              </div>

              {/* Explicit Rating Badge with Verified TMDB Attribution */}
              <div className="inline-flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 light:bg-zinc-50 light:border-zinc-200">
                <div className="flex items-center gap-1.5 font-mono text-base font-bold text-amber-400">
                  <Star className="h-4 w-4 fill-current text-amber-500" />
                  <span>{Number(movie.vote_average || 0).toFixed(1)}</span>
                </div>
                <div className="text-left border-l border-zinc-700 pl-3 light:border-zinc-300">
                  <div className="text-[11px] font-bold text-zinc-300 light:text-zinc-800 uppercase tracking-tight">
                    Source: {movie.rating_source || 'TMDB'}
                  </div>
                  <div className="text-[10px] text-zinc-400 light:text-zinc-500 font-mono">
                    Based on {(movie.vote_count || 0).toLocaleString()} user votes
                  </div>
                </div>
              </div>

              {/* Genres list */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {movie.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-xs text-zinc-300 light:bg-zinc-100 light:border-zinc-200 light:text-zinc-700"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {/* Action Buttons: Favorite & Watchlist */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleFavoriteClick}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                    isFavorite
                      ? 'bg-amber-500 text-zinc-950 border-amber-500'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800 light:bg-zinc-100 light:border-zinc-300 light:text-zinc-800'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                  <span>{isFavorite ? 'Saved in Favorites' : 'Add to Favorites'}</span>
                </button>

                <button
                  onClick={handleWatchlistClick}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                    isWatchlist
                      ? 'bg-amber-500 text-zinc-950 border-amber-500'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800 light:bg-zinc-100 light:border-zinc-300 light:text-zinc-800'
                  }`}
                >
                  <Bookmark className={`h-4 w-4 ${isWatchlist ? 'fill-current' : ''}`} />
                  <span>{isWatchlist ? 'On Watchlist' : 'Add to Watchlist'}</span>
                </button>

                <a
                  href={`https://www.themoviedb.org/movie/${movie.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-400 hover:text-amber-400 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>View on TMDB</span>
                </a>
              </div>

              {/* Instant feedback notification */}
              {feedbackMessage && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 animate-in fade-in duration-150">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{feedbackMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Synopsis & Cast Split */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-zinc-800/80 light:border-zinc-200">
            <div className="md:col-span-2 space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 light:text-zinc-600">
                Synopsis
              </h3>
              <p className="text-sm text-zinc-300 light:text-zinc-700 leading-relaxed">
                {movie.overview || 'No synopsis provided for this title.'}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold uppercase tracking-wider text-zinc-500 block mb-0.5">Director</span>
                <span className="text-zinc-200 light:text-zinc-800 font-medium">{movie.director || 'Unavailable'}</span>
              </div>
              <div>
                <span className="font-bold uppercase tracking-wider text-zinc-500 block mb-0.5">Top Cast</span>
                <span className="text-zinc-300 light:text-zinc-700 leading-normal">
                  {movie.cast && movie.cast.length > 0 ? movie.cast.join(', ') : 'Information unavailable'}
                </span>
              </div>
            </div>
          </div>

          {/* Phase 2 Step C: Transparent "Why This Movie?" Explanation */}
          <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 sm:p-5 light:border-amber-500/30 light:bg-amber-50">
            <div className="flex items-center gap-2 mb-2 text-amber-500">
              <Lightbulb className="h-4 w-4 shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Why This Recommendation? (Recommendation Transparency)
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 light:text-zinc-800 leading-relaxed">
              This film was surfaced via deterministic preference matching on genre affinity (<strong>{movie.genres.join(', ')}</strong>), language profile (<strong>{movie.language_name}</strong>), and verified rating thresholds ({movie.vote_average}+ on TMDB). The recommendation engine uses transparent rule citation without AI hallucination.
            </p>
          </section>

          {/* Section 8: Where to Watch (Streaming Availability with India default) */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 light:bg-zinc-50 light:border-zinc-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Tv className="h-4 w-4 text-amber-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200 light:text-zinc-800">
                  Where to Watch (Streaming Availability)
                </h4>
              </div>

              {/* Region Selector (India default) */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-400">Region:</span>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none light:bg-white light:border-zinc-300 light:text-zinc-900"
                >
                  <option value="IN">India (IN) - Default</option>
                  <option value="US">United States (US)</option>
                </select>
              </div>
            </div>

            {watchData.has_providers ? (
              <div className="space-y-3 pt-1">
                {watchData.flatrate.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-zinc-400 block mb-1.5 uppercase">
                      Subscription Streaming
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {watchData.flatrate.map((p) => (
                        <div
                          key={p.provider_name}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium light:bg-white light:border-zinc-200"
                        >
                          {p.logo_path && (
                            <img src={p.logo_path} alt={p.provider_name} className="h-4 w-4 rounded" />
                          )}
                          <span>{p.provider_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {watchData.rent.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-zinc-400 block mb-1.5 uppercase">
                      Rent
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {watchData.rent.map((p) => (
                        <div
                          key={p.provider_name}
                          className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs light:bg-white light:border-zinc-200"
                        >
                          {p.provider_name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {watchData.buy.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-zinc-400 block mb-1.5 uppercase">
                      Buy
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {watchData.buy.map((p) => (
                        <div
                          key={p.provider_name}
                          className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs light:bg-white light:border-zinc-200"
                        >
                          {p.provider_name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-zinc-500 pt-1 italic">
                  {watchData.attribution}
                </p>
              </div>
            ) : (
              <div className="text-xs text-zinc-400 light:text-zinc-600">
                <p>{watchData.message}</p>
                <p className="text-[11px] text-zinc-500 mt-1 italic">{watchData.attribution}</p>
              </div>
            )}
          </section>

          {/* Similar Movies Section (TF-IDF Vector Similarity) */}
          <section className="space-y-4 pt-4 border-t border-zinc-800/80 light:border-zinc-200">
            <div>
              <h3 className="text-base font-bold text-zinc-100 light:text-zinc-900">
                Similar Movies (Content-Based Filtering)
              </h3>
              <p className="text-xs text-zinc-400 light:text-zinc-600">
                Ranked using TF-IDF vectorization and cosine similarity over narrative metadata and shared genre weightings.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {similarMovies.map((similar) => (
                <MovieCard
                  key={similar.id}
                  movie={similar}
                  onSelectMovie={onSelectMovie}
                  isFavorite={userFavorites.has(similar.id)}
                  onToggleFavorite={onToggleFavorite}
                  isWatchlist={userWatchlist.has(similar.id)}
                  onToggleWatchlist={onToggleWatchlist}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
