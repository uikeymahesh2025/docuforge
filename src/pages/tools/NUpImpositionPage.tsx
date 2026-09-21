import React, { useState } from 'react';
import {
  LayoutGrid,
  Scissors,
  Printer,
  Download,
  FileText,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle2,
  Sliders,
  Maximize2,
  Columns2,
  Layers,
} from 'lucide-react';
import { FileUploader } from '../../components/tools/FileUploader';
import { loadPdfDocument } from '../../pdf/pdfManager';
import { formatNUpGridPdf, NUpGridOptions } from '../../pdf/pdfModifier';
import { useToastStore } from '../../stores/useToastStore';
import { sanitizeFilename, downloadBlob, formatBytes } from '../../utils/downloadHelpers';

export const NUpImpositionPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);

  // Settings
  const [layout, setLayout] = useState<'2x1' | '2x2' | '3x3'>('2x2');
  const [sheetSize, setSheetSize] = useState<'A4' | 'A3' | 'Letter'>('A4');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [drawCutLines, setDrawCutLines] = useState<boolean>(true);
  const [drawPageBorders, setDrawPageBorders] = useState<boolean>(true);
  const [marginOption, setMarginOption] = useState<'compact' | 'normal' | 'wide'>('normal');
  const [gutterOption, setGutterOption] = useState<'minimal' | 'normal' | 'wide'>('normal');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  const marginMap = {
    compact: 10,
    normal: 16,
    wide: 24,
  };

  const gutterMap = {
    minimal: 4,
    normal: 8,
    wide: 12,
  };

  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setPreviewDataUrl(null);

    try {
      const buffer = await selected.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setFileBytes(bytes);

      const pdfDoc = await loadPdfDocument(bytes);
      setTotalPages(pdfDoc.numPages);

      addToast({
        type: 'success',
        title: 'PDF Loaded',
        message: `${selected.name} (${pdfDoc.numPages} pages) ready for N-Up imposition.`,
      });

      generateLivePreview(bytes, layout, sheetSize, orientation, drawCutLines, drawPageBorders, marginOption, gutterOption);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Load Failed',
        message: err?.message || 'Could not load PDF document.',
      });
    }
  };

  const generateLivePreview = async (
    bytes: Uint8Array,
    l: '2x1' | '2x2' | '3x3',
    sz: 'A4' | 'A3' | 'Letter',
    orient: 'landscape' | 'portrait',
    cut: boolean,
    borders: boolean,
    m: 'compact' | 'normal' | 'wide',
    g: 'minimal' | 'normal' | 'wide'
  ) => {
    try {
      const options: NUpGridOptions = {
        layout: l,
        sheetSize: sz,
        orientation: orient,
        drawCutLines: cut,
        drawPageBorders: borders,
        marginPt: marginMap[m],
        gutterPt: gutterMap[g],
      };

      const imposedBytes = await formatNUpGridPdf(bytes, options);
      const pdf = await loadPdfDocument(imposedBytes);
      if (pdf.numPages > 0) {
        const page1 = await pdf.getPage(1);
        const viewport = page1.getViewport({ scale: 1.1 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page1.render({ canvasContext: ctx, viewport } as any).promise;
          setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.88));
        }
      }
    } catch (err) {
      console.warn('Could not generate N-Up preview:', err);
    }
  };

  const updateSetting = (
    newLayout = layout,
    newSize = sheetSize,
    newOrient = orientation,
    newCut = drawCutLines,
    newBorders = drawPageBorders,
    newMargin = marginOption,
    newGutter = gutterOption
  ) => {
    setLayout(newLayout);
    setSheetSize(newSize);
    setOrientation(newOrient);
    setDrawCutLines(newCut);
    setDrawPageBorders(newBorders);
    setMarginOption(newMargin);
    setGutterOption(newGutter);

    if (fileBytes) {
      generateLivePreview(fileBytes, newLayout, newSize, newOrient, newCut, newBorders, newMargin, newGutter);
    }
  };

  const handleDownloadImposed = async () => {
    if (!fileBytes || !file) return;

    setIsProcessing(true);
    try {
      const options: NUpGridOptions = {
        layout,
        sheetSize,
        orientation,
        drawCutLines,
        drawPageBorders,
        marginPt: marginMap[marginOption],
        gutterPt: gutterMap[gutterOption],
      };

      const resultBytes = await formatNUpGridPdf(fileBytes, options);
      const blob = new Blob([resultBytes as unknown as BlobPart], { type: 'application/pdf' });
      const filename = sanitizeFilename(file.name, `nup_${layout}_${sheetSize}`, 'pdf');
      downloadBlob(blob, filename);

      addToast({
        type: 'success',
        title: 'N-Up PDF Downloaded',
        message: `${filename} created with custom grid imposition.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Imposition Failed',
        message: err?.message || 'Could not impose PDF.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pagesPerSheet = layout === '2x1' ? 2 : layout === '2x2' ? 4 : 9;
  const calculatedSheets = Math.ceil(totalPages / pagesPerSheet);
  const paperSavedPercent = totalPages > 0 ? Math.round(((totalPages - calculatedSheets) / totalPages) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Page Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <LayoutGrid className="w-4 h-4" />
          Commercial Print Shop Tool
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
          Multi-Page <span className="text-brand-gold">N-Up Grid Imposition</span>
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto">
          Impose multiple document pages onto single A4, A3, or Letter sheets in 2-up, 4-up, or 9-up layouts with precision cutting guides and configurable gutters.
        </p>
      </div>

      {!file ? (
        <div className="max-w-3xl mx-auto">
          <FileUploader
            accept=".pdf,application/pdf"
            fileType="pdf"
            subtitle="Upload multi-page PDFs, manuals, presentation slides, or coupon sheets for N-Up grid layout"
            onFilesSelected={handleFilesSelected}
          />

          {/* Quick Layout Presets info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 text-center">
              <div className="w-9 h-9 mx-auto rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                <Columns2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">2-Up Side-by-Side (2x1)</h3>
              <p className="text-xs text-zinc-400 mt-1">2 pages per sheet. Ideal for handouts, booklets, and meeting agendas.</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 text-center">
              <div className="w-9 h-9 mx-auto rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">4-Up Grid (2x2)</h3>
              <p className="text-xs text-zinc-400 mt-1">4 pages per sheet. Save 75% paper for slide decks, cheat-sheets, and study flashcards.</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 text-center">
              <div className="w-9 h-9 mx-auto rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2">
                <Scissors className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">9-Up Grid (3x3)</h3>
              <p className="text-xs text-zinc-400 mt-1">9 pages per sheet with dashed cutting lines. Perfect for cards, coupons, and tickets.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#121216] border border-zinc-800 rounded-xl p-5 space-y-4">
              {/* File Info */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="w-5 h-5 text-brand-gold shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-white truncate max-w-[200px]">{file.name}</h3>
                    <p className="text-[11px] text-zinc-400">{totalPages} Source Pages</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setFileBytes(null);
                  }}
                  className="text-xs text-zinc-400 hover:text-red-400 transition-colors"
                >
                  Change File
                </button>
              </div>

              {/* Savings Stat Badge */}
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                    Paper Optimization
                  </span>
                  <span className="text-xs text-zinc-200 font-medium">
                    {totalPages} pages ➔ {calculatedSheets} {calculatedSheets === 1 ? 'Sheet' : 'Sheets'}
                  </span>
                </div>
                <div className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-extrabold text-xs">
                  {paperSavedPercent}% Paper Saved
                </div>
              </div>

              {/* Layout Grid Selector */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-2">
                  Imposition Layout Grid
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => updateSetting('2x1')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      layout === '2x1'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold shadow-sm'
                        : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    2-Up (2x1)
                    <span className="block text-[10px] opacity-75 font-normal">2 pgs/sheet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSetting('2x2')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      layout === '2x2'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold shadow-sm'
                        : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    4-Up (2x2)
                    <span className="block text-[10px] opacity-75 font-normal">4 pgs/sheet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSetting('3x3')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      layout === '3x3'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold shadow-sm'
                        : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    9-Up (3x3)
                    <span className="block text-[10px] opacity-75 font-normal">9 pgs/sheet</span>
                  </button>
                </div>
              </div>

              {/* Sheet Size & Orientation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5">
                    Sheet Size
                  </label>
                  <select
                    value={sheetSize}
                    onChange={(e) => updateSetting(layout, e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-gold"
                  >
                    <option value="A4">A4 (Standard)</option>
                    <option value="A3">A3 (Large Print)</option>
                    <option value="Letter">US Letter</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5">
                    Orientation
                  </label>
                  <select
                    value={orientation}
                    onChange={(e) => updateSetting(layout, sheetSize, e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-gold"
                  >
                    <option value="landscape">Landscape (Horizontal)</option>
                    <option value="portrait">Portrait (Vertical)</option>
                  </select>
                </div>
              </div>

              {/* Margins & Gutters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5">
                    Outer Margins
                  </label>
                  <select
                    value={marginOption}
                    onChange={(e) => updateSetting(layout, sheetSize, orientation, drawCutLines, drawPageBorders, e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-gold"
                  >
                    <option value="compact">Compact (10 pt)</option>
                    <option value="normal">Normal (16 pt)</option>
                    <option value="wide">Wide (24 pt)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5">
                    Cell Gutters
                  </label>
                  <select
                    value={gutterOption}
                    onChange={(e) => updateSetting(layout, sheetSize, orientation, drawCutLines, drawPageBorders, marginOption, e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-gold"
                  >
                    <option value="minimal">Minimal (4 pt)</option>
                    <option value="normal">Standard (8 pt)</option>
                    <option value="wide">Wide (12 pt)</option>
                  </select>
                </div>
              </div>

              {/* Print Shop Guidelines Toggles */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-brand-gold" />
                    <div>
                      <span className="text-xs font-medium text-zinc-200 block">Dashed Cutting Guidelines</span>
                      <span className="text-[10px] text-zinc-400">Scissor cut guides between rows and columns</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={drawCutLines}
                    onChange={(e) => updateSetting(layout, sheetSize, orientation, e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <div>
                      <span className="text-xs font-medium text-zinc-200 block">Page Bounding Box Border</span>
                      <span className="text-[10px] text-zinc-400">Subtle 0.5pt outline around each imposed page</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={drawPageBorders}
                    onChange={(e) => updateSetting(layout, sheetSize, orientation, drawCutLines, e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                  />
                </label>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleDownloadImposed}
                disabled={isProcessing}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Rendering Imposed PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Generate & Download Imposed PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Live Preview Column */}
          <div className="lg:col-span-7">
            <div className="bg-[#121216] border border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center min-h-[460px]">
              <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-zinc-800 text-xs">
                <span className="font-semibold text-white flex items-center gap-2">
                  <Printer className="w-4 h-4 text-brand-gold" />
                  Imposed Sheet 1 Live Preview
                </span>
                <span className="text-zinc-400">
                  {sheetSize} • {orientation.toUpperCase()} • {layout}
                </span>
              </div>

              {previewDataUrl ? (
                <div className="w-full flex justify-center">
                  <div className="rounded-lg overflow-hidden border border-zinc-700/60 shadow-2xl bg-white max-w-full">
                    <img
                      src={previewDataUrl}
                      alt="N-Up Imposition Preview"
                      className="max-h-[480px] w-auto object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center p-12 text-zinc-500">
                  <LayoutGrid className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Generating layout preview...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
