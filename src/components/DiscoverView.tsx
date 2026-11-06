import React, { useState, useMemo, useEffect } from 'react';
import { Filter, X, RotateCcw, ChevronLeft, ChevronRight, SlidersHorizontal, AlertCircle, RefreshCw } from 'lucide-react';
import { Movie, FilterState } from '../types';
import { MovieCard } from './MovieCard';
import { ClientRecommendationEngine } from '../services/recommender';
import { fetchLiveMoviesFromTMDB, fetchMovieGenres } from '../services/tmdbLiveService';

interface DiscoverViewProps {
  movies: Movie[];
  filters: FilterState;
  onUpdateFilters: (newFilters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onSelectMovie: (movie: Movie) => void;
  userFavorites: Set<number>;
  onToggleFavorite: (movie: Movie) => void;
  userWatchlist: Set<number>;
  onToggleWatchlist: (movie: Movie) => void;
}

const GENRE_OPTIONS = [
  'All Genres',
  'Sci-Fi',
  'Action',
  'Horror',
  'Thriller',
  'Drama',
  'Comedy',
  'Romance',
  'Animation',
  'Adventure',
  'Crime',
  'Fantasy',
  'History',
  'War',
  'Family'
];

const LANGUAGE_OPTIONS = [
  { code: '', label: 'All Languages' },
  { code: 'en', label: 'English (en)' },
  { code: 'kn', label: 'Kannada (kn)' },
  { code: 'hi', label: 'Hindi (hi)' },
  { code: 'te', label: 'Telugu (te)' },
  { code: 'ta', label: 'Tamil (ta)' },
  { code: 'ml', label: 'Malayalam (ml)' },
  { code: 'ko', label: 'Korean (ko)' },
  { code: 'ja', label: 'Japanese (ja)' },
  { code: 'es', label: 'Spanish (es)' },
  { code: 'fr', label: 'French (fr)' }
];

const COUNTRY_OPTIONS = [
  { code: '', label: 'All Countries' },
  { code: 'IN', label: 'India (IN)' },
  { code: 'US', label: 'United States (US)' },
  { code: 'GB', label: 'United Kingdom (GB)' },
  { code: 'KR', label: 'South Korea (KR)' },
  { code: 'JP', label: 'Japan (JP)' }
];

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  movies,
  filters,
  onUpdateFilters,
  onResetFilters,
  onSelectMovie,
  userFavorites,
  onToggleFavorite,
  userWatchlist,
  onToggleWatchlist,
}) => {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [genreOptions, setGenreOptions] = useState(GENRE_OPTIONS);
  const [liveResults, setLiveResults] = useState<Movie[]>([]);
  const [liveTotal, setLiveTotal] = useState<number | null>(null);
  const [isLiveFetching, setIsLiveFetching] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [hasApiResults, setHasApiResults] = useState(false);
  const [liveSuggestion, setLiveSuggestion] = useState<string | undefined>(undefined);

  // Client recommendation engine for catalogue fallback
  const engine = useMemo(() => new ClientRecommendationEngine(movies), [movies]);

  useEffect(() => {
    let active = true;
    fetchMovieGenres().then((genres) => {
      if (active && genres) {
        setGenreOptions(['All Genres', ...genres]);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // The Flask API uses the server-configured TMDB key and returns curated data on failure.
  useEffect(() => {
    let active = true;
    setIsLiveFetching(true);
    fetchLiveMoviesFromTMDB(filters).then((res) => {
      if (!active) return;
      setLiveResults(res.results);
      setLiveTotal(res.total);
      setIsLiveActive(res.isLive);
      setHasApiResults(res.available);
      setLiveSuggestion(res.suggestion);
    }).finally(() => {
      if (active) setIsLiveFetching(false);
    });
    return () => {
      active = false;
    };
  }, [filters]);

  // Local fallback calculation
  const localCalc = useMemo(() => {
    return engine.filterAndRank(filters);
  }, [engine, filters]);

  const results = hasApiResults ? liveResults : localCalc.results;
  const total = hasApiResults && liveTotal !== null ? liveTotal : localCalc.total;
  const suggestion = hasApiResults ? liveSuggestion : localCalc.suggestion;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  // Determine active filter badges
  const activeChips = useMemo(() => {
    const list: { key: keyof FilterState; label: string }[] = [];
    if (filters.search) list.push({ key: 'search', label: `Search: "${filters.search}"` });
    if (filters.genre && filters.genre !== 'All Genres') list.push({ key: 'genre', label: `Genre: ${filters.genre}` });
    if (filters.language) {
      const match = LANGUAGE_OPTIONS.find(l => l.code === filters.language);
      list.push({ key: 'language', label: `Lang: ${match ? match.label : filters.language}` });
    }
    if (filters.country) {
      list.push({ key: 'country', label: `Country: ${filters.country}` });
    }
    if (filters.min_rating > 0) {
      list.push({ key: 'min_rating', label: `Rating: ${filters.min_rating}+` });
    }
    if (filters.year_from || filters.year_to) {
      list.push({ key: 'year_from', label: `Years: ${filters.year_from || '1950'} - ${filters.year_to || '2026'}` });
    }
    return list;
  }, [filters]);

  const handleRemoveChip = (key: keyof FilterState) => {
    if (key === 'min_rating') {
      onUpdateFilters({ min_rating: 0, page: 1 });
    } else if (key === 'year_from') {
      onUpdateFilters({ year_from: '', year_to: '', page: 1 });
    } else {
      onUpdateFilters({ [key]: '', page: 1 });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100 light:text-zinc-900">
            Discover Movies
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 light:text-zinc-600 mt-1">
            Deterministic rule-based filtering across language, country, ratings, and release windows
          </p>
        </div>

        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          className="lg:hidden flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 light:bg-white light:border-zinc-300 light:text-zinc-800"
        >
          <SlidersHorizontal className="h-4 w-4 text-amber-500" />
          <span>{mobileFilterOpen ? 'Hide Filters' : 'Filter Catalogue'}</span>
        </button>
      </div>

      {/* Main Grid: Sidebar Filters + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Filter Panel (Desktop & Mobile Dropdown) */}
        <aside className={`${mobileFilterOpen ? 'block' : 'hidden'} lg:block lg:col-span-1 rounded-2xl border border-zinc-800/80 bg-zinc-950 p-5 space-y-6 sticky top-20 shadow-xl light:bg-white light:border-zinc-200`}>
          
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 light:border-zinc-200">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-100 light:text-zinc-900">
              <Filter className="h-4 w-4 text-amber-500" />
              <span>Filter Catalogue</span>
            </div>
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 font-semibold cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear All</span>
            </button>
          </div>

          {/* Search by Title */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 light:text-zinc-600 mb-1.5">
              Title or Keyword
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onUpdateFilters({ search: e.target.value, page: 1 })}
              placeholder="e.g. Interstellar, Mars..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none light:bg-zinc-50 light:border-zinc-300 light:text-zinc-900"
            />
          </div>

          {/* Genre Dropdown */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 light:text-zinc-600 mb-1.5">
              Genre
            </label>
            <select
              value={filters.genre}
              onChange={(e) => onUpdateFilters({ genre: e.target.value, page: 1 })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none light:bg-zinc-50 light:border-zinc-300 light:text-zinc-900"
            >
              {genreOptions.map((g) => (
                <option key={g} value={g === 'All Genres' ? '' : g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Language Dropdown */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 light:text-zinc-600 mb-1.5">
              Language
            </label>
            <select
              value={filters.language}
              onChange={(e) => onUpdateFilters({ language: e.target.value, page: 1 })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none light:bg-zinc-50 light:border-zinc-300 light:text-zinc-900"
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Country Dropdown */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 light:text-zinc-600 mb-1.5">
              Country of Origin
            </label>
            <select
              value={filters.country}
              onChange={(e) => onUpdateFilters({ country: e.target.value, page: 1 })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none light:bg-zinc-50 light:border-zinc-300 light:text-zinc-900"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Minimum Rating Slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400 light:text-zinc-600 mb-1.5">
              <span>Minimum Rating</span>
              <span className="font-mono text-amber-500">{filters.min_rating > 0 ? `${filters.min_rating.toFixed(1)}+` : 'Any'}</span>
            </div>
            <input
              type="range"
              min="0"
              max="9"
              step="0.5"
              value={filters.min_rating}
              onChange={(e) => onUpdateFilters({ min_rating: parseFloat(e.target.value), page: 1 })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
              <span>0.0</span>
              <span>5.0</span>
              <span>9.0+</span>
            </div>
          </div>

          {/* Release Year Window */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 light:text-zinc-600 mb-1.5">
              Release Year Window
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="1950"
                max="2026"
                placeholder="From (1970)"
                value={filters.year_from}
                onChange={(e) => onUpdateFilters({ year_from: e.target.value, page: 1 })}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none light:bg-zinc-50 light:border-zinc-300 light:text-zinc-900"
              />
              <input
                type="number"
                min="1950"
                max="2026"
                placeholder="To (2026)"
                value={filters.year_to}
                onChange={(e) => onUpdateFilters({ year_to: e.target.value, page: 1 })}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none light:bg-zinc-50 light:border-zinc-300 light:text-zinc-900"
              />
            </div>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 light:text-zinc-600 mb-1.5">
              Sort By
            </label>
            <select
              value={filters.sort}
              onChange={(e) => onUpdateFilters({ sort: e.target.value, page: 1 })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none light:bg-zinc-50 light:border-zinc-300 light:text-zinc-900"
            >
              <option value="popularity">Popularity (High to Low)</option>
              <option value="rating">Rating (Highest First)</option>
              <option value="rating_asc">Rating (Lowest First)</option>
              <option value="release_date">Release Date (Newest)</option>
              <option value="release_date_asc">Release Date (Oldest)</option>
              <option value="title">Title (A - Z)</option>
            </select>
          </div>

          <button
            onClick={() => setMobileFilterOpen(false)}
            className="w-full lg:hidden py-2 text-xs font-semibold text-zinc-950 bg-amber-500 rounded-lg cursor-pointer"
          >
            Apply &amp; View Results
          </button>
        </aside>

        {/* Results Area */}
        <main className="lg:col-span-3 space-y-6">
          
          {/* Active Filter Chips Bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950 p-3 light:bg-white light:border-zinc-200">
            <span className="text-[11px] font-bold uppercase text-zinc-500 mr-1">
              Active Filters:
            </span>
            {activeChips.length > 0 ? (
              activeChips.map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 border border-zinc-700/80 px-2.5 py-1 text-xs text-zinc-200 light:bg-zinc-100 light:border-zinc-300 light:text-zinc-800"
                >
                  <span>{chip.label}</span>
                  <button
                    onClick={() => handleRemoveChip(chip.key)}
                    className="text-zinc-400 hover:text-rose-400 cursor-pointer"
                    title="Remove filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-xs text-zinc-500">Showing all movies without restriction</span>
            )}
          </div>

          {/* Result Count Status & Live Source Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400 light:text-zinc-600 px-1">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong>{results.length}</strong> of <strong>{total}</strong> matching movies
              </span>
              {isLiveActive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live from themoviedb.org
                </span>
              ) : hasApiResults ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 light:bg-zinc-100 light:text-zinc-600">
                  Curated TMDB Catalogue
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 light:bg-zinc-100 light:text-zinc-600">
                  Local Catalogue
                </span>
              )}
              {isLiveFetching && (
                <span className="text-[11px] text-amber-500 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Fetching live...
                </span>
              )}
            </div>
            <span className="font-mono">
              Page {filters.page} of {totalPages}
            </span>
          </div>

          {/* Empty Results Handling with Helpful Suggestions */}
          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-12 text-center space-y-4 light:bg-white light:border-zinc-300">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-100 light:text-zinc-900">
                No movies matched your current criteria
              </h3>
              <p className="mx-auto max-w-md text-xs sm:text-sm text-zinc-400 light:text-zinc-600 leading-relaxed">
                {suggestion || "Try relaxing your rating threshold, clearing the country filter, or widening the release window."}
              </p>
              <button
                onClick={onResetFilters}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          ) : (
            /* Movie Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {results.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onSelectMovie={onSelectMovie}
                  isFavorite={userFavorites.has(movie.id)}
                  onToggleFavorite={onToggleFavorite}
                  isWatchlist={userWatchlist.has(movie.id)}
                  onToggleWatchlist={onToggleWatchlist}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-zinc-800/60 light:border-zinc-200">
              <button
                disabled={filters.page <= 1}
                onClick={() => onUpdateFilters({ page: filters.page - 1 })}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-800 cursor-pointer light:bg-white light:border-zinc-300 light:text-zinc-800"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </button>

              <span className="font-mono text-xs text-zinc-400 light:text-zinc-600">
                {filters.page} / {totalPages}
              </span>

              <button
                disabled={filters.page >= totalPages}
                onClick={() => onUpdateFilters({ page: filters.page + 1 })}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-800 cursor-pointer light:bg-white light:border-zinc-300 light:text-zinc-800"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
