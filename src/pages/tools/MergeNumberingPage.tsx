import React, { useState } from 'react';
import {
  Combine,
  Hash,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Download,
  FileText,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle2,
  Settings,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Layers,
} from 'lucide-react';
import { FileUploader } from '../../components/tools/FileUploader';
import { loadPdfDocument } from '../../pdf/pdfManager';
import {
  mergePdfWithContinuousNumbering,
  ContinuousNumberingOptions,
} from '../../pdf/pdfModifier';
import { useToastStore } from '../../stores/useToastStore';
import { sanitizeFilename, downloadBlob, formatBytes } from '../../utils/downloadHelpers';

interface FileQueueItem {
  id: string;
  file: File;
  bytes: Uint8Array;
  numPages: number;
}

export const MergeNumberingPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [files, setFiles] = useState<FileQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  // Continuous Numbering Configuration
  const [position, setPosition] = useState<ContinuousNumberingOptions['position']>('bottom-center');
  const [format, setFormat] = useState<ContinuousNumberingOptions['format']>('page-x-of-y');
  const [customPattern, setCustomPattern] = useState<string>('Doc - Page {n}');
  const [fontSize, setFontSize] = useState<number>(10);
  const [startNumber, setStartNumber] = useState<number>(1);
  const [marginPt, setMarginPt] = useState<number>(25);
  const [skipFirstPage, setSkipFirstPage] = useState<boolean>(false);
  const [colorHex, setColorHex] = useState<string>('#111827');
  const [headerText, setHeaderText] = useState<string>('');

  const handleFilesSelected = async (newFiles: File[]) => {
    if (!newFiles || newFiles.length === 0) return;

    try {
      const queueItems: FileQueueItem[] = [];

      for (const f of newFiles) {
        const buf = await f.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let numPages = 1;
        try {
          const pdfDoc = await loadPdfDocument(bytes);
          numPages = pdfDoc.numPages;
        } catch {
          // fallback
        }
        queueItems.push({
          id: `${f.name}-${Date.now()}-${Math.random()}`,
          file: f,
          bytes,
          numPages,
        });
      }

      setFiles((prev) => [...prev, ...queueItems]);
      addToast({
        type: 'success',
        title: 'Files Added',
        message: `Added ${queueItems.length} document(s) to merge list.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Load Error',
        message: err?.message || 'Could not load PDF files.',
      });
    }
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    setFiles((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index >= files.length - 1) return;
    setFiles((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const totalCumulativePages = files.reduce((acc, curr) => acc + curr.numPages, 0);

  // Compute page ranges for each file
  let currentAccumulator = startNumber;
  const filesWithRanges = files.map((item) => {
    const start = currentAccumulator;
    const end = currentAccumulator + item.numPages - 1;
    currentAccumulator += item.numPages;
    return {
      ...item,
      pageRange: `${start} - ${end}`,
    };
  });

  const handleMergeAndNumber = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    try {
      const options: ContinuousNumberingOptions = {
        position,
        format,
        customPattern: format === 'custom' ? customPattern : undefined,
        fontSize,
        startNumber,
        marginPt,
        skipFirstPage,
        colorHex,
        headerText: headerText.trim() ? headerText.trim() : undefined,
      };

      const sourceFiles = files.map((f) => ({
        bytes: f.bytes,
        name: f.file.name,
      }));

      const mergedBytes = await mergePdfWithContinuousNumbering(sourceFiles, options);
      const blob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' });
      const filename = sanitizeFilename(files[0].file.name, 'continuous_numbered', 'pdf');
      downloadBlob(blob, filename);

      addToast({
        type: 'success',
        title: 'Batch Merged & Numbered',
        message: `${filename} (${totalCumulativePages} pages) generated with continuous running numbers.`,
      });
    } catch (err: any) {
      console.error('Merge numbering failed:', err);
      addToast({
        type: 'error',
        title: 'Merge Failed',
        message: err?.message || 'Could not assemble numbered PDF.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-brand-gold/25 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-3">
          <Hash className="w-4 h-4" />
          Continuous Numbering Engine
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
          Batch PDF Merge with <span className="text-brand-gold">Continuous Numbering</span>
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto">
          Combine multiple separate PDFs in custom order and inject continuous running page numbers ("Page X of Y"), legal exhibit headers, and footers across the entire compilation.
        </p>
      </div>

      {files.length === 0 ? (
        <div className="max-w-3xl mx-auto">
          <FileUploader
            accept=".pdf,application/pdf"
            fileType="pdf"
            subtitle="Select 2 or more PDF documents to merge into a single numbered volume"
            onFilesSelected={handleFilesSelected}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 text-center">
              <div className="w-9 h-9 mx-auto rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                <Combine className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">Reorderable Document Queue</h3>
              <p className="text-xs text-zinc-400 mt-1">Easily arrange chapters, pleadings, and attachments in exact order.</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 text-center">
              <div className="w-9 h-9 mx-auto rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2">
                <Hash className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">Continuous Running Count</h3>
              <p className="text-xs text-zinc-400 mt-1">Automatic "Page X of Total" spanning across all documents seamlessly.</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 text-center">
              <div className="w-9 h-9 mx-auto rounded-lg bg-amber-500/10 text-brand-gold flex items-center justify-center mb-2">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">Legal Exhibits & Titles</h3>
              <p className="text-xs text-zinc-400 mt-1">Stamp case numbers or running matter titles alongside the pagination.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Reorderable Document Queue */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-[#121216] border border-zinc-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <h3 className="text-sm font-semibold text-white">Merge Document Sequence</h3>
                  <p className="text-xs text-zinc-400">
                    {files.length} {files.length === 1 ? 'file' : 'files'} • {totalCumulativePages} Total Pages
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="text-xs text-zinc-400 hover:text-red-400 transition-colors"
                >
                  Clear All
                </button>
              </div>

              {/* Document List Items */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filesWithRanges.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 transition-all"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-6 h-6 rounded bg-brand-gold/15 text-brand-gold text-xs font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-semibold text-zinc-200 truncate max-w-[210px]">
                          {item.file.name}
                        </h4>
                        <p className="text-[11px] text-zinc-400">
                          {item.numPages} pgs • Running Pgs: <span className="text-brand-gold font-mono">{item.pageRange}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(index)}
                        disabled={index === files.length - 1}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFile(item.id)}
                        className="p-1 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors ml-1"
                        title="Remove Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add More Files Drop Area */}
              <div className="pt-2">
                <FileUploader
                  accept=".pdf,application/pdf"
                  fileType="pdf"
                  subtitle="Add more PDF files to this batch"
                  onFilesSelected={handleFilesSelected}
                />
              </div>
            </div>
          </div>

          {/* Right: Continuous Numbering Configuration */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-[#121216] border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider pb-2 border-b border-zinc-800 flex items-center justify-between">
                <span>Numbering & Header Settings</span>
                <span className="text-[11px] text-brand-gold lowercase font-normal font-mono">
                  {totalCumulativePages} pages total
                </span>
              </h3>

              {/* Numbering Format */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Pagination Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat('page-x-of-y')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border text-left transition-all ${
                      format === 'page-x-of-y'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold'
                        : 'bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    Page {startNumber} of {totalCumulativePages}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('x-slash-y')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border text-left transition-all ${
                      format === 'x-slash-y'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold'
                        : 'bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {startNumber} / {totalCumulativePages}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('dash-x-dash')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border text-left transition-all ${
                      format === 'dash-x-dash'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold'
                        : 'bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    - {startNumber} -
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('page-x')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border text-left transition-all ${
                      format === 'page-x'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold'
                        : 'bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    Page {startNumber}
                  </button>
                </div>
              </div>

              {/* Position Selector */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Page Number Placement
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPosition('bottom-left')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium border transition-all ${
                      position === 'bottom-left'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold'
                        : 'bg-zinc-900 border-zinc-700/80 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    Bottom Left
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosition('bottom-center')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium border transition-all ${
                      position === 'bottom-center'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold'
                        : 'bg-zinc-900 border-zinc-700/80 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    Bottom Center
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosition('bottom-right')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium border transition-all ${
                      position === 'bottom-right'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold'
                        : 'bg-zinc-900 border-zinc-700/80 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    Bottom Right
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosition('top-left')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium border transition-all ${
                      position === 'top-left'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold'
                        : 'bg-zinc-900 border-zinc-700/80 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    Top Left
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosition('top-center')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium border transition-all ${
                      position === 'top-center'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold'
                        : 'bg-zinc-900 border-zinc-700/80 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    Top Center
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosition('top-right')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium border transition-all ${
                      position === 'top-right'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold'
                        : 'bg-zinc-900 border-zinc-700/80 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    Top Right
                  </button>
                </div>
              </div>

              {/* Header Text & Starting Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Optional Header Title
                  </label>
                  <input
                    type="text"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    placeholder="e.g. Legal Exhibit Binder"
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-gold placeholder-zinc-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Start Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={startNumber}
                    onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-gold"
                  />
                </div>
              </div>

              {/* Font Size & Ink Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Font Size ({fontSize} pt)
                  </label>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-gold"
                  >
                    <option value="9">9 pt (Subtle)</option>
                    <option value="10">10 pt (Standard)</option>
                    <option value="11">11 pt (Medium)</option>
                    <option value="12">12 pt (Prominent)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Ink Color
                  </label>
                  <select
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-gold"
                  >
                    <option value="#111827">Jet Black (#111827)</option>
                    <option value="#374151">Dark Slate (#374151)</option>
                    <option value="#4B5563">Charcoal Grey (#4B5563)</option>
                    <option value="#D97706">Brand Gold (#D97706)</option>
                  </select>
                </div>
              </div>

              {/* Cover Page Skip Toggle */}
              <div className="pt-2 border-t border-zinc-800">
                <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 cursor-pointer">
                  <div>
                    <span className="text-xs font-medium text-zinc-200 block">Skip First Page (Cover Sheet)</span>
                    <span className="text-[10px] text-zinc-400">Do not stamp page number on cover/title page</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={skipFirstPage}
                    onChange={(e) => setSkipFirstPage(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                  />
                </label>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleMergeAndNumber}
                disabled={isProcessing || files.length === 0}
                className="w-full mt-3 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Merging & Stamping Page Numbers...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Merge {files.length} PDFs with Continuous Numbering</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
