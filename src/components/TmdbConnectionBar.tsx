import React, { useState, useEffect } from 'react';
import { Globe, Key, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, X } from 'lucide-react';
import { getActiveTmdbKey, setActiveTmdbKey, validateTmdbKey, TMDB_SITE_URL } from '../services/tmdbLiveService';

interface TmdbConnectionBarProps {
  onConnectionChange?: () => void;
}

export const TmdbConnectionBar: React.FC<TmdbConnectionBarProps> = ({ onConnectionChange }) => {
  const [apiKey, setApiKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    const key = getActiveTmdbKey();
    setApiKey(key);
    if (key) {
      validateTmdbKey(key).then(res => {
        setIsConnected(res.valid);
      });
    }
  }, []);

  const handleTestAndSave = async () => {
    if (!apiKey.trim()) {
      setStatusMessage({ text: 'Please enter your TMDB API key.', isError: true });
      return;
    }
    setTesting(true);
    setStatusMessage(null);
    try {
      const res = await validateTmdbKey(apiKey.trim());
      if (res.valid) {
        setActiveTmdbKey(apiKey.trim());
        setIsConnected(true);
        setStatusMessage({ text: 'Connected to themoviedb.org! Live fetching is active.', isError: false });
        if (onConnectionChange) onConnectionChange();
      } else {
        setStatusMessage({ text: res.message, isError: true });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = () => {
    setActiveTmdbKey('');
    setApiKey('');
    setIsConnected(false);
    setStatusMessage({ text: 'Disconnected. App will use verified catalogue.', isError: false });
    if (onConnectionChange) onConnectionChange();
  };

  return (
    <div className="w-full bg-zinc-900/90 border-b border-zinc-800 text-xs light:bg-zinc-100 light:border-zinc-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3">
        
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <Globe className={`h-3.5 w-3.5 ${isConnected ? 'text-emerald-400' : 'text-amber-500'}`} />
          <span className="font-semibold text-zinc-200 light:text-zinc-800">
            {isConnected ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Fetching from themoviedb.org Active
              </span>
            ) : (
              <span>
                Live Movie Fetching via <a href={TMDB_SITE_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-400">themoviedb.org</a>
              </span>
            )}
          </span>
          <span className="text-zinc-500 hidden sm:inline">&middot;</span>
          <span className="text-zinc-400 hidden sm:inline light:text-zinc-600">
            {isConnected ? 'Querying 800,000+ titles live' : 'Connect free TMDB API key for unlimited live fetching'}
          </span>
        </div>

        {/* Action Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-pointer font-medium light:bg-white light:border-zinc-300 light:text-zinc-800"
          >
            <Key className="h-3 w-3 text-amber-500" />
            <span>{isConnected ? 'TMDB Key Configured' : 'Configure TMDB Key'}</span>
          </button>
        </div>
      </div>

      {/* Drawer */}
      {isDrawerOpen && (
        <div className="border-t border-zinc-800 bg-zinc-950 p-4 sm:p-6 light:bg-white light:border-zinc-200 animate-in slide-in-from-top-2 duration-150">
          <div className="mx-auto max-w-3xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-zinc-100 light:text-zinc-900 flex items-center gap-2">
                <Globe className="h-4 w-4 text-amber-500" />
                <span>The Movie Database (themoviedb.org) Live API Connection</span>
              </h4>
              <button onClick={() => setIsDrawerOpen(false)} className="text-zinc-500 hover:text-white cursor-pointer light:hover:text-zinc-900">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 light:text-zinc-600 leading-relaxed">
              To fetch movies live directly from <strong>themoviedb.org</strong> in real-time without limits, enter your free TMDB API key (v3 auth). If you don't have one, you can generate a free key in 1 minute on TMDB.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your TMDB API Key from themoviedb.org/settings/api..."
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none light:bg-zinc-50 light:border-zinc-300 light:text-zinc-900"
              />
              <button
                onClick={handleTestAndSave}
                disabled={testing}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400 disabled:opacity-50 cursor-pointer text-xs"
              >
                {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>{testing ? 'Verifying...' : 'Connect to themoviedb.org'}</span>
              </button>

              {isConnected && (
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-rose-400 hover:border-rose-500/50 cursor-pointer text-xs"
                >
                  Disconnect
                </button>
              )}
            </div>

            {statusMessage && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                statusMessage.isError
                  ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                  : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              }`}>
                {statusMessage.isError ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-850 light:border-zinc-200">
              <a
                href="https://www.themoviedb.org/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-amber-500 hover:underline"
              >
                <span>Get a free API key at themoviedb.org/settings/api</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <span>Zero server storage &middot; Key stored locally in your browser</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
