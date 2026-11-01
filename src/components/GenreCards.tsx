import React from 'react';
import { Sparkles } from 'lucide-react';

interface GenreCardsProps {
  onSelectGenre: (genre: string) => void;
}

const POPULAR_GENRES = [
  { name: 'Sci-Fi', hint: 'Wormholes, AI & Space Odyssey' },
  { name: 'Action', hint: 'High-octane Martial Arts & Chases' },
  { name: 'Horror', hint: 'Spine-chilling Folklore & Dread' },
  { name: 'Thriller', hint: 'Heists, Suspense & Psychological Twists' },
  { name: 'Drama', hint: 'Human Spirit, Family & Struggle' },
  { name: 'Animation', hint: 'Studio Ghibli & Hand-drawn Magic' },
  { name: 'Comedy', hint: 'Satire, Wit & Humour' },
  { name: 'Adventure', hint: 'Epic Expeditions & Wilderness' },
  { name: 'Crime', hint: 'Underworld Dynasties & Detectives' },
  { name: 'Fantasy', hint: 'Demigods, Folklore & Myth' },
];

export const GenreCards: React.FC<GenreCardsProps> = ({ onSelectGenre }) => {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 border-t border-zinc-800/60 light:border-zinc-200">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 light:text-zinc-900">
            Popular Genres
          </h2>
          <p className="text-xs text-zinc-400 light:text-zinc-600">
            Select a genre to trigger deterministic matching with customized rating and language filters
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
        {POPULAR_GENRES.map((g) => (
          <button
            key={g.name}
            onClick={() => onSelectGenre(g.name)}
            className="group flex flex-col p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-amber-500/80 hover:bg-zinc-850 hover:-translate-y-0.5 transition-all text-left cursor-pointer light:bg-white light:border-zinc-200 light:hover:border-amber-500"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-zinc-200 group-hover:text-amber-400 transition-colors light:text-zinc-800">
                {g.name}
              </span>
              <Sparkles className="h-3 w-3 text-zinc-600 group-hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-[11px] text-zinc-500 light:text-zinc-400 leading-tight">
              {g.hint}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
