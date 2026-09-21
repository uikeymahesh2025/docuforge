import React, { useState } from 'react';
import {
  FileText,
  Download,
  FolderArchive,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Sliders,
  Calendar,
  Hash,
  Search,
  ArrowRight,
  Layers,
  FileCheck,
} from 'lucide-react';
import JSZip from 'jszip';
import { FileUploader } from '../../components/tools/FileUploader';
import { wipePdfMetadata } from '../../pdf/pdfModifier';
import { useToastStore } from '../../stores/useToastStore';

interface FileItem {
  id: string;
  originalFile: File;
  originalName: string;
  sizeKb: number;
}

export const BatchRenamerPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [files, setFiles] = useState<FileItem[]>([]);

  // Bulk Renaming Rules
  const [prefix, setPrefix] = useState<string>('');
  const [suffix, setSuffix] = useState<string>('');
  const [findText, setFindText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [caseFormat, setCaseFormat] = useState<'none' | 'lower' | 'upper' | 'title'>('none');
  const [includeDate, setIncludeDate] = useState<boolean>(false);
  const [dateFormat, setDateFormat] = useState<'YYYY-MM-DD' | 'DD-MM-YYYY'>('YYYY-MM-DD');
  const [numbering, setNumbering] = useState<'none' | '1' | '01' | '001'>('001');
  const [startNumber, setStartNumber] = useState<number>(1);

  // Metadata wiping
  const [stripMetadata, setStripMetadata] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFilesSelected = (newFiles: File[]) => {
    if (!newFiles || newFiles.length === 0) return;

    const items: FileItem[] = newFiles.map((f) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      originalFile: f,
      originalName: f.name,
      sizeKb: Math.round((f.size / 1024) * 10) / 10,
    }));

    setFiles((prev) => [...prev, ...items]);
    addToast({
      type: 'success',
      title: 'Files Added',
      message: `Added ${newFiles.length} file(s) for batch processing.`,
    });
  };

  const getTodayFormatted = (fmt: 'YYYY-MM-DD' | 'DD-MM-YYYY'): string => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return fmt === 'YYYY-MM-DD' ? `${y}-${m}-${d}` : `${d}-${m}-${y}`;
  };

  // Compute new name for a file based on current rules
  const computeNewName = (item: FileItem, index: number): string => {
    const rawName = item.originalName.replace(/\.pdf$/i, '');
    let base = rawName;

    // 1. Find & replace
    if (findText.trim()) {
      base = base.split(findText).join(replaceText);
    }

    // 2. Case transformation
    if (caseFormat === 'lower') {
      base = base.toLowerCase();
    } else if (caseFormat === 'upper') {
      base = base.toUpperCase();
    } else if (caseFormat === 'title') {
      base = base.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }

    // 3. Prefix & Suffix
    let res = `${prefix}${base}${suffix}`;

    // 4. Date stamp
    if (includeDate) {
      const dateStr = getTodayFormatted(dateFormat);
      res = `${res}_${dateStr}`;
    }

    // 5. Sequential Numbering
    if (numbering !== 'none') {
      const num = startNumber + index;
      const padLen = numbering === '001' ? 3 : numbering === '01' ? 2 : 1;
      const padded = String(num).padStart(padLen, '0');
      res = `${res}_${padded}`;
    }

    return `${res}.pdf`;
  };

  const handleDeleteItem = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDownloadZip = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const zip = new JSZip();

      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        const newFileName = computeNewName(item, i);
        const buffer = await item.originalFile.arrayBuffer();
        let bytes: any = new Uint8Array(buffer);

        if (stripMetadata) {
          bytes = await wipePdfMetadata(bytes);
        }

        zip.file(newFileName, bytes);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `renamed_batch_${files.length}_files.zip`;
      link.click();
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'ZIP Exported!',
        message: `Successfully renamed and packaged ${files.length} PDF files.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Batch Error',
        message: err?.message || 'Could not package renamed files.',
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
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Batch PDF Renamer & Metadata Wiper
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-semibold border border-violet-300 dark:border-violet-800">
                  Bulk 50+ Files
                </span>
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Bulk rename files with prefix, suffix, sequential numbering ([001]), date stamps, and strip confidential author/EXIF metadata in one click.
              </p>
            </div>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="max-w-xl mx-auto py-10">
            <FileUploader
              onFilesSelected={handleFilesSelected}
              accept=".pdf,application/pdf"
              multiple={true}
              fileType="pdf"
              title="Select Multiple PDFs for Batch Renaming"
              subtitle="Drop 10, 50, or 100+ documents, invoices, or client photoshoot files"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Renaming Rules */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-violet-500" />
                    Renaming Pattern Rules
                  </span>
                  <button
                    onClick={() => setFiles([])}
                    className="text-xs text-rose-500 hover:underline"
                  >
                    Clear All ({files.length})
                  </button>
                </div>

                {/* Prefix & Suffix */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Prefix
                    </label>
                    <input
                      type="text"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      placeholder="e.g. Invoice_"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Suffix
                    </label>
                    <input
                      type="text"
                      value={suffix}
                      onChange={(e) => setSuffix(e.target.value)}
                      placeholder="e.g. _Final"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                {/* Find & Replace */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Find Text
                    </label>
                    <input
                      type="text"
                      value={findText}
                      onChange={(e) => setFindText(e.target.value)}
                      placeholder="e.g. Draft"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Replace With
                    </label>
                    <input
                      type="text"
                      value={replaceText}
                      onChange={(e) => setReplaceText(e.target.value)}
                      placeholder="e.g. Approved"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                {/* Sequential Numbering */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Numbering Format
                    </label>
                    <select
                      value={numbering}
                      onChange={(e) => setNumbering(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="none">No Numbering</option>
                      <option value="1">1, 2, 3...</option>
                      <option value="01">01, 02, 03...</option>
                      <option value="001">001, 002, 003...</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Start Number
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={startNumber}
                      onChange={(e) => setStartNumber(Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                {/* Date Stamp & Case */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Letter Casing
                    </label>
                    <select
                      value={caseFormat}
                      onChange={(e) => setCaseFormat(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="none">Preserve Original</option>
                      <option value="lower">lowercase</option>
                      <option value="upper">UPPERCASE</option>
                      <option value="title">Title Case</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <input
                        type="checkbox"
                        checked={includeDate}
                        onChange={(e) => setIncludeDate(e.target.checked)}
                        className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4"
                      />
                      <span>Append Date Stamp</span>
                    </label>
                  </div>
                </div>

                {/* Metadata Wiper Option */}
                <div className="p-3 rounded-lg bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/60 dark:border-violet-900/40">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stripMetadata}
                      onChange={(e) => setStripMetadata(e.target.checked)}
                      className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4 mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold text-violet-950 dark:text-violet-200 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                        <span>Wipe All Confidential Metadata</span>
                      </div>
                      <div className="text-[11px] text-violet-700 dark:text-violet-300 mt-0.5">
                        Strips document Author, Creation timestamps, Company names, and EXIF tags before download.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Download ZIP Button */}
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={isProcessing}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 text-base transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Renaming & Wiping Metadata...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Download All Renamed PDFs as ZIP ({files.length})</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Column: Live Table Preview */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col h-full min-h-[500px]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-violet-500" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Live Renaming Preview ({files.length} Files)
                    </span>
                  </div>
                  {stripMetadata && (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                      Metadata Cleaned
                    </span>
                  )}
                </div>

                <div className="flex-1 mt-3 overflow-y-auto max-h-[440px] pr-1 space-y-2">
                  {files.map((item, idx) => {
                    const newName = computeNewName(item, idx);
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-400 text-[11px] truncate" title={item.originalName}>
                            {item.originalName} ({item.sizeKb} KB)
                          </div>
                          <div className="flex items-center gap-1.5 text-violet-700 dark:text-violet-300 font-bold font-mono mt-0.5 truncate">
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate" title={newName}>
                              {newName}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
