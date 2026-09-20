import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Undo,
  Redo,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FoldHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  Sliders,
  Search,
  FileText,
  X,
  ChevronUp,
  ChevronDown,
  Pencil,
  Type,
  Highlighter,
  Square,
  Trash2,
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
import { searchPdf, loadPdfDocument, findPdfSearchMatches } from '../pdf/pdfManager';
import { sanitizeFilename } from '../utils/downloadHelpers';

const COLOR_PRESETS = [
  '#000000',
  '#FFFFFF',
  '#D4AF37', // UIKEY AI Gold
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#FFFF00', // Yellow
];

export const EditorPage: React.FC = () => {
  const {
    pdfBytes,
    fileName,
    pageCount,
    currentPage,
    scale,
    rotation,
    activeTool,
    annotations,
    directTextEdits,
    imageReplacements,
    historyIndex,
    history,
    strokeColor,
    textColor,
    strokeWidth,
    fontSize,
    setStrokeWidth,
    setFontSize,
    setColor,
    setStrokeColor,
    setTextColor,
    updateAnnotation,
    setPdf,
    setCurrentPage,
    setScale,
    fitToWidth,
    fitToPage,
    undo,
    redo,
    addAnnotation,
    selectedAnnotationId,
    deleteAnnotation,
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    isSearching,
    setIsSearching,
    searchMatches,
    setSearchMatches,
    activeSearchMatchIndex,
    setActiveSearchMatchIndex,
    nextSearchMatch,
    prevSearchMatch,
    clearSearch,
  } = useEditorStore();

  const addToast = useToastStore((state) => state.addToast);

  // UI Drawers & Modals
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('Baking annotations...');
  const [exportResult, setExportResult] = useState<Uint8Array | null>(null);

  // Active object & Quick Toolbar helpers
  const selectedAnn = annotations.find((a) => a.id === selectedAnnotationId);
  const showQuickBar =
    Boolean(selectedAnn) ||
    ['draw', 'highlight', 'text', 'rect', 'circle', 'line', 'arrow'].includes(activeTool);

  const activeDisplayColor =
    (selectedAnn as any)?.color ||
    (selectedAnn as any)?.strokeColor ||
    (activeTool === 'text' ? textColor : strokeColor);

  const handleQuickColorSelect = (col: string) => {
    setColor(col);
    setStrokeColor(col);
    setTextColor(col);
    if (selectedAnn) {
      updateAnnotation(selectedAnn.id, {
        color: col,
        strokeColor: col,
      } as any);
    }
  };

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
      } else if (e.key === 'Escape' && isSearchOpen) {
        e.preventDefault();
        setIsSearchOpen(false);
      } else if (e.key === '+' || e.key === '=') {
        if (!(e.target instanceof HTMLInputElement)) {
          setScale((s) => s + 0.15);
        }
      } else if (e.key === '-') {
        if (!(e.target instanceof HTMLInputElement)) {
          setScale((s) => s - 0.15);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setScale(1.0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedAnnotationId, deleteAnnotation, setScale, isSearchOpen, setIsSearchOpen]);

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

  // Perform full-document search with exact highlight coordinates
  const handlePerformSearch = async (queryOverride?: string) => {
    const q = (queryOverride !== undefined ? queryOverride : searchQuery).trim();
    if (!pdfBytes || !q) {
      clearSearch();
      return;
    }
    setIsSearching(true);
    try {
      const doc = await loadPdfDocument(pdfBytes);
      const matches = await findPdfSearchMatches(doc, q, rotation);
      setSearchMatches(matches);
      if (matches.length === 0) {
        addToast({
          type: 'info',
          title: 'No matches found',
          message: `"${q}" was not found in this PDF.`,
        });
      } else {
        // If current page doesn't have matches, switch to page with first match
        const hasMatchOnCurrent = matches.some((m) => m.pageNumber === currentPage);
        if (!hasMatchOnCurrent) {
          setCurrentPage(matches[0].pageNumber);
        }
      }
    } catch (err) {
      console.error('PDF search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced live search as user types in the search box
  useEffect(() => {
    if (!isSearchOpen) return;
    const q = searchQuery.trim();
    if (!q) {
      setSearchMatches([]);
      return;
    }
    const timer = setTimeout(() => {
      handlePerformSearch(q);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isSearchOpen, pdfBytes, rotation]);

  // Export PDF with baked annotations
  const handleExport = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    setProcessingStatus('Embedding annotations & finalizing PDF...');
    try {
      const bakedBytes = await bakeAnnotationsOnPdf(
        pdfBytes,
        annotations,
        directTextEdits,
        imageReplacements,
        rotation
      );
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
              className={`px-1.5 py-0.5 hover:text-white transition border-l border-white/5 font-mono text-[10px] rounded ${
                scale === 1.0 ? 'text-brand-gold font-bold bg-white/5' : ''
              }`}
              title="100% Zoom (Ctrl+0)"
            >
              100%
            </button>
            {fitToWidth && (
              <button
                onClick={fitToWidth}
                className="p-1.5 hover:text-white hover:bg-white/5 rounded transition border-l border-white/5"
                title="Fit to Width"
              >
                <FoldHorizontal className="w-3.5 h-3.5" />
              </button>
            )}
            {fitToPage && (
              <button
                onClick={fitToPage}
                className="p-1.5 hover:text-white hover:bg-white/5 rounded transition"
                title="Fit Page to Screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
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

        {/* Center Canvas Area with Mode Helper Banner */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {activeTool === 'direct-text' && (
            <div className="bg-brand-gold/10 border-b border-brand-gold/20 px-4 py-2 flex items-center justify-between text-xs text-amber-200 z-20 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
                <span className="font-semibold text-brand-gold">Direct Text Edit Active:</span>
                <span>Hover and click on any text in the PDF to edit it in place. The original text will be masked and updated cleanly.</span>
              </div>
            </div>
          )}

          {activeTool === 'replace-image' && (
            <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-2 flex items-center justify-between text-xs text-blue-200 z-20 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="font-semibold text-blue-400">Image Replace Active:</span>
                <span>Drag a rectangle or click anywhere on the page to replace an existing image, graphic, or logo.</span>
              </div>
            </div>
          )}

          {/* Quick Color & Tool Options Toolbar */}
          {showQuickBar && (
            <div className="bg-[#121218]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs text-zinc-300 z-20 shadow-md animate-fadeIn">
              {/* Left: Active Tool/Object Indicator + Color Swatches */}
              <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-medium">
                  {activeTool === 'draw' && <Pencil className="w-3.5 h-3.5 text-brand-gold" />}
                  {activeTool === 'highlight' && <Highlighter className="w-3.5 h-3.5 text-brand-gold" />}
                  {activeTool === 'text' && <Type className="w-3.5 h-3.5 text-brand-gold" />}
                  {['rect', 'circle', 'line', 'arrow'].includes(activeTool) && <Square className="w-3.5 h-3.5 text-brand-gold" />}
                  {selectedAnn && !['draw', 'highlight', 'text', 'rect', 'circle', 'line', 'arrow'].includes(activeTool) && (
                    <Sliders className="w-3.5 h-3.5 text-brand-gold" />
                  )}
                  <span className="capitalize">
                    {selectedAnn ? `Selected ${selectedAnn.type}` : activeTool}
                  </span>
                </div>

                <div className="h-4 w-px bg-white/10 hidden sm:block" />

                {/* Color Swatches */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLOR_PRESETS.map((col) => {
                    const isSelected = activeDisplayColor.toLowerCase() === col.toLowerCase();
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => handleQuickColorSelect(col)}
                        style={{ backgroundColor: col }}
                        className={`w-5 h-5 rounded-full border transition-all ${
                          isSelected
                            ? 'border-brand-gold scale-125 shadow-gold-glow ring-2 ring-brand-gold/50'
                            : 'border-white/20 hover:scale-110 hover:border-white/60'
                        }`}
                        title={col}
                      />
                    );
                  })}

                  {/* Native Custom Color Picker */}
                  <div className="flex items-center gap-1 pl-1">
                    <input
                      type="color"
                      value={activeDisplayColor}
                      onChange={(e) => handleQuickColorSelect(e.target.value)}
                      className="w-6 h-6 rounded-md cursor-pointer bg-transparent border border-white/20 p-0 hover:border-brand-gold transition"
                      title="Pick custom color"
                    />
                    <span className="font-mono text-[10px] text-zinc-400 uppercase hidden md:inline">
                      {activeDisplayColor}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Contextual Controls (Stroke Size / Font Size / Delete) */}
              <div className="flex items-center gap-2.5">
                {(activeTool === 'text' || selectedAnn?.type === 'text') && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400 text-[11px]">Size:</span>
                    <input
                      type="number"
                      min="10"
                      max="72"
                      value={selectedAnn && 'fontSize' in selectedAnn ? (selectedAnn as any).fontSize : fontSize}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (selectedAnn) {
                          updateAnnotation(selectedAnn.id, { fontSize: val } as any);
                        } else {
                          setFontSize(val);
                        }
                      }}
                      className="w-14 px-2 py-0.5 rounded bg-zinc-900 border border-white/10 text-center text-white text-xs"
                    />
                    <span className="text-zinc-500 text-[11px]">px</span>
                  </div>
                )}

                {(['draw', 'highlight', 'rect', 'circle', 'line', 'arrow'].includes(activeTool) ||
                  (selectedAnn && ['draw', 'highlight', 'rect', 'circle', 'line', 'arrow'].includes(selectedAnn.type))) && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400 text-[11px]">Stroke:</span>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={selectedAnn && 'strokeWidth' in selectedAnn ? (selectedAnn as any).strokeWidth : strokeWidth}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (selectedAnn) {
                          updateAnnotation(selectedAnn.id, { strokeWidth: val } as any);
                        } else {
                          setStrokeWidth(val);
                        }
                      }}
                      className="w-16 sm:w-20 accent-brand-gold cursor-pointer"
                    />
                    <span className="text-zinc-400 text-[10px] font-mono w-4">
                      {selectedAnn && 'strokeWidth' in selectedAnn ? (selectedAnn as any).strokeWidth : strokeWidth}
                    </span>
                  </div>
                )}

                {selectedAnn && (
                  <button
                    onClick={() => deleteAnnotation(selectedAnn.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs transition active:scale-95"
                    title="Delete selected item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <PdfCanvasViewer />
        </div>

        {/* Right Properties Panel (Desktop) */}
        <PropertiesPanel isMobile={false} />

        {/* Mobile Properties Drawer */}
        {isPropertiesOpen && (
          <PropertiesPanel isMobile={true} onClose={() => setIsPropertiesOpen(false)} />
        )}

        {/* PDF Search Drawer */}
        {/* PDF Search Floating Bar / Drawer */}
        {isSearchOpen && (
          <div className="absolute top-3 right-3 sm:right-6 bg-[#121218]/95 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 shadow-2xl z-40 w-80 sm:w-96 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-brand-gold" />
                <span>Search in PDF</span>
              </span>

              <div className="flex items-center gap-1.5">
                {searchMatches.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-brand-gold border border-amber-500/30">
                    {activeSearchMatchIndex + 1} of {searchMatches.length}
                  </span>
                )}
                {!isSearching && searchQuery.trim() && searchMatches.length === 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    0 matches
                  </span>
                )}
                {isSearching && (
                  <span className="text-[10px] text-zinc-400 animate-pulse">
                    Searching...
                  </span>
                )}
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
                  title="Close Search (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Input & Action Controls */}
            <div className="flex items-center gap-1.5 mb-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (e.shiftKey) prevSearchMatch();
                      else if (searchMatches.length > 0) nextSearchMatch();
                      else handlePerformSearch();
                    } else if (e.key === 'Escape') {
                      setIsSearchOpen(false);
                    }
                  }}
                  autoFocus
                  placeholder="Find word or phrase..."
                  className="w-full pl-3 pr-7 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-gold"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5"
                    title="Clear"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Prev / Next navigation buttons */}
              <button
                onClick={prevSearchMatch}
                disabled={searchMatches.length === 0}
                className="p-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white hover:border-amber-500/40 disabled:opacity-40 disabled:hover:border-white/10 transition"
                title="Previous match (Shift+Enter)"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={nextSearchMatch}
                disabled={searchMatches.length === 0}
                className="p-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white hover:border-amber-500/40 disabled:opacity-40 disabled:hover:border-white/10 transition"
                title="Next match (Enter)"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePerformSearch()}
                disabled={isSearching || !searchQuery.trim()}
                className="px-2.5 py-1.5 rounded-xl bg-brand-gold text-black font-semibold text-xs hover:brightness-110 disabled:opacity-50 transition shrink-0"
                title="Find in document"
              >
                {isSearching ? '...' : 'Find'}
              </button>
            </div>

            {/* Results Snippets List */}
            {searchMatches.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1 border-t border-white/5 no-scrollbar">
                {searchMatches.map((m) => {
                  const isActive = activeSearchMatchIndex === m.globalIndex;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setActiveSearchMatchIndex(m.globalIndex);
                        setCurrentPage(m.pageNumber);
                      }}
                      className={`w-full text-left p-2 rounded-xl transition text-xs border ${
                        isActive
                          ? 'bg-amber-500/15 border-brand-gold/60 text-white'
                          : 'bg-zinc-900/50 hover:bg-white/5 border-white/5 text-zinc-300'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] font-semibold text-brand-gold mb-0.5">
                        <span>Page {m.pageNumber}</span>
                        <span className="text-[9px] text-zinc-500 font-mono">#{m.globalIndex + 1}</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 line-clamp-1">
                        {m.snippet}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
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
