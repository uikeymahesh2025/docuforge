import React, { useState } from 'react';
import { Star, Ban, ZoomIn, Check, RotateCcw } from 'lucide-react';

export interface PhotoCardItem {
  originalIndex: number; // 0-based index
  pageNumber: number; // 1-based page number
  rating: number; // 0 to 5
  rejected: boolean;
  thumbnailUrl?: string;
}

interface PhotoCardProps {
  item: PhotoCardItem;
  onRate: (index: number, rating: number) => void;
  onToggleReject: (index: number) => void;
  onEnlarge: (index: number) => void;
  onVisible?: (pageNumber: number) => void;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  item,
  onRate,
  onToggleReject,
  onEnlarge,
  onVisible,
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // IntersectionObserver reference to trigger lazy load when card is near viewport
  const cardRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (item.thumbnailUrl || !onVisible) return;
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onVisible(item.pageNumber);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [item.thumbnailUrl, item.pageNumber, onVisible]);

  const activeStars = hoverRating !== null ? hoverRating : item.rating;

  return (
    <div
      ref={cardRef}
      className={`group relative flex flex-col rounded-2xl bg-[#0F0F16] border transition-all duration-200 overflow-hidden shadow-md hover:shadow-xl ${
        item.rejected
          ? 'border-red-500/30 opacity-70 hover:opacity-100 hover:border-red-500/60'
          : item.rating > 0
          ? 'border-amber-400/40 ring-1 ring-amber-400/20 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Top Banner / Number & Quick Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
        <span className="px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[11px] font-bold text-zinc-200 shadow-sm pointer-events-auto">
          #{item.pageNumber}
        </span>

        {item.rejected ? (
          <span className="px-2 py-0.5 rounded-full bg-red-500/90 text-white font-extrabold text-[10px] tracking-wider uppercase shadow-md flex items-center gap-1">
            <Ban className="w-3 h-3" />
            Rejected
          </span>
        ) : item.rating > 0 ? (
          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black font-extrabold text-[10px] shadow-md flex items-center gap-1">
            <Star className="w-3 h-3 fill-black text-black" />
            {item.rating}★
          </span>
        ) : null}
      </div>

      {/* Thumbnail Area with Click-to-Enlarge */}
      <div
        onClick={() => onEnlarge(item.originalIndex)}
        className="relative w-full aspect-3/4 sm:aspect-4/5 bg-zinc-950 flex items-center justify-center cursor-pointer overflow-hidden"
      >
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={`Photo #${item.pageNumber}`}
            className={`w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02] ${
              item.rejected ? 'grayscale contrast-125' : ''
            }`}
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-zinc-600">
            <div className="w-6 h-6 border-2 border-brand-gold/40 border-t-brand-gold rounded-full animate-spin" />
            <span className="text-[10px] uppercase tracking-wider font-semibold">Loading</span>
          </div>
        )}

        {/* Hover Enlarge Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-lg">
            <ZoomIn className="w-3.5 h-3.5 text-brand-gold" />
            <span>Click to Preview</span>
          </div>
        </div>

        {/* Rejected Overlay Strip */}
        {item.rejected && (
          <div className="absolute inset-0 bg-red-950/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
            <div className="transform -rotate-12 bg-red-600/90 text-white font-black text-sm tracking-widest uppercase px-4 py-1 rounded shadow-lg border border-red-400">
              REJECTED
            </div>
          </div>
        )}
      </div>

      {/* Bottom Interactive Bar (Rating & Reject) */}
      <div className="p-3 bg-[#13131D] border-t border-white/5 flex flex-col gap-2">
        {/* 1-to-5 Star Interactive Rating Bar */}
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-1"
            onMouseLeave={() => setHoverRating(null)}
          >
            {[1, 2, 3, 4, 5].map((starVal) => {
              const isFilled = starVal <= activeStars;
              return (
                <button
                  key={starVal}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Toggle off if clicking same rating
                    if (item.rating === starVal) {
                      onRate(item.originalIndex, 0);
                    } else {
                      onRate(item.originalIndex, starVal);
                    }
                  }}
                  onMouseEnter={() => setHoverRating(starVal)}
                  disabled={item.rejected}
                  className={`p-1 rounded-md transition transform active:scale-90 ${
                    item.rejected
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-white/10 hover:scale-110 cursor-pointer'
                  }`}
                  title={`Rate ${starVal} Star${starVal > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`w-4 h-4 transition-colors ${
                      isFilled
                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                        : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Quick Reject / Unrate Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleReject(item.originalIndex);
            }}
            className={`p-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              item.rejected
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                : 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10'
            }`}
            title={item.rejected ? 'Restore Photo' : 'Reject Photo'}
          >
            {item.rejected ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden xs:inline">Restore</span>
              </>
            ) : (
              <>
                <Ban className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden xs:inline">Reject</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
