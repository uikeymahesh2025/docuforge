import React, { useState } from 'react';
import {
  Share2,
  Download,
  Sparkles,
  Layers,
  FileCheck,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Palette,
  Eye,
  Smartphone,
  Square,
  ArrowRight,
  FolderArchive,
  Image as ImageIcon,
} from 'lucide-react';
import JSZip from 'jszip';
import { FileUploader } from '../../components/tools/FileUploader';
import { loadPdfDocument } from '../../pdf/pdfManager';
import { useToastStore } from '../../stores/useToastStore';

interface CarouselSlide {
  pageNumber: number;
  dataUrl: string;
  blob: Blob;
}

export const CarouselMakerPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);

  // Styling & dimensions
  const [aspectRatio, setAspectRatio] = useState<'4:5' | '1:1'>('4:5');
  const [themeBg, setThemeBg] = useState<string>('#0f172a'); // slate-900 default
  const [brandHandle, setBrandHandle] = useState<string>('@creator');
  const [showSwipeBadge, setShowSwipeBadge] = useState<boolean>(true);
  const [showPageNumbers, setShowPageNumbers] = useState<boolean>(true);
  const [cardPadding, setCardPadding] = useState<number>(40);

  // Rendered slides
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [activePreviewSlide, setActivePreviewSlide] = useState<number>(1);

  // Background presets
  const BG_PRESETS = [
    { label: 'Dark Navy', color: '#0f172a', textColor: '#ffffff' },
    { label: 'Clean White', color: '#ffffff', textColor: '#0f172a' },
    { label: 'Deep Indigo', color: '#1e1b4b', textColor: '#ffffff' },
    { label: 'Warm Cream', color: '#fbf9f5', textColor: '#1c1917' },
    { label: 'Charcoal Minimal', color: '#18181b', textColor: '#ffffff' },
    { label: 'Soft Slate', color: '#f1f5f9', textColor: '#0f172a' },
  ];

  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    renderCarousel(selected, aspectRatio, themeBg, brandHandle, showSwipeBadge, showPageNumbers, cardPadding);
  };

  const renderCarousel = async (
    targetFile: File,
    ratio: '4:5' | '1:1',
    bgColor: string,
    handle: string,
    swipe: boolean,
    numbers: boolean,
    padding: number
  ) => {
    setIsRendering(true);
    try {
      const buffer = await targetFile.arrayBuffer();
      const pdf = await loadPdfDocument(new Uint8Array(buffer));
      const pagesCount = pdf.numPages;
      setTotalPages(pagesCount);

      const targetW = 1080;
      const targetH = ratio === '4:5' ? 1350 : 1080;

      const generatedSlides: CarouselSlide[] = [];

      for (let p = 1; p <= pagesCount; p++) {
        const page = await pdf.getPage(p);

        // Render PDF page to intermediate canvas
        const viewport = page.getViewport({ scale: 2.0 });
        const pdfCanvas = document.createElement('canvas');
        pdfCanvas.width = Math.floor(viewport.width);
        pdfCanvas.height = Math.floor(viewport.height);
        const pdfCtx = pdfCanvas.getContext('2d');
        if (!pdfCtx) continue;
        await page.render({ canvasContext: pdfCtx, viewport } as any).promise;

        // Composite onto high-res 1080px carousel card
        const cardCanvas = document.createElement('canvas');
        cardCanvas.width = targetW;
        cardCanvas.height = targetH;
        const ctx = cardCanvas.getContext('2d');
        if (!ctx) continue;

        // 1. Fill background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, targetW, targetH);

        // Detect if dark or light background for text colors
        const isDark = isDarkColor(bgColor);
        const textColor = isDark ? '#ffffff' : '#0f172a';
        const subTextColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.7)';

        // 2. Header Bar (Brand Handle & Page Counter)
        const headerY = 70;
        if (handle.trim()) {
          ctx.font = '600 28px Inter, system-ui, sans-serif';
          ctx.fillStyle = textColor;
          ctx.textBaseline = 'middle';
          ctx.fillText(handle.trim(), padding + 20, headerY);
        }

        if (numbers) {
          const pageStr = `${p} / ${pagesCount}`;
          ctx.font = '700 24px Inter, system-ui, sans-serif';
          ctx.fillStyle = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.85)';
          ctx.textBaseline = 'middle';
          const textW = ctx.measureText(pageStr).width;

          // Pill background
          const pillPad = 14;
          const pillH = 36;
          const pillX = targetW - padding - 20 - textW - pillPad * 2;
          const pillY = headerY - pillH / 2;

          ctx.fillStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.08)';
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, textW + pillPad * 2, pillH, 18);
          ctx.fill();

          ctx.fillStyle = textColor;
          ctx.fillText(pageStr, pillX + pillPad, headerY);
        }

        // 3. Middle Area: Embedded PDF Page Canvas
        const availTop = 120;
        const availBottom = swipe && p < pagesCount ? targetH - 90 : targetH - 50;
        const availW = targetW - padding * 2;
        const availH = availBottom - availTop;

        const scale = Math.min(availW / pdfCanvas.width, availH / pdfCanvas.height);
        const renderW = pdfCanvas.width * scale;
        const renderH = pdfCanvas.height * scale;
        const renderX = (targetW - renderW) / 2;
        const renderY = availTop + (availH - renderH) / 2;

        // Card shadow behind PDF page if background is light/colored
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.22)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 12;

        // Draw PDF page with subtle rounded border
        ctx.drawImage(pdfCanvas, renderX, renderY, renderW, renderH);
        ctx.restore();

        // 4. Footer Swipe Badge (if not last page)
        if (swipe && p < pagesCount) {
          const footerY = targetH - 55;
          ctx.font = '700 26px Inter, system-ui, sans-serif';
          ctx.fillStyle = textColor;
          ctx.textBaseline = 'middle';
          const swipeText = 'SWIPE 👉';
          const swipeW = ctx.measureText(swipeText).width;
          const swipeX = targetW - padding - 20 - swipeW;

          ctx.fillText(swipeText, swipeX, footerY);
        }

        // Convert cardCanvas to Blob
        const dataUrl = cardCanvas.toDataURL('image/png', 1.0);
        const byteString = atob(dataUrl.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: 'image/png' });

        generatedSlides.push({
          pageNumber: p,
          dataUrl,
          blob,
        });
      }

      setSlides(generatedSlides);
      addToast({
        type: 'success',
        title: 'Carousel Created!',
        message: `Generated ${generatedSlides.length} social carousel slides (${targetW}x${targetH} px).`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Render Error',
        message: err?.message || 'Failed to render carousel.',
      });
    } finally {
      setIsRendering(false);
    }
  };

  const isDarkColor = (hex: string): boolean => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  };

  const handleDownloadSingle = (slide: CarouselSlide) => {
    const link = document.createElement('a');
    link.href = slide.dataUrl;
    link.download = `carousel_slide_${slide.pageNumber}.png`;
    link.click();
  };

  const handleDownloadZip = async () => {
    if (slides.length === 0) return;
    const zip = new JSZip();
    slides.forEach((slide) => {
      const base64Data = slide.dataUrl.split(',')[1];
      zip.file(`slide_${String(slide.pageNumber).padStart(2, '0')}.png`, base64Data, { base64: true });
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    const baseName = file?.name.replace(/\.pdf$/i, '') || 'carousel';
    link.href = url;
    link.download = `${baseName}_carousel_1080p.zip`;
    link.click();
    URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: 'ZIP Downloaded!',
      message: `Exported ${slides.length} slides ready for Instagram / LinkedIn.`,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-pink-600 text-white shadow-md shadow-pink-500/20">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                PDF to Social Media Carousel Generator
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 font-semibold border border-pink-300 dark:border-pink-800">
                  Instagram & LinkedIn
                </span>
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Transform any PDF slides or notes into viral 1080x1350 vertical or 1080x1080 square carousel images with 1-click ZIP export.
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
              title="Select PDF to Convert to Social Media Carousel"
              subtitle="Drop any presentation, infographic, or document to make Instagram/LinkedIn carousels"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Controls */}
            <div className="lg:col-span-4 space-y-4">
              {/* Document Status */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    <FileCheck className="w-4 h-4 text-pink-500" />
                    <span className="truncate max-w-[180px]" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null);
                      setSlides([]);
                    }}
                    className="text-xs text-rose-500 hover:underline"
                  >
                    Change PDF
                  </button>
                </div>
                <div className="text-xs text-slate-500">
                  Total Slides: <strong className="text-slate-800 dark:text-slate-200">{totalPages} pages</strong>
                </div>
              </div>

              {/* Format & Aspect Ratio */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  1. Aspect Ratio & Dimensions
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAspectRatio('4:5');
                      if (file) renderCarousel(file, '4:5', themeBg, brandHandle, showSwipeBadge, showPageNumbers, cardPadding);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      aspectRatio === '4:5'
                        ? 'border-pink-500 bg-pink-500/10 text-pink-900 dark:text-pink-200 ring-2 ring-pink-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Smartphone className="w-4 h-4 text-pink-500" />
                      <span className="text-xs font-bold">4:5 Vertical</span>
                    </div>
                    <div className="text-[11px] text-slate-500">1080 x 1350 px (Instagram / LinkedIn)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAspectRatio('1:1');
                      if (file) renderCarousel(file, '1:1', themeBg, brandHandle, showSwipeBadge, showPageNumbers, cardPadding);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      aspectRatio === '1:1'
                        ? 'border-pink-500 bg-pink-500/10 text-pink-900 dark:text-pink-200 ring-2 ring-pink-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Square className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold">1:1 Square</span>
                    </div>
                    <div className="text-[11px] text-slate-500">1080 x 1080 px (Standard)</div>
                  </button>
                </div>
              </div>

              {/* Branding & Canvas Customization */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  2. Branding & Watermark
                </label>

                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                    Social Handle or Brand Name
                  </label>
                  <input
                    type="text"
                    value={brandHandle}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBrandHandle(val);
                      if (file) renderCarousel(file, aspectRatio, themeBg, val, showSwipeBadge, showPageNumbers, cardPadding);
                    }}
                    placeholder="@yourhandle or Studio Name"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSwipeBadge}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setShowSwipeBadge(val);
                        if (file) renderCarousel(file, aspectRatio, themeBg, brandHandle, val, showPageNumbers, cardPadding);
                      }}
                      className="rounded text-pink-600 focus:ring-pink-500 w-4 h-4"
                    />
                    <span>"SWIPE 👉" Prompt</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPageNumbers}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setShowPageNumbers(val);
                        if (file) renderCarousel(file, aspectRatio, themeBg, brandHandle, showSwipeBadge, val, cardPadding);
                      }}
                      className="rounded text-pink-600 focus:ring-pink-500 w-4 h-4"
                    />
                    <span>Slide Counters (1/10)</span>
                  </label>
                </div>
              </div>

              {/* Background Theme Presets */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  3. Theme Background
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {BG_PRESETS.map((preset) => (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => {
                        setThemeBg(preset.color);
                        if (file) renderCarousel(file, aspectRatio, preset.color, brandHandle, showSwipeBadge, showPageNumbers, cardPadding);
                      }}
                      className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1.5 ${
                        themeBg === preset.color
                          ? 'border-pink-500 ring-2 ring-pink-500/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-full border border-slate-300"
                        style={{ backgroundColor: preset.color }}
                      />
                      <span className="text-[10px] font-semibold truncate w-full">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Download ZIP Button */}
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={slides.length === 0 || isRendering}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white font-bold shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 text-base transition-all disabled:opacity-50"
              >
                {isRendering ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Rendering Slides...</span>
                  </>
                ) : (
                  <>
                    <FolderArchive className="w-5 h-5" />
                    <span>Download All Slides as ZIP ({slides.length})</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Slides Preview */}
            <div className="lg:col-span-8 space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col h-full min-h-[520px]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-pink-500" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Slide {activePreviewSlide} of {slides.length} Preview
                    </span>
                  </div>
                  {slides[activePreviewSlide - 1] && (
                    <button
                      onClick={() => handleDownloadSingle(slides[activePreviewSlide - 1])}
                      className="text-xs font-semibold px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download This Slide (PNG)
                    </button>
                  )}
                </div>

                {/* Main Slide Card Display */}
                <div className="flex-1 flex items-center justify-center p-6 bg-slate-100 dark:bg-slate-950/60 rounded-lg mt-3 overflow-hidden">
                  {isRendering ? (
                    <div className="text-center text-slate-400">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-pink-500" />
                      <p className="text-sm">Rendering high-res social carousel cards...</p>
                    </div>
                  ) : slides[activePreviewSlide - 1] ? (
                    <div className="relative shadow-2xl rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800 max-h-[460px]">
                      <img
                        src={slides[activePreviewSlide - 1].dataUrl}
                        alt={`Slide ${activePreviewSlide}`}
                        className="max-h-[440px] object-contain"
                      />
                    </div>
                  ) : (
                    <div className="text-slate-400 text-sm">No slides loaded.</div>
                  )}
                </div>

                {/* Horizontal Slide Thumbnails Strip */}
                {slides.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                      {slides.map((slide) => {
                        const isSelected = activePreviewSlide === slide.pageNumber;
                        return (
                          <button
                            key={slide.pageNumber}
                            type="button"
                            onClick={() => setActivePreviewSlide(slide.pageNumber)}
                            className={`flex-shrink-0 relative rounded-lg overflow-hidden border-2 transition-all ${
                              isSelected
                                ? 'border-pink-500 ring-2 ring-pink-500/30 scale-105'
                                : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                            }`}
                            style={{ width: '64px', height: aspectRatio === '4:5' ? '80px' : '64px' }}
                          >
                            <img
                              src={slide.dataUrl}
                              alt={`Thumb ${slide.pageNumber}`}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5">
                              #{slide.pageNumber}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
