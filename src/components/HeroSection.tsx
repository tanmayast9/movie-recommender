import React, { useState } from 'react';
import { Search, Compass, Sparkles } from 'lucide-react';
import { Movie } from '../types';

interface HeroSectionProps {
  featuredMovie: Movie | null;
  onSearch: (query: string) => void;
  onDiscoverClick: () => void;
  onSelectMovie: (movie: Movie) => void;
  onLiveSuggestClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  featuredMovie,
  onSearch,
  onDiscoverClick,
  onSelectMovie,
  onLiveSuggestClick,
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const backdropUrl = featuredMovie?.backdrop_path || 'https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg';

  return (
    <section className="relative min-h-[500px] md:min-h-[580px] w-full flex items-center justify-center overflow-hidden border-b border-zinc-800/60 bg-zinc-950 light:bg-zinc-100">
      
      {/* Dynamic API Backdrop with Measured Gradient Scrim */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 dark:opacity-30 light:opacity-20 scale-105 transition-all duration-700 filter blur-[1px]"
        style={{ backgroundImage: `url('${backdropUrl}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/40 light:from-white light:via-white/70 light:to-white/40" />

      {/* Content Container */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        
        {/* Editorial Subtitle / Header */}
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-amber-500 mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Rule-Based &amp; Content Similarity Engine</span>
        </div>

        {/* Primary Headline (No orphans via text-wrap: balance) */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-100 light:text-zinc-900 leading-[1.12] [text-wrap:balance]">
          Find Your Next <span className="text-amber-500">Favourite</span> Movie
        </h1>

        {/* Short Descriptive Paragraph */}
        <p className="mt-4 max-w-2xl text-sm sm:text-base text-zinc-400 light:text-zinc-600 leading-relaxed [text-wrap:balance]">
          Discover films tailored to your precise taste. Filter by genre, language, country, and release window, or explore mathematically similar titles with transparent recommendation explanations.
        </p>

        {/* Search Input Bar */}
        <form onSubmit={handleSubmit} className="mt-8 w-full max-w-xl">
          <div className="relative flex items-center rounded-xl bg-zinc-900/90 border border-zinc-700/80 shadow-2xl p-1.5 focus-within:border-amber-500 transition-colors light:bg-white light:border-zinc-300">
            <Search className="h-5 w-5 text-zinc-400 ml-3 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, director, or keyword..."
              className="w-full bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none light:text-zinc-900 light:placeholder-zinc-400"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Search
            </button>
          </div>
        </form>

        {/* Call to Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3.5">
          <button
            onClick={onLiveSuggestClick}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/25 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Suggest a Movie Live</span>
          </button>

          <button
            onClick={onDiscoverClick}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-zinc-200 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl transition-all cursor-pointer light:bg-white light:border-zinc-300 light:text-zinc-800"
          >
            <Compass className="h-4 w-4" />
            <span>Discover Catalogue</span>
          </button>

          {featuredMovie && (
            <button
              onClick={() => onSelectMovie(featuredMovie)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-zinc-400 bg-transparent hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <span>Spotlight: {featuredMovie.title}</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
