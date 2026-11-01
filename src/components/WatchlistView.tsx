import React, { useState } from 'react';
import { Bookmark, Check, Eye, Trash2, ArrowRight } from 'lucide-react';
import { Movie } from '../types';

interface WatchlistViewProps {
  watchlist: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onRemoveFromWatchlist: (movie: Movie) => void;
  onExploreClick: () => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  watchlist,
  onSelectMovie,
  onRemoveFromWatchlist,
  onExploreClick,
}) => {
  const [watchedSet, setWatchedSet] = useState<Set<number>>(new Set());

  const toggleWatched = (id: number) => {
    setWatchedSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100 light:text-zinc-900 flex items-center gap-2.5">
            <Bookmark className="h-6 w-6 text-amber-500 fill-current" />
            <span>My Watchlist</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 light:text-zinc-600 mt-1">
            Keep track of upcoming films you plan to experience and check off finished titles
          </p>
        </div>
        <span className="text-xs font-mono font-semibold text-zinc-400">
          {watchlist.length} {watchlist.length === 1 ? 'film queued' : 'films queued'}
        </span>
      </div>

      {/* Empty State */}
      {watchlist.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-12 text-center space-y-4 light:bg-white light:border-zinc-300">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <Bookmark className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-zinc-100 light:text-zinc-900">
            Your Watchlist is empty
          </h3>
          <p className="mx-auto max-w-md text-xs sm:text-sm text-zinc-400 light:text-zinc-600 leading-relaxed">
            Queue movies to your personal watchlist to plan your upcoming viewing sessions.
          </p>
          <button
            onClick={onExploreClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors cursor-pointer"
          >
            <span>Discover Movies</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        /* List / Grid of Watchlist Items with Watched Checkbox */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {watchlist.map((movie) => {
            const isWatched = watchedSet.has(movie.id);
            const releaseYear = (movie.release_date || '').slice(0, 4);

            return (
              <div
                key={movie.id}
                className={`flex gap-4 p-4 rounded-xl border transition-all ${
                  isWatched
                    ? 'border-zinc-850 bg-zinc-950/40 opacity-70 light:bg-zinc-100/60 light:border-zinc-200'
                    : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 light:bg-white light:border-zinc-200'
                }`}
              >
                {/* Thumbnail */}
                <div 
                  className="w-20 shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-950 cursor-pointer"
                  onClick={() => onSelectMovie(movie)}
                >
                  {movie.poster_path ? (
                    <img src={movie.poster_path} alt={movie.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-zinc-600 text-xs">
                      No Poster
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h3 
                      className={`text-sm font-bold cursor-pointer transition-colors ${
                        isWatched ? 'line-through text-zinc-400 light:text-zinc-500' : 'text-zinc-100 hover:text-amber-400 light:text-zinc-900'
                      }`}
                      onClick={() => onSelectMovie(movie)}
                    >
                      {movie.title}
                    </h3>
                    
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400 light:text-zinc-500">
                      <span>{releaseYear}</span>
                      <span aria-hidden="true">&middot;</span>
                      <span className="font-mono text-amber-500 font-semibold">{movie.vote_average.toFixed(1)} TMDB</span>
                      <span aria-hidden="true">&middot;</span>
                      <span className="uppercase text-[11px]">{movie.original_language}</span>
                    </div>

                    <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2 light:text-zinc-600">
                      {movie.overview}
                    </p>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-800/60 light:border-zinc-100">
                    <button
                      onClick={() => toggleWatched(movie.id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        isWatched
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 light:bg-zinc-100 light:text-zinc-700'
                      }`}
                    >
                      <Check className="h-3 w-3" />
                      <span>{isWatched ? 'Completed' : 'Mark Watched'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectMovie(movie)}
                        className="text-xs font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Details</span>
                      </button>

                      <button
                        onClick={() => onRemoveFromWatchlist(movie)}
                        className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Remove from watchlist"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
