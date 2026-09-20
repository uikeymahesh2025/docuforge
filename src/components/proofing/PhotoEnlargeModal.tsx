import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Star,
  Ban,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
} from 'lucide-react';
import { PhotoCardItem } from './PhotoCard';

interface PhotoEnlargeModalProps {
  currentIndex: number;
  items: PhotoCardItem[];
  pdfDoc: any; // pdfjs document proxy
  onClose: () => void;
  onNavigate: (index: number) => void;
  onRate: (index: number, rating: number) => void;
  onToggleReject: (index: number) => void;
}

export const PhotoEnlargeModal: React.FC<PhotoEnlargeModalProps> = ({
  currentIndex,
  items,
  pdfDoc,
  onClose,
  onNavigate,
  onRate,
  onToggleReject,
}) => {
  const currentItem = items[currentIndex];
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [highResUrl, setHighResUrl] = useState<string | null>(null);
  const [isLoadingHighRes, setIsLoadingHighRes] = useState<boolean>(true);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Render high-resolution preview canvas (e.g. 1600px width for crystal-clear detail)
  useEffect(() => {
    let isCancelled = false;
    if (!pdfDoc || !currentItem) return;

    setIsLoadingHighRes(true);
    setHighResUrl(null);
    setZoomLevel(1.0);

    const renderHighRes = async () => {
      try {
        const page = await pdfDoc.getPage(currentItem.pageNumber);
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        // Target high-res preview ~1400-1800px width
        const targetWidth = Math.min(Math.max(window.innerWidth * 1.2, 1400), 2200);
        const scale = targetWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise;

        if (!isCancelled) {
          setHighResUrl(canvas.toDataURL('image/jpeg', 0.9));
          setIsLoadingHighRes(false);
        }
      } catch (err) {
        console.error('High-res render error:', err);
        if (!isCancelled) {
          setIsLoadingHighRes(false);
        }
      }
    };

    renderHighRes();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentItem?.pageNumber]);

  // Keyboard navigation: Left/Right arrow, Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < items.length - 1) {
        onNavigate(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, items.length, onClose, onNavigate]);

  if (!currentItem) return null;

  const activeStars = hoverRating !== null ? hoverRating : currentItem.rating;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 animate-fadeIn select-none"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="flex items-center justify-between z-20 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 max-w-5xl w-full mx-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-brand-gold uppercase tracking-wider">
            Photo #{currentItem.pageNumber}
          </span>
          <span className="text-[11px] text-zinc-400 font-medium">
            ({currentIndex + 1} of {items.length})
          </span>
          {currentItem.rejected ? (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
              Rejected
            </span>
          ) : currentItem.rating > 0 ? (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-brand-gold border border-amber-400/30">
              {currentItem.rating} Stars
            </span>
          ) : null}
        </div>

        {/* Zoom Controls & Close */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-900 border border-white/10 rounded-xl p-0.5 text-xs text-zinc-300">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.25))}
              className="p-1.5 hover:text-white rounded-lg hover:bg-white/10 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-mono text-zinc-400">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(3.0, z + 0.25))}
              className="p-1.5 hover:text-white rounded-lg hover:bg-white/10 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1.0)}
              className="p-1.5 hover:text-brand-gold rounded-lg hover:bg-white/10 transition ml-0.5"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
            title="Close Preview (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport with Previous & Next Arrows */}
      <div
        className="relative flex-1 flex items-center justify-center overflow-auto my-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous Button */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-2 sm:left-6 z-20 p-3 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white transition hover:scale-110 shadow-2xl"
            title="Previous Photo (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Display High-Res Image (or Fallback to Thumbnail while loading) */}
        <div className="relative max-h-full max-w-full flex items-center justify-center p-2">
          {highResUrl ? (
            <img
              src={highResUrl}
              alt={`Full-res #${currentItem.pageNumber}`}
              style={{ transform: `scale(${zoomLevel})` }}
              className={`max-h-[75vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-transform duration-150 ${
                currentItem.rejected ? 'grayscale contrast-125 opacity-75' : ''
              }`}
            />
          ) : currentItem.thumbnailUrl ? (
            <img
              src={currentItem.thumbnailUrl}
              alt={`Preview #${currentItem.pageNumber}`}
              style={{ transform: `scale(${zoomLevel})` }}
              className={`max-h-[75vh] max-w-[90vw] object-contain rounded-lg shadow-2xl blur-[1px] transition-transform duration-150 ${
                currentItem.rejected ? 'grayscale contrast-125 opacity-75' : ''
              }`}
            />
          ) : null}

          {isLoadingHighRes && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-xs rounded-lg pointer-events-none">
              <div className="px-3.5 py-1.5 rounded-full bg-black/80 border border-white/15 text-xs text-brand-gold font-semibold flex items-center gap-2 shadow-xl">
                <div className="w-3.5 h-3.5 border-2 border-brand-gold/40 border-t-brand-gold rounded-full animate-spin" />
                <span>Loading High-Res Detail...</span>
              </div>
            </div>
          )}
        </div>

        {/* Next Button */}
        {currentIndex < items.length - 1 && (
          <button
            type="button"
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-2 sm:right-6 z-20 p-3 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white transition hover:scale-110 shadow-2xl"
            title="Next Photo (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Rating & Control Bar */}
      <div
        className="z-20 bg-black/75 backdrop-blur-md border border-white/10 rounded-2xl p-3 max-w-lg w-full mx-auto shadow-2xl flex items-center justify-between gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Star Rating Group */}
        <div className="flex items-center gap-1.5" onMouseLeave={() => setHoverRating(null)}>
          {[1, 2, 3, 4, 5].map((starVal) => {
            const isFilled = starVal <= activeStars;
            return (
              <button
                key={starVal}
                type="button"
                onClick={() => {
                  if (currentItem.rating === starVal) {
                    onRate(currentItem.originalIndex, 0);
                  } else {
                    onRate(currentItem.originalIndex, starVal);
                  }
                }}
                onMouseEnter={() => setHoverRating(starVal)}
                disabled={currentItem.rejected}
                className={`p-1.5 rounded-xl transition ${
                  currentItem.rejected
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-white/10 hover:scale-115 cursor-pointer'
                }`}
                title={`Rate ${starVal} Star`}
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    isFilled
                      ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]'
                      : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Quick Reject Toggle */}
        <button
          type="button"
          onClick={() => onToggleReject(currentItem.originalIndex)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
            currentItem.rejected
              ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              : 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white'
          }`}
        >
          {currentItem.rejected ? (
            <>
              <RotateCcw className="w-4 h-4" />
              <span>Restore Photo</span>
            </>
          ) : (
            <>
              <Ban className="w-4 h-4" />
              <span>Reject Photo</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
