import React, { useState } from 'react';
import { X, Sparkles, RefreshCw, Star, Heart, Bookmark, Eye, Tv, Globe, Key, CheckCircle2, Film } from 'lucide-react';
import { Movie } from '../types';
import { fetchLiveMovieSuggestion, LiveSuggestionResult } from '../services/liveMovieApi';

interface LiveSuggesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
  isFavorite: boolean;
  onToggleFavorite: (movie: Movie) => void;
  isWatchlist: boolean;
  onToggleWatchlist: (movie: Movie) => void;
}

const MOODS = [
  { id: 'mind-bending', label: 'Mind-Bending', icon: '🌌', desc: 'Space, wormholes & reality warps' },
  { id: 'adrenaline', label: 'Adrenaline Rush', icon: '⚡', desc: 'High-octane action & stunts' },
  { id: 'chills', label: 'Spine Chiller', icon: '🕯️', desc: 'Horror, dread & mythic curses' },
  { id: 'emotional', label: 'Deep Emotion', icon: '🎭', desc: 'Heartfelt drama & human stories' },
  { id: 'feel-good', label: 'Feel-Good', icon: '😄', desc: 'Laughs, wit & lighthearted charm' },
  { id: 'mythological', label: 'Folklore & Myth', icon: '🔱', desc: 'Demigods, rituals & epic lore' },
  { id: 'suspense', label: 'Gripping Suspense', icon: '🕵️', desc: 'Twists, heists & investigations' },
];

const LANGUAGES = [
  { code: '', label: 'Any Language' },
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'Kannada' },
  { code: 'hi', label: 'Hindi' },
  { code: 'te', label: 'Telugu' },
  { code: 'ta', label: 'Tamil' },
  { code: 'ko', label: 'Korean' },
  { code: 'ja', label: 'Japanese' },
];

