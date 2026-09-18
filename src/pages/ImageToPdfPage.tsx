import React, { useState } from 'react';
import { Image as ImageIcon, ArrowUp, ArrowDown, Trash2, Plus, Download } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { imagesToPdf } from '../pdf/pdfModifier';
import { useToastStore } from '../stores/useToastStore';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const addToast = useToastStore((state) => state.addToast);

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
      message: `${newItems.length} images added. You can reorder them below.`,
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

  const handleConvert = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    try {
      const pdfBytes = await imagesToPdf(images, pageSize);
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
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <ImageIcon className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Images to <span className="text-brand-gold">PDF</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Convert JPG, PNG, and WEBP pictures into a single organized PDF document.
        </p>
      </div>

      {images.length === 0 ? (
        <FileUploader
          fileType="image"
          accept="image/jpeg,image/png,image/webp"
          multiple={true}
          title="Drop image files here"
          subtitle="Supports JPG, PNG, and WEBP formats"
          onFilesSelected={handleFilesSelected}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Selected Images ({images.length})
              </span>
              <button
                onClick={() => setImages([])}
                className="text-xs text-zinc-500 hover:text-rose-400 transition"
              >
                Clear All
              </button>
            </div>

            {/* Page Size settings */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-zinc-300">Target Page Size:</label>
              {(['A4', 'Letter', 'Fit'] as const).map((ps) => (
                <button
                  key={ps}
                  onClick={() => setPageSize(ps)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    pageSize === ps
                      ? 'border-brand-gold bg-amber-500/10 text-white'
                      : 'border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {ps === 'Fit' ? 'Fit to Image Size' : ps}
                </button>
              ))}
            </div>

            {/* Image List */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="bg-zinc-900 border border-white/10 rounded-xl p-2.5 flex flex-col justify-between group"
                >
                  <div className="aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center mb-2">
                    <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[11px] text-zinc-300 truncate mb-2">{img.name}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 text-zinc-400 hover:text-white disabled:opacity-20"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveDown(idx)}
                        disabled={idx === images.length - 1}
                        className="p-1 text-zinc-400 hover:text-white disabled:opacity-20"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeImg(img.id)}
                      className="p-1 text-zinc-500 hover:text-rose-400"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add More Images */}
            <FileUploader
              fileType="image"
              accept="image/jpeg,image/png,image/webp"
              multiple={true}
              title="Add more photos"
              subtitle="Upload additional images to append"
              onFilesSelected={handleFilesSelected}
            />
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

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Building PDF from images..." />
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
