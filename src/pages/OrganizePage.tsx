import React, { useState, useEffect } from 'react';
import { LayoutGrid, ArrowLeft, ArrowRight, RotateCw, Copy, Trash2, Plus, Download, RefreshCw } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { organizePdfPages, PageOperation } from '../pdf/pdfModifier';
import { loadPdfDocument, getPageThumbnail } from '../pdf/pdfManager';
import { useToastStore } from '../stores/useToastStore';
import { sanitizeFilename } from '../utils/downloadHelpers';

interface PageItem {
  originalIndex: number;
  rotation: number;
  thumbnailUrl?: string;
}

export const OrganizePage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    try {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const doc = await loadPdfDocument(bytes);

      const items: PageItem[] = [];
      for (let i = 0; i < doc.numPages; i++) {
        items.push({ originalIndex: i, rotation: 0 });
      }

      setFile(f);
      setPdfBytes(bytes);
      setPages(items);

      // Async load thumbnails
      loadThumbnails(doc, items);

      addToast({
        type: 'success',
        title: 'PDF Loaded',
        message: `Organize ${doc.numPages} pages visually.`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Error loading file',
        message: 'Could not parse document pages.',
      });
    }
  };

  const loadThumbnails = async (doc: any, items: PageItem[]) => {
    for (let i = 0; i < items.length; i++) {
      try {
        const thumb = await getPageThumbnail(doc, items[i].originalIndex + 1, 140);
        setPages((prev) => {
          const arr = [...prev];
          if (arr[i]) arr[i] = { ...arr[i], thumbnailUrl: thumb };
          return arr;
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const moveLeft = (index: number) => {
    if (index === 0) return;
    setPages((prev) => {
      const arr = [...prev];
      const temp = arr[index - 1];
      arr[index - 1] = arr[index];
      arr[index] = temp;
      return arr;
    });
  };

  const moveRight = (index: number) => {
    if (index === pages.length - 1) return;
    setPages((prev) => {
      const arr = [...prev];
      const temp = arr[index + 1];
      arr[index + 1] = arr[index];
      arr[index] = temp;
      return arr;
    });
  };

  const rotatePage = (index: number) => {
    setPages((prev) => {
      const arr = [...prev];
      arr[index] = { ...arr[index], rotation: (arr[index].rotation + 90) % 360 };
      return arr;
    });
  };

  const duplicatePage = (index: number) => {
    setPages((prev) => {
      const arr = [...prev];
      const copy = { ...arr[index] };
      arr.splice(index + 1, 0, copy);
      return arr;
    });
    addToast({ type: 'info', title: 'Page Duplicated', message: `Added duplicate after position ${index + 1}.` });
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1) {
      addToast({ type: 'warning', title: 'Cannot Delete', message: 'The document must have at least one page.' });
      return;
    }
    setPages((prev) => prev.filter((_, i) => i !== index));
    addToast({ type: 'info', title: 'Page Removed', message: `Page ${index + 1} deleted.` });
  };

  const handleSave = async () => {
    if (!pdfBytes || pages.length === 0) return;
    setIsProcessing(true);
    try {
      const ops: PageOperation[] = pages.map((p) => ({
        originalIndex: p.originalIndex,
        rotation: p.rotation,
      }));
      const modified = await organizePdfPages(pdfBytes, ops);
      setResultData(modified);
      addToast({ type: 'success', title: 'Pages Reorganized', message: 'Your organized PDF is ready to download.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Save Failed', message: err?.message || 'Could not save page layout.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <LayoutGrid className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Organize <span className="text-brand-gold">PDF Pages</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Sort, reorder, rotate, duplicate and delete pages visually.
        </p>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop your PDF here to organize"
          subtitle="View and rearrange document pages visually"
          onFilesSelected={handleFileSelected}
        />
      ) : (
        <div className="space-y-6">
          {/* Top action bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#121218] border border-white/10">
            <div>
              <p className="text-xs font-bold text-white">{file?.name}</p>
              <p className="text-[11px] text-zinc-500">{pages.length} pages currently in document</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setPdfBytes(null);
                  setFile(null);
                }}
                className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-lg bg-zinc-900 border border-white/5 transition"
              >
                Change Document
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-gold text-black font-semibold text-xs hover:brightness-110 shadow-gold-glow transition active:scale-95"
              >
                <Download className="w-3.5 h-3.5" /> Save Changes
              </button>
            </div>
          </div>

          {/* Page Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pages.map((p, idx) => (
              <div
                key={`${p.originalIndex}-${idx}`}
                className="bg-[#121218] border border-white/10 rounded-2xl p-3 flex flex-col justify-between group hover:border-brand-gold/40 transition shadow-sm"
              >
                {/* Thumbnail */}
                <div className="aspect-[1/1.4] bg-white rounded-xl overflow-hidden flex items-center justify-center relative mb-3">
                  {p.thumbnailUrl ? (
                    <img
                      src={p.thumbnailUrl}
                      alt={`Page ${idx + 1}`}
                      style={{ transform: `rotate(${p.rotation}deg)` }}
                      className="w-full h-full object-contain transition-transform"
                    />
                  ) : (
                    <div className="text-zinc-400 text-xs font-mono">Page {p.originalIndex + 1}</div>
                  )}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-[10px] text-white font-mono">
                    {idx + 1}
                  </span>
                </div>

                {/* Page card controls */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveLeft(idx)}
                      disabled={idx === 0}
                      className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 rounded transition"
                      title="Move Left"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveRight(idx)}
                      disabled={idx === pages.length - 1}
                      className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 rounded transition"
                      title="Move Right"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => rotatePage(idx)}
                      className="p-1 text-zinc-400 hover:text-brand-gold rounded transition"
                      title="Rotate 90° CW"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => duplicatePage(idx)}
                      className="p-1 text-zinc-400 hover:text-brand-gold rounded transition"
                      title="Duplicate Page"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deletePage(idx)}
                      className="p-1 text-zinc-400 hover:text-rose-400 rounded transition"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Applying page reorganization..." />
      <ResultModal
        isOpen={Boolean(resultData)}
        onClose={() => setResultData(null)}
        resultData={resultData}
        defaultFileName={file ? sanitizeFilename(file.name, 'organized') : 'organized.pdf'}
        onReset={() => {
          setResultData(null);
          setPdfBytes(null);
          setFile(null);
        }}
      />
    </div>
  );
};
