import React from 'react';
import { Film } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="mt-auto border-t border-zinc-800/80 bg-zinc-950 py-12 text-zinc-400 light:bg-white light:border-zinc-200 light:text-zinc-600">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-lg font-bold text-zinc-100 light:text-zinc-900">
              <Film className="h-5 w-5 text-amber-500" />
              <span>Cine<span className="text-amber-500">Match</span></span>
            </div>
            <p className="text-xs text-zinc-400 max-w-md leading-relaxed light:text-zinc-600">
              Deterministic movie discovery platform combining multi-attribute rule filtering and content-based TF-IDF vector similarity. Designed to help cinephiles find films with transparent, truthful recommendations.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200 light:text-zinc-800">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-amber-500 transition-colors cursor-pointer">
                  Homepage
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('discover')} className="hover:text-amber-500 transition-colors cursor-pointer">
                  Discover Movies
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('favorites')} className="hover:text-amber-500 transition-colors cursor-pointer">
                  Personal Favorites
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('watchlist')} className="hover:text-amber-500 transition-colors cursor-pointer">
                  Watchlist Queue
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Attribution */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200 light:text-zinc-800">
              Attribution
            </h4>
            <p className="text-xs text-zinc-500 leading-relaxed light:text-zinc-500">
              Movie metadata and imagery courtesy of <strong>TMDB</strong>. Streaming availability provided by <strong>JustWatch via TMDB</strong>.
            </p>
            <p className="text-[11px] text-zinc-500 italic">
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-800/60 light:border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>&copy; {new Date().getFullYear()} CineMatch. Built with Python, Flask &amp; React.</p>
          <div className="flex items-center gap-4">
            <span>Deterministic Filtering</span>
            <span>&middot;</span>
            <span>TF-IDF Vector Similarity</span>
            <span>&middot;</span>
            <span>SQLite Persistence</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
