import React, { useState } from 'react';
import {
  Camera,
  ArrowUp,
  ArrowDown,
  Trash2,
  Download,
  RotateCw,
  Wand2,
  Sparkles,
  RefreshCw,
  Plus,
  FileCheck,
  Zap,
  CheckCircle2,
  Shield,
  Layers,
} from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { ImageEditModal } from '../components/tools/ImageEditModal';
import { CameraScannerModal } from '../components/tools/CameraScannerModal';
import { imagesToPdf } from '../pdf/pdfModifier';
import { useToastStore } from '../stores/useToastStore';
import {
  rotateImage,
  autoDetectDocumentQuad,
  warpPerspective,
  loadImage,
} from '../utils/imageProcessor';

interface ScannedItem {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

export const ScanToPdfPage: React.FC = () => {
  const [pages, setPages] = useState<ScannedItem[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'Fit'>('A4');
  const [marginSize, setMarginSize] = useState<'none' | 'small' | 'normal'>('small');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('Compiling PDF from scanned pages...');
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [editingPage, setEditingPage] = useState<ScannedItem | null>(null);

  const addToast = useToastStore((state) => state.addToast);

  // Callback from CameraScannerModal
  const handleCameraPagesScanned = (
    scannedPages: { id: string; name: string; dataUrl: string; width: number; height: number }[]
  ) => {
    setPages((prev) => [...prev, ...scannedPages]);
    addToast({
      type: 'success',
      title: 'Scanned Pages Added',
      message: `${scannedPages.length} page(s) captured with camera. Ready for PDF compilation.`,
    });
  };

  // Upload fallback
  const handleFilesSelected = async (files: File[]) => {
    const newItems: ScannedItem[] = [];

    for (const file of files) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      const dims = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.src = dataUrl;
      });

      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        dataUrl,
        width: dims.width,
        height: dims.height,
      });
    }

    setPages((prev) => [...prev, ...newItems]);
    addToast({
      type: 'success',
      title: 'Photos Uploaded',
      message: `${newItems.length} image(s) added to scanner queue.`,
    });
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setPages((prev) => {
      const arr = [...prev];
      const temp = arr[idx - 1];
      arr[idx - 1] = arr[idx];
      arr[idx] = temp;
      return arr;
    });
  };

  const moveDown = (idx: number) => {
    if (idx === pages.length - 1) return;
    setPages((prev) => {
      const arr = [...prev];
      const temp = arr[idx + 1];
      arr[idx + 1] = arr[idx];
      arr[idx] = temp;
      return arr;
    });
  };

  const removePage = (id: string) => {
    setPages((prev) => prev.filter((i) => i.id !== id));
  };

  // Rotate single page 90° Clockwise
  const handleQuickRotate = async (id: string) => {
    const target = pages.find((i) => i.id === id);
    if (!target) return;
    try {
      const res = await rotateImage(target.dataUrl, 90);
      setPages((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, dataUrl: res.dataUrl, width: res.width, height: res.height }
            : i
        )
      );
      addToast({
        type: 'success',
        title: 'Rotated 90°',
        message: `${target.name} rotated clockwise.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Rotate Failed', message: err?.message });
    }
  };

  // Quick Auto Perspective Single Page
  const handleAutoStraightenSingle = async (id: string) => {
    const target = pages.find((i) => i.id === id);
    if (!target) return;
    setIsProcessing(true);
    setProcessingStatus(`Straightening ${target.name}...`);
    try {
      const imgEl = await loadImage(target.dataUrl);
      const quad = autoDetectDocumentQuad(imgEl);
      const res = await warpPerspective(target.dataUrl, quad);
      setPages((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, dataUrl: res.dataUrl, width: res.width, height: res.height }
            : i
        )
      );
      addToast({
        type: 'success',
        title: 'Auto Straightened',
        message: `${target.name} perspective corrected & straightened.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Straighten Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch Auto Perspective Straighten All Pages
  const handleAutoStraightenAll = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);
    setProcessingStatus(`Auto-straightening all ${pages.length} document pages...`);
    try {
      const updatedList: ScannedItem[] = [];
      for (const item of pages) {
        const imgEl = await loadImage(item.dataUrl);
        const quad = autoDetectDocumentQuad(imgEl);
        const res = await warpPerspective(item.dataUrl, quad);
        updatedList.push({
          ...item,
          dataUrl: res.dataUrl,
          width: res.width,
          height: res.height,
        });
      }
      setPages(updatedList);
      addToast({
        type: 'success',
        title: 'All Pages Straightened',
        message: `${pages.length} pages rectified with perspective correction.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Batch Straighten Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Save changes from ImageEditModal
  const handleSaveEditedPage = (updated: ScannedItem) => {
    setPages((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    addToast({
      type: 'success',
      title: 'Page Updated',
      message: `${updated.name} updated successfully.`,
    });
  };

  // Compile all pages into PDF
  const handleCompilePdf = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);
    setProcessingStatus('Compiling high-resolution PDF document...');
    try {
      const pdfBytes = await imagesToPdf(pages, pageSize, marginSize);
      setResultBytes(pdfBytes);
      addToast({
        type: 'success',
        title: 'PDF Ready',
        message: `${pages.length} scanned pages compiled into a clean PDF.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Compilation Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <Camera className="w-8 h-8" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/15 text-brand-gold border border-brand-gold/30 text-xs font-bold mb-3 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real-Time Multi-Photo Camera Scanner</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
          Document <span className="text-brand-gold">Camera Scanner</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Scan physical documents, notes, receipts, and IDs straight from your camera. Rear-camera priority on mobile, live continuous batch capture, and auto-perspective paper corner detection.
        </p>
      </div>

      {pages.length === 0 ? (
        <div className="space-y-6">
          {/* Main Hero Launch Camera Card */}
          <div className="relative border-2 border-brand-gold/40 hover:border-brand-gold bg-gradient-to-b from-amber-500/10 to-transparent rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 shadow-2xl overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-brand-gold/10 blur-[90px] rounded-full pointer-events-none" />

            <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mb-6 rounded-3xl bg-amber-500/20 border-2 border-brand-gold/50 flex items-center justify-center text-brand-gold shadow-gold-glow group-hover:scale-105 transition-transform duration-200">
                <Camera className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                Ready to Scan Documents?
              </h2>
              <p className="text-zinc-300 text-xs sm:text-sm mb-8 leading-relaxed">
                Opens the full-screen camera scanner with rear-camera lens priority. Snap multiple pages rapidly with auto-perspective straightening.
              </p>

              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-brand-gold text-black font-extrabold text-base hover:brightness-110 shadow-gold-glow flex items-center justify-center gap-3 transition active:scale-95 cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>Launch Camera Scanner</span>
              </button>

              {/* Feature Pills */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[11px] text-zinc-400">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-brand-gold" /> Rear Camera Priority
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5">
                  <Wand2 className="w-3 h-3 text-brand-gold" /> Auto-Perspective Quad Crop
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-brand-gold" /> Multi-Page Batch Capture
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Option: Or Upload Existing Photos */}
          <div className="pt-4">
            <div className="relative flex items-center justify-center mb-6">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#09090C] px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider absolute">
                Or Upload Existing Document Photos
              </span>
            </div>

            <FileUploader
              fileType="image"
              accept="image/jpeg,image/png,image/webp"
              multiple={true}
              title="Drop document photos or scans here"
              subtitle="Supports JPG, PNG, and WEBP formats from your device"
              onFilesSelected={handleFilesSelected}
            />
          </div>
        </div>
      ) : (
        /* Workspace when pages exist */
        <div className="space-y-6">
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            {/* Header with Batch actions */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Scanned Document Pages ({pages.length})
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-brand-gold text-[10px] font-mono font-bold border border-brand-gold/30">
                  {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsCameraOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-brand-gold text-black text-xs font-bold flex items-center gap-1.5 hover:brightness-110 shadow-gold-glow transition active:scale-95"
                  title="Open Camera to scan more pages"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan More with Camera</span>
                </button>

                <button
                  onClick={handleAutoStraightenAll}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-brand-gold border border-brand-gold/30 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                  title="Auto-detect corners and straighten all scanned pages"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>⚡ Auto-Straighten All</span>
                </button>

                <button
                  onClick={() => setPages([])}
                  className="text-xs text-zinc-500 hover:text-rose-400 transition px-2 py-1"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Layout & Page Size settings */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-[#0C0C12] border border-white/5">
              <div className="flex items-center gap-2.5">
                <label className="text-xs font-semibold text-zinc-300">PDF Page Size:</label>
                {(['A4', 'Letter', 'Fit'] as const).map((ps) => (
                  <button
                    key={ps}
                    onClick={() => setPageSize(ps)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                      pageSize === ps
                        ? 'border-brand-gold bg-amber-500/15 text-white shadow-gold-glow'
                        : 'border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {ps === 'Fit' ? 'Fit to Image' : ps}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5">
                <label className="text-xs font-semibold text-zinc-300">Margin:</label>
                {(['none', 'small', 'normal'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMarginSize(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border capitalize transition ${
                      marginSize === m
                        ? 'border-brand-gold bg-amber-500/15 text-white shadow-gold-glow'
                        : 'border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Scanned Pages Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {pages.map((page, idx) => (
                <div
                  key={page.id}
                  className="bg-zinc-900 border border-white/10 hover:border-brand-gold/40 rounded-xl p-3 flex flex-col justify-between group transition-all shadow-md"
                >
                  {/* Thumbnail */}
                  <div className="aspect-[3/4] bg-black rounded-lg overflow-hidden flex items-center justify-center mb-2.5 relative">
                    <img
                      src={page.dataUrl}
                      alt={page.name}
                      className="w-full h-full object-contain"
                    />

                    {/* Quick Buttons Overlay */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-90 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleQuickRotate(page.id)}
                        className="p-1.5 rounded-lg bg-black/75 hover:bg-brand-gold hover:text-black text-white border border-white/20 transition shadow-md"
                        title="Rotate 90° Clockwise"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleAutoStraightenSingle(page.id)}
                        className="p-1.5 rounded-lg bg-black/75 hover:bg-brand-gold hover:text-black text-amber-300 border border-white/20 transition shadow-md"
                        title="⚡ Auto Straighten Document"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-zinc-300 border border-white/10">
                      {page.width}×{page.height}
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-200 font-medium truncate mb-2" title={page.name}>
                    {page.name}
                  </p>

                  {/* Edit / Straighten CTA */}
                  <button
                    onClick={() => setEditingPage(page)}
                    className="w-full mb-2 py-1.5 px-2 rounded-lg bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold border border-brand-gold/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Edit Corners &amp; Filters</span>
                  </button>

                  {/* Reorder & Delete */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-zinc-400">
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 hover:text-white disabled:opacity-20 transition"
                        title="Move Page Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveDown(idx)}
                        disabled={idx === pages.length - 1}
                        className="p-1 hover:text-white disabled:opacity-20 transition"
                        title="Move Page Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-[10px] text-zinc-500 font-mono font-bold">Page {idx + 1}</span>

                    <button
                      onClick={() => removePage(page.id)}
                      className="p-1 hover:text-rose-400 transition"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add More Section */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">Add More Documents</span>
                <button
                  onClick={() => setIsCameraOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-brand-gold text-black text-xs font-bold flex items-center gap-1.5 hover:brightness-110 shadow-gold-glow transition active:scale-95"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan More with Camera</span>
                </button>
              </div>

              <FileUploader
                fileType="image"
                accept="image/jpeg,image/png,image/webp"
                multiple={true}
                title="Add more photos from device"
                subtitle="Upload additional images to append"
                onFilesSelected={handleFilesSelected}
              />
            </div>
          </div>

          {/* Primary Compile CTA */}
          <button
            onClick={handleCompilePdf}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-extrabold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95 cursor-pointer"
          >
            <FileCheck className="w-5 h-5" />
            <span>Generate PDF from Scanned Pages ({pages.length})</span>
          </button>
        </div>
      )}

      {/* Fullscreen Camera Scanner Modal */}
      {isCameraOpen && (
        <CameraScannerModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onComplete={handleCameraPagesScanned}
        />
      )}

      {/* Interactive Image Edit Modal */}
      {editingPage && (
        <ImageEditModal
          isOpen={Boolean(editingPage)}
          image={editingPage}
          onClose={() => setEditingPage(null)}
          onSave={handleSaveEditedPage}
        />
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText={processingStatus} />
      <ResultModal
        isOpen={Boolean(resultBytes)}
        onClose={() => setResultBytes(null)}
        resultData={resultBytes}
        defaultFileName="scanned-document.pdf"
        onReset={() => {
          setResultBytes(null);
          setPages([]);
        }}
      />
    </div>
  );
};
