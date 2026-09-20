import React, { useState } from 'react';
import {
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Download,
  RotateCw,
  Wand2,
  Crop as CropIcon,
  Sparkles,
  RefreshCw,
  Camera,
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

interface ImageItem {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

export const ImageToPdfPage: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'Fit'>('A4');
  const [marginSize, setMarginSize] = useState<'none' | 'small' | 'normal'>('small');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('Building PDF from images...');
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [editingImage, setEditingImage] = useState<ImageItem | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const addToast = useToastStore((state) => state.addToast);

  const handleCameraPagesScanned = (
    scannedPages: { id: string; name: string; dataUrl: string; width: number; height: number }[]
  ) => {
    setImages((prev) => [...prev, ...scannedPages]);
    addToast({
      type: 'success',
      title: 'Scanned Pages Added',
      message: `${scannedPages.length} camera page(s) compiled. You can reorder, crop, or generate your PDF.`,
    });
  };

  const handleFilesSelected = async (files: File[]) => {
    const newItems: ImageItem[] = [];

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

    setImages((prev) => [...prev, ...newItems]);
    addToast({
      type: 'success',
      title: 'Images Added',
      message: `${newItems.length} images added. You can rotate, crop, or auto-straighten them below.`,
    });
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setImages((prev) => {
      const arr = [...prev];
      const temp = arr[idx - 1];
      arr[idx - 1] = arr[idx];
      arr[idx] = temp;
      return arr;
    });
  };

  const moveDown = (idx: number) => {
    if (idx === images.length - 1) return;
    setImages((prev) => {
      const arr = [...prev];
      const temp = arr[idx + 1];
      arr[idx + 1] = arr[idx];
      arr[idx] = temp;
      return arr;
    });
  };

  const removeImg = (id: string) => {
    setImages((prev) => prev.filter((i) => i.id !== id));
  };

  // Quick 90° Clockwise Rotate
  const handleQuickRotate = async (id: string) => {
    const target = images.find((i) => i.id === id);
    if (!target) return;
    try {
      const res = await rotateImage(target.dataUrl, 90);
      setImages((prev) =>
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

  // Quick Auto Perspective / Straighten Single Image
  const handleAutoStraightenSingle = async (id: string) => {
    const target = images.find((i) => i.id === id);
    if (!target) return;
    setIsProcessing(true);
    setProcessingStatus(`Straightening ${target.name}...`);
    try {
      const imgEl = await loadImage(target.dataUrl);
      const quad = autoDetectDocumentQuad(imgEl);
      const res = await warpPerspective(target.dataUrl, quad);
      setImages((prev) =>
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

  // Auto Perspective Straighten All Images
  const handleAutoStraightenAll = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setProcessingStatus(`Auto-straightening all ${images.length} images...`);
    try {
      const updatedList: ImageItem[] = [];
      for (const item of images) {
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
      setImages(updatedList);
      addToast({
        type: 'success',
        title: 'All Images Straightened',
        message: `${images.length} images successfully rectified and straightened.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Batch Straighten Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Commit changes from ImageEditModal
  const handleSaveEditedImage = (updated: ImageItem) => {
    setImages((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    addToast({
      type: 'success',
      title: 'Image Updated',
      message: `${updated.name} changes applied successfully.`,
    });
  };

  const handleConvert = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setProcessingStatus('Generating PDF from enhanced images...');
    try {
      const pdfBytes = await imagesToPdf(images, pageSize, marginSize);
      setResultBytes(pdfBytes);
      addToast({
        type: 'success',
        title: 'PDF Created Successfully',
        message: `${images.length} images combined into a clean PDF.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Conversion Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <ImageIcon className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Images to <span className="text-brand-gold">PDF</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
          Convert camera photos, scans, and documents into a clean PDF. Rotate, crop, or use Auto Perspective to straighten tilted pages automatically.
        </p>
      </div>

      {images.length === 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {/* Direct Camera Scanner CTA Card */}
            <div
              onClick={() => setIsCameraOpen(true)}
              className="relative cursor-pointer border-2 border-dashed border-brand-gold/40 hover:border-brand-gold bg-amber-500/5 hover:bg-amber-500/10 rounded-3xl p-8 sm:p-10 text-center transition-all duration-200 group flex flex-col items-center justify-between shadow-xl"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl bg-amber-500/15 border border-brand-gold/40 flex items-center justify-center text-brand-gold group-hover:scale-105 group-hover:shadow-gold-glow transition duration-200 shadow-md">
                <Camera className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/30 text-[11px] font-bold mb-3 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  <span>Camera Scanner</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-gold transition">
                  Scan Document
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Batch multi-page scanning with rear camera, auto-perspective document detection, and interactive corner pins.
                </p>
              </div>

              <button
                type="button"
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-gold text-black font-bold text-xs sm:text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Open Camera Scanner</span>
              </button>
            </div>

            {/* Standard File Upload */}
            <div className="flex flex-col justify-center">
              <FileUploader
                fileType="image"
                accept="image/jpeg,image/png,image/webp"
                multiple={true}
                title="Drop image files here"
                subtitle="Upload existing JPG, PNG, or WEBP photos"
                onFilesSelected={handleFilesSelected}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            {/* Header with Batch actions */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Selected Images ({images.length})
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsCameraOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-brand-gold text-black text-xs font-bold flex items-center gap-1.5 hover:brightness-110 shadow-gold-glow transition active:scale-95"
                  title="Open Camera to scan more pages"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan Document (Camera)</span>
                </button>

                <button
                  onClick={handleAutoStraightenAll}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-brand-gold border border-brand-gold/30 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                  title="Auto-detect corners and straighten all uploaded images"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>⚡ Auto-Straighten All</span>
                </button>

                <button
                  onClick={() => setImages([])}
                  className="text-xs text-zinc-500 hover:text-rose-400 transition px-2 py-1"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Layout & Page Size settings */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-[#0C0C12] border border-white/5">
              <div className="flex items-center gap-2.5">
                <label className="text-xs font-semibold text-zinc-300">Page Size:</label>
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
                <label className="text-xs font-semibold text-zinc-300">Page Margin:</label>
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

            {/* Image Grid with Direct Action Controls */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="bg-zinc-900 border border-white/10 hover:border-brand-gold/40 rounded-xl p-3 flex flex-col justify-between group transition-all shadow-md"
                >
                  {/* Thumbnail with overlay action badges */}
                  <div className="aspect-[3/4] bg-black rounded-lg overflow-hidden flex items-center justify-center mb-2.5 relative">
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-full h-full object-contain"
                    />

                    {/* Quick Action Buttons on Thumbnail */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-90 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleQuickRotate(img.id)}
                        className="p-1.5 rounded-lg bg-black/75 hover:bg-brand-gold hover:text-black text-white border border-white/20 transition shadow-md"
                        title="Rotate 90° Clockwise"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleAutoStraightenSingle(img.id)}
                        className="p-1.5 rounded-lg bg-black/75 hover:bg-brand-gold hover:text-black text-amber-300 border border-white/20 transition shadow-md"
                        title="⚡ Auto Straighten Document"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-zinc-300 border border-white/10">
                      {img.width}×{img.height}
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-200 font-medium truncate mb-2" title={img.name}>
                    {img.name}
                  </p>

                  {/* Primary Edit / Straighten CTA */}
                  <button
                    onClick={() => setEditingImage(img)}
                    className="w-full mb-2 py-1.5 px-2 rounded-lg bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold border border-brand-gold/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Edit &amp; Straighten</span>
                  </button>

                  {/* Bottom Row Reorder & Delete */}
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
                        disabled={idx === images.length - 1}
                        className="p-1 hover:text-white disabled:opacity-20 transition"
                        title="Move Page Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-[10px] text-zinc-500 font-mono">Page {idx + 1}</span>

                    <button
                      onClick={() => removeImg(img.id)}
                      className="p-1 hover:text-rose-400 transition"
                      title="Delete Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add More Images or Scan More Pages */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">Add More Documents</span>
                <button
                  onClick={() => setIsCameraOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-brand-gold text-black text-xs font-bold flex items-center gap-1.5 hover:brightness-110 shadow-gold-glow transition active:scale-95"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan with Camera</span>
                </button>
              </div>

              <FileUploader
                fileType="image"
                accept="image/jpeg,image/png,image/webp"
                multiple={true}
                title="Add more photos"
                subtitle="Upload additional images to append"
                onFilesSelected={handleFilesSelected}
              />
            </div>
          </div>

          <button
            onClick={handleConvert}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Generate PDF ({images.length} pages)</span>
          </button>
        </div>
      )}

      {/* Camera Scanner Full-screen Modal */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onComplete={handleCameraPagesScanned}
      />

      {/* Interactive Image Edit Modal */}
      {editingImage && (
        <ImageEditModal
          isOpen={Boolean(editingImage)}
          image={editingImage}
          onClose={() => setEditingImage(null)}
          onSave={handleSaveEditedImage}
        />
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText={processingStatus} />
      <ResultModal
        isOpen={Boolean(resultBytes)}
        onClose={() => setResultBytes(null)}
        resultData={resultBytes}
        defaultFileName="images-to-pdf.pdf"
        onReset={() => {
          setResultBytes(null);
          setImages([]);
        }}
      />
    </div>
  );
};
