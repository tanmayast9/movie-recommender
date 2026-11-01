import React from 'react';
import { Heart, Film, ArrowRight } from 'lucide-react';
import { Movie } from '../types';
import { MovieCard } from './MovieCard';

interface FavoritesViewProps {
  favorites: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onToggleFavorite: (movie: Movie) => void;
  userWatchlist: Set<number>;
  onToggleWatchlist: (movie: Movie) => void;
  onExploreClick: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favorites,
  onSelectMovie,
  onToggleFavorite,
  userWatchlist,
  onToggleWatchlist,
  onExploreClick,
}) => {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100 light:text-zinc-900 flex items-center gap-2.5">
            <Heart className="h-6 w-6 text-amber-500 fill-current" />
            <span>My Favorites</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 light:text-zinc-600 mt-1">
            Your personal handpicked collection of favorite cinema, preserved across your sessions
          </p>
        </div>
        <span className="text-xs font-mono font-semibold text-zinc-400">
          {favorites.length} {favorites.length === 1 ? 'title' : 'titles'}
        </span>
      </div>

      {/* Empty State */}
      {favorites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-12 text-center space-y-4 light:bg-white light:border-zinc-300">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <Heart className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-zinc-100 light:text-zinc-900">
            Your Favorites list is currently empty
          </h3>
          <p className="mx-auto max-w-md text-xs sm:text-sm text-zinc-400 light:text-zinc-600 leading-relaxed">
            Click the heart icon on any movie card or detail page to add films here for quick access.
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
        /* Movie Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {favorites.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onSelectMovie={onSelectMovie}
              isFavorite={true}
              onToggleFavorite={onToggleFavorite}
              isWatchlist={userWatchlist.has(movie.id)}
              onToggleWatchlist={onToggleWatchlist}
            />
          ))}
        </div>
      )}
    </div>
  );
};
