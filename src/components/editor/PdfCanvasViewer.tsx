import React, { useRef, useEffect, useState } from 'react';
import {
  Check,
  X,
  Trash2,
  RefreshCw,
  ImagePlus,
  FileEdit,
  Sparkles,
  Type,
} from 'lucide-react';
import { useEditorStore } from '../../stores/useEditorStore';
import {
  loadPdfDocument,
  renderPageToCanvas,
  getPageTextItemsWithCoords,
  extractMatchesFromTextItems,
  getWordClusters,
  getLineClusters,
  getParagraphClusters,
} from '../../pdf/pdfManager';
import {
  AnyAnnotation,
  TextAnnotation,
  DrawAnnotation,
  ShapeAnnotation,
  ImageAnnotation,
  ExtractedTextItem,
  DirectTextEdit,
  ImageReplacement,
  TextClusterInfo,
} from '../../types';

interface PdfCanvasViewerProps {
  onSelectAnnotation?: (id: string | null) => void;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({ onSelectAnnotation }) => {
  const {
    pdfBytes,
    currentPage,
    scale,
    rotation,
    activeTool,
    annotations,
    selectedAnnotationId,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    setSelectedAnnotationId,
    strokeColor,
    strokeWidth,
    textColor,
    fontSize,
    opacity,
    directTextEdits,
    addDirectTextEdit,
    removeDirectTextEdit,
    imageReplacements,
    addImageReplacement,
    removeImageReplacement,
    extractedPageTextItems,
    setExtractedPageTextItems,
    searchQuery,
    searchMatches,
    activeSearchMatchIndex,
    setActiveSearchMatchIndex,
    setScale,
    setFitHandlers,
  } = useEditorStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const [pageDims, setPageDims] = useState<{ width: number; height: number }>({ width: 595, height: 842 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [currentShapePreview, setCurrentShapePreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Dragging / Moving existing annotations (Text, Drawing, Shapes, Images)
  interface DragState {
    annotationId: string;
    startMouseX: number;
    startMouseY: number;
    startAnnX: number;
    startAnnY: number;
    originalPoints?: { x: number; y: number }[];
  }

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{
    scrollLeft: number;
    scrollTop: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const [hoveredAnnId, setHoveredAnnId] = useState<string | null>(null);

  // Direct Text Edit State
  const [directTextScope, setDirectTextScope] = useState<'word' | 'line' | 'paragraph'>('word');
  const [editingModal, setEditingModal] = useState<{
    id: string;
    originalText: string;
    newText: string;
    fontSize: number;
    color: string;
    backgroundColor: string;
    x: number;
    y: number;
    width: number;
    height: number;
    isExistingEdit: boolean;
    scope: 'word' | 'line' | 'paragraph';
    wordCluster?: TextClusterInfo;
    lineCluster?: TextClusterInfo;
    paragraphCluster?: TextClusterInfo;
  } | null>(null);

  // Image Replacement State
  const [pendingReplaceCoords, setPendingReplaceCoords] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [targetReplaceId, setTargetReplaceId] = useState<string | null>(null);

  // Compute search highlight rectangles on current page
  const pageSearchHighlights = React.useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return [];

    // 1. If global search indexed results across document, filter for this page
    if (searchMatches.length > 0) {
      const filtered = searchMatches.filter((m) => m.pageNumber === currentPage);
      if (filtered.length > 0) return filtered;
    }

    // 2. Otherwise calculate live matches instantly from extracted text items on this page
    if (extractedPageTextItems.length > 0) {
      return extractMatchesFromTextItems(extractedPageTextItems, searchQuery, currentPage);
    }

    return [];
  }, [searchQuery, searchMatches, currentPage, extractedPageTextItems]);

  // Compute clustered items for direct text editing based on selected scope (Word vs Line vs Paragraph)
  const displayedClusters = React.useMemo(() => {
    if (directTextScope === 'paragraph') {
      return getParagraphClusters(extractedPageTextItems);
    }
    if (directTextScope === 'line') {
      return getLineClusters(extractedPageTextItems);
    }
    return getWordClusters(extractedPageTextItems);
  }, [extractedPageTextItems, directTextScope]);

  // Smoothly scroll active search match into view
  useEffect(() => {
    if (activeSearchMatchIndex >= 0 && searchMatches.length > 0) {
      const activeMatch = searchMatches[activeSearchMatchIndex];
      if (activeMatch && activeMatch.pageNumber === currentPage) {
        const matchEl = document.getElementById(`search-highlight-${activeMatch.id}`);
        if (matchEl) {
          matchEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }
    }
  }, [activeSearchMatchIndex, searchMatches, currentPage]);

  // Register Fit to Width & Fit to Page handlers
  useEffect(() => {
    const fitToWidth = () => {
      if (!containerRef.current || pageDims.width === 0) return;
      const padding = window.innerWidth < 640 ? 32 : 64;
      const availableWidth = containerRef.current.clientWidth - padding;
      const unscaledWidth = pageDims.width / scale;
      if (unscaledWidth > 0 && availableWidth > 50) {
        const newScale = Math.min(Math.max(availableWidth / unscaledWidth, 0.25), 4.0);
        setScale(Number(newScale.toFixed(2)));
      }
    };

    const fitToPage = () => {
      if (!containerRef.current || pageDims.width === 0 || pageDims.height === 0) return;
      const padding = window.innerWidth < 640 ? 32 : 64;
      const availableWidth = containerRef.current.clientWidth - padding;
      const availableHeight = containerRef.current.clientHeight - padding;
      const unscaledWidth = pageDims.width / scale;
      const unscaledHeight = pageDims.height / scale;
      if (unscaledWidth > 0 && unscaledHeight > 0 && availableWidth > 50 && availableHeight > 50) {
        const newScale = Math.min(
          Math.max(
            Math.min(availableWidth / unscaledWidth, availableHeight / unscaledHeight),
            0.25
          ),
          4.0
        );
        setScale(Number(newScale.toFixed(2)));
      }
    };

    setFitHandlers({ fitToWidth, fitToPage });
    return () => {
      setFitHandlers(null);
    };
  }, [pageDims.width, pageDims.height, scale, setScale, setFitHandlers]);

  // Ctrl + Mouse Wheel for smooth zooming
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale((prev) => {
          const next = prev + delta;
          return Math.min(Math.max(Number(next.toFixed(2)), 0.25), 4.0);
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [setScale]);

  // Render base PDF page and extract text coordinates
  useEffect(() => {
    if (!pdfBytes || !pdfCanvasRef.current) return;

    let isCancelled = false;
    const renderPdf = async () => {
      try {
        const doc = await loadPdfDocument(pdfBytes);
        if (isCancelled || !pdfCanvasRef.current) return;

        const res = await renderPageToCanvas(
          doc,
          currentPage,
          pdfCanvasRef.current,
          scale,
          rotation
        );

        if (!isCancelled) {
          setPageDims({ width: res.width, height: res.height });
          if (overlayCanvasRef.current) {
            overlayCanvasRef.current.width = res.width;
            overlayCanvasRef.current.height = res.height;
          }

          // Extract text items with exact bounds for direct editing
          try {
            const textItems = await getPageTextItemsWithCoords(doc, currentPage, 1.0, rotation);
            if (!isCancelled) {
              setExtractedPageTextItems(textItems);
            }
          } catch (tErr) {
            console.warn('Failed extracting text items with coordinates:', tErr);
          }
        }
      } catch (err) {
        console.error('Error rendering PDF page canvas:', err);
      }
    };

    renderPdf();
    return () => {
      isCancelled = true;
    };
  }, [pdfBytes, currentPage, scale, rotation, setExtractedPageTextItems]);

  // Redraw overlays on overlay canvas whenever annotations or preview changes
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Filter annotations for current page
    const pageAnns = annotations.filter((a) => a.pageNumber === currentPage);

    for (const ann of pageAnns) {
      ctx.save();
      ctx.globalAlpha = ann.opacity;

      const isSelected = ann.id === selectedAnnotationId;

      if (ann.type === 'draw' || ann.type === 'highlight') {
        const drawAnn = ann as DrawAnnotation;
        if (drawAnn.points && drawAnn.points.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = ann.color;
          ctx.lineWidth = (drawAnn.strokeWidth || 3) * scale;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.moveTo(drawAnn.points[0].x * scale, drawAnn.points[0].y * scale);
          for (let i = 1; i < drawAnn.points.length; i++) {
            ctx.lineTo(drawAnn.points[i].x * scale, drawAnn.points[i].y * scale);
          }
          ctx.stroke();
        }
      } else if (ann.type === 'rect') {
        const s = ann as ShapeAnnotation;
        ctx.strokeStyle = s.strokeColor || '#D4AF37';
        ctx.lineWidth = (s.strokeWidth || 2) * scale;
        if (s.fillColor && s.fillColor !== 'transparent') {
          ctx.fillStyle = s.fillColor;
          ctx.fillRect(ann.x * scale, ann.y * scale, ann.width * scale, ann.height * scale);
        }
        ctx.strokeRect(ann.x * scale, ann.y * scale, ann.width * scale, ann.height * scale);
      } else if (ann.type === 'circle') {
        const s = ann as ShapeAnnotation;
        ctx.strokeStyle = s.strokeColor || '#D4AF37';
        ctx.lineWidth = (s.strokeWidth || 2) * scale;
        const radiusX = (ann.width * scale) / 2;
        const radiusY = (ann.height * scale) / 2;
        ctx.beginPath();
        ctx.ellipse(
          ann.x * scale + radiusX,
          ann.y * scale + radiusY,
          Math.abs(radiusX),
          Math.abs(radiusY),
          0,
          0,
          2 * Math.PI
        );
        ctx.stroke();
      } else if (ann.type === 'line' || ann.type === 'arrow') {
        const s = ann as ShapeAnnotation;
        ctx.strokeStyle = s.strokeColor || '#D4AF37';
        ctx.lineWidth = (s.strokeWidth || 2) * scale;
        ctx.beginPath();
        ctx.moveTo(ann.x * scale, ann.y * scale);
        ctx.lineTo((ann.x + ann.width) * scale, (ann.y + ann.height) * scale);
        ctx.stroke();
      }

      // Selected bounding box highlight
      if (isSelected) {
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
          ann.x * scale - 4,
          ann.y * scale - 4,
          ann.width * scale + 8,
          ann.height * scale + 8
        );
      }

      ctx.restore();
    }

    // Active freehand preview
    if (isDrawing && currentPoints.length > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = activeTool === 'highlight' ? 0.4 : opacity;
      ctx.lineWidth = (activeTool === 'highlight' ? 14 : strokeWidth) * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(currentPoints[0].x * scale, currentPoints[0].y * scale);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x * scale, currentPoints[i].y * scale);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Active shape or image replacement preview
    if (currentShapePreview) {
      ctx.save();
      ctx.strokeStyle = activeTool === 'replace-image' ? '#3B82F6' : strokeColor;
      ctx.lineWidth = (activeTool === 'replace-image' ? 2 : strokeWidth) * scale;
      ctx.globalAlpha = activeTool === 'replace-image' ? 0.9 : opacity;
      ctx.setLineDash([4, 4]);

      if (activeTool === 'rect' || activeTool === 'replace-image') {
        if (activeTool === 'replace-image') {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
          ctx.fillRect(
            currentShapePreview.x * scale,
            currentShapePreview.y * scale,
            currentShapePreview.w * scale,
            currentShapePreview.h * scale
          );
        }
        ctx.strokeRect(
          currentShapePreview.x * scale,
          currentShapePreview.y * scale,
          currentShapePreview.w * scale,
          currentShapePreview.h * scale
        );
      } else if (activeTool === 'circle') {
        ctx.beginPath();
        ctx.ellipse(
          (currentShapePreview.x + currentShapePreview.w / 2) * scale,
          (currentShapePreview.y + currentShapePreview.h / 2) * scale,
          Math.abs((currentShapePreview.w / 2) * scale),
          Math.abs((currentShapePreview.h / 2) * scale),
          0,
          0,
          2 * Math.PI
        );
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [
    annotations,
    currentPage,
    selectedAnnotationId,
    scale,
    isDrawing,
    currentPoints,
    currentShapePreview,
    activeTool,
    strokeColor,
    strokeWidth,
    opacity,
  ]);

  // Window-level dragging and canvas panning listeners
  useEffect(() => {
    if (!dragState && !isPanning) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      // Moving an annotation (Text, Draw, Shape, Image, Signature)
      if (dragState) {
        const canvas = overlayCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const currentMouseX = (clientX - rect.left) / scale;
        const currentMouseY = (clientY - rect.top) / scale;

        const dx = currentMouseX - dragState.startMouseX;
        const dy = currentMouseY - dragState.startMouseY;

        const newX = Math.round(dragState.startAnnX + dx);
        const newY = Math.round(dragState.startAnnY + dy);

        if (dragState.originalPoints && dragState.originalPoints.length > 0) {
          const newPoints = dragState.originalPoints.map((pt) => ({
            x: Math.round(pt.x + dx),
            y: Math.round(pt.y + dy),
          }));
          updateAnnotation(dragState.annotationId, {
            x: newX,
            y: newY,
            points: newPoints,
          } as any);
        } else {
          updateAnnotation(dragState.annotationId, {
            x: newX,
            y: newY,
          } as any);
        }
        return;
      }

      // Panning the document canvas with the Hand tool
      if (isPanning && panStart && containerRef.current) {
        const dx = clientX - panStart.clientX;
        const dy = clientY - panStart.clientY;
        containerRef.current.scrollLeft = panStart.scrollLeft - dx;
        containerRef.current.scrollTop = panStart.scrollTop - dy;
      }
    };

    const handlePointerUp = () => {
      setDragState(null);
      setIsPanning(false);
      setPanStart(null);
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: false });
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [dragState, isPanning, panStart, scale, updateAnnotation]);

  // Initiate dragging an existing annotation
  const startDragAnnotation = (
    ann: AnyAnnotation,
    clientX: number,
    clientY: number
  ) => {
    setSelectedAnnotationId(ann.id);
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (clientX - rect.left) / scale;
    const mouseY = (clientY - rect.top) / scale;

    const origPoints =
      (ann.type === 'draw' || ann.type === 'highlight') && (ann as DrawAnnotation).points
        ? (ann as DrawAnnotation).points.map((p) => ({ ...p }))
        : undefined;

    setDragState({
      annotationId: ann.id,
      startMouseX: mouseX,
      startMouseY: mouseY,
      startAnnX: ann.x,
      startAnnY: ann.y,
      originalPoints: origPoints,
    });
  };

  // Accurate hit testing for any annotation on current page
  const hitTestAnnotation = (x: number, y: number): AnyAnnotation | null => {
    const pageAnns = annotations.filter((a) => a.pageNumber === currentPage);
    for (let i = pageAnns.length - 1; i >= 0; i--) {
      const ann = pageAnns[i];
      const pad = 12;

      if (ann.type === 'draw' || ann.type === 'highlight') {
        const drawAnn = ann as DrawAnnotation;
        if (
          x >= ann.x - pad &&
          x <= ann.x + ann.width + pad &&
          y >= ann.y - pad &&
          y <= ann.y + ann.height + pad
        ) {
          if (drawAnn.points && drawAnn.points.length > 0) {
            const threshold = Math.max((drawAnn.strokeWidth || 4) + 12, 16);
            const near = drawAnn.points.some((pt) => {
              const d2 = (pt.x - x) ** 2 + (pt.y - y) ** 2;
              return d2 <= threshold * threshold;
            });
            if (near) return ann;
          } else {
            return ann;
          }
        }
      } else if (ann.type === 'line' || ann.type === 'arrow') {
        const x1 = ann.x;
        const y1 = ann.y;
        const x2 = ann.x + ann.width;
        const y2 = ann.y + ann.height;
        const lineLenSq = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        if (lineLenSq === 0) {
          if (Math.hypot(x - x1, y - y1) <= 16) return ann;
        } else {
          let t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / lineLenSq;
          t = Math.max(0, Math.min(1, t));
          const projX = x1 + t * (x2 - x1);
          const projY = y1 + t * (y2 - y1);
          if (Math.hypot(x - projX, y - projY) <= 16) return ann;
        }
      } else {
        if (
          x >= ann.x - pad &&
          x <= ann.x + ann.width + pad &&
          y >= ann.y - pad &&
          y <= ann.y + ann.height + pad
        ) {
          return ann;
        }
      }
    }
    return null;
  };

  // Mouse / Touch handlers for overlay
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCanvasCoords(e);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (activeTool === 'direct-text') {
      // Handled by text overlay elements
      return;
    }

    if (activeTool === 'replace-image') {
      setShapeStart(coords);
      setCurrentShapePreview({ x: coords.x, y: coords.y, w: 0, h: 0 });
      return;
    }

    if (activeTool === 'eraser') {
      const hit = hitTestAnnotation(coords.x, coords.y);
      if (hit) deleteAnnotation(hit.id);
      return;
    }

    // Both 'select' AND 'hand' can select and move existing annotations!
    if (activeTool === 'select' || activeTool === 'hand') {
      const hit = hitTestAnnotation(coords.x, coords.y);
      if (hit) {
        startDragAnnotation(hit, clientX, clientY);
        return;
      } else {
        setSelectedAnnotationId(null);
        if (activeTool === 'hand') {
          // Pan canvas when clicking blank area with Hand tool
          if (containerRef.current) {
            setIsPanning(true);
            setPanStart({
              scrollLeft: containerRef.current.scrollLeft,
              scrollTop: containerRef.current.scrollTop,
              clientX,
              clientY,
            });
          }
          return;
        }
      }
      return;
    }

    if (activeTool === 'text') {
      const id = Math.random().toString(36).substring(2, 9);
      const defaultText = prompt('Enter text to add:', 'Text overlay') || '';
      if (defaultText.trim()) {
        const newText: TextAnnotation = {
          id,
          pageNumber: currentPage,
          type: 'text',
          text: defaultText,
          x: coords.x,
          y: coords.y,
          width: defaultText.length * 10,
          height: fontSize * 1.3,
          fontSize,
          fontFamily: 'Helvetica',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
          color: textColor,
          opacity,
        };
        addAnnotation(newText);
      }
      return;
    }

    if (activeTool === 'draw' || activeTool === 'highlight') {
      setIsDrawing(true);
      setCurrentPoints([coords]);
      return;
    }

    if (['rect', 'circle', 'line', 'arrow'].includes(activeTool)) {
      setShapeStart(coords);
      setCurrentShapePreview({ x: coords.x, y: coords.y, w: 0, h: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCanvasCoords(e);

    // Freehand drawing in progress
    if (isDrawing) {
      setCurrentPoints((prev) => [...prev, coords]);
      return;
    }

    // Shape drawing in progress
    if (shapeStart) {
      const w = coords.x - shapeStart.x;
      const h = coords.y - shapeStart.y;
      setCurrentShapePreview({
        x: w < 0 ? coords.x : shapeStart.x,
        y: h < 0 ? coords.y : shapeStart.y,
        w: Math.abs(w),
        h: Math.abs(h),
      });
      return;
    }

    // Update hover feedback for annotations when using Hand or Select tools
    if (
      (activeTool === 'select' || activeTool === 'hand' || activeTool === 'eraser') &&
      !dragState &&
      !isPanning
    ) {
      const hit = hitTestAnnotation(coords.x, coords.y);
      setHoveredAnnId(hit ? hit.id : null);
    }
  };

  const handleMouseUp = () => {
    if (activeTool === 'replace-image' && shapeStart) {
      const minW = currentShapePreview && currentShapePreview.w > 20 ? currentShapePreview.w : 180;
      const minH = currentShapePreview && currentShapePreview.h > 20 ? currentShapePreview.h : 140;
      const posX = currentShapePreview && currentShapePreview.w > 20 ? currentShapePreview.x : Math.max(0, shapeStart.x - 90);
      const posY = currentShapePreview && currentShapePreview.h > 20 ? currentShapePreview.y : Math.max(0, shapeStart.y - 70);

      setTargetReplaceId(null);
      setPendingReplaceCoords({ x: posX, y: posY, width: minW, height: minH });
      setShapeStart(null);
      setCurrentShapePreview(null);
      replaceFileInputRef.current?.click();
      return;
    }

    if (isDrawing && currentPoints.length > 1) {
      const id = Math.random().toString(36).substring(2, 9);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of currentPoints) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }

      const drawAnn: DrawAnnotation = {
        id,
        pageNumber: currentPage,
        type: activeTool === 'highlight' ? 'highlight' : 'draw',
        points: currentPoints,
        x: minX,
        y: minY,
        width: Math.max(maxX - minX, 10),
        height: Math.max(maxY - minY, 10),
        strokeWidth: activeTool === 'highlight' ? 14 : strokeWidth,
        color: strokeColor,
        opacity: activeTool === 'highlight' ? 0.35 : opacity,
      };

      addAnnotation(drawAnn);
      setIsDrawing(false);
      setCurrentPoints([]);
    } else if (shapeStart && currentShapePreview && (currentShapePreview.w > 5 || currentShapePreview.h > 5)) {
      const id = Math.random().toString(36).substring(2, 9);
      const shapeAnn: ShapeAnnotation = {
        id,
        pageNumber: currentPage,
        type: activeTool as any,
        x: currentShapePreview.x,
        y: currentShapePreview.y,
        width: currentShapePreview.w,
        height: currentShapePreview.h,
        strokeWidth,
        strokeColor,
        fillColor: 'transparent',
        color: strokeColor,
        opacity,
      };
      addAnnotation(shapeAnn);
      setShapeStart(null);
      setCurrentShapePreview(null);
    } else {
      setShapeStart(null);
      setCurrentShapePreview(null);
      setIsDrawing(false);
      setCurrentPoints([]);
    }
  };

  // Image replacement file input change handler
  const handleReplaceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;

      if (targetReplaceId) {
        const existing = imageReplacements.find((r) => r.id === targetReplaceId);
        if (existing) {
          addImageReplacement({
            ...existing,
            dataUrl,
          });
        }
        setTargetReplaceId(null);
      } else if (pendingReplaceCoords) {
        addImageReplacement({
          id: Math.random().toString(36).substring(2, 9),
          pageNumber: currentPage,
          dataUrl,
          x: pendingReplaceCoords.x,
          y: pendingReplaceCoords.y,
          width: pendingReplaceCoords.width,
          height: pendingReplaceCoords.height,
        });
        setPendingReplaceCoords(null);
      }
    };
    reader.readAsDataURL(file);
    if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'hand' && e.button === 0) {
      const target = e.target as HTMLElement;
      if (
        target === containerRef.current ||
        target.getAttribute('data-scroll-area') === 'true'
      ) {
        setIsPanning(true);
        setPanStart({
          scrollLeft: containerRef.current ? containerRef.current.scrollLeft : 0,
          scrollTop: containerRef.current ? containerRef.current.scrollTop : 0,
          clientX: e.clientX,
          clientY: e.clientY,
        });
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleContainerMouseDown}
      className={`flex-1 overflow-auto canvas-container-bg relative select-none ${
        dragState || isPanning ? 'cursor-grabbing' : activeTool === 'hand' ? 'cursor-grab' : ''
      }`}
    >
      {/* Hidden file picker for image replacement */}
      <input
        ref={replaceFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleReplaceFileChange}
        className="hidden"
      />

      {/* Floating Direct Text Edit Tool Scope Selector */}
      {activeTool === 'direct-text' && (
        <div className="sticky top-4 left-0 right-0 z-30 flex justify-center pointer-events-none mb-[-42px]">
          <div className="pointer-events-auto bg-[#121218]/95 backdrop-blur-md border border-brand-gold/40 rounded-full px-4 py-1.5 shadow-2xl flex items-center gap-3 animate-fadeIn">
            <div className="flex items-center gap-1.5 text-xs text-brand-gold font-bold">
              <Type className="w-3.5 h-3.5" />
              <span>Direct Text Edit</span>
            </div>
            <div className="h-3 w-[1px] bg-white/20" />
            <div className="flex items-center bg-black/50 p-0.5 rounded-full border border-white/10 text-[11px]">
              <button
                type="button"
                onClick={() => setDirectTextScope('word')}
                className={`px-3 py-0.5 rounded-full transition font-semibold ${
                  directTextScope === 'word'
                    ? 'bg-brand-gold text-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Word Mode
              </button>
              <button
                type="button"
                onClick={() => setDirectTextScope('line')}
                className={`px-3 py-0.5 rounded-full transition font-semibold ${
                  directTextScope === 'line'
                    ? 'bg-brand-gold text-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Line Mode
              </button>
              <button
                type="button"
                onClick={() => setDirectTextScope('paragraph')}
                className={`px-3 py-0.5 rounded-full transition font-semibold ${
                  directTextScope === 'paragraph'
                    ? 'bg-brand-gold text-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Paragraph Mode
              </button>
            </div>
            <span className="text-[10px] text-zinc-400 hidden sm:inline">
              {directTextScope === 'word'
                ? 'Hover & click any word to edit'
                : directTextScope === 'line'
                ? 'Hover & click any line to edit'
                : 'Hover & click any paragraph to edit'}
            </span>
          </div>
        </div>
      )}

      {/* Centering & Scroll Area:
          min-w-full and min-h-full ensure it takes at least 100% of viewport.
          w-fit and h-fit ensure it expands when canvas is larger (zoomed in),
          so left, right, top, bottom edges are 100% scrollable and never clipped.
      */}
      <div
        data-scroll-area="true"
        className="min-w-full min-h-full w-fit h-fit flex p-4 sm:p-8 box-border"
      >
        <div
          className="m-auto relative shadow-2xl rounded-sm transition-all shrink-0"
          style={{
            width: `${pageDims.width}px`,
            height: `${pageDims.height}px`,
          }}
        >
        {/* PDF.js Page Canvas */}
        <canvas
          ref={pdfCanvasRef}
          className="absolute inset-0 bg-white pointer-events-none rounded-sm shadow-md"
        />

        {/* Render Direct Text Masking & Replaced Text (Always rendered so edits are visible) */}
        {directTextEdits
          .filter((e) => e.pageNumber === currentPage)
          .map((edit) => {
            const isToolActive = activeTool === 'direct-text';
            return (
              <React.Fragment key={edit.id}>
                {/* Background Mask to hide original text */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${edit.x * scale - 1}px`,
                    top: `${edit.y * scale - 1}px`,
                    width: `${edit.width * scale + 2}px`,
                    height: `${edit.height * scale + 2}px`,
                    backgroundColor: edit.backgroundColor || '#ffffff',
                    zIndex: 15,
                  }}
                />
                {/* Replacement Text */}
                <div
                  onClick={(e) => {
                    if (isToolActive) {
                      e.stopPropagation();
                      const words = getWordClusters(extractedPageTextItems);
                      const lines = getLineClusters(extractedPageTextItems);
                      const paras = getParagraphClusters(extractedPageTextItems);

                      const matchedWord =
                        words.find((w) => w.id === edit.id) ||
                        words.find((w) => Math.abs(w.x - edit.x) < 4 && Math.abs(w.y - edit.y) < 4);
                      const matchedLine =
                        lines.find((l) => l.id === edit.id) ||
                        matchedWord?.lineCluster ||
                        lines.find(
                          (l) => Math.abs(l.y - edit.y) < 6 && edit.x >= l.x - 5 && edit.x <= l.x + l.width + 5
                        );
                      const matchedPara =
                        paras.find((p) => p.id === edit.id) ||
                        matchedLine?.paragraphCluster ||
                        matchedWord?.paragraphCluster ||
                        paras.find((p) => edit.y >= p.y - 6 && edit.y <= p.y + p.height + 6);

                      setEditingModal({
                        id: edit.id,
                        originalText: edit.originalText,
                        newText: edit.newText,
                        fontSize: edit.fontSize,
                        color: edit.color,
                        backgroundColor: edit.backgroundColor,
                        x: edit.x,
                        y: edit.y,
                        width: edit.width,
                        height: edit.height,
                        isExistingEdit: true,
                        scope: edit.scope || 'word',
                        wordCluster: matchedWord,
                        lineCluster: matchedLine,
                        paragraphCluster: matchedPara,
                      });
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: `${edit.x * scale}px`,
                    top: `${edit.y * scale}px`,
                    width: `${edit.width * scale}px`,
                    minHeight: `${edit.height * scale}px`,
                    fontSize: `${edit.fontSize * scale}px`,
                    color: edit.color,
                    fontFamily:
                      edit.fontFamily ||
                      "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', Helvetica, Arial, sans-serif",
                    zIndex: 16,
                    lineHeight: 1.25,
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'break-word',
                  }}
                  className={`select-none ${
                    isToolActive
                      ? 'cursor-pointer ring-1 ring-brand-gold bg-amber-500/10 hover:ring-2 hover:bg-amber-500/20 rounded-xs transition-all'
                      : ''
                  }`}
                  title={isToolActive ? `Click to re-edit (Original: "${edit.originalText}")` : undefined}
                >
                  {edit.newText}
                </div>
              </React.Fragment>
            );
          })}

        {/* When activeTool === 'direct-text', show interactive highlight boxes over all unedited text clusters */}
        {activeTool === 'direct-text' &&
          displayedClusters
            .filter(
              (cluster) =>
                !directTextEdits.some(
                  (e) =>
                    e.pageNumber === currentPage &&
                    (e.id === cluster.id ||
                      (cluster.lineCluster && e.id === cluster.lineCluster.id) ||
                      (cluster.wordCluster && e.id === cluster.wordCluster.id) ||
                      (cluster.paragraphCluster && e.id === cluster.paragraphCluster.id))
                )
            )
            .map((cluster) => {
              let wordCl = cluster.wordCluster || (directTextScope === 'word' ? cluster : undefined);
              let lineCl = cluster.lineCluster || (directTextScope === 'line' ? cluster : undefined);
              const paraCl = cluster.paragraphCluster || (directTextScope === 'paragraph' ? cluster : undefined);

              return (
                <div
                  key={cluster.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!lineCl && directTextScope === 'paragraph') {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickY = (e.clientY - rect.top) / scale + cluster.y;
                      const lines = getLineClusters(extractedPageTextItems).filter(
                        (l) => l.paragraphCluster?.id === cluster.id
                      );
                      lineCl = lines.find((l) => clickY >= l.y - 4 && clickY <= l.y + l.height + 4) || lines[0];
                    }
                    if (!wordCl && (directTextScope === 'line' || directTextScope === 'paragraph')) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = (e.clientX - rect.left) / scale + cluster.x;
                      const clickY = (e.clientY - rect.top) / scale + cluster.y;
                      const words = getWordClusters(extractedPageTextItems).filter((w) =>
                        lineCl ? w.lineCluster?.id === lineCl.id : w.paragraphCluster?.id === cluster.id
                      );
                      wordCl =
                        words.find(
                          (w) =>
                            clickY >= w.y - 4 &&
                            clickY <= w.y + w.height + 4 &&
                            clickX >= w.x - 4 &&
                            clickX <= w.x + w.width + 4
                        ) || words[0];
                    }

                    setEditingModal({
                      id: cluster.id,
                      originalText: cluster.str,
                      newText: cluster.str,
                      fontSize: cluster.fontSize,
                      color: '#000000',
                      backgroundColor: '#ffffff',
                      x: cluster.x,
                      y: cluster.y,
                      width: cluster.width,
                      height: cluster.height,
                      isExistingEdit: false,
                      scope: directTextScope,
                      wordCluster: wordCl,
                      lineCluster: lineCl,
                      paragraphCluster: paraCl,
                    });
                  }}
                  style={{
                    position: 'absolute',
                    left: `${cluster.x * scale}px`,
                    top: `${cluster.y * scale}px`,
                    width: `${cluster.width * scale}px`,
                    height: `${cluster.height * scale}px`,
                    zIndex: 20,
                  }}
                  className="cursor-text border border-transparent bg-transparent hover:border-amber-400/90 hover:bg-amber-400/20 hover:shadow-xs rounded-xs transition-colors"
                  title={
                    directTextScope === 'word'
                      ? `Click to edit word: "${cluster.str}"`
                      : directTextScope === 'line'
                      ? `Click to edit line: "${cluster.str}"`
                      : `Click to edit paragraph: "${cluster.str.slice(0, 40)}${cluster.str.length > 40 ? '...' : ''}"`
                  }
                />
              );
            })}

