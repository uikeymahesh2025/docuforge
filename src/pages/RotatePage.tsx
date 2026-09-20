import React, { useState } from 'react';
import { RotateCw, RotateCcw, Download, RefreshCw, CheckCircle2, SlidersHorizontal, Sparkles, Check } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { organizePdfPages } from '../pdf/pdfModifier';
import { loadPdfDocument, getPageThumbnail } from '../pdf/pdfManager';
import { useToastStore } from '../stores/useToastStore';
import { sanitizeFilename } from '../utils/downloadHelpers';

interface PageRotateItem {
  pageNumber: number; // 1-indexed
  rotation: number; // 0, 90, 180, 270 degrees to apply
  thumbnailUrl?: string;
}

export const RotatePage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [pages, setPages] = useState<PageRotateItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const [rangeInput, setRangeInput] = useState('');

  const addToast = useToastStore((state) => state.addToast);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    try {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const doc = await loadPdfDocument(bytes);

      const items: PageRotateItem[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        items.push({ pageNumber: i, rotation: 0 });
      }

      setPdfBytes(bytes);
      setFile(f);
      setTotalPages(doc.numPages);
      setPages(items);
      setResultData(null);
      setRangeInput('');

      // Incrementally load page thumbnails
      loadThumbnails(doc, items);

      addToast({
        type: 'success',
        title: 'Document Loaded',
        message: `${doc.numPages} ${doc.numPages === 1 ? 'page' : 'pages'} ready to rotate.`,
      });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Could not load PDF document.' });
    }
  };

  const loadThumbnails = async (doc: any, items: PageRotateItem[]) => {
    for (let i = 0; i < items.length; i++) {
      try {
        const thumb = await getPageThumbnail(doc, items[i].pageNumber, 160);
        setPages((prev) => {
          const arr = [...prev];
          if (arr[i]) {
            arr[i] = { ...arr[i], thumbnailUrl: thumb };
          }
          return arr;
        });
      } catch (err) {
        console.error('Thumbnail generation error:', err);
      }
    }
  };

  // Rotate a single individual page
  const rotateSinglePage = (pageNumber: number, direction: 'cw' | 'ccw') => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.pageNumber !== pageNumber) return p;
        const delta = direction === 'cw' ? 90 : 270;
        return { ...p, rotation: (p.rotation + delta) % 360 };
      })
    );
  };

  // Reset a single individual page
  const resetSinglePage = (pageNumber: number) => {
    setPages((prev) =>
      prev.map((p) => (p.pageNumber === pageNumber ? { ...p, rotation: 0 } : p))
    );
  };

  // Rotate all pages by 90 degrees
  const rotateAllPages = (direction: 'cw' | 'ccw') => {
    const delta = direction === 'cw' ? 90 : 270;
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotation: (p.rotation + delta) % 360,
      }))
    );
    addToast({
      type: 'info',
      title: 'Rotated All Pages',
      message: `Applied ${direction === 'cw' ? '+90° Clockwise' : '-90° Counter-Clockwise'} to all ${totalPages} pages.`,
    });
  };

  // Rotate only Odd or Even pages
  const rotateFilteredPages = (type: 'odd' | 'even', direction: 'cw' | 'ccw') => {
    const delta = direction === 'cw' ? 90 : 270;
    setPages((prev) =>
      prev.map((p) => {
        const isTarget = type === 'odd' ? p.pageNumber % 2 !== 0 : p.pageNumber % 2 === 0;
        return isTarget ? { ...p, rotation: (p.rotation + delta) % 360 } : p;
      })
    );
    addToast({
      type: 'info',
      title: `Rotated ${type === 'odd' ? 'Odd' : 'Even'} Pages`,
      message: `Applied ${direction === 'cw' ? '+90°' : '-90°'} rotation.`,
    });
  };

  // Rotate by custom range (e.g. "1, 3, 5-7")
  const rotateRangePages = (direction: 'cw' | 'ccw') => {
    if (!rangeInput.trim()) return;
    const parts = rangeInput.split(/[,;\s]+/);
    const targetSet = new Set<number>();

    for (const part of parts) {
      if (!part.trim()) continue;
      if (part.includes('-')) {
        const [s, e] = part.split('-');
        const start = parseInt(s, 10);
        const end = parseInt(e, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
            if (i >= 1 && i <= totalPages) targetSet.add(i);
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= totalPages) {
          targetSet.add(num);
        }
      }
    }

    if (targetSet.size === 0) {
      addToast({ type: 'warning', title: 'Invalid Range', message: 'Please enter valid page numbers (e.g., 1, 3, 5-7).' });
      return;
    }

    const delta = direction === 'cw' ? 90 : 270;
    setPages((prev) =>
      prev.map((p) =>
        targetSet.has(p.pageNumber) ? { ...p, rotation: (p.rotation + delta) % 360 } : p
      )
    );
    addToast({
      type: 'info',
      title: 'Rotated Selected Pages',
      message: `Applied rotation to pages: ${Array.from(targetSet).sort((a, b) => a - b).join(', ')}.`,
    });
  };

  // Reset all pages to 0 degrees
  const resetAllPages = () => {
    setPages((prev) => prev.map((p) => ({ ...p, rotation: 0 })));
    addToast({ type: 'info', title: 'Reset Complete', message: 'All page rotations set to 0°.' });
  };

  // Count how many pages have active rotation
  const modifiedCount = pages.filter((p) => p.rotation !== 0).length;

  const handleApply = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const ops = pages.map((p) => ({
        originalIndex: p.pageNumber - 1,
        rotation: p.rotation,
      }));
      const rotated = await organizePdfPages(pdfBytes, ops);
      setResultData(rotated);
      addToast({
        type: 'success',
        title: 'Rotation Complete',
        message: modifiedCount > 0 ? `${modifiedCount} page(s) rotated successfully.` : 'Document ready to download.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Rotation Failed', message: err?.message || 'Could not rotate document.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetDocument = () => {
    setPdfBytes(null);
    setFile(null);
    setPages([]);
    setResultData(null);
    setRangeInput('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <RotateCw className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Rotate <span className="text-brand-gold">PDF Pages</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
          Rotate individual pages or the entire document clockwise (90°), counter-clockwise (90°), or upside down (180°) with instant visual preview.
        </p>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop PDF here to rotate"
          subtitle="Rotate specific pages or entire document with visual preview"
          onFilesSelected={handleFileSelected}
        />
      ) : (
        <div className="space-y-6">
          {/* Header & Batch Controls Toolbar */}
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{file?.name}</span>
                  <span className="text-xs font-normal text-zinc-400 font-mono">
                    ({totalPages} {totalPages === 1 ? 'page' : 'pages'})
                  </span>
                </p>
                <p className="text-xs text-brand-gold mt-0.5">
                  {modifiedCount === 0
                    ? 'No pages rotated yet. Click on individual cards below or use batch controls.'
                    : `${modifiedCount} of ${totalPages} pages rotated`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {modifiedCount > 0 && (
                  <button
                    onClick={resetAllPages}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reset All (0°)
                  </button>
                )}
                <button
                  onClick={handleResetDocument}
                  className="text-xs text-zinc-400 hover:text-white transition px-3 py-1.5 border border-white/10 rounded-lg"
                >
                  Change File
                </button>
              </div>
            </div>

            {/* Quick Batch Actions */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2.5">
                Quick Batch Actions
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <button
                  onClick={() => rotateAllPages('cw')}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-white/10 bg-zinc-900/70 hover:border-brand-gold/50 hover:bg-amber-500/10 text-zinc-200 hover:text-white text-xs font-semibold transition"
                >
                  <RotateCw className="w-3.5 h-3.5 text-brand-gold" />
                  <span>All Pages ↻</span>
                </button>

                <button
                  onClick={() => rotateAllPages('ccw')}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-white/10 bg-zinc-900/70 hover:border-brand-gold/50 hover:bg-amber-500/10 text-zinc-200 hover:text-white text-xs font-semibold transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-brand-gold" />
                  <span>All Pages ↺</span>
                </button>

                <button
                  onClick={() => rotateFilteredPages('odd', 'cw')}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-white/10 bg-zinc-900/70 hover:border-brand-gold/50 hover:bg-amber-500/10 text-zinc-200 hover:text-white text-xs font-semibold transition"
                >
                  <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Odd Pages ↻</span>
                </button>

                <button
                  onClick={() => rotateFilteredPages('even', 'cw')}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-white/10 bg-zinc-900/70 hover:border-brand-gold/50 hover:bg-amber-500/10 text-zinc-200 hover:text-white text-xs font-semibold transition"
                >
                  <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Even Pages ↻</span>
                </button>

                <button
                  onClick={() => rotateAllPages('cw')}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-white/10 bg-zinc-900/70 hover:border-brand-gold/50 hover:bg-amber-500/10 text-zinc-200 hover:text-white text-xs font-semibold transition"
                  title="Rotate all 180° by applying 90° twice"
                >
                  <RotateCw className="w-3.5 h-3.5 text-brand-gold" />
                  <span>Flip 180°</span>
                </button>

                <button
                  onClick={resetAllPages}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-white/10 bg-zinc-900/70 hover:border-red-500/50 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 text-xs font-semibold transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset to 0°</span>
                </button>
              </div>
            </div>

            {/* Specific Pages Range Input */}
            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="text-xs text-zinc-400 whitespace-nowrap">
                Rotate Specific Pages:
              </span>
              <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="e.g. 1, 3, 5-8"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  className="flex-1 sm:max-w-xs px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-gold"
                />
                <button
                  onClick={() => rotateRangePages('cw')}
                  disabled={!rangeInput.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-brand-gold hover:text-black disabled:opacity-40 disabled:hover:bg-white/10 disabled:hover:text-white rounded-lg text-xs font-semibold transition"
                >
                  <RotateCw className="w-3 h-3" /> 90° ↻
                </button>
                <button
                  onClick={() => rotateRangePages('ccw')}
                  disabled={!rangeInput.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-brand-gold hover:text-black disabled:opacity-40 disabled:hover:bg-white/10 disabled:hover:text-white rounded-lg text-xs font-semibold transition"
                >
                  <RotateCcw className="w-3 h-3" /> 90° ↺
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Visual Page Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <span>Individual Page Controls</span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  (Click ↻ or ↺ on any page to rotate it individually)
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {pages.map((p) => {
                const isRotated = p.rotation !== 0;

                return (
                  <div
                    key={p.pageNumber}
                    className={`group relative bg-[#121218] rounded-2xl border p-3.5 flex flex-col items-center transition shadow-lg ${
                      isRotated
                        ? 'border-brand-gold/60 ring-1 ring-brand-gold/30 bg-amber-500/5'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Card Header: Page Number & Angle Badge */}
                    <div className="w-full flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold text-white">
                        Page {p.pageNumber}
                      </span>
                      {isRotated ? (
                        <span className="text-[10px] font-mono font-bold text-brand-gold bg-amber-500/20 px-2 py-0.5 rounded border border-brand-gold/30">
                          +{p.rotation}°
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          0°
                        </span>
                      )}
                    </div>

                    {/* Thumbnail Display with Smooth CSS Rotation */}
                    <div className="relative w-full h-44 bg-black/60 rounded-xl overflow-hidden flex items-center justify-center mb-3 border border-white/5">
                      {p.thumbnailUrl ? (
                        <img
                          src={p.thumbnailUrl}
                          alt={`Page ${p.pageNumber}`}
                          style={{
                            transform: `rotate(${p.rotation}deg)`,
                            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                          className="max-h-36 max-w-[85%] object-contain rounded shadow-md pointer-events-none"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                          <div className="w-5 h-5 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
                          <span className="text-[10px]">Loading...</span>
                        </div>
                      )}

                      {/* Quick Hover Overlay Buttons */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition duration-200">
                        <button
                          type="button"
                          onClick={() => rotateSinglePage(p.pageNumber, 'ccw')}
                          title="Rotate 90° Counter-Clockwise"
                          className="p-2 rounded-lg bg-zinc-900/90 border border-white/20 text-zinc-200 hover:text-brand-gold hover:border-brand-gold transition shadow-lg"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => rotateSinglePage(p.pageNumber, 'cw')}
                          title="Rotate 90° Clockwise"
                          className="p-2 rounded-lg bg-zinc-900/90 border border-white/20 text-zinc-200 hover:text-brand-gold hover:border-brand-gold transition shadow-lg"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => rotateSinglePage(p.pageNumber, 'ccw')}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white/5 hover:bg-brand-gold hover:text-black text-zinc-300 font-semibold text-xs transition"
                        title="Rotate 90° Counter-Clockwise"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>↺ 90°</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => rotateSinglePage(p.pageNumber, 'cw')}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white/5 hover:bg-brand-gold hover:text-black text-zinc-300 font-semibold text-xs transition"
                        title="Rotate 90° Clockwise"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>90° ↻</span>
                      </button>
                    </div>

                    {/* Reset Button (visible when page is rotated) */}
                    {isRotated && (
                      <button
                        type="button"
                        onClick={() => resetSinglePage(p.pageNumber)}
                        className="mt-2 text-[10px] text-zinc-400 hover:text-zinc-200 underline transition"
                      >
                        Reset to 0°
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Apply & Download Bar */}
          <div className="sticky bottom-6 z-30 p-4 bg-[#121218]/95 backdrop-blur-md border border-brand-gold/30 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white">
                {modifiedCount > 0
                  ? `${modifiedCount} page(s) scheduled for rotation`
                  : 'All pages at original orientation (0°)'}
              </p>
              <p className="text-xs text-zinc-400">
                Total {totalPages} {totalPages === 1 ? 'page' : 'pages'} in final document
              </p>
            </div>

            <button
              onClick={handleApply}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-8 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
            >
              <RotateCw className="w-4 h-4" />
              <span>Apply &amp; Download Rotated PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Applying rotation to pages..." />
      <ResultModal
        isOpen={Boolean(resultData)}
        onClose={() => setResultData(null)}
        resultData={resultData}
        defaultFileName={file ? sanitizeFilename(file.name, 'rotated') : 'document_rotated.pdf'}
        title="Your Rotated PDF is Ready!"
        subtitle={
          modifiedCount > 0
            ? `${modifiedCount} page(s) rotated successfully.`
            : 'Document saved successfully.'
        }
        onReset={handleResetDocument}
      />
    </div>
  );
};
