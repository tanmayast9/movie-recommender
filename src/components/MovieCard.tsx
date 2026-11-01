import React from 'react';
import { Star, Heart, Bookmark, Eye, Film } from 'lucide-react';
import { Movie } from '../types';

interface MovieCardProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
  isFavorite: boolean;
  onToggleFavorite: (movie: Movie) => void;
  isWatchlist: boolean;
  onToggleWatchlist: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onSelectMovie,
  isFavorite,
  onToggleFavorite,
  isWatchlist,
  onToggleWatchlist,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const releaseYear = movie.release_date ? movie.release_date.slice(0, 4) : 'N/A';
  const genresText = (movie.genres || []).slice(0, 2).join(' · ');

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/50 transition-all duration-200 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/40 light:bg-white light:border-zinc-200 light:hover:shadow-zinc-300">
      
      {/* Poster Container (2:3 aspect ratio) */}
      <div 
        className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950 cursor-pointer"
        onClick={() => onSelectMovie(movie)}
      >
        {movie.poster_path && !imageError ? (
          <img
            src={movie.poster_path}
            alt={movie.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center bg-zinc-900 text-zinc-500">
            <Film className="h-10 w-10 mb-2 opacity-40 text-amber-500" />
            <span className="text-xs font-semibold line-clamp-2 text-zinc-400">{movie.title}</span>
            <span className="text-[10px] text-zinc-600 mt-1">Poster Unavailable</span>
          </div>
        )}

        {/* Action Buttons Overlay */}
        <div 
          className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onToggleFavorite(movie)}
            className={`p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
              isFavorite
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'bg-zinc-950/70 text-zinc-300 hover:bg-amber-500 hover:text-zinc-950 border border-zinc-800/60'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-label="Toggle favorite"
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={() => onToggleWatchlist(movie)}
            className={`p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
              isWatchlist
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'bg-zinc-950/70 text-zinc-300 hover:bg-amber-500 hover:text-zinc-950 border border-zinc-800/60'
            }`}
            title={isWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
            aria-label="Toggle watchlist"
          >
            <Bookmark className={`h-3.5 w-3.5 ${isWatchlist ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Subtle Bottom Gradient Scrim */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-950/90 to-transparent pointer-events-none" />
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-3.5">
        
        {/* Title */}
        <h3 
          className="font-semibold text-sm text-zinc-100 hover:text-amber-400 transition-colors line-clamp-1 cursor-pointer light:text-zinc-900"
          title={movie.title}
          onClick={() => onSelectMovie(movie)}
        >
          {movie.title}
        </h3>

        {/* Clean unboxed metadata with dot separators (Zero-pill discipline) */}
        <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400 light:text-zinc-500">
          <span>{releaseYear}</span>
          <span aria-hidden="true" className="text-zinc-600 light:text-zinc-300">&middot;</span>
          <span className="uppercase text-[11px] font-medium tracking-wider">{movie.original_language || 'EN'}</span>
        </div>

        {/* Rating and Verified Source Label */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center gap-1 font-mono text-xs font-semibold text-amber-400">
            <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
            <span className="tabular-nums">{Number(movie.vote_average || 0).toFixed(1)}</span>
          </div>
          <span className="text-[11px] text-zinc-500 light:text-zinc-400 font-medium tracking-tight">
            ({movie.rating_source || 'TMDB'})
          </span>
        </div>

        {/* Genres */}
        {genresText && (
          <p className="mt-1.5 text-xs text-zinc-400 light:text-zinc-500 truncate" title={movie.genres.join(', ')}>
            {genresText}
          </p>
        )}

        {/* Card Footer / View Details Link */}
        <div className="mt-auto pt-3 border-t border-zinc-800/60 light:border-zinc-100 flex items-center justify-between">
          <button
            onClick={() => onSelectMovie(movie)}
            className="flex items-center gap-1 text-xs font-semibold text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View Details</span>
          </button>

          {movie.similarity_percentage !== undefined && (
            <span className="font-mono text-[11px] text-amber-400/90 font-medium">
              {movie.similarity_percentage}% match
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
