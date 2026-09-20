import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Star,
  Ban,
  Check,
  Download,
  Filter,
  ArrowUpDown,
  Share2,
  Sparkles,
  RefreshCw,
  Eye,
  Trash2,
  Upload,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  FileText,
} from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { PhotoCard, PhotoCardItem } from '../components/proofing/PhotoCard';
import { PhotoEnlargeModal } from '../components/proofing/PhotoEnlargeModal';
import { ProofingExportModal } from '../components/proofing/ProofingExportModal';
import { loadPdfDocument, getPageThumbnail } from '../pdf/pdfManager';
import { useToastStore } from '../stores/useToastStore';

export const PhotoProofingPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [items, setItems] = useState<PhotoCardItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<
    'all' | '5' | '4' | '3' | '1-2' | 'unrated' | 'rejected'
  >('all');

  // Pagination state (smooth performance for 100+ page albums)
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(24);

  // Modals state
  const [enlargedIndex, setEnlargedIndex] = useState<number | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Thumbnail rendering queue tracking
  const loadingPagesRef = useRef<Set<number>>(new Set());
  const thumbnailCacheRef = useRef<Map<number, string>>(new Map());

  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selectedFile = files[0];

    try {
      setIsLoading(true);
      const buffer = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const doc = await loadPdfDocument(bytes);

      const newItems: PhotoCardItem[] = [];
      for (let i = 0; i < doc.numPages; i++) {
        newItems.push({
          originalIndex: i,
          pageNumber: i + 1,
          rating: 0,
          rejected: false,
        });
      }

      setFile(selectedFile);
      setPdfBytes(bytes);
      setPdfDoc(doc);
      setItems(newItems);
      setPage(1);
      thumbnailCacheRef.current.clear();
      loadingPagesRef.current.clear();

      addToast({
        type: 'success',
        title: 'Album Loaded!',
        message: `Loaded ${doc.numPages} photo pages for client proofing.`,
      });
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Error Loading PDF',
        message: 'Could not open this album PDF. Please check if file is valid.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Thumbnail generator with concurrency limit
  const fetchThumbnail = useCallback(
    async (pageNumber: number) => {
      if (!pdfDoc) return;
      if (thumbnailCacheRef.current.has(pageNumber)) {
        const cached = thumbnailCacheRef.current.get(pageNumber);
        setItems((prev) =>
          prev.map((it) => (it.pageNumber === pageNumber ? { ...it, thumbnailUrl: cached } : it))
        );
        return;
      }
      if (loadingPagesRef.current.has(pageNumber)) return;

      loadingPagesRef.current.add(pageNumber);
      try {
        const thumb = await getPageThumbnail(pdfDoc, pageNumber, 320);
        thumbnailCacheRef.current.set(pageNumber, thumb);
        setItems((prev) =>
          prev.map((it) => (it.pageNumber === pageNumber ? { ...it, thumbnailUrl: thumb } : it))
        );
      } catch (err) {
        console.error(`Failed thumbnail for page ${pageNumber}:`, err);
      } finally {
        loadingPagesRef.current.delete(pageNumber);
      }
    },
    [pdfDoc]
  );

  // Rating and reject handlers
  const handleRate = (originalIndex: number, rating: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.originalIndex === originalIndex
          ? {
              ...item,
              rating,
              // If rated > 0, un-reject automatically
              rejected: rating > 0 ? false : item.rejected,
            }
          : item
      )
    );
  };

  const handleToggleReject = (originalIndex: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.originalIndex !== originalIndex) return item;
        const newRejected = !item.rejected;
        return {
          ...item,
          rejected: newRejected,
          // If rejected, clear rating
          rating: newRejected ? 0 : item.rating,
        };
      })
    );
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === '5') return item.rating === 5 && !item.rejected;
      if (activeFilter === '4') return item.rating === 4 && !item.rejected;
      if (activeFilter === '3') return item.rating === 3 && !item.rejected;
      if (activeFilter === '1-2') return (item.rating === 1 || item.rating === 2) && !item.rejected;
      if (activeFilter === 'unrated') return item.rating === 0 && !item.rejected;
      if (activeFilter === 'rejected') return item.rejected;
      return true;
    });
  }, [items, activeFilter]);

  // Pagination slicing
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    if (pageSize >= 9999) return filteredItems;
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  // Preload visible page thumbnails when paginated items change
  useEffect(() => {
    if (!pdfDoc || paginatedItems.length === 0) return;
    paginatedItems.forEach((item) => {
      if (!item.thumbnailUrl) {
        fetchThumbnail(item.pageNumber);
      }
    });
  }, [paginatedItems, pdfDoc, fetchThumbnail]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [activeFilter, pageSize]);

  // Metrics counts
  const totalCount = items.length;
  const count5 = items.filter((i) => i.rating === 5 && !i.rejected).length;
  const count4 = items.filter((i) => i.rating === 4 && !i.rejected).length;
  const count3 = items.filter((i) => i.rating === 3 && !i.rejected).length;
  const count12 = items.filter((i) => (i.rating === 1 || i.rating === 2) && !i.rejected).length;
  const totalSelected = count5 + count4 + count3 + count12;
  const unratedCount = items.filter((i) => i.rating === 0 && !i.rejected).length;
  const rejectedCount = items.filter((i) => i.rejected).length;

  const handleResetAll = () => {
    if (window.confirm('Are you sure you want to reset all ratings and rejections?')) {
      setItems((prev) => prev.map((i) => ({ ...i, rating: 0, rejected: false })));
      addToast({
        type: 'info',
        title: 'Selection Reset',
        message: 'All photo ratings have been reset.',
      });
    }
  };

  const handleSelectAllVisible5Star = () => {
    const visibleIndices = new Set(paginatedItems.map((i) => i.originalIndex));
    setItems((prev) =>
      prev.map((i) =>
        visibleIndices.has(i.originalIndex) ? { ...i, rating: 5, rejected: false } : i
      )
    );
    addToast({
      type: 'success',
      title: 'Batch Rated',
      message: `Rated ${visibleIndices.size} visible photos as 5-Stars.`,
    });
  };

  return (
    <div className="min-h-screen bg-[#09090C] text-zinc-100 flex flex-col">
      {/* Hero Header Area */}
      <section className="relative pt-8 pb-6 border-b border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-brand-gold text-xs font-bold flex items-center gap-1.5 shadow-xs">
                  <Star className="w-3.5 h-3.5 fill-brand-gold" />
                  Wedding & Event Pro
                </span>
                <span className="text-zinc-500 text-xs">• 100% Lossless Export</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Photo Proofing & Selection
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
                Review wedding & event album PDFs with 1-5 star ratings, fast rejections,
                click-to-enlarge inspection, and lossless sorted export with WhatsApp sharing.
              </p>
            </div>

            {items.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-gold text-black font-bold text-xs hover:brightness-110 shadow-gold-glow transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Export Selection ({totalSelected})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Close this album and upload a different PDF?')) {
                      setFile(null);
                      setPdfBytes(null);
                      setPdfDoc(null);
                      setItems([]);
                    }
                  }}
                  className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white text-xs transition"
                  title="Upload Another Album"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Upload Zone when no file is loaded */}
        {items.length === 0 ? (
          <div className="max-w-2xl mx-auto w-full my-auto py-12">
            <FileUploader
              fileType="pdf"
              title="Upload Wedding or Event Album PDF"
              subtitle="Drop a multi-page PDF album (supports 100+ high-res pages)"
              onFilesSelected={handleFilesSelected}
            />
            {isLoading && (
              <div className="mt-6 flex flex-col items-center justify-center gap-3 text-zinc-400">
                <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">
                  Parsing high-resolution album pages...
                </span>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Sticky Top Filter & Stats Bar */}
            <div className="sticky top-2 z-30 bg-[#101018]/95 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                    activeFilter === 'all'
                      ? 'bg-brand-gold text-black shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('5')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1 ${
                    activeFilter === '5'
                      ? 'bg-amber-400 text-black shadow-xs'
                      : 'text-zinc-400 hover:text-amber-400 hover:bg-white/5'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>5 Stars ({count5})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('4')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1 ${
                    activeFilter === '4'
                      ? 'bg-amber-400 text-black shadow-xs'
                      : 'text-zinc-400 hover:text-amber-400 hover:bg-white/5'
                  }`}
                >
                  <span>4 Stars ({count4})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('3')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1 ${
                    activeFilter === '3'
                      ? 'bg-amber-400 text-black shadow-xs'
                      : 'text-zinc-400 hover:text-amber-400 hover:bg-white/5'
                  }`}
                >
                  <span>3 Stars ({count3})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('1-2')}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition ${
                    activeFilter === '1-2'
                      ? 'bg-amber-400 text-black shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  1-2 Stars ({count12})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('unrated')}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition ${
                    activeFilter === 'unrated'
                      ? 'bg-zinc-700 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Unrated ({unratedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('rejected')}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition flex items-center gap-1 ${
                    activeFilter === 'rejected'
                      ? 'bg-red-500 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-red-400 hover:bg-white/5'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Rejected ({rejectedCount})</span>
                </button>
              </div>

              {/* Live Metrics Badge & Quick Action Buttons */}
              <div className="flex items-center gap-2.5 justify-between md:justify-end text-xs">
                {/* Live Metrics Badge */}
                <div className="hidden lg:flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 text-[11px] text-zinc-300">
                  <span>
                    Total: <strong className="text-white">{totalCount}</strong>
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span>
                    Selected: <strong className="text-brand-gold">{totalSelected}</strong>
                  </span>
                  <span className="text-zinc-500">
                    (5★: {count5}, 4★: {count4}, 3★: {count3})
                  </span>
                </div>

                {/* Bulk Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible5Star}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-white/10 hover:border-amber-400/40 text-[11px] font-semibold text-zinc-300 hover:text-brand-gold transition"
                    title="Mark all photos currently visible on this page as 5-star"
                  >
                    Rate Page 5★
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition"
                    title="Reset All Ratings"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Gallery Grid */}
            {filteredItems.length === 0 ? (
              <div className="py-20 text-center space-y-3 bg-[#0F0F16] rounded-2xl border border-white/5">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-500 mx-auto">
                  <Filter className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">No Photos Match This Filter</h4>
                <p className="text-xs text-zinc-400">
                  Try selecting "All" or choosing another star filter above.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition"
                >
                  Show All Photos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {paginatedItems.map((item) => (
                  <PhotoCard
                    key={item.originalIndex}
                    item={item}
                    onRate={handleRate}
                    onToggleReject={handleToggleReject}
                    onEnlarge={(origIdx) => {
                      // Find index of this item in items array
                      const idx = items.findIndex((i) => i.originalIndex === origIdx);
                      if (idx !== -1) setEnlargedIndex(idx);
                    }}
                    onVisible={fetchThumbnail}
                  />
                ))}
              </div>
            )}

            {/* Bottom Pagination & Items Per Page Controls */}
            {filteredItems.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-white/5 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <span>Items per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-gold"
                  >
                    <option value={24}>24 photos</option>
                    <option value={48}>48 photos</option>
                    <option value={96}>96 photos</option>
                    <option value={9999}>All photos</option>
                  </select>
                  <span className="text-[11px] text-zinc-500">
                    Showing {(page - 1) * pageSize + 1} -{' '}
                    {Math.min(page * pageSize, filteredItems.length)} of {filteredItems.length}
                  </span>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-semibold text-white px-2">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Click-to-Enlarge Modal Preview */}
      {enlargedIndex !== null && pdfDoc && (
        <PhotoEnlargeModal
          currentIndex={enlargedIndex}
          items={items}
          pdfDoc={pdfDoc}
          onClose={() => setEnlargedIndex(null)}
          onNavigate={(newIdx) => setEnlargedIndex(newIdx)}
          onRate={handleRate}
          onToggleReject={handleToggleReject}
        />
      )}

      {/* Lossless Export & WhatsApp Share Modal */}
      {isExportModalOpen && pdfBytes && file && (
        <ProofingExportModal
          sourceBytes={pdfBytes}
          fileName={file.name}
          items={items}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </div>
  );
};
