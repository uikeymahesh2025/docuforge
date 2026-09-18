import { create } from 'zustand';
import { EditorTool, AnyAnnotation } from '../types';

interface EditorState {
  pdfBytes: Uint8Array | null;
  fileName: string;
  pageCount: number;
  currentPage: number;
  scale: number;
  rotation: number;
  activeTool: EditorTool;
  selectedAnnotationId: string | null;
  annotations: AnyAnnotation[];
  history: AnyAnnotation[][];
  historyIndex: number;
  isSearching: boolean;
  searchQuery: string;

  // Tool customization properties
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  opacity: number;

  // Actions
  setPdf: (bytes: Uint8Array, fileName: string, pageCount: number) => void;
  resetEditor: () => void;
  setCurrentPage: (page: number) => void;
  setScale: (scale: number | ((prev: number) => number)) => void;
  setRotation: (rot: number | ((prev: number) => number)) => void;
  setActiveTool: (tool: EditorTool) => void;
  setSelectedAnnotationId: (id: string | null) => void;
  
  // Customization setters
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setStrokeWidth: (w: number) => void;
  setFontSize: (s: number) => void;
  setFontFamily: (f: string) => void;
  setTextColor: (color: string) => void;
  setOpacity: (o: number) => void;
  setIsSearching: (val: boolean) => void;
  setSearchQuery: (query: string) => void;

  // History & Annotations
  addAnnotation: (ann: AnyAnnotation) => void;
  updateAnnotation: (id: string, patch: Partial<AnyAnnotation>) => void;
  deleteAnnotation: (id: string) => void;
  undo: () => void;
  redo: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  pdfBytes: null,
  fileName: 'document.pdf',
  pageCount: 0,
  currentPage: 1,
  scale: 1.0,
  rotation: 0,
  activeTool: 'select',
  selectedAnnotationId: null,
  annotations: [],
  history: [[]],
  historyIndex: 0,
  isSearching: false,
  searchQuery: '',

  strokeColor: '#D4AF37', // UIKEY AI gold accent default
  fillColor: 'transparent',
  strokeWidth: 3,
  fontSize: 18,
  fontFamily: 'Helvetica, Arial, sans-serif',
  textColor: '#000000',
  opacity: 1,

  setPdf: (bytes, fileName, pageCount) => {
    set({
      pdfBytes: bytes,
      fileName,
      pageCount,
      currentPage: 1,
      scale: 1.0,
      rotation: 0,
      annotations: [],
      history: [[]],
      historyIndex: 0,
      selectedAnnotationId: null,
    });
  },

  resetEditor: () => {
    set({
      pdfBytes: null,
      fileName: 'document.pdf',
      pageCount: 0,
      currentPage: 1,
      annotations: [],
      history: [[]],
      historyIndex: 0,
      selectedAnnotationId: null,
    });
  },

  setCurrentPage: (page) => {
    const { pageCount } = get();
    if (page >= 1 && page <= pageCount) {
      set({ currentPage: page, selectedAnnotationId: null });
    }
  },

  setScale: (scaleOrFn) => {
    const nextScale = typeof scaleOrFn === 'function' ? scaleOrFn(get().scale) : scaleOrFn;
    const clamped = Math.min(Math.max(nextScale, 0.25), 4.0);
    set({ scale: Number(clamped.toFixed(2)) });
  },

  setRotation: (rotOrFn) => {
    const nextRot = typeof rotOrFn === 'function' ? rotOrFn(get().rotation) : rotOrFn;
    set({ rotation: (nextRot % 360 + 360) % 360 });
  },

  setActiveTool: (tool) => set({ activeTool: tool, selectedAnnotationId: null }),
  setSelectedAnnotationId: (id) => set({ selectedAnnotationId: id }),

  setStrokeColor: (strokeColor) => set({ strokeColor }),
  setFillColor: (fillColor) => set({ fillColor }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setFontSize: (fontSize) => set({ fontSize }),
  setFontFamily: (fontFamily) => set({ fontFamily }),
  setTextColor: (textColor) => set({ textColor }),
  setOpacity: (opacity) => set({ opacity }),
  setIsSearching: (isSearching) => set({ isSearching }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  addAnnotation: (ann) => {
    const { annotations, history, historyIndex } = get();
    const nextAnnotations = [...annotations, ann];
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(nextAnnotations);

    set({
      annotations: nextAnnotations,
      history: nextHistory,
      historyIndex: nextHistory.length - 1,
      selectedAnnotationId: ann.id,
    });
  },

  updateAnnotation: (id, patch) => {
    const { annotations, history, historyIndex } = get();
    const nextAnnotations = annotations.map((a) => (a.id === id ? ({ ...a, ...patch } as AnyAnnotation) : a));
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(nextAnnotations);

    set({
      annotations: nextAnnotations,
      history: nextHistory,
      historyIndex: nextHistory.length - 1,
    });
  },

  deleteAnnotation: (id) => {
    const { annotations, history, historyIndex } = get();
    const nextAnnotations = annotations.filter((a) => a.id !== id);
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(nextAnnotations);

    set({
      annotations: nextAnnotations,
      history: nextHistory,
      historyIndex: nextHistory.length - 1,
      selectedAnnotationId: null,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      set({
        historyIndex: prevIndex,
        annotations: history[prevIndex],
        selectedAnnotationId: null,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      set({
        historyIndex: nextIndex,
        annotations: history[nextIndex],
        selectedAnnotationId: null,
      });
    }
  },
}));
