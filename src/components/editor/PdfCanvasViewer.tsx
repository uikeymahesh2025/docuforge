import React, { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '../../stores/useEditorStore';
import { loadPdfDocument, renderPageToCanvas } from '../../pdf/pdfManager';
import { AnyAnnotation, TextAnnotation, DrawAnnotation, ShapeAnnotation, ImageAnnotation } from '../../types';

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
  } = useEditorStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [pageDims, setPageDims] = useState<{ width: number; height: number }>({ width: 595, height: 842 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [currentShapePreview, setCurrentShapePreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Dragging / Moving existing annotation
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Render base PDF page
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
        }
      } catch (err) {
        console.error('Error rendering PDF page canvas:', err);
      }
    };

    renderPdf();
    return () => {
      isCancelled = true;
    };
  }, [pdfBytes, currentPage, scale, rotation]);

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

    // Active shape preview
    if (currentShapePreview) {
      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth * scale;
      ctx.globalAlpha = opacity;
      ctx.setLineDash([3, 3]);

      if (activeTool === 'rect') {
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

    if (activeTool === 'select') {
      // Hit testing existing annotations
      const pageAnns = annotations.filter((a) => a.pageNumber === currentPage);
      // Reverse to hit top items first
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

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8 canvas-container-bg relative select-none"
    >
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
                  className={`absolute cursor-move select-none p-1 rounded transition ${
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
                  className={`absolute cursor-move select-none transition ${
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
    </div>
  );
};
