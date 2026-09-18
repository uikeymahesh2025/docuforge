import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight } from 'lucide-react';
import { TOOLS, CATEGORY_LABELS } from '../../utils/toolsCatalog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger open via custom event or parent
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = TOOLS.filter((tool) => {
    const q = query.toLowerCase();
    return (
      tool.name.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      CATEGORY_LABELS[tool.category]?.toLowerCase().includes(q)
    );
  });

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-2xl bg-[#121218] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-4 border-b border-white/10 gap-3">
          <Search className="w-5 h-5 text-brand-gold shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search PDF tools (e.g. Merge, Watermark, Compress, Sign)..."
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 text-base focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              <p className="text-sm">No matching tools found for "{query}"</p>
              <p className="text-xs text-zinc-600 mt-1">Try keywords like edit, sign, merge, images, word or watermark.</p>
            </div>
          ) : (
            filtered.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleSelect(tool.path)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-white/5 text-left transition group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100 group-hover:text-brand-gold transition">
                      {tool.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-white/5 uppercase tracking-wider font-semibold">
                      {CATEGORY_LABELS[tool.category]}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-snug line-clamp-1">{tool.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-brand-gold group-hover:translate-x-1 transition" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