        {/* Render Image Replacements */}
        {imageReplacements
          .filter((r) => r.pageNumber === currentPage)
          .map((rep) => {
            const isToolActive = activeTool === 'replace-image' || activeTool === 'select';
            return (
              <div
                key={rep.id}
                style={{
                  position: 'absolute',
                  left: `${rep.x * scale}px`,
                  top: `${rep.y * scale}px`,
                  width: `${rep.width * scale}px`,
                  height: `${rep.height * scale}px`,
                  zIndex: 14,
                }}
                className={`group relative bg-white shadow-sm ${
                  isToolActive ? 'ring-2 ring-brand-gold' : ''
                }`}
              >
                <img
                  src={rep.dataUrl}
                  alt="Replacement"
                  className="w-full h-full object-cover select-none"
                />

                {/* Hover control bar for replacement */}
                {isToolActive && (
                  <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-sm p-1 rounded-md border border-white/10 z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetReplaceId(rep.id);
                        replaceFileInputRef.current?.click();
                      }}
                      className="p-1 text-zinc-300 hover:text-white rounded hover:bg-white/10 transition"
                      title="Replace with new image"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImageReplacement(rep.id);
                      }}
                      className="p-1 text-red-400 hover:text-red-300 rounded hover:bg-red-500/10 transition"
                      title="Delete Replacement"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

        {/* Interactive Annotations & Drawing Canvas */}
        <canvas
          ref={overlayCanvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          className={`absolute inset-0 touch-none ${
            dragState
              ? 'cursor-grabbing'
              : isPanning
              ? 'cursor-grabbing'
              : hoveredAnnId && (activeTool === 'hand' || activeTool === 'select')
              ? 'cursor-grab'
              : activeTool === 'hand'
              ? 'cursor-grab'
              : activeTool === 'select'
              ? 'cursor-default'
              : activeTool === 'direct-text'
              ? 'cursor-text pointer-events-none'
              : activeTool === 'replace-image'
              ? 'cursor-crosshair'
              : activeTool === 'eraser'
              ? 'cursor-not-allowed'
              : 'cursor-crosshair'
          }`}
        />

        {/* Search Highlights Overlay Layer */}
        {pageSearchHighlights.length > 0 && (
          <div className="absolute inset-0 z-20 pointer-events-none">
            {pageSearchHighlights.map((match, idx) => {
              const isGlobalActive =
                activeSearchMatchIndex >= 0 &&
                searchMatches[activeSearchMatchIndex]?.id === match.id;
              const isFirstOrActive =
                isGlobalActive || (activeSearchMatchIndex === -1 && idx === 0);

              const padX = 2 * scale;
              const padY = 1.5 * scale;

              return (
                <div
                  key={match.id}
                  id={`search-highlight-${match.id}`}
                  style={{
                    position: 'absolute',
                    left: `${match.x * scale - padX}px`,
                    top: `${match.y * scale - padY}px`,
                    width: `${match.width * scale + padX * 2}px`,
                    height: `${match.height * scale + padY * 2}px`,
                    mixBlendMode: 'multiply',
                  }}
                  onClick={(e) => {
                    if (activeTool === 'select' || activeTool === 'hand') {
                      e.stopPropagation();
                      if (match.globalIndex !== undefined) {
                        setActiveSearchMatchIndex(match.globalIndex);
                      }
                    }
                  }}
                  className={`rounded-[3px] transition-all duration-150 ${
                    activeTool === 'select' || activeTool === 'hand'
                      ? 'pointer-events-auto cursor-pointer'
                      : 'pointer-events-none'
                  } ${
                    isFirstOrActive
                      ? 'bg-amber-400/85 border-2 border-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.95)] ring-2 ring-amber-400/60 animate-pulse'
                      : 'bg-yellow-300/55 border border-yellow-500/80 hover:bg-yellow-400/75 hover:border-yellow-600'
                  }`}
                  title={`Match ${match.matchIndexOnPage + 1}: "${match.text}"`}
                />
              );
            })}
          </div>
        )}

        {/* Render Text Annotations as interactive draggable and editable elements */}
        {annotations
          .filter(
            (a) =>
              a.pageNumber === currentPage &&
              (a.type === 'text' || a.type === 'image' || a.type === 'signature')
          )
          .map((ann) => {
            const isSelected = ann.id === selectedAnnotationId;
            const isDraggingThis = dragState?.annotationId === ann.id;
            const canMove = activeTool === 'hand' || activeTool === 'select' || isSelected;

            if (ann.type === 'text') {
              const t = ann as TextAnnotation;
              return (
                <div
                  key={ann.id}
                  onMouseDown={(e) => {
                    if (activeTool === 'eraser') {
                      e.stopPropagation();
                      deleteAnnotation(ann.id);
                      return;
                    }
                    if (canMove) {
                      e.stopPropagation();
                      startDragAnnotation(ann, e.clientX, e.clientY);
                    } else {
                      setSelectedAnnotationId(ann.id);
                    }
                  }}
                  onTouchStart={(e) => {
                    if (activeTool === 'eraser') {
                      e.stopPropagation();
                      deleteAnnotation(ann.id);
                      return;
                    }
                    if (canMove && e.touches[0]) {
                      e.stopPropagation();
                      startDragAnnotation(ann, e.touches[0].clientX, e.touches[0].clientY);
                    } else {
                      setSelectedAnnotationId(ann.id);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAnnotationId(ann.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const newText = prompt('Edit text:', t.text);
                    if (newText !== null) updateAnnotation(ann.id, { text: newText } as any);
                  }}
                  style={{
                    left: `${ann.x * scale}px`,
                    top: `${ann.y * scale}px`,
                    fontSize: `${(t.fontSize || 16) * scale}px`,
                    color: t.color,
                    opacity: t.opacity,
                    fontWeight: t.fontWeight,
                    fontStyle: t.fontStyle,
                  }}
                  className={`absolute select-none p-1 rounded transition-shadow z-30 ${
                    isDraggingThis
                      ? 'cursor-grabbing ring-2 ring-brand-gold bg-amber-500/20 shadow-2xl scale-105'
                      : canMove
                      ? activeTool === 'hand'
                        ? 'cursor-grab hover:ring-2 hover:ring-brand-gold/60'
                        : 'cursor-move hover:ring-2 hover:ring-brand-gold/60'
                      : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'ring-2 ring-brand-gold bg-amber-500/10 shadow-lg'
                      : ''
                  }`}
                  title="Click and drag with Hand or Select tool to move. Double-click to edit text."
                >
                  {t.text}
                </div>
              );
            }

            if (ann.type === 'image' || ann.type === 'signature') {
              const img = ann as ImageAnnotation;
              return (
                <div
                  key={ann.id}
                  onMouseDown={(e) => {
                    if (activeTool === 'eraser') {
                      e.stopPropagation();
                      deleteAnnotation(ann.id);
                      return;
                    }
                    if (canMove) {
                      e.stopPropagation();
                      startDragAnnotation(ann, e.clientX, e.clientY);
                    } else {
                      setSelectedAnnotationId(ann.id);
                    }
                  }}
                  onTouchStart={(e) => {
                    if (activeTool === 'eraser') {
                      e.stopPropagation();
                      deleteAnnotation(ann.id);
                      return;
                    }
                    if (canMove && e.touches[0]) {
                      e.stopPropagation();
                      startDragAnnotation(ann, e.touches[0].clientX, e.touches[0].clientY);
                    } else {
                      setSelectedAnnotationId(ann.id);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAnnotationId(ann.id);
                  }}
                  style={{
                    left: `${ann.x * scale}px`,
                    top: `${ann.y * scale}px`,
                    width: `${ann.width * scale}px`,
                    height: `${ann.height * scale}px`,
                    opacity: ann.opacity,
                  }}
                  className={`absolute select-none transition-shadow z-30 ${
                    isDraggingThis
                      ? 'cursor-grabbing ring-2 ring-brand-gold bg-amber-500/20 shadow-2xl scale-105'
                      : canMove
                      ? activeTool === 'hand'
                        ? 'cursor-grab hover:ring-2 hover:ring-brand-gold/60'
                        : 'cursor-move hover:ring-2 hover:ring-brand-gold/60'
                      : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'ring-2 ring-brand-gold bg-amber-500/10 shadow-lg'
                      : ''
                  }`}
                  title="Click and drag with Hand or Select tool to move."
                >
                  <img
                    src={img.dataUrl}
                    alt="Overlay"
                    className="w-full h-full object-contain pointer-events-none"
                  />
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Direct Text Edit Modal Dialog */}
      {editingModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setEditingModal(null)}
        >
          <div
            className="bg-[#121218] border border-white/10 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-gold"></span>
                <h3 className="text-sm font-bold text-white">
                  {editingModal.scope === 'paragraph'
                    ? 'Edit Paragraph'
                    : editingModal.scope === 'line'
                    ? 'Edit Entire Line'
                    : 'Edit Word'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold font-semibold uppercase tracking-wider">
                  {editingModal.scope === 'paragraph'
                    ? 'Paragraph Mode'
                    : editingModal.scope === 'line'
                    ? 'Line Mode'
                    : 'Word Mode'}
                </span>
                {editingModal.isExistingEdit && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">
                    Modified
                  </span>
                )}
              </div>
              <button
                onClick={() => setEditingModal(null)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scope Selection: Word vs Line vs Paragraph */}
            <div className="flex items-center justify-between pb-1">
              <label className="text-[11px] font-medium text-zinc-400">Selection Scope:</label>
              <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10 text-[11px]">
                <button
                  type="button"
                  disabled={!editingModal.wordCluster}
                  onClick={() => {
                    if (editingModal.wordCluster && editingModal.scope !== 'word') {
                      setEditingModal({
                        ...editingModal,
                        scope: 'word',
                        originalText: editingModal.wordCluster.str,
                        newText:
                          editingModal.newText === editingModal.originalText
                            ? editingModal.wordCluster.str
                            : editingModal.newText,
                        x: editingModal.wordCluster.x,
                        y: editingModal.wordCluster.y,
                        width: editingModal.wordCluster.width,
                        height: editingModal.wordCluster.height,
                        fontSize: editingModal.wordCluster.fontSize,
                      });
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    editingModal.scope === 'word'
                      ? 'bg-brand-gold text-black font-bold shadow-xs'
                      : 'text-zinc-400 hover:text-white disabled:opacity-30'
                  }`}
                >
                  Word
                </button>
                <button
                  type="button"
                  disabled={!editingModal.lineCluster}
                  onClick={() => {
                    if (editingModal.lineCluster && editingModal.scope !== 'line') {
                      setEditingModal({
                        ...editingModal,
                        scope: 'line',
                        originalText: editingModal.lineCluster.str,
                        newText:
                          editingModal.newText === editingModal.originalText
                            ? editingModal.lineCluster.str
                            : editingModal.newText,
                        x: editingModal.lineCluster.x,
                        y: editingModal.lineCluster.y,
                        width: editingModal.lineCluster.width,
                        height: editingModal.lineCluster.height,
                        fontSize: editingModal.lineCluster.fontSize,
                      });
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    editingModal.scope === 'line'
                      ? 'bg-brand-gold text-black font-bold shadow-xs'
                      : 'text-zinc-400 hover:text-white disabled:opacity-30'
                  }`}
                >
                  Line
                </button>
                <button
                  type="button"
                  disabled={!editingModal.paragraphCluster}
                  onClick={() => {
                    if (editingModal.paragraphCluster && editingModal.scope !== 'paragraph') {
                      setEditingModal({
                        ...editingModal,
                        scope: 'paragraph',
                        originalText: editingModal.paragraphCluster.str,
                        newText:
                          editingModal.newText === editingModal.originalText
                            ? editingModal.paragraphCluster.str
                            : editingModal.newText,
                        x: editingModal.paragraphCluster.x,
                        y: editingModal.paragraphCluster.y,
                        width: editingModal.paragraphCluster.width,
                        height: editingModal.paragraphCluster.height,
                        fontSize: editingModal.paragraphCluster.fontSize,
                      });
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    editingModal.scope === 'paragraph'
                      ? 'bg-brand-gold text-black font-bold shadow-xs'
                      : 'text-zinc-400 hover:text-white disabled:opacity-30'
                  }`}
                >
                  Paragraph
                </button>
              </div>
            </div>

            {/* Original Text Quote */}
            <div>
              <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Original PDF Text:</label>
              <div
                style={{ fontFamily: "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', sans-serif" }}
                className="text-xs text-zinc-200 bg-black/40 px-3 py-2 rounded-xl border border-white/5 font-medium break-words select-all max-h-28 overflow-y-auto"
              >
                "{editingModal.originalText}"
              </div>
            </div>

            {/* New Text Input */}
            <div>
              <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Replacement Text:</label>
              <textarea
                rows={editingModal.scope === 'paragraph' ? 6 : 3}
                value={editingModal.newText}
                onChange={(e) => setEditingModal({ ...editingModal, newText: e.target.value })}
                style={{ fontFamily: "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', sans-serif" }}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-gold resize-y min-h-[70px]"
                placeholder="Type replacement text..."
                autoFocus
              />
            </div>

            {/* Formatting: Font Size, Text Color, Background Color */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Font Size (pt):</label>
                <input
                  type="number"
                  min={6}
                  max={72}
                  value={Math.round(editingModal.fontSize)}
                  onChange={(e) =>
                    setEditingModal({
                      ...editingModal,
                      fontSize: Number(e.target.value) || 12,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Text Color:</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={editingModal.color}
                    onChange={(e) => setEditingModal({ ...editingModal, color: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-white/10"
                  />
                  <span className="text-[11px] font-mono text-zinc-400 uppercase">{editingModal.color}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 mb-1 block">
                Background Mask Color (Covers original text):
              </label>
              <div className="flex items-center gap-2">
                {[
                  { color: '#ffffff', label: 'White' },
                  { color: '#f4f4f5', label: 'Light Gray' },
                  { color: '#fef08a', label: 'Yellow' },
                  { color: '#09090c', label: 'Dark' },
                ].map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => setEditingModal({ ...editingModal, backgroundColor: item.color })}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition ${
                      editingModal.backgroundColor.toLowerCase() === item.color
                        ? 'border-brand-gold bg-white/10 text-white font-semibold'
                        : 'border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-black/20"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.label}</span>
                  </button>
                ))}
                <input
                  type="color"
                  value={editingModal.backgroundColor}
                  onChange={(e) => setEditingModal({ ...editingModal, backgroundColor: e.target.value })}
                  className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border border-white/10"
                  title="Custom Mask Color"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              {editingModal.isExistingEdit ? (
                <button
                  type="button"
                  onClick={() => {
                    removeDirectTextEdit(editingModal.id);
                    setEditingModal(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Restore Original</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingModal(null)}
                  className="px-3.5 py-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addDirectTextEdit({
                      id: editingModal.id,
                      pageNumber: currentPage,
                      originalText: editingModal.originalText,
                      newText: editingModal.newText,
                      x: editingModal.x,
                      y: editingModal.y,
                      width: editingModal.width,
                      height: editingModal.height,
                      fontSize: editingModal.fontSize,
                      fontFamily: "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', Helvetica, Arial, sans-serif",
                      color: editingModal.color,
                      backgroundColor: editingModal.backgroundColor,
                      scope: editingModal.scope,
                    });
                    setEditingModal(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-gold text-black font-semibold text-xs hover:brightness-110 shadow-gold-glow transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply Edit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
