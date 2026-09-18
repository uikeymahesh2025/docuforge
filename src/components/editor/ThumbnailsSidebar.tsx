import React, { useEffect, useState } from 'react';
import { X, Copy, Trash2, RotateCw } from 'lucide-react';
import { useEditorStore } from '../../stores/useEditorStore';
import { loadPdfDocument, getPageThumbnail } from '../../pdf/pdfManager';

interface ThumbnailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThumbnailsSidebar: React.FC<ThumbnailsSidebarProps> = ({ isOpen, onClose }) => {
  const { pdfBytes, pageCount, currentPage, setCurrentPage } = useEditorStore();
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !pdfBytes || pageCount === 0) return;

    let isMounted = true;
    const generateThumbs = async () => {
      setIsLoading(true);
      try {
        const doc = await loadPdfDocument(pdfBytes);
        const thumbs: string[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          if (!isMounted) break;
          const thumbUrl = await getPageThumbnail(doc, i, 120);
          thumbs.push(thumbUrl);
        }
        if (isMounted) setThumbnails(thumbs);
      } catch (err) {
        console.error('Failed to generate thumbnails', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    generateThumbs();
    return () => {
      isMounted = false;
    };
  }, [isOpen, pdfBytes, pageCount]);

  if (!isOpen) return null;

  return (
    <aside className="w-56 bg-[#0C0C12] border-r border-white/10 flex flex-col z-30 shrink-0 select-none shadow-xl">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
        <span className="text-xs font-bold uppercase tracking-wider text-white">Pages ({pageCount})</span>
        <button
          onClick={onClose}
          className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading && thumbnails.length === 0 && (
          <div className="text-center py-10 text-xs text-zinc-500 animate-pulse">
            Generating thumbnails...
          </div>
        )}

        {Array.from({ length: pageCount }).map((_, idx) => {
          const pageNum = idx + 1;
          const isCurrent = currentPage === pageNum;
          const thumb = thumbnails[idx];

          return (
            <div
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              className={`cursor-pointer rounded-xl border-2 p-1.5 transition group ${
                isCurrent
                  ? 'border-brand-gold bg-amber-500/10 shadow-gold-glow'
                  : 'border-white/10 hover:border-white/30 bg-black/40'
              }`}
            >
              <div className="aspect-[1/1.4] w-full bg-white rounded-lg overflow-hidden flex items-center justify-center relative">
                {thumb ? (
                  <img src={thumb} alt={`Page ${pageNum}`} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-zinc-400 text-xs font-mono">{pageNum}</div>
                )}
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-white font-mono">
                  {pageNum}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
