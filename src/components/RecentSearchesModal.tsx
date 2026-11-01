import React from 'react';
import { X, History, Trash2, Search, ArrowRight } from 'lucide-react';
import { RecentSearchItem } from '../types';

interface RecentSearchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  searches: RecentSearchItem[];
  onSelectSearch: (item: RecentSearchItem) => void;
  onClearHistory: () => void;
}

export const RecentSearchesModal: React.FC<RecentSearchesModalProps> = ({
  isOpen,
  onClose,
  searches,
  onSelectSearch,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-zinc-100 light:bg-white light:border-zinc-200 light:text-zinc-900">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 light:border-zinc-200">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-amber-500" />
            <h3 className="text-base font-bold">Recent Discovery History</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white cursor-pointer light:hover:text-zinc-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4">
          {searches.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs">
              No recent searches recorded yet. Search or apply filters in Discover to build your search history.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {searches.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectSearch(item);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 hover:border-amber-500/80 hover:bg-zinc-850 transition-colors text-left group cursor-pointer light:bg-zinc-50 light:border-zinc-200"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Search className="h-4 w-4 text-zinc-500 group-hover:text-amber-500 shrink-0" />
                    <div className="truncate">
                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-amber-400 block truncate light:text-zinc-800">
                        {item.query ? `"${item.query}"` : 'Filter Combo'}
                      </span>
                      {item.filtersSummary && (
                        <span className="text-[11px] text-zinc-500 truncate block">
                          {item.filtersSummary}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-amber-500 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {searches.length > 0 && (
          <div className="pt-3 border-t border-zinc-800 light:border-zinc-200 flex justify-between items-center text-xs">
            <span className="text-zinc-500">Max 15 items preserved</span>
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
