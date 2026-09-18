import React, { useRef, useEffect, useState } from 'react';
import {
  Check,
  X,
  Trash2,
  RefreshCw,
  ImagePlus,
  FileEdit,
  Sparkles,
} from 'lucide-react';
import { useEditorStore } from '../../stores/useEditorStore';
import { loadPdfDocument, renderPageToCanvas, getPageTextItemsWithCoords } from '../../pdf/pdfManager';
import {
  AnyAnnotation,
  TextAnnotation,
  DrawAnnotation,
  ShapeAnnotation,
  ImageAnnotation,
  ExtractedTextItem,
  DirectTextEdit,
  ImageReplacement,
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

  // Dragging / Moving existing annotation
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Direct Text Edit State
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
  } | null>(null);

  // Image Replacement State
  const [pendingReplaceCoords, setPendingReplaceCoords] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [targetReplaceId, setTargetReplaceId] = useState<string | null>(null);

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
      ctx.strokeStyle = activeTool === 'highlight' ? '#FFFF00' : strokeColor;
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

    if (activeTool === 'direct-text') {
      // Handled by text overlay elements
      return;
    }

    if (activeTool === 'replace-image') {
      setShapeStart(coords);
      setCurrentShapePreview({ x: coords.x, y: coords.y, w: 0, h: 0 });
      return;
    }

    if (activeTool === 'select') {
      // Hit testing existing annotations
      const pageAnns = annotations.filter((a) => a.pageNumber === currentPage);
      const hit = [...pageAnns].reverse().find((ann) => {
        return (
          coords.x >= ann.x &&
          coords.x <= ann.x + ann.width &&
          coords.y >= ann.y &&
          coords.y <= ann.y + ann.height
        );
      });

      if (hit) {
        setSelectedAnnotationId(hit.id);
        setDraggingId(hit.id);
        setDragOffset({ x: coords.x - hit.x, y: coords.y - hit.y });
      } else {
        setSelectedAnnotationId(null);
      }
    } else if (activeTool === 'eraser') {
      const pageAnns = annotations.filter((a) => a.pageNumber === currentPage);
      const hit = [...pageAnns].reverse().find((ann) => {
        return (
          coords.x >= ann.x - 5 &&
          coords.x <= ann.x + ann.width + 5 &&
          coords.y >= ann.y - 5 &&
          coords.y <= ann.y + ann.height + 5
        );
      });
      if (hit) deleteAnnotation(hit.id);
    } else if (activeTool === 'text') {
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
    } else if (activeTool === 'draw' || activeTool === 'highlight') {
      setIsDrawing(true);
      setCurrentPoints([coords]);
    } else if (['rect', 'circle', 'line', 'arrow'].includes(activeTool)) {
      setShapeStart(coords);
      setCurrentShapePreview({ x: coords.x, y: coords.y, w: 0, h: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCanvasCoords(e);

    if (draggingId) {
      const ann = annotations.find((a) => a.id === draggingId);
      if (ann) {
        updateAnnotation(draggingId, {
          x: coords.x - dragOffset.x,
          y: coords.y - dragOffset.y,
        });
      }
    } else if (isDrawing) {
      setCurrentPoints((prev) => [...prev, coords]);
    } else if (shapeStart) {
      const w = coords.x - shapeStart.x;
      const h = coords.y - shapeStart.y;
      setCurrentShapePreview({
        x: w < 0 ? coords.x : shapeStart.x,
        y: h < 0 ? coords.y : shapeStart.y,
        w: Math.abs(w),
        h: Math.abs(h),
      });
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

    if (draggingId) {
      setDraggingId(null);
    } else if (isDrawing && currentPoints.length > 1) {
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
        color: activeTool === 'highlight' ? '#FFFF00' : strokeColor,
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

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8 canvas-container-bg relative select-none"
    >
      {/* Hidden file picker for image replacement */}
      <input
        ref={replaceFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleReplaceFileChange}
        className="hidden"
      />

      <div
        className="relative shadow-2xl rounded-sm transition-all"
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
                      });
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: `${edit.x * scale}px`,
                    top: `${edit.y * scale}px`,
                    fontSize: `${edit.fontSize * scale}px`,
                    color: edit.color,
                    fontFamily: edit.fontFamily || 'Helvetica, Arial, sans-serif',
                    zIndex: 16,
                    lineHeight: 1.15,
                    whiteSpace: 'pre',
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

        {/* When activeTool === 'direct-text', show interactive highlight boxes over all unedited text items */}
        {activeTool === 'direct-text' &&
          extractedPageTextItems
            .filter((item) => !directTextEdits.some((e) => e.pageNumber === currentPage && e.id === item.id))
            .map((item) => (
              <div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingModal({
                    id: item.id,
                    originalText: item.str,
                    newText: item.str,
                    fontSize: item.fontSize,
                    color: '#000000',
                    backgroundColor: '#ffffff',
                    x: item.x,
                    y: item.y,
                    width: item.width,
                    height: item.height,
                    isExistingEdit: false,
                  });
                }}
                style={{
                  position: 'absolute',
                  left: `${item.x * scale}px`,
                  top: `${item.y * scale}px`,
                  width: `${item.width * scale}px`,
                  height: `${item.height * scale}px`,
                  zIndex: 20,
                }}
                className="cursor-text border border-transparent hover:border-amber-400/80 hover:bg-amber-400/20 rounded-xs transition-colors"
                title={`Click to edit: "${item.str}"`}
              />
            ))}

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
            activeTool === 'select'
              ? 'cursor-default'
              : activeTool === 'hand'
              ? 'cursor-grab'
              : activeTool === 'direct-text'
              ? 'cursor-text pointer-events-none'
              : activeTool === 'replace-image'
              ? 'cursor-crosshair'
              : activeTool === 'eraser'
              ? 'cursor-not-allowed'
              : 'cursor-crosshair'
          }`}
        />

        {/* Render Text Annotations as interactive editable elements */}
        {annotations
          .filter((a) => a.pageNumber === currentPage && (a.type === 'text' || a.type === 'image' || a.type === 'signature'))
          .map((ann) => {
            const isSelected = ann.id === selectedAnnotationId;

            if (ann.type === 'text') {
              const t = ann as TextAnnotation;
              return (
                <div
                  key={ann.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAnnotationId(ann.id);
                  }}
                  onDoubleClick={() => {
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
                  className={`absolute cursor-move select-none p-1 rounded transition z-30 ${
                    isSelected ? 'ring-2 ring-brand-gold bg-amber-500/10' : 'hover:ring-1 hover:ring-zinc-400'
                  }`}
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
                  className={`absolute cursor-move select-none transition z-30 ${
                    isSelected ? 'ring-2 ring-brand-gold bg-amber-500/10' : 'hover:ring-1 hover:ring-zinc-400'
                  }`}
                >
                  <img src={img.dataUrl} alt="Overlay" className="w-full h-full object-contain pointer-events-none" />
                </div>
              );
            }
            return null;
          })}
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
                <h3 className="text-sm font-bold text-white">Direct PDF Text Edit</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-gold/20 text-brand-gold font-semibold">
                  {editingModal.isExistingEdit ? 'Edited' : 'Original Text'}
                </span>
              </div>
              <button
                onClick={() => setEditingModal(null)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Original Text Quote */}
            <div>
              <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Original PDF Text:</label>
              <div className="text-xs text-zinc-300 bg-black/40 px-3 py-2 rounded-xl border border-white/5 font-mono break-words select-all">
                "{editingModal.originalText}"
              </div>
            </div>

            {/* New Text Input */}
            <div>
              <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Replacement Text:</label>
              <textarea
                rows={3}
                value={editingModal.newText}
                onChange={(e) => setEditingModal({ ...editingModal, newText: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-gold resize-none"
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
                      fontFamily: 'Helvetica, Arial, sans-serif',
                      color: editingModal.color,
                      backgroundColor: editingModal.backgroundColor,
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
