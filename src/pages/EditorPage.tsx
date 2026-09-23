import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Lock,
  Wrench,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useEditorStore } from '../stores/useEditorStore';
import { useToastStore } from '../stores/useToastStore';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { PropertiesPanel } from '../components/editor/PropertiesPanel';
import { ThumbnailsSidebar } from '../components/editor/ThumbnailsSidebar';
import { PdfCanvasViewer } from '../components/editor/PdfCanvasViewer';
import { SignatureModal } from '../components/editor/SignatureModal';
import { KeyboardShortcutsModal } from '../components/editor/KeyboardShortcutsModal';
import { ExportOptionsModal } from '../components/editor/ExportOptionsModal';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { bakeAnnotationsOnPdf } from '../pdf/pdfModifier';
import { searchPdf, loadPdfDocument, findPdfSearchMatches } from '../pdf/pdfManager';
import { sanitizeFilename } from '../utils/downloadHelpers';
import { LARGE_FILE_THRESHOLD_BYTES } from '../utils/fileValidators';

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
  const navigate = useNavigate();

  // UI Drawers & Modals
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isExportOptionsOpen, setIsExportOptionsOpen] = useState(false);

  // Processing & Export
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('Processing...');
  const [exportResult, setExportResult] = useState<Uint8Array | null>(null);
  const [exportFileName, setExportFileName] = useState('');
  const [lastExportOptions, setLastExportOptions] = useState<{
    fileName: string;
    pageRange: string;
    flatten: boolean;
  } | null>(null);

  // Error & Recovery States
  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    fileBytes: Uint8Array | null;
    fileName: string;
    error: string | null;
  }>({
    isOpen: false,
    fileBytes: null,
    fileName: '',
    error: null,
  });
  const [passwordInput, setPasswordInput] = useState('');

  const [corruptModal, setCorruptModal] = useState<{
    isOpen: boolean;
    fileName: string;
    message: string;
  }>({
    isOpen: false,
    fileName: '',
    message: '',
  });

  const [pendingDraft, setPendingDraft] = useState<{
    key: string;
    count: number;
    data: any;
  } | null>(null);

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

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Shift+Z, Delete, +, -, Ctrl+F, Ctrl+S, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing inside form inputs
      const isInput =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (pdfBytes) {
          setIsExportOptionsOpen(true);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotationId && !isInput) {
          e.preventDefault();
          deleteAnnotation(selectedAnnotationId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape') {
        if (isSearchOpen) {
          e.preventDefault();
          setIsSearchOpen(false);
        }
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
        }
        if (isExportOptionsOpen) {
          setIsExportOptionsOpen(false);
        }
      } else if (e.key === '+' || e.key === '=') {
        if (!isInput) {
          setScale((s) => s + 0.15);
        }
      } else if (e.key === '-') {
        if (!isInput) {
          setScale((s) => s - 0.15);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setScale(1.0);
      } else if (e.key === '?' && !isInput) {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo,
    redo,
    selectedAnnotationId,
    deleteAnnotation,
    setScale,
    isSearchOpen,
    setIsSearchOpen,
    pdfBytes,
    isShortcutsOpen,
    isExportOptionsOpen,
  ]);

  // Unsaved changes beforeunload listener
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pdfBytes && (annotations.length > 0 || directTextEdits.length > 0)) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pdfBytes, annotations.length, directTextEdits.length]);

  // Autosave draft annotations to sessionStorage
  useEffect(() => {
    if (pdfBytes && fileName && (annotations.length > 0 || directTextEdits.length > 0)) {
      try {
        const key = `docuforge_draft_${fileName}`;
        sessionStorage.setItem(
          key,
          JSON.stringify({
            annotations,
            directTextEdits,
            savedAt: Date.now(),
          })
        );
      } catch (err) {
        // quota exceeded or private mode
      }
    }
  }, [pdfBytes, fileName, annotations, directTextEdits]);

  // Process uploaded or sample PDF
  const loadPdfBytesIntoEditor = async (
    bytes: Uint8Array,
    name: string,
    password?: string
  ) => {
    setIsProcessing(true);
    setProcessingStatus('Reading PDF file...');
    try {
      await new Promise((r) => setTimeout(r, 60));
      setProcessingStatus('Rendering document pages...');
      const doc = await loadPdfDocument(bytes, password);

      setProcessingStatus('Preparing editor workspace...');
      setPdf(bytes, name, doc.numPages);

      // Check if large file
      if (bytes.length >= LARGE_FILE_THRESHOLD_BYTES) {
        addToast({
          type: 'info',
          title: 'Large document loaded',
          message: `${(bytes.length / (1024 * 1024)).toFixed(1)}MB document opened. Operating safely in local memory.`,
        });
      } else {
        addToast({
          type: 'success',
          title: 'PDF Opened Successfully',
          message: `${name} (${doc.numPages} ${doc.numPages === 1 ? 'page' : 'pages'})`,
        });
      }

      // Check for previously saved draft
      try {
        const draftKey = `docuforge_draft_${name}`;
        const rawDraft = sessionStorage.getItem(draftKey);
        if (rawDraft) {
          const parsed = JSON.parse(rawDraft);
          const count = (parsed.annotations?.length || 0) + (parsed.directTextEdits?.length || 0);
          if (count > 0) {
            setPendingDraft({ key: draftKey, count, data: parsed });
          }
        }
      } catch (e) {
        // ignore
      }
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() || '';
      const isPassword =
        err?.name === 'PasswordException' ||
        msg.includes('password') ||
        err?.code === 1;

      if (isPassword) {
        setPasswordModal({
          isOpen: true,
          fileBytes: bytes,
          fileName: name,
          error: password ? 'Incorrect password. Please try again.' : null,
        });
      } else {
        setCorruptModal({
          isOpen: true,
          fileName: name,
          message:
            err?.message ||
            'The PDF structure could not be parsed. The file may be damaged or truncated.',
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      await loadPdfBytesIntoEditor(bytes, file.name);
    } catch (err: any) {
      setCorruptModal({
        isOpen: true,
        fileName: file.name,
        message: 'Could not read file from disk.',
      });
    }
  };

  // Password decryption handler
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModal.fileBytes) return;
    const pwd = passwordInput;
    setPasswordModal((prev) => ({ ...prev, error: null }));
    await loadPdfBytesIntoEditor(passwordModal.fileBytes, passwordModal.fileName, pwd);
    setPasswordModal((prev) => ({ ...prev, isOpen: false }));
    setPasswordInput('');
  };

  // Draft recovery action
  const handleRestoreDraft = () => {
    if (!pendingDraft?.data) return;
    const { annotations: draftAnns, directTextEdits: draftEdits } = pendingDraft.data;
    if (Array.isArray(draftAnns)) {
      draftAnns.forEach((ann) => addAnnotation(ann));
    }
    if (Array.isArray(draftEdits)) {
      draftEdits.forEach((edit) => useEditorStore.getState().addDirectTextEdit(edit));
    }
    addToast({
      type: 'success',
      title: 'Draft Edits Restored',
      message: `Recovered ${pendingDraft.count} previous annotations.`,
    });
    setPendingDraft(null);
  };

  const handleDismissDraft = () => {
    if (pendingDraft?.key) {
      sessionStorage.removeItem(pendingDraft.key);
    }
    setPendingDraft(null);
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

  // Debounced live search
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

  // Export PDF with baked annotations & page range option
  const executeExport = async (options: {
    fileName: string;
    pageRange: string;
    flatten: boolean;
  }) => {
    if (!pdfBytes) return;
    setLastExportOptions(options);
    setIsExportOptionsOpen(false);
    setIsProcessing(true);
    setProcessingStatus('Embedding annotations & finalizing PDF...');
    try {
      await new Promise((r) => setTimeout(r, 60));
      setProcessingStatus('Embedding vectors, signatures & fonts...');
      const bakedBytes = await bakeAnnotationsOnPdf(
        pdfBytes,
        annotations,
        directTextEdits,
        imageReplacements,
        rotation,
        {
          pageRange: options.pageRange,
          flattenAnnotations: options.flatten,
        }
      );
      setExportFileName(options.fileName);
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
        message: err?.message || 'Could not finalize document. Please retry.',
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

  // -------------------------------------------------------------
  // FIRST SCREEN: EMPTY STATE (No document loaded)
  // -------------------------------------------------------------
  if (!pdfBytes) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto">
        {/* Main Headline & Positioning */}
        <div className="text-center mb-8 max-w-2xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
            <FileText className="w-8 h-8" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">
            Edit your PDF <span className="gold-gradient-text">privately in your browser.</span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed mb-6">
            Add text, signatures, highlights and shapes without uploading your document. 100% private, instant, and processed locally on your device.
          </p>

          {/* Three-step visual workflow helper */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left p-4 rounded-2xl bg-[#0D0D14] border border-white/5 shadow-lg mb-6">
            <div className="flex items-start gap-2.5 p-2">
              <span className="w-6 h-6 rounded-full bg-brand-gold text-black font-extrabold text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <span className="font-bold text-white text-xs block">Choose a tool</span>
                <span className="text-[11px] text-zinc-400">Select text, signature, draw, or shapes</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2">
              <span className="w-6 h-6 rounded-full bg-brand-gold text-black font-extrabold text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <span className="font-bold text-white text-xs block">Click on the page</span>
                <span className="text-[11px] text-zinc-400">Draw, position or type directly on the PDF</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2">
              <span className="w-6 h-6 rounded-full bg-brand-gold text-black font-extrabold text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <span className="font-bold text-white text-xs block">Save &amp; Download</span>
                <span className="text-[11px] text-zinc-400">Download your finalized document instantly</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Card */}
        <div className="w-full max-w-2xl mb-8">
          <FileUploader
            title="Drop your PDF to start editing"
            subtitle="or choose a PDF from your computer or phone"
            onFilesSelected={handleFileSelected}
            showSampleButton={true}
          />
        </div>

        {/* Processing Modal */}
        <ProcessingModal
          isOpen={isProcessing}
          statusText={processingStatus}
          onCancel={() => setIsProcessing(false)}
        />

        {/* Password Decryption Modal */}
        {passwordModal.isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          >
            <div className="w-full max-w-sm bg-[#121218] border border-amber-500/40 rounded-3xl p-6 text-center shadow-2xl">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-brand-gold">
                <Lock className="w-6 h-6" />
              </div>
              <h2 id="password-modal-title" className="text-base font-bold text-white mb-1">
                Password Protected PDF
              </h2>
              <p className="text-xs text-zinc-400 mb-4">
                "{passwordModal.fileName}" is encrypted. Enter the password to open it.
              </p>

              {passwordModal.error && (
                <div className="mb-3 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {passwordModal.error}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter PDF password..."
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-gold"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPasswordModal({
                        isOpen: false,
                        fileBytes: null,
                        fileName: '',
                        error: null,
                      })
                    }
                    className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 rounded-xl bg-brand-gold text-black text-xs font-bold hover:brightness-110 shadow-gold-glow"
                  >
                    Unlock &amp; Edit
                  </button>
                </div>
              </form>

              <div className="mt-4 pt-3 border-t border-white/5">
                <Link
                  to="/unlock-pdf"
                  className="text-xs text-brand-gold hover:underline"
                >
                  Need to permanently remove password? Use PDF Unlocker →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Corrupted PDF Modal with Repair Link */}
        {corruptModal.isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="corrupt-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          >
            <div className="w-full max-w-md bg-[#121218] border border-rose-500/30 rounded-3xl p-6 text-center shadow-2xl">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h2 id="corrupt-modal-title" className="text-base font-bold text-white mb-1">
                Unable to Open PDF
              </h2>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                "{corruptModal.fileName}" could not be parsed by the browser PDF engine. {corruptModal.message}
              </p>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => setCorruptModal({ isOpen: false, fileName: '', message: '' })}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
                >
                  Choose Another File
                </button>
                <Link
                  to="/repair-pdf"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-brand-gold text-black text-xs font-bold hover:brightness-110 shadow-gold-glow"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Try PDF Repair</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE WORKSPACE (Document loaded)
  // -------------------------------------------------------------
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#09090C] overflow-hidden select-none">
      {/* Draft Recovery Notification Banner */}
      {pendingDraft && (
        <div className="bg-amber-500/15 border-b border-brand-gold/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200 z-30 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-gold" />
            <span className="font-semibold text-white">Unsaved edits found:</span>
            <span>We recovered {pendingDraft.count} annotations from your previous session for this file.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestoreDraft}
              className="px-3 py-1 rounded-lg bg-brand-gold text-black font-bold text-xs hover:brightness-110 transition"
            >
              Restore Edits
            </button>
            <button
              onClick={handleDismissDraft}
              className="px-2 py-1 text-zinc-400 hover:text-white transition"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Editor Bar */}
      <header className="h-14 bg-[#0C0C10] border-b border-white/10 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 shrink-0 z-30">
        {/* Left: Document title & Page Drawer toggle */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setIsThumbnailsOpen(!isThumbnailsOpen)}
            className={`p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
              isThumbnailsOpen ? 'bg-white/10 text-brand-gold' : ''
            }`}
            title="Toggle Page Thumbnails"
            aria-label="Toggle Page Thumbnails"
          >
            <Layers className="w-4 h-4" />
          </button>
          <div className="flex flex-col min-w-0">
            <span
              className="text-xs font-semibold text-zinc-200 truncate max-w-[120px] sm:max-w-[200px]"
              title={fileName}
            >
              {fileName}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {pageCount} {pageCount === 1 ? 'page' : 'pages'}
            </span>
          </div>
        </div>

        {/* Center: Page navigation & Zoom */}
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Page navigation */}
          <nav
            aria-label="Page Navigation"
            className="flex items-center bg-zinc-900/80 rounded-xl p-0.5 border border-white/5 text-xs text-zinc-300"
          >
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1}
              className="p-1.5 hover:text-white disabled:opacity-30 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded"
              title="First Page"
              aria-label="Go to First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 hover:text-white disabled:opacity-30 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded"
              title="Previous Page"
              aria-label="Go to Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px]" aria-live="polite">
              {currentPage} / {pageCount}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= pageCount}
              className="p-1.5 hover:text-white disabled:opacity-30 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded"
              title="Next Page"
              aria-label="Go to Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(pageCount)}
              disabled={currentPage >= pageCount}
              className="p-1.5 hover:text-white disabled:opacity-30 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded"
              title="Last Page"
              aria-label="Go to Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </nav>

          {/* Zoom controls */}
          <div className="hidden sm:flex items-center bg-zinc-900/80 rounded-xl p-0.5 border border-white/5 text-xs text-zinc-300">
            <button
              onClick={() => setScale((s) => s - 0.15)}
              className="p-1.5 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] min-w-[44px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => s + 0.15)}
              className="p-1.5 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setScale(1.0)}
              className={`px-1.5 py-0.5 hover:text-white transition border-l border-white/5 font-mono text-[10px] rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                scale === 1.0 ? 'text-brand-gold font-bold bg-white/5' : ''
              }`}
              title="100% Zoom (Ctrl+0)"
              aria-label="Reset Zoom to 100%"
            >
              100%
            </button>
            {fitToWidth && (
              <button
                onClick={fitToWidth}
                className="p-1.5 hover:text-white hover:bg-white/5 rounded transition border-l border-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                title="Fit to Width"
                aria-label="Fit Page to Width"
              >
                <FoldHorizontal className="w-3.5 h-3.5" />
              </button>
            )}
            {fitToPage && (
              <button
                onClick={fitToPage}
                className="p-1.5 hover:text-white hover:bg-white/5 rounded transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                title="Fit Page to Screen"
                aria-label="Fit Entire Page to Screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Undo, Redo, Search, Shortcuts & Save */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-lg text-zinc-400 hover:text-white disabled:opacity-20 hover:bg-white/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-lg text-zinc-400 hover:text-white disabled:opacity-20 hover:bg-white/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
              isSearchOpen ? 'text-brand-gold bg-white/10' : ''
            }`}
            title="Search in PDF (Ctrl+F)"
            aria-label="Search inside PDF"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Keyboard Shortcuts Trigger Button */}
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="hidden sm:flex p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            title="Shortcuts Help (?)"
            aria-label="Keyboard Shortcuts Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Properties Panel Toggle on mobile */}
          <button
            onClick={() => setIsPropertiesOpen(!isPropertiesOpen)}
            className="xl:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            title="Tool Properties"
            aria-label="Open Tool Properties"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Save & Download CTA Button */}
          <button
            onClick={() => setIsExportOptionsOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-gold text-black font-bold text-xs hover:brightness-110 shadow-gold-glow transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
            aria-label="Save and Download PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save &amp; Download</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Row */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Thumbnails Drawer */}
        <ThumbnailsSidebar isOpen={isThumbnailsOpen} onClose={() => setIsThumbnailsOpen(false)} />

        {/* Left Desktop Toolbar */}
        <div className="hidden md:flex">
          <EditorToolbar
            onOpenSignature={() => setIsSignatureOpen(true)}
            onImageSelected={handleImageSelected}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
            isMobile={false}
          />
        </div>

        {/* Center Canvas Area with Mode Helper Banner */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeTool === 'direct-text' && (
            <div className="bg-brand-gold/10 border-b border-brand-gold/20 px-4 py-2 flex items-center justify-between text-xs text-amber-200 z-20 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
                <span className="font-semibold text-brand-gold">Direct Text Edit Active:</span>
                <span>Click on any text in the PDF to edit it directly in place.</span>
              </div>
            </div>
          )}

          {activeTool === 'replace-image' && (
            <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-2 flex items-center justify-between text-xs text-blue-200 z-20 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="font-semibold text-blue-400">Image Replace Active:</span>
                <span>Drag a rectangle or click anywhere to replace an image on the page.</span>
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
                        aria-label={`Select color ${col}`}
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
                      aria-label="Pick custom color"
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
                    <label htmlFor="quick-font-size" className="text-zinc-400 text-[11px]">Size:</label>
                    <input
                      id="quick-font-size"
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
                    <label htmlFor="quick-stroke-size" className="text-zinc-400 text-[11px]">Stroke:</label>
                    <input
                      id="quick-stroke-size"
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
        </main>

        {/* Right Properties Panel (Desktop) */}
        <PropertiesPanel isMobile={false} />

        {/* Mobile Properties Drawer */}
        {isPropertiesOpen && (
          <PropertiesPanel isMobile={true} onClose={() => setIsPropertiesOpen(false)} />
        )}

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
                  aria-label="Close search"
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
                  aria-label="Search term in document"
                  className="w-full pl-3 pr-7 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-gold"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5"
                    title="Clear"
                    aria-label="Clear search input"
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
                aria-label="Previous match"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={nextSearchMatch}
                disabled={searchMatches.length === 0}
                className="p-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white hover:border-amber-500/40 disabled:opacity-40 disabled:hover:border-white/10 transition"
                title="Next match (Enter)"
                aria-label="Next match"
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
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          isMobile={true}
        />
      </div>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureOpen}
        onClose={() => setIsSignatureOpen(false)}
        onSaveSignature={handleSaveSignature}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Export Options Modal */}
      <ExportOptionsModal
        isOpen={isExportOptionsOpen}
        onClose={() => setIsExportOptionsOpen(false)}
        defaultFileName={fileName}
        pageCount={pageCount}
        annotationCount={annotations.length}
        directEditCount={directTextEdits.length}
        onConfirmExport={executeExport}
      />

      {/* Processing Modal with Cancel option */}
      <ProcessingModal
        isOpen={isProcessing}
        statusText={processingStatus}
        onCancel={() => setIsProcessing(false)}
      />

      {/* Result Modal with download and retry */}
      <ResultModal
        isOpen={Boolean(exportResult)}
        onClose={() => setExportResult(null)}
        resultData={exportResult}
        defaultFileName={exportFileName || sanitizeFilename(fileName, 'edited')}
        onReset={() => setExportResult(null)}
        onRetry={
          lastExportOptions
            ? () => executeExport(lastExportOptions)
            : undefined
        }
      />
    </div>
  );
};
