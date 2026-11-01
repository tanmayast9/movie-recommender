import React from 'react';
import { Sun, Moon, User as UserIcon, LogOut, History, Film, Sparkles } from 'lucide-react';
import { UserAccount } from '../types';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  currentUser: UserAccount | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenHistory: () => void;
  onOpenLiveSuggest: () => void;
  favoritesCount: number;
  watchlistCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  theme,
  onToggleTheme,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenHistory,
  onOpenLiveSuggest,
  favoritesCount,
  watchlistCount,
}) => {
  return (
    <header className="sticky top-0 z-40 h-16 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md dark:border-zinc-800/80 light:bg-white/90 light:border-zinc-200">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        
        {/* Zone 1: Wordmark / Brand */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-zinc-100 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 light:text-zinc-900"
        >
          <Film className="h-6 w-6 text-amber-500" />
          <span>Cine<span className="text-amber-500">Match</span></span>
        </button>

        {/* Zone 2: Navigation Links (single line, clean text) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400 light:text-zinc-600">
          <button
            onClick={() => onNavigate('home')}
            className={`whitespace-nowrap transition-colors hover:text-zinc-100 light:hover:text-zinc-900 cursor-pointer ${
              currentView === 'home' ? 'text-amber-500 font-semibold' : ''
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onNavigate('discover')}
            className={`whitespace-nowrap transition-colors hover:text-zinc-100 light:hover:text-zinc-900 cursor-pointer ${
              currentView === 'discover' ? 'text-amber-500 font-semibold' : ''
            }`}
          >
            Discover Movies
          </button>
          <button
            onClick={() => onNavigate('favorites')}
            className={`whitespace-nowrap transition-colors hover:text-zinc-100 light:hover:text-zinc-900 cursor-pointer ${
              currentView === 'favorites' ? 'text-amber-500 font-semibold' : ''
            }`}
          >
            Favorites {favoritesCount > 0 && <span className="text-xs text-amber-500 ml-0.5">({favoritesCount})</span>}
          </button>
          <button
            onClick={() => onNavigate('watchlist')}
            className={`whitespace-nowrap transition-colors hover:text-zinc-100 light:hover:text-zinc-900 cursor-pointer ${
              currentView === 'watchlist' ? 'text-amber-500 font-semibold' : ''
            }`}
          >
            Watchlist {watchlistCount > 0 && <span className="text-xs text-amber-500 ml-0.5">({watchlistCount})</span>}
          </button>
          <button
            onClick={onOpenLiveSuggest}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500 hover:text-zinc-950 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Suggest Live</span>
          </button>
        </nav>

        {/* Zone 3: Actions & Auth */}
        <div className="flex items-center gap-3 shrink-0">
          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="p-2 text-zinc-400 hover:text-zinc-100 light:hover:text-zinc-900 rounded-lg transition-colors cursor-pointer"
            title="Recent Searches"
            aria-label="Recent Searches"
          >
            <History className="h-4 w-4" />
          </button>

          {/* Theme Switcher Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 text-zinc-400 hover:text-zinc-100 light:hover:text-zinc-900 rounded-lg border border-zinc-800 light:border-zinc-200 transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-zinc-700" />}
          </button>

          {/* Authentication Zone */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800 light:border-zinc-200">
              <span className="text-xs font-semibold text-zinc-300 light:text-zinc-700 truncate max-w-[100px]">
                {currentUser.username}
              </span>
              <button
                onClick={onLogout}
                className="p-1.5 text-zinc-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
