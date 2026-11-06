/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { FeaturedSpotlight } from './components/FeaturedSpotlight';
import { GenreCards } from './components/GenreCards';
import { MovieCard } from './components/MovieCard';
import { DiscoverView } from './components/DiscoverView';
import { MovieDetailModal } from './components/MovieDetailModal';
import { FavoritesView } from './components/FavoritesView';
import { WatchlistView } from './components/WatchlistView';
import { AuthModal } from './components/AuthModal';
import { RecentSearchesModal } from './components/RecentSearchesModal';
import { LiveSuggesterModal } from './components/LiveSuggesterModal';
import { Movie, FilterState, UserAccount, RecentSearchItem } from './types';
import { MOVIES_DATABASE } from './data/movies';
import { ArrowRight, Star } from 'lucide-react';

export default function App() {
  // Theme state: defaults to cinematic dark theme
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('cinematch_theme') as 'dark' | 'light') || 'dark';
  });

  // Current view navigation: 'home' | 'discover' | 'favorites' | 'watchlist'
  const [currentView, setCurrentView] = useState<'home' | 'discover' | 'favorites' | 'watchlist'>('home');

  // Currently opened detail movie
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('cinematch_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isLiveSuggestModalOpen, setIsLiveSuggestModalOpen] = useState(false);

  // Filter State (Preserved when navigating between pages)
  const [filters, setFilters] = useState<FilterState>({
    genre: '',
    language: '',
    country: '',
    min_rating: 0,
    year_from: '',
    year_to: '',
    sort: 'popularity',
    search: '',
    page: 1,
    limit: 12
  });

  // User Collections (Favorites & Watchlist scoped to current user or local guest)
  const storagePrefix = currentUser ? `user_${currentUser.id}_` : 'guest_';

  const [favorites, setFavorites] = useState<Movie[]>(() => {
    const saved = localStorage.getItem(`${storagePrefix}favorites`);
    return saved ? JSON.parse(saved) : [];
  });

  const [watchlist, setWatchlist] = useState<Movie[]>(() => {
    const saved = localStorage.getItem(`${storagePrefix}watchlist`);
    return saved ? JSON.parse(saved) : [];
  });

  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>(() => {
    const saved = localStorage.getItem(`${storagePrefix}recent_searches`);
    return saved ? JSON.parse(saved) : [];
  });

  // Re-sync collections when user logs in or out
  useEffect(() => {
    const prefix = currentUser ? `user_${currentUser.id}_` : 'guest_';
    const savedFavs = localStorage.getItem(`${prefix}favorites`);
    setFavorites(savedFavs ? JSON.parse(savedFavs) : []);

    const savedWatch = localStorage.getItem(`${prefix}watchlist`);
    setWatchlist(savedWatch ? JSON.parse(savedWatch) : []);

    const savedHistory = localStorage.getItem(`${prefix}recent_searches`);
    setRecentSearches(savedHistory ? JSON.parse(savedHistory) : []);
  }, [currentUser]);

  // Apply Theme class to document root
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    localStorage.setItem('cinematch_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.removeItem('cinematch_tmdb_key');
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Fast lookups for favorite and watchlist status
  const userFavoritesSet = useMemo(() => new Set(favorites.map(m => m.id)), [favorites]);
  const userWatchlistSet = useMemo(() => new Set(watchlist.map(m => m.id)), [watchlist]);

  // Toggle Favorite
  const handleToggleFavorite = useCallback((movie: Movie) => {
    setFavorites(prev => {
      const exists = prev.some(m => m.id === movie.id);
      const updated = exists ? prev.filter(m => m.id !== movie.id) : [movie, ...prev];
      const prefix = currentUser ? `user_${currentUser.id}_` : 'guest_';
      localStorage.setItem(`${prefix}favorites`, JSON.stringify(updated));
      return updated;
    });
  }, [currentUser]);

  // Toggle Watchlist
  const handleToggleWatchlist = useCallback((movie: Movie) => {
    setWatchlist(prev => {
      const exists = prev.some(m => m.id === movie.id);
      const updated = exists ? prev.filter(m => m.id !== movie.id) : [movie, ...prev];
      const prefix = currentUser ? `user_${currentUser.id}_` : 'guest_';
      localStorage.setItem(`${prefix}watchlist`, JSON.stringify(updated));
      return updated;
    });
  }, [currentUser]);

  // Record Search Query in Recent Searches
  const recordSearch = useCallback((query: string, filterSummary = '') => {
    if (!query && !filterSummary) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.query !== query);
      const item: RecentSearchItem = {
        id: Date.now().toString(),
        query,
        filtersSummary: filterSummary,
        timestamp: Date.now()
      };
      const updated = [item, ...filtered].slice(0, 15);
      const prefix = currentUser ? `user_${currentUser.id}_` : 'guest_';
      localStorage.setItem(`${prefix}recent_searches`, JSON.stringify(updated));
      return updated;
    });
  }, [currentUser]);

  // Handle Hero Search Submission
  const handleHeroSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query, page: 1 }));
    recordSearch(query, 'Title Search');
    setCurrentView('discover');
  };

  // Genre card click from Homepage
  const handleSelectGenre = (genre: string) => {
    setFilters(prev => ({ ...prev, genre, page: 1 }));
    recordSearch('', `Genre: ${genre}`);
    setCurrentView('discover');
  };

  // Re-run search from Recent Searches
  const handleSelectRecentSearch = (item: RecentSearchItem) => {
    if (item.query) {
      setFilters(prev => ({ ...prev, search: item.query, page: 1 }));
    }
    setCurrentView('discover');
  };

  const handleClearHistory = () => {
    const prefix = currentUser ? `user_${currentUser.id}_` : 'guest_';
    localStorage.removeItem(`${prefix}recent_searches`);
    setRecentSearches([]);
  };

  // Authentication Handlers
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    localStorage.setItem('cinematch_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('cinematch_current_user');
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilters({
      genre: '',
      language: '',
      country: '',
      min_rating: 0,
      year_from: '',
      year_to: '',
      sort: 'popularity',
      search: '',
      page: 1,
      limit: 12
    });
  };

  // Top Rated & Popular Slices for Homepage
  const topRatedMovies = useMemo(() => {
    return [...MOVIES_DATABASE]
      .sort((a, b) => b.vote_average - a.vote_average || b.vote_count - a.vote_count)
      .slice(0, 4);
  }, []);

  const popularMovies = useMemo(() => {
    return [...MOVIES_DATABASE]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 4);
  }, []);

  const featuredMovie = MOVIES_DATABASE[0]; // Interstellar

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 antialiased light:bg-slate-50 light:text-slate-900">
      
      {/* 3-Zone Top Bar Contract */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view as any)}
        theme={theme}
        onToggleTheme={toggleTheme}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onOpenLiveSuggest={() => setIsLiveSuggestModalOpen(true)}
        favoritesCount={favorites.length}
        watchlistCount={watchlist.length}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'home' && (
          <div className="space-y-4">
            {/* Page A: Hero Section */}
            <HeroSection
              featuredMovie={featuredMovie}
              onSearch={handleHeroSearch}
              onDiscoverClick={() => setCurrentView('discover')}
              onSelectMovie={setSelectedMovie}
              onLiveSuggestClick={() => setIsLiveSuggestModalOpen(true)}
            />

            {/* Featured Movie Spotlight */}
            <FeaturedSpotlight
              movie={featuredMovie}
              onSelectMovie={setSelectedMovie}
              isFavorite={userFavoritesSet.has(featuredMovie.id)}
              onToggleFavorite={handleToggleFavorite}
              isWatchlist={userWatchlistSet.has(featuredMovie.id)}
              onToggleWatchlist={handleToggleWatchlist}
            />

            {/* Clickable Genre Cards */}
            <GenreCards onSelectGenre={handleSelectGenre} />

            {/* Top-Rated Movies Section */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 border-t border-zinc-800/60 light:border-zinc-200">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-zinc-100 light:text-zinc-900 flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500 fill-current" />
                    <span>Top-Rated Masterpieces</span>
                  </h2>
                  <p className="text-xs text-zinc-400 light:text-zinc-600">
                    Highest consensus ratings with explicit TMDB vote source verification
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFilters(prev => ({ ...prev, sort: 'rating', page: 1 }));
                    setCurrentView('discover');
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  <span>Explore all</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                {topRatedMovies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onSelectMovie={setSelectedMovie}
                    isFavorite={userFavoritesSet.has(movie.id)}
                    onToggleFavorite={handleToggleFavorite}
                    isWatchlist={userWatchlistSet.has(movie.id)}
                    onToggleWatchlist={handleToggleWatchlist}
                  />
                ))}
              </div>
            </section>

            {/* Popular Worldwide Section */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 border-t border-zinc-800/60 light:border-zinc-200">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-zinc-100 light:text-zinc-900">
                    Popular Worldwide
                  </h2>
                  <p className="text-xs text-zinc-400 light:text-zinc-600">
                    Trending movies spanning Hollywood, Indian cinema, Japanese anime, and Korean cinema
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFilters(prev => ({ ...prev, sort: 'popularity', page: 1 }));
                    setCurrentView('discover');
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  <span>Explore all</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                {popularMovies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onSelectMovie={setSelectedMovie}
                    isFavorite={userFavoritesSet.has(movie.id)}
                    onToggleFavorite={handleToggleFavorite}
                    isWatchlist={userWatchlistSet.has(movie.id)}
                    onToggleWatchlist={handleToggleWatchlist}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Page B: Discover Movies */}
        {currentView === 'discover' && (
          <DiscoverView
            movies={MOVIES_DATABASE}
            filters={filters}
            onUpdateFilters={(partial) => setFilters(prev => ({ ...prev, ...partial }))}
            onResetFilters={handleResetFilters}
            onSelectMovie={setSelectedMovie}
            userFavorites={userFavoritesSet}
            onToggleFavorite={handleToggleFavorite}
            userWatchlist={userWatchlistSet}
            onToggleWatchlist={handleToggleWatchlist}
          />
        )}

        {/* Phase 3: Favorites View */}
        {currentView === 'favorites' && (
          <FavoritesView
            favorites={favorites}
            onSelectMovie={setSelectedMovie}
            onToggleFavorite={handleToggleFavorite}
            userWatchlist={userWatchlistSet}
            onToggleWatchlist={handleToggleWatchlist}
            onExploreClick={() => setCurrentView('discover')}
          />
        )}

        {/* Phase 3: Watchlist View */}
        {currentView === 'watchlist' && (
          <WatchlistView
            watchlist={watchlist}
            onSelectMovie={setSelectedMovie}
            onRemoveFromWatchlist={handleToggleWatchlist}
            onExploreClick={() => setCurrentView('discover')}
          />
        )}
      </main>

      {/* Page C: Dedicated Movie Detail Modal */}
      {selectedMovie && (
        <MovieDetailModal
          movie={selectedMovie}
          allMovies={MOVIES_DATABASE}
          onClose={() => setSelectedMovie(null)}
          onSelectMovie={setSelectedMovie}
          isFavorite={userFavoritesSet.has(selectedMovie.id)}
          onToggleFavorite={handleToggleFavorite}
          isWatchlist={userWatchlistSet.has(selectedMovie.id)}
          onToggleWatchlist={handleToggleWatchlist}
          userFavorites={userFavoritesSet}
          userWatchlist={userWatchlistSet}
        />
      )}

      {/* Authentication Modal */}
      {isAuthModalOpen && (
        <AuthModal
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Recent Searches Modal */}
      <RecentSearchesModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        searches={recentSearches}
        onSelectSearch={handleSelectRecentSearch}
        onClearHistory={handleClearHistory}
      />

      {/* Live Movie Suggester Modal */}
      <LiveSuggesterModal
        isOpen={isLiveSuggestModalOpen}
        onClose={() => setIsLiveSuggestModalOpen(false)}
        onSelectMovie={setSelectedMovie}
        isFavorite={selectedMovie ? userFavoritesSet.has(selectedMovie.id) : false}
        onToggleFavorite={handleToggleFavorite}
        isWatchlist={selectedMovie ? userWatchlistSet.has(selectedMovie.id) : false}
        onToggleWatchlist={handleToggleWatchlist}
      />

      {/* Site Footer */}
      <Footer onNavigate={(view) => setCurrentView(view as any)} />
    </div>
  );
}
