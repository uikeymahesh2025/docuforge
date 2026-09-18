import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Undo,
  Redo,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  Sliders,
  Search,
  FileText,
  X,
} from 'lucide-react';
import { useEditorStore } from '../stores/useEditorStore';
import { useToastStore } from '../stores/useToastStore';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { PropertiesPanel } from '../components/editor/PropertiesPanel';
import { ThumbnailsSidebar } from '../components/editor/ThumbnailsSidebar';
import { PdfCanvasViewer } from '../components/editor/PdfCanvasViewer';
import { SignatureModal } from '../components/editor/SignatureModal';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { bakeAnnotationsOnPdf } from '../pdf/pdfModifier';
import { searchPdf, loadPdfDocument } from '../pdf/pdfManager';
import { sanitizeFilename } from '../utils/downloadHelpers';

export const EditorPage: React.FC = () => {
  const {
    pdfBytes,
    fileName,
    pageCount,
    currentPage,
    scale,
    annotations,
    historyIndex,
    history,
    setPdf,
    setCurrentPage,
    setScale,
    undo,
    redo,
    addAnnotation,
    selectedAnnotationId,
    deleteAnnotation,
  } = useEditorStore();

  const addToast = useToastStore((state) => state.addToast);

  // UI Drawers & Modals
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('Baking annotations...');
  const [exportResult, setExportResult] = useState<Uint8Array | null>(null);

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ pageNumber: number; count: number; snippets: string[] }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Shift+Z, Delete, +, -, Ctrl+F, Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only delete annotation if not typing in an input
        if (
          selectedAnnotationId &&
          !(e.target instanceof HTMLInputElement) &&
          !(e.target instanceof HTMLTextAreaElement)
        ) {
          e.preventDefault();
          deleteAnnotation(selectedAnnotationId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === '+' || e.key === '=') {
        if (!(e.target instanceof HTMLInputElement)) {
          setScale((s) => s + 0.15);
        }
      } else if (e.key === '-') {
        if (!(e.target instanceof HTMLInputElement)) {
          setScale((s) => s - 0.15);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedAnnotationId, deleteAnnotation, setScale]);

  // Load uploaded PDF
  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const doc = await loadPdfDocument(bytes);
      setPdf(bytes, file.name, doc.numPages);
      addToast({
        type: 'success',
        title: 'PDF Opened Successfully',
        message: `${file.name} (${doc.numPages} ${doc.numPages === 1 ? 'page' : 'pages'})`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Unable to open PDF',
        message: 'The file may be corrupted, encrypted or unsupported.',
      });
    }
  };

  // Perform search
  const handlePerformSearch = async () => {
    if (!pdfBytes || !searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const doc = await loadPdfDocument(pdfBytes);
      const res = await searchPdf(doc, searchQuery);
      setSearchResults(res);
      if (res.length === 0) {
        addToast({ type: 'info', title: 'No matches found', message: `"${searchQuery}" not found in PDF.` });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Export PDF with baked annotations
  const handleExport = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    setProcessingStatus('Embedding annotations & finalizing PDF...');
    try {
      const bakedBytes = await bakeAnnotationsOnPdf(pdfBytes, annotations);
      setExportResult(bakedBytes);
      addToast({
        type: 'success',
        title: 'PDF Export Ready',
        message: 'All edits and signatures have been permanently applied.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Export Failed',
        message: err?.message || 'Could not finalize document.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Add signature
  const handleSaveSignature = (dataUrl: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    addAnnotation({
      id,
      pageNumber: currentPage,
      type: 'signature',
      dataUrl,
      rotation: 0,
      x: 100,
      y: 200,
      width: 180,
      height: 70,
      color: '#000000',
      opacity: 1,
    });
    addToast({ type: 'success', title: 'Signature Placed', message: 'Move or resize it on the page.' });
  };

  // Add image
  const handleImageSelected = (dataUrl: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    addAnnotation({
      id,
      pageNumber: currentPage,
      type: 'image',
      dataUrl,
      rotation: 0,
      x: 80,
      y: 120,
      width: 160,
      height: 160,
      color: '#000000',
      opacity: 1,
    });
    addToast({ type: 'success', title: 'Image Added', message: 'Adjust position and scale as needed.' });
  };

  // If no document is loaded, show upload screen
  if (!pdfBytes) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 sm:p-8 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
            <FileText className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            PDF <span className="text-brand-gold">Editor</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Upload your PDF to add text, signatures, freehand drawings, shapes, and annotations directly in your browser.
          </p>
        </div>

        <FileUploader
          title="Drop your PDF to start editing"
          subtitle="or browse files from your computer or mobile"
          onFilesSelected={handleFileSelected}
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#09090C] overflow-hidden select-none">
      {/* Top Editor Bar */}
      <div className="h-14 bg-[#0C0C10] border-b border-white/10 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 shrink-0 z-30">
        {/* Left: Document title & Page Drawer toggle */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setIsThumbnailsOpen(!isThumbnailsOpen)}
            className={`p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition ${
              isThumbnailsOpen ? 'bg-white/10 text-brand-gold' : ''
            }`}
            title="Toggle Page Thumbnails"
          >
            <Layers className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-zinc-200 truncate max-w-[120px] sm:max-w-[200px]" title={fileName}>
            {fileName}
          </span>
        </div>

        {/* Center: Page navigation & Zoom */}
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Page navigation */}
          <div className="flex items-center bg-zinc-900/80 rounded-xl p-0.5 border border-white/5 text-xs text-zinc-300">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1}
              className="p-1.5 hover:text-white disabled:opacity-30 transition"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 hover:text-white disabled:opacity-30 transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px]">
              {currentPage} / {pageCount}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= pageCount}
              className="p-1.5 hover:text-white disabled:opacity-30 transition"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(pageCount)}
              disabled={currentPage >= pageCount}
              className="p-1.5 hover:text-white disabled:opacity-30 transition"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="hidden sm:flex items-center bg-zinc-900/80 rounded-xl p-0.5 border border-white/5 text-xs text-zinc-300">
            <button
              onClick={() => setScale((s) => s - 0.15)}
              className="p-1.5 hover:text-white transition"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] min-w-[44px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => s + 0.15)}
              className="p-1.5 hover:text-white transition"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setScale(1.0)}
              className="p-1.5 hover:text-white transition border-l border-white/5"
              title="Reset Zoom (100%)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Undo, Redo, Search, Export */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-lg text-zinc-400 hover:text-white disabled:opacity-20 hover:bg-white/5 transition"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-lg text-zinc-400 hover:text-white disabled:opacity-20 hover:bg-white/5 transition"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition ${
              isSearchOpen ? 'text-brand-gold bg-white/10' : ''
            }`}
            title="Search in PDF (Ctrl+F)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Properties Panel Toggle on mobile */}
          <button
            onClick={() => setIsPropertiesOpen(!isPropertiesOpen)}
            className="xl:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
            title="Tool Properties"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Export / Download CTA */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-gold text-black font-semibold text-xs hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save &amp; Download</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Row */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Thumbnails Drawer */}
        <ThumbnailsSidebar isOpen={isThumbnailsOpen} onClose={() => setIsThumbnailsOpen(false)} />

        {/* Left Desktop Toolbar */}
        <div className="hidden md:flex">
          <EditorToolbar
            onOpenSignature={() => setIsSignatureOpen(true)}
            onImageSelected={handleImageSelected}
            isMobile={false}
          />
        </div>

        {/* Center Canvas Area */}
        <PdfCanvasViewer />

        {/* Right Properties Panel (Desktop) */}
        <PropertiesPanel isMobile={false} />

        {/* Mobile Properties Drawer */}
        {isPropertiesOpen && (
          <PropertiesPanel isMobile={true} onClose={() => setIsPropertiesOpen(false)} />
        )}

        {/* PDF Search Drawer */}
        {isSearchOpen && (
          <div className="absolute top-3 right-3 sm:right-6 bg-[#121218] border border-white/10 rounded-2xl p-4 shadow-2xl z-40 w-80 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-brand-gold" />
                <span>Search in PDF</span>
              </span>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-zinc-500 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePerformSearch()}
                placeholder="Find text..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-gold"
              />
              <button
                onClick={handlePerformSearch}
                disabled={isSearching}
                className="px-3 py-1.5 rounded-xl bg-brand-gold text-black font-semibold text-xs hover:brightness-110 transition"
              >
                {isSearching ? '...' : 'Find'}
              </button>
            </div>

            {/* Results */}
            <div className="max-h-48 overflow-y-auto space-y-2">
              {searchResults.map((res) => (
                <button
                  key={res.pageNumber}
                  onClick={() => setCurrentPage(res.pageNumber)}
                  className="w-full text-left p-2 rounded-lg bg-zinc-900/60 hover:bg-white/5 border border-white/5 transition"
                >
                  <div className="flex justify-between text-[11px] font-semibold text-brand-gold">
                    <span>Page {res.pageNumber}</span>
                    <span>{res.count} {res.count === 1 ? 'match' : 'matches'}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2">{res.snippets[0]}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Floating Toolbar */}
      <div className="md:hidden">
        <EditorToolbar
          onOpenSignature={() => setIsSignatureOpen(true)}
          onImageSelected={handleImageSelected}
          isMobile={true}
        />
      </div>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureOpen}
        onClose={() => setIsSignatureOpen(false)}
        onSaveSignature={handleSaveSignature}
      />

      {/* Processing Modal */}
      <ProcessingModal isOpen={isProcessing} statusText={processingStatus} />

      {/* Result Modal */}
      <ResultModal
        isOpen={Boolean(exportResult)}
        onClose={() => setExportResult(null)}
        resultData={exportResult}
        defaultFileName={sanitizeFilename(fileName, 'edited')}
        onReset={() => setExportResult(null)}
      />
    </div>
  );
};
