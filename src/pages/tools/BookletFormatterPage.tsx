import React, { useState } from 'react';
import {
  BookOpen,
  Printer,
  Scissors,
  Download,
  Sparkles,
  Layers,
  FileCheck,
  CheckCircle2,
  RefreshCw,
  Info,
  Maximize2,
  LayoutGrid,
  Columns2,
} from 'lucide-react';
import { FileUploader } from '../../components/tools/FileUploader';
import { formatBookletPdf, BookletFormatOptions } from '../../pdf/pdfModifier';
import { loadPdfDocument } from '../../pdf/pdfManager';
import { useToastStore } from '../../stores/useToastStore';

export const BookletFormatterPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [layoutMode, setLayoutMode] = useState<'2-up' | '4-up'>('2-up');
  const [sheetSize, setSheetSize] = useState<'A4' | 'Letter'>('A4');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [drawCutLines, setDrawCutLines] = useState<boolean>(true);
  const [marginOption, setMarginOption] = useState<'compact' | 'normal' | 'wide'>('normal');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  const marginMap = {
    compact: 8,
    normal: 16,
    wide: 24,
  };

  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);

    try {
      const buffer = await selected.arrayBuffer();
      const pdf = await loadPdfDocument(new Uint8Array(buffer));
      setTotalPages(pdf.numPages);
      addToast({
        type: 'success',
        title: 'PDF Loaded',
        message: `${selected.name} (${pdf.numPages} pages) ready for booklet imposition.`,
      });
      generatePreview(selected, layoutMode, sheetSize, orientation, drawCutLines, marginOption);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Load Failed',
        message: err?.message || 'Could not read PDF file.',
      });
    }
  };

  const generatePreview = async (
    targetFile: File,
    mode: '2-up' | '4-up',
    size: 'A4' | 'Letter',
    orient: 'landscape' | 'portrait',
    cutLines: boolean,
    margin: 'compact' | 'normal' | 'wide'
  ) => {
    try {
      const buf = await targetFile.arrayBuffer();
      const options: BookletFormatOptions = {
        mode,
        sheetSize: size,
        orientation: orient,
        drawCutLines: cutLines,
        marginPt: marginMap[margin],
      };
      const formattedBytes = await formatBookletPdf(new Uint8Array(buf), options);
      const pdfDoc = await loadPdfDocument(formattedBytes);
      if (pdfDoc.numPages > 0) {
        const firstPage = await pdfDoc.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1.2 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await firstPage.render({ canvasContext: ctx, viewport } as any).promise;
          setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.85));
        }
      }
    } catch (err) {
      console.warn('Could not generate booklet preview:', err);
    }
  };

  const handleOptionChange = (
    mode = layoutMode,
    size = sheetSize,
    orient = orientation,
    cutLines = drawCutLines,
    margin = marginOption
  ) => {
    if (file) {
      generatePreview(file, mode, size, orient, cutLines, margin);
    }
  };

  const handleDownloadBooklet = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const buf = await file.arrayBuffer();
      const options: BookletFormatOptions = {
        mode: layoutMode,
        sheetSize,
        orientation,
        drawCutLines,
        marginPt: marginMap[marginOption],
      };

      const resultBytes = await formatBookletPdf(new Uint8Array(buf), options);
      const blob = new Blob([resultBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const baseName = file.name.replace(/\.pdf$/i, '');
      link.href = url;
      link.download = `${baseName}_booklet_${layoutMode}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'Booklet Generated!',
        message: `Saved ${baseName}_booklet_${layoutMode}.pdf successfully.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Booklet Formatting Error',
        message: err?.message || 'Failed to arrange pages.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const calculatedSheets = Math.ceil(totalPages / (layoutMode === '2-up' ? 2 : 4));
  const paperSavedPercentage = totalPages > 0 ? Math.round(((totalPages - calculatedSheets) / totalPages) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  Booklet Print Formatter (2-up & 4-up)
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-800">
                    Eco Paper Saver
                  </span>
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Arrange multiple PDF pages onto single A4 or Letter sheets with folding cut-lines. Perfect for college notes, question banks, study material, and booklets.
                </p>
              </div>
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
              title="Select PDF Document to Format into Booklet"
              subtitle="Drop any study guide, assignment, notes or exam paper PDF"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Form Controls */}
            <div className="lg:col-span-5 space-y-5">
              {/* Document Overview Badge */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                    <span className="truncate max-w-[200px]" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreviewDataUrl(null);
                    }}
                    className="text-xs text-rose-500 hover:text-rose-600 hover:underline"
                  >
                    Change PDF
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Original</div>
                    <div className="text-base font-bold text-slate-800 dark:text-slate-200">{totalPages} pgs</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Printed Sheets</div>
                    <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">{calculatedSheets} sheets</div>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Paper Saved</div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{paperSavedPercentage}%</div>
                  </div>
                </div>
              </div>

              {/* Layout Mode Selection */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  1. Imposition Layout
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLayoutMode('2-up');
                      handleOptionChange('2-up');
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                      layoutMode === '2-up'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Columns2 className="w-5 h-5 text-amber-500" />
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                        Popular
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-sm">2-up (2 Pages / Sheet)</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Side-by-side reading, fold in half like a book.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLayoutMode('4-up');
                      handleOptionChange('4-up');
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                      layoutMode === '4-up'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <LayoutGrid className="w-5 h-5 text-amber-500" />
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                        75% Less Paper
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-sm">4-up (4 Pages / Sheet)</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        2x2 grid, best for micro-notes, question banks.
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Sheet Properties */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  2. Paper & Orientation
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Sheet Size</label>
                    <select
                      value={sheetSize}
                      onChange={(e) => {
                        const val = e.target.value as 'A4' | 'Letter';
                        setSheetSize(val);
                        handleOptionChange(layoutMode, val);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="A4">A4 (210 x 297 mm)</option>
                      <option value="Letter">US Letter (8.5 x 11 in)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Orientation</label>
                    <select
                      value={orientation}
                      onChange={(e) => {
                        const val = e.target.value as 'landscape' | 'portrait';
                        setOrientation(val);
                        handleOptionChange(layoutMode, sheetSize, val);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="landscape">Landscape (Recommended)</option>
                      <option value="portrait">Portrait</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Margins & Padding</label>
                    <select
                      value={marginOption}
                      onChange={(e) => {
                        const val = e.target.value as 'compact' | 'normal' | 'wide';
                        setMarginOption(val);
                        handleOptionChange(layoutMode, sheetSize, orientation, drawCutLines, val);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="compact">Compact (8pt - Max Area)</option>
                      <option value="normal">Normal (16pt - Standard)</option>
                      <option value="wide">Wide (24pt - Easy Stapling)</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <input
                        type="checkbox"
                        checked={drawCutLines}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setDrawCutLines(val);
                          handleOptionChange(layoutMode, sheetSize, orientation, val);
                        }}
                        className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                      />
                      <Scissors className="w-3.5 h-3.5 text-slate-500" />
                      <span>Folding / Cut Lines</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleDownloadBooklet}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 text-base transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Arranging Booklet Pages...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Download Ready-to-Print Booklet PDF</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Column: Sheet Preview */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col h-full min-h-[480px]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Sheet 1 Preview ({layoutMode.toUpperCase()} Layout)
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {orientation === 'landscape' ? 'Landscape View' : 'Portrait View'}
                  </span>
                </div>

                <div className="flex-1 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950/60 rounded-lg mt-3 overflow-hidden">
                  {previewDataUrl ? (
                    <div className="relative shadow-2xl rounded border border-slate-300 dark:border-slate-700 bg-white max-h-[450px]">
                      <img
                        src={previewDataUrl}
                        alt="Booklet Sheet Preview"
                        className="max-h-[420px] object-contain rounded"
                      />
                    </div>
                  ) : (
                    <div className="text-center p-8 text-slate-400">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm">Generating sheet preview...</p>
                    </div>
                  )}
                </div>

                {/* Print Guide Tips */}
                <div className="mt-4 p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-semibold">Printing Instructions:</span> Open the downloaded PDF in Chrome or Adobe Reader. In the print dialog, select <strong>"Two-Sided (Duplex) Flip on Short Edge"</strong> for landscape booklets, or flip on long edge for portrait.
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
