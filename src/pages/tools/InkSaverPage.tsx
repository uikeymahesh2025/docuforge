import React, { useState } from 'react';
import {
  Droplet,
  Download,
  Sparkles,
  Sliders,
  FileCheck,
  CheckCircle2,
  RefreshCw,
  Printer,
  Leaf,
  Layers,
  Eye,
  Info,
} from 'lucide-react';
import { FileUploader } from '../../components/tools/FileUploader';
import { loadPdfDocument } from '../../pdf/pdfManager';
import { convertPdfToInkSaver, InkSaverOptions } from '../../pdf/pdfModifier';
import { useToastStore } from '../../stores/useToastStore';

export const InkSaverPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);

  // Options
  const [mode, setMode] = useState<'ink-saver' | 'grayscale' | 'monochrome'>('ink-saver');
  const [contrastThreshold, setContrastThreshold] = useState<number>(210);
  const [quality, setQuality] = useState<number>(0.85);

  const [previewOriginalUrl, setPreviewOriginalUrl] = useState<string | null>(null);
  const [previewProcessedUrl, setPreviewProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isRenderingPreview, setIsRenderingPreview] = useState<boolean>(false);

  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);

    try {
      const buffer = await selected.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setFileBytes(bytes);
      const pdf = await loadPdfDocument(bytes);
      setTotalPages(pdf.numPages);

      addToast({
        type: 'success',
        title: 'PDF Loaded',
        message: `${selected.name} (${pdf.numPages} pages) ready for ink-saving conversion.`,
      });

      renderPreviews(bytes, mode, contrastThreshold);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Load Failed',
        message: err?.message || 'Could not load PDF document.',
      });
    }
  };

  const renderPreviews = async (
    bytes: Uint8Array,
    currentMode: 'ink-saver' | 'grayscale' | 'monochrome',
    thresh: number
  ) => {
    setIsRenderingPreview(true);
    try {
      const pdf = await loadPdfDocument(bytes);
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.2 });

      // 1. Original Preview
      const origCanvas = document.createElement('canvas');
      origCanvas.width = Math.floor(viewport.width);
      origCanvas.height = Math.floor(viewport.height);
      const origCtx = origCanvas.getContext('2d');
      if (origCtx) {
        await page.render({ canvasContext: origCtx, viewport } as any).promise;
        setPreviewOriginalUrl(origCanvas.toDataURL('image/jpeg', 0.8));

        // 2. Processed Preview
        const procCanvas = document.createElement('canvas');
        procCanvas.width = origCanvas.width;
        procCanvas.height = origCanvas.height;
        const procCtx = procCanvas.getContext('2d');
        if (procCtx) {
          procCtx.drawImage(origCanvas, 0, 0);
          const imgData = procCtx.getImageData(0, 0, procCanvas.width, procCanvas.height);
          const d = imgData.data;

          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            if (currentMode === 'ink-saver') {
              if (gray >= thresh) {
                d[i] = 255;
                d[i + 1] = 255;
                d[i + 2] = 255;
              } else {
                const boost = Math.max(0, gray - 20);
                d[i] = boost;
                d[i + 1] = boost;
                d[i + 2] = boost;
              }
            } else if (currentMode === 'monochrome') {
              const val = gray >= 150 ? 255 : 0;
              d[i] = val;
              d[i + 1] = val;
              d[i + 2] = val;
            } else {
              d[i] = gray;
              d[i + 1] = gray;
              d[i + 2] = gray;
            }
          }

          procCtx.putImageData(imgData, 0, 0);
          setPreviewProcessedUrl(procCanvas.toDataURL('image/jpeg', 0.8));
        }
      }
    } catch (err) {
      console.warn('Preview generation failed:', err);
    } finally {
      setIsRenderingPreview(false);
    }
  };

  const handleModeChange = (newMode: 'ink-saver' | 'grayscale' | 'monochrome') => {
    setMode(newMode);
    if (fileBytes) {
      renderPreviews(fileBytes, newMode, contrastThreshold);
    }
  };

  const handleThresholdChange = (newThresh: number) => {
    setContrastThreshold(newThresh);
    if (fileBytes) {
      renderPreviews(fileBytes, mode, newThresh);
    }
  };

  const handleDownload = async () => {
    if (!fileBytes) return;
    setIsProcessing(true);
    try {
      const options: InkSaverOptions = {
        mode,
        contrastThreshold,
        quality,
      };

      const resultBytes = await convertPdfToInkSaver(fileBytes, options);
      const blob = new Blob([resultBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const baseName = file?.name.replace(/\.pdf$/i, '') || 'document';
      link.href = url;
      link.download = `${baseName}_${mode}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'Ink-Saver PDF Ready!',
        message: `Saved ${baseName}_${mode}.pdf. Prepared for up to 70% ink savings.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Conversion Failed',
        message: err?.message || 'Could not process PDF pages.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/20">
              <Droplet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Ink Saver & Grayscale Converter
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-800">
                  Save ~70% Ink
                </span>
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Eliminate background colors, dark borders, and colored fills to save up to 70% printer toner. Perfect for printing college lecture slides, study notes, and legal briefs.
              </p>
            </div>
          </div>
        </div>

        {!file ? (
          <div className="max-w-xl mx-auto py-10">
            <FileUploader
              onFilesSelected={handleFilesSelected}
              accept=".pdf,application/pdf"
              multiple={false}
              fileType="pdf"
              title="Select PDF Document to Optimize for Printing"
              subtitle="Drop any presentation slide deck, colored assignment, or report"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Controls */}
            <div className="lg:col-span-5 space-y-5">
              {/* Document Overview */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <FileCheck className="w-4 h-4 text-emerald-500" />
                  <span className="truncate max-w-[200px]" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-xs font-normal text-slate-500">({totalPages} pgs)</span>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setFileBytes(null);
                    setPreviewOriginalUrl(null);
                    setPreviewProcessedUrl(null);
                  }}
                  className="text-xs text-rose-500 hover:underline"
                >
                  Change PDF
                </button>
              </div>

              {/* Mode Selection */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  1. Optimization Mode
                </label>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleModeChange('ink-saver')}
                    className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      mode === 'ink-saver'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <Leaf className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-sm flex items-center gap-2">
                        Ink-Saver Eco Mode
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Recommended
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Turns colored backgrounds & tints to pure white while darkening text for maximum toner savings.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeChange('grayscale')}
                    className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      mode === 'grayscale'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <Sliders className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-sm">Pure Grayscale</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Standard photo-safe desaturation. Preserves image shades and charts faithfully.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeChange('monochrome')}
                    className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      mode === 'monochrome'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <Printer className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-sm">High-Contrast B&W</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Pure black and white thresholding, perfect for photocopying legal documents.
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Threshold Slider (for ink-saver mode) */}
              {mode === 'ink-saver' && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Background Tint Whiteout Threshold
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {contrastThreshold}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={150}
                    max={245}
                    step={5}
                    value={contrastThreshold}
                    onChange={(e) => handleThresholdChange(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Keep light tones (150)</span>
                    <span>Aggressive tint wipe (245)</span>
                  </div>
                </div>
              )}

              {/* Download Action Button */}
              <button
                type="button"
                onClick={handleDownload}
                disabled={isProcessing}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-base transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Processing All {totalPages} Pages...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Download Ready Ink-Saver PDF</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Live Preview Comparison */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col h-full min-h-[500px]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Page 1 Before & After Live Preview
                    </span>
                  </div>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    ~70% Less Toner Used
                  </span>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-4 mt-3 p-3 bg-slate-100 dark:bg-slate-950/60 rounded-lg overflow-hidden items-center justify-center">
                  {/* Original */}
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-semibold text-slate-500 mb-2">Original Color</span>
                    {previewOriginalUrl ? (
                      <img
                        src={previewOriginalUrl}
                        alt="Original Page"
                        className="max-h-[380px] object-contain rounded shadow-lg border border-slate-300 dark:border-slate-700 bg-white"
                      />
                    ) : (
                      <div className="text-xs text-slate-400">Loading...</div>
                    )}
                  </div>

                  {/* Processed */}
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                      Optimized Print Output
                    </span>
                    {isRenderingPreview ? (
                      <div className="py-20 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                        <span className="text-xs">Applying filter...</span>
                      </div>
                    ) : previewProcessedUrl ? (
                      <img
                        src={previewProcessedUrl}
                        alt="Ink Saver Page"
                        className="max-h-[380px] object-contain rounded shadow-lg border border-emerald-500/40 bg-white ring-2 ring-emerald-500/20"
                      />
                    ) : (
                      <div className="text-xs text-slate-400">Generating preview...</div>
                    )}
                  </div>
                </div>

                <div className="mt-3 p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                  <div>
                    <strong>Print Advice:</strong> Use this output directly when printing college notes, question banks, or slides on Laser or Inkjet printers to stop wasting expensive black & color cartridges on dark slide backgrounds.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
