import React, { useState } from 'react';
import {
  Bookmark,
  Plus,
  Trash2,
  Download,
  Sparkles,
  FileCheck,
  CheckCircle2,
  RefreshCw,
  Search,
  BookOpen,
  ChevronRight,
  ListTree,
  FileText,
} from 'lucide-react';
import { FileUploader } from '../../components/tools/FileUploader';
import { loadPdfDocument } from '../../pdf/pdfManager';
import { addBookmarksToPdf, BookmarkItem } from '../../pdf/pdfModifier';
import { useToastStore } from '../../stores/useToastStore';

export const BookmarkGeneratorPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // New bookmark input form
  const [newTitle, setNewTitle] = useState<string>('');
  const [newPageNum, setNewPageNum] = useState<number>(1);

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
      setNewPageNum(1);

      addToast({
        type: 'success',
        title: 'PDF Loaded',
        message: `${selected.name} (${pdf.numPages} pages) ready for bookmarking.`,
      });

      // Auto-scan headings on upload
      scanDocumentHeadings(bytes, pdf.numPages);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Load Failed',
        message: err?.message || 'Could not load PDF document.',
      });
    }
  };

  const scanDocumentHeadings = async (bytes: Uint8Array, numPages: number) => {
    setIsScanning(true);
    try {
      const pdf = await loadPdfDocument(bytes);
      const detected: BookmarkItem[] = [];

      for (let p = 1; p <= numPages; p++) {
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];

        // Find items with prominent font size (>= 14pt) or uppercase headings
        for (const item of items) {
          if (!item.str || item.str.trim().length < 3) continue;
          const str = item.str.trim();
          const fontSize = Math.round(item.transform[0] || item.height || 12);

          // If font size is >= 14 or begins with "Chapter", "Unit", "Section", "Part"
          const isHeading =
            fontSize >= 14 ||
            /^(chapter|unit|section|part|module|act|index|table of contents)\b/i.test(str);

          if (isHeading && str.length < 80) {
            // Avoid duplicates on same page
            if (!detected.some((b) => b.pageNumber === p && b.title === str)) {
              detected.push({
                id: `bm-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                title: str,
                pageNumber: p,
              });
            }
          }
        }
      }

      if (detected.length > 0) {
        setBookmarks(detected);
        addToast({
          type: 'success',
          title: 'Auto-Detected Headings',
          message: `Found ${detected.length} potential bookmark headings from the document structure.`,
        });
      } else {
        // Default first page bookmark
        setBookmarks([
          { id: `bm-1`, title: 'Document Title / Page 1', pageNumber: 1 },
        ]);
      }
    } catch (err) {
      console.warn('Heading scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newBm: BookmarkItem = {
      id: `bm-${Date.now()}`,
      title: newTitle.trim(),
      pageNumber: Math.max(1, Math.min(totalPages, Number(newPageNum) || 1)),
    };

    setBookmarks((prev) => [...prev, newBm].sort((a, b) => a.pageNumber - b.pageNumber));
    setNewTitle('');
    setNewPageNum(Math.min(totalPages, newBm.pageNumber + 1));
  };

  const handleDeleteBookmark = (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleUpdateTitle = (id: string, title: string) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, title } : b))
    );
  };

  const handleUpdatePage = (id: string, pageNumber: number) => {
    setBookmarks((prev) =>
      prev
        .map((b) => (b.id === id ? { ...b, pageNumber: Math.max(1, Math.min(totalPages, pageNumber)) } : b))
        .sort((a, b) => a.pageNumber - b.pageNumber)
    );
  };

  const handleDownload = async () => {
    if (!fileBytes || bookmarks.length === 0) return;
    setIsProcessing(true);
    try {
      const outputBytes = await addBookmarksToPdf(fileBytes, bookmarks);
      const blob = new Blob([outputBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const baseName = file?.name.replace(/\.pdf$/i, '') || 'document';
      link.href = url;
      link.download = `${baseName}_with_bookmarks.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'Bookmarks Injected!',
        message: `Saved PDF with ${bookmarks.length} clickable table of contents bookmarks.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Injection Failed',
        message: err?.message || 'Could not inject bookmarks into PDF.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-md shadow-blue-500/20">
              <Bookmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Smart Clickable Bookmark & TOC Generator
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-300 dark:border-indigo-800">
                  PDF Outlines
                </span>
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Auto-detect headings or manually create interactive bookmarks. Makes your PDF easily searchable and clickable in Chrome, Edge, Adobe Reader, and Apple Preview.
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
              title="Select PDF to Add Bookmarks & Table of Contents"
              subtitle="Drop any textbook, thesis, contract, or long document"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Bookmark Creator & Manager */}
            <div className="lg:col-span-7 space-y-5">
              {/* Document Overview */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <FileCheck className="w-4 h-4 text-emerald-500" />
                  <span className="truncate max-w-[220px]" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-xs font-normal text-slate-500">({totalPages} pages)</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => scanDocumentHeadings(fileBytes!, totalPages)}
                    disabled={isScanning}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{isScanning ? 'Scanning...' : 'Re-scan Headings'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setFile(null);
                      setFileBytes(null);
                      setBookmarks([]);
                    }}
                    className="text-xs text-rose-500 hover:underline"
                  >
                    Change PDF
                  </button>
                </div>
              </div>

              {/* Add New Bookmark Form */}
              <form
                onSubmit={handleAddBookmark}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Add Bookmark Entry</span>
                </div>
                <div className="grid grid-cols-12 gap-2.5">
                  <div className="col-span-8">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Chapter 1: Introduction"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={newPageNum}
                      onChange={(e) => setNewPageNum(Number(e.target.value))}
                      placeholder="Page #"
                      className="w-20 px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!newTitle.trim()}
                      className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </form>

              {/* Bookmark List Table */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Bookmark Tree Structure ({bookmarks.length} Chapters)
                  </span>
                  {bookmarks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBookmarks([])}
                      className="text-xs text-slate-400 hover:text-rose-500"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {bookmarks.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No bookmarks added. Enter chapter titles above or click "Re-scan Headings".
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {bookmarks.map((bm, index) => (
                      <div
                        key={bm.id}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs group"
                      >
                        <span className="w-5 text-center font-mono text-slate-400">
                          {index + 1}.
                        </span>
                        <input
                          type="text"
                          value={bm.title}
                          onChange={(e) => handleUpdateTitle(bm.id, e.target.value)}
                          className="flex-1 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5 text-slate-800 dark:text-slate-200 font-medium"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-[11px]">Pg:</span>
                          <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={bm.pageNumber}
                            onChange={(e) => handleUpdatePage(bm.id, Number(e.target.value))}
                            className="w-14 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center text-xs font-bold text-indigo-600 dark:text-indigo-400"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteBookmark(bm.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleDownload}
                disabled={bookmarks.length === 0 || isProcessing}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 text-base transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Injecting PDF Outlines...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Download Bookmarked PDF ({bookmarks.length} Links)</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Column: PDF Outlines Preview Mockup */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col h-full min-h-[480px]">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <ListTree className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    PDF Reader Sidebar Preview
                  </span>
                </div>

                <div className="flex-1 mt-3 p-3 bg-slate-900 rounded-lg text-slate-300 font-sans border border-slate-800 space-y-2 overflow-y-auto max-h-[420px]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-800 flex items-center gap-1.5">
                    <Bookmark className="w-3 h-3 text-indigo-400" />
                    <span>Bookmarks Panel (Acrobat / Chrome / Edge)</span>
                  </div>

                  {bookmarks.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      Bookmarks will appear in this sidebar view.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {bookmarks.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between p-2 rounded hover:bg-slate-800/80 cursor-pointer text-xs transition-colors group"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                            <span className="truncate text-slate-200 group-hover:text-indigo-300">
                              {b.title}
                            </span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            p.{b.pageNumber}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-200">
                  <strong>Compatibility:</strong> Generated bookmarks conform to the ISO 32000 PDF standard and automatically show in the left-hand navigation pane in all PDF viewers.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