export const LiveSuggesterModal: React.FC<LiveSuggesterModalProps> = ({
  isOpen,
  onClose,
  onSelectMovie,
  isFavorite,
  onToggleFavorite,
  isWatchlist,
  onToggleWatchlist,
}) => {
  const [selectedMood, setSelectedMood] = useState('mind-bending');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [minRating, setMinRating] = useState(7.5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LiveSuggestionResult | null>(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('cinematch_tmdb_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keySavedFeedback, setKeySavedFeedback] = useState(false);

  if (!isOpen) return null;

  const handleSaveApiKey = () => {
    localStorage.setItem('cinematch_tmdb_key', apiKey.trim());
    setKeySavedFeedback(true);
    setTimeout(() => setKeySavedFeedback(false), 2000);
  };

  const handleGetSuggestion = async () => {
    setLoading(true);
    try {
      const res = await fetchLiveMovieSuggestion({
        mood: selectedMood,
        language: selectedLanguage,
        min_rating: minRating,
        customApiKey: apiKey.trim(),
      });
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl text-zinc-100 max-h-[92vh] overflow-y-auto light:bg-white light:border-zinc-200 light:text-zinc-900">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer light:hover:text-zinc-900"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-semibold mb-2">
            <Globe className="h-3.5 w-3.5" />
            <span>Live Internet Movie API</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Suggest a Movie Live
          </h2>
          <p className="text-xs text-zinc-400 light:text-zinc-600 mt-1 max-w-md mx-auto">
            Choose your mood and language to fetch a live movie suggestion directly from the internet with ratings and streaming channels.
          </p>
        </div>

        {/* Configuration Controls */}
        <div className="space-y-4 mb-6">
          
          {/* Mood Selector Chips */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 light:text-zinc-600 mb-2">
              Select Your Vibe
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMood(m.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedMood === m.id
                      ? 'border-amber-500 bg-amber-500/10 text-zinc-100 light:text-zinc-900 shadow-sm'
                      : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 light:bg-zinc-50 light:border-zinc-200 light:text-zinc-700'
                  }`}
                >
                  <div className="text-base mb-1">{m.icon}</div>
                  <div className="text-xs font-bold truncate">{m.label}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Language & Rating Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 light:text-zinc-600 mb-1.5">
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none light:bg-zinc-50 light:border-zinc-300 light:text-zinc-900"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-zinc-400 light:text-zinc-600 mb-1.5">
                <span>Minimum Rating</span>
                <span className="font-mono text-amber-500">{minRating.toFixed(1)}+</span>
              </div>
              <input
                type="range"
                min="6.0"
                max="8.8"
                step="0.2"
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* TMDB Key Input Dropdown */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="flex items-center gap-1.5 text-xs text-amber-500 hover:underline cursor-pointer"
            >
              <Key className="h-3.5 w-3.5" />
              <span>{apiKey ? 'TMDB API Key Configured (Live)' : 'Connect Custom TMDB API Key (Optional)'}</span>
            </button>

            {showKeyInput && (
              <div className="mt-2 p-3 rounded-xl border border-zinc-800 bg-zinc-900/80 light:bg-zinc-50 light:border-zinc-200 space-y-2">
                <p className="text-[11px] text-zinc-400">
                  Enter your free TMDB API key to query live over 800,000+ movies directly from TMDB's internet servers.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste TMDB API Key..."
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={handleSaveApiKey}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 cursor-pointer"
                  >
                    Save Key
                  </button>
                </div>
                {keySavedFeedback && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Key saved for live queries!
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Suggest Live Action Button */}
        <button
          onClick={handleGetSuggestion}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Querying Live Movie API...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>{result ? 'Suggest Another Movie Live' : 'Suggest Movie Live from Internet'}</span>
            </>
          )}
        </button>

        {/* Live Result Spotlight */}
        {result && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-4 animate-in fade-in duration-300 light:bg-zinc-50 light:border-zinc-200">
            
            <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-800 pb-2 light:border-zinc-200">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Live Suggestion Retrieved
              </span>
              <span className="text-[11px] text-zinc-500">Source: {result.source}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-24 sm:w-28 shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-950 shadow-md">
                {result.movie.poster_path ? (
                  <img src={result.movie.poster_path} alt={result.movie.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-zinc-500 text-xs">
                    <Film className="h-6 w-6" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-bold text-zinc-100 light:text-zinc-900">
                  {result.movie.title}
                </h3>

                <div className="flex items-center gap-2 text-xs text-zinc-400 light:text-zinc-600">
                  <span>{(result.movie.release_date || '').slice(0, 4)}</span>
                  <span>&middot;</span>
                  <div className="flex items-center gap-1 font-mono text-amber-500 font-semibold">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span>{result.movie.vote_average.toFixed(1)}</span>
                  </div>
                  <span>&middot;</span>
                  <span className="uppercase text-[11px]">{result.movie.original_language}</span>
                  <span>&middot;</span>
                  <span>{result.movie.genres.join(', ')}</span>
                </div>

                <p className="text-xs text-zinc-300 light:text-zinc-700 line-clamp-3 leading-relaxed">
                  {result.movie.overview}
                </p>

                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 light:text-amber-800 light:bg-amber-50">
                  <strong>Why This:</strong> {result.whySuggested}
                </div>
              </div>
            </div>

            {/* Where to Watch snippet */}
            {result.watchProviders.has_providers && (
              <div className="text-xs space-y-1.5 pt-2 border-t border-zinc-800 light:border-zinc-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Tv className="h-3.5 w-3.5 text-amber-500" />
                  <span>Available in India on:</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {result.watchProviders.flatrate.map((p) => (
                    <span key={p.provider_name} className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[11px] light:bg-white light:border-zinc-200">
                      {p.provider_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => {
                  onSelectMovie(result.movie);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>View Full Details</span>
              </button>

              <button
                onClick={() => onToggleFavorite(result.movie)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                  isFavorite
                    ? 'bg-amber-500 text-zinc-950 border-amber-500'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-900 light:bg-white light:border-zinc-300 light:text-zinc-800'
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                <span>{isFavorite ? 'In Favorites' : 'Add to Favorites'}</span>
              </button>

              <button
                onClick={() => onToggleWatchlist(result.movie)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                  isWatchlist
                    ? 'bg-amber-500 text-zinc-950 border-amber-500'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-900 light:bg-white light:border-zinc-300 light:text-zinc-800'
                }`}
              >
                <Bookmark className={`h-3.5 w-3.5 ${isWatchlist ? 'fill-current' : ''}`} />
                <span>{isWatchlist ? 'On Watchlist' : 'Add to Watchlist'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
