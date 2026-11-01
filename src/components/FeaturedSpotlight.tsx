import React from 'react';
import { Star, Eye, Heart, Bookmark } from 'lucide-react';
import { Movie } from '../types';

interface FeaturedSpotlightProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
  isFavorite: boolean;
  onToggleFavorite: (movie: Movie) => void;
  isWatchlist: boolean;
  onToggleWatchlist: (movie: Movie) => void;
}

export const FeaturedSpotlight: React.FC<FeaturedSpotlightProps> = ({
  movie,
  onSelectMovie,
  isFavorite,
  onToggleFavorite,
  isWatchlist,
  onToggleWatchlist,
}) => {
  const backdropUrl = movie.backdrop_path || movie.poster_path || '';
  const releaseYear = (movie.release_date || '').slice(0, 4);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 light:text-zinc-900">
            Featured Spotlight
          </h2>
          <p className="text-xs text-zinc-400 light:text-zinc-600">
            Hand-curated landmark title from our live TMDB catalogue
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl min-h-[380px] flex items-end light:border-zinc-300">
        
        {/* Large Backdrop Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 hover:scale-105"
          style={{ backgroundImage: `url('${backdropUrl}')` }}
        />

        {/* Cinematic Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent light:from-white light:via-white/80" />

        {/* Content Box */}
        <div className="relative z-10 p-6 sm:p-10 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">
            <span>Editor's Selection</span>
            <span aria-hidden="true">&middot;</span>
            <span>{movie.genres.join(', ')}</span>
          </div>

          <h3 className="text-2xl sm:text-4xl font-extrabold text-zinc-100 light:text-zinc-900 leading-tight">
            {movie.title}
          </h3>

          <div className="mt-2.5 flex items-center gap-3 text-xs text-zinc-300 light:text-zinc-700">
            <span>{releaseYear}</span>
            <span aria-hidden="true">&middot;</span>
            <div className="flex items-center gap-1 font-mono text-amber-400 font-semibold">
              <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
              <span>{Number(movie.vote_average).toFixed(1)}</span>
            </div>
            <span className="text-[11px] text-zinc-400 light:text-zinc-500">
              Source: {movie.rating_source || 'TMDB'} ({(movie.vote_count || 0).toLocaleString()} votes)
            </span>
            <span aria-hidden="true">&middot;</span>
            <span>{movie.runtime ? `${movie.runtime} min` : ''}</span>
          </div>

          <p className="mt-3 text-sm text-zinc-300 light:text-zinc-700 line-clamp-3 max-w-2xl leading-relaxed">
            {movie.overview}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onSelectMovie(movie)}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors cursor-pointer"
            >
              <Eye className="h-4 w-4" />
              <span>View Details &amp; Where to Watch</span>
            </button>

            <button
              onClick={() => onToggleFavorite(movie)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                isFavorite
                  ? 'bg-amber-500 text-zinc-950 border-amber-500'
                  : 'bg-zinc-900/80 text-zinc-200 border-zinc-700 hover:bg-zinc-800 light:bg-zinc-100 light:text-zinc-900 light:border-zinc-300'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
              <span>{isFavorite ? 'In Favorites' : 'Add to Favorites'}</span>
            </button>

            <button
              onClick={() => onToggleWatchlist(movie)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                isWatchlist
                  ? 'bg-amber-500 text-zinc-950 border-amber-500'
                  : 'bg-zinc-900/80 text-zinc-200 border-zinc-700 hover:bg-zinc-800 light:bg-zinc-100 light:text-zinc-900 light:border-zinc-300'
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${isWatchlist ? 'fill-current' : ''}`} />
              <span>{isWatchlist ? 'On Watchlist' : 'Add to Watchlist'}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
