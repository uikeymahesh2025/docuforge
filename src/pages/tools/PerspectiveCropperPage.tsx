import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  Maximize2,
  Download,
  RotateCw,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle2,
  FileText,
  Sliders,
  Image as ImageIcon,
  Palette,
  SunMedium,
  Check,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { FileUploader } from '../../components/tools/FileUploader';
import { loadPdfDocument } from '../../pdf/pdfManager';
import { useToastStore } from '../../stores/useToastStore';
import { sanitizeFilename, downloadBlob } from '../../utils/downloadHelpers';

interface Point {
  x: number;
  y: number;
}

type AspectPreset = 'auto' | 'a4' | 'letter';
type FilterPreset = 'magic-color' | 'clean-bw' | 'grayscale' | 'original';

export const PerspectiveCropperPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [file, setFile] = useState<File | null>(null);
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // 4 Quad Corners in natural image coordinates
  // Index 0: Top-Left, 1: Top-Right, 2: Bottom-Right, 3: Bottom-Left
  const [corners, setCorners] = useState<Point[]>([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ]);

  const [activeCorner, setActiveCorner] = useState<number | null>(null);
  const [aspectPreset, setAspectPreset] = useState<AspectPreset>('a4');
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('magic-color');
  const [rotation, setRotation] = useState<number>(0);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [flattenedDataUrl, setFlattenedDataUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load File (PDF page 1 or image)
  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setFlattenedDataUrl(null);
    setRotation(0);

    try {
      const isPdf = selected.name.toLowerCase().endsWith('.pdf') || selected.type === 'application/pdf';

      if (isPdf) {
        const buffer = await selected.arrayBuffer();
        const pdfDoc = await loadPdfDocument(new Uint8Array(buffer));
        const page1 = await pdfDoc.getPage(1);
        const viewport = page1.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page1.render({ canvasContext: ctx, viewport } as any).promise;
          const img = new Image();
          img.src = canvas.toDataURL('image/jpeg', 0.95);
          img.onload = () => initImage(img);
        }
      } else {
        const img = new Image();
        img.src = URL.createObjectURL(selected);
        img.onload = () => initImage(img);
      }

      addToast({
        type: 'success',
        title: 'Document Loaded',
        message: `${selected.name} loaded. Drag the 4 corner handles to align document boundaries.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Load Failed',
        message: err?.message || 'Could not load document.',
      });
    }
  };

  const initImage = (img: HTMLImageElement) => {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    setSourceImage(img);
    setNaturalSize({ width: w, height: h });

    // Initialize 4 corners with an intelligent 8% margin inset
    const insetX = w * 0.08;
    const insetY = h * 0.08;
    setCorners([
      { x: insetX, y: insetY }, // TL
      { x: w - insetX, y: insetY }, // TR
      { x: w - insetX, y: h - insetY }, // BR
      { x: insetX, y: h - insetY }, // BL
    ]);
  };

  const handleResetCorners = () => {
    if (!naturalSize.width || !naturalSize.height) return;
    const w = naturalSize.width;
    const h = naturalSize.height;
    const insetX = w * 0.06;
    const insetY = h * 0.06;
    setCorners([
      { x: insetX, y: insetY },
      { x: w - insetX, y: insetY },
      { x: w - insetX, y: h - insetY },
      { x: insetX, y: h - insetY },
    ]);
    addToast({
      type: 'info',
      title: 'Corners Reset',
      message: 'Quadrilateral handles reset to standard inset.',
    });
  };

  // Convert client mouse/touch point to image natural coordinate
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = naturalSize.width / rect.width;
    const scaleY = naturalSize.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const pt = getCanvasCoords(e);
    if (!pt || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const hitThreshold = (30 * naturalSize.width) / rect.width; // 30px screen radius

    let closestIdx = -1;
    let minDistance = Infinity;

    corners.forEach((c, idx) => {
      const dist = Math.hypot(c.x - pt.x, c.y - pt.y);
      if (dist < hitThreshold && dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    if (closestIdx !== -1) {
      setActiveCorner(closestIdx);
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (activeCorner === null) return;
    const pt = getCanvasCoords(e);
    if (!pt) return;

    // Constrain inside image boundaries
    const clampedX = Math.max(0, Math.min(naturalSize.width, pt.x));
    const clampedY = Math.max(0, Math.min(naturalSize.height, pt.y));

    setCorners((prev) => {
      const next = [...prev];
      next[activeCorner] = { x: clampedX, y: clampedY };
      return next;
    });
  };

  const handlePointerUp = () => {
    setActiveCorner(null);
  };

  // Render the image and corner handles to canvas
  const drawEditorCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImage || !naturalSize.width) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = naturalSize.width;
    canvas.height = naturalSize.height;

    // 1. Draw source image
    ctx.drawImage(sourceImage, 0, 0);

    // 2. Dim background outside quad
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Clip & redraw active quadrilateral in full brightness
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(sourceImage, 0, 0);
    ctx.restore();

    // 4. Draw quadrilateral stroke lines
    ctx.save();
    ctx.strokeStyle = '#D4AF37'; // Brand Gold
    ctx.lineWidth = Math.max(3, naturalSize.width / 300);
    ctx.setLineDash([Math.max(6, naturalSize.width / 150), Math.max(4, naturalSize.width / 200)]);
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // 5. Draw 4 draggable corner handles
    const colors = ['#10B981', '#38BDF8', '#A855F7', '#F59E0B']; // TL, TR, BR, BL
    const radius = Math.max(12, naturalSize.width / 60);

    corners.forEach((c, idx) => {
      ctx.save();
      // Outer ring
      ctx.beginPath();
      ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = colors[idx];
      ctx.fill();
      ctx.lineWidth = Math.max(3, radius / 4);
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(c.x, c.y, radius / 3, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.restore();
    });
  }, [sourceImage, naturalSize, corners]);

  useEffect(() => {
    drawEditorCanvas();
  }, [drawEditorCanvas]);

  // Perspective Warp Mesh Transform Engine (Subdivided Quad)
  const applyPerspectiveWarp = async () => {
    if (!sourceImage || !naturalSize.width) return;
    setIsProcessing(true);

    try {
      const [tl, tr, br, bl] = corners;

      // Calculate width & height of target flat rectangle
      const topW = Math.hypot(tr.x - tl.x, tr.y - tl.y);
      const bottomW = Math.hypot(br.x - bl.x, br.y - bl.y);
      const leftH = Math.hypot(bl.x - tl.x, bl.y - tl.y);
      const rightH = Math.hypot(br.x - tr.x, br.y - tr.y);

      let targetW = Math.round(Math.max(topW, bottomW));
      let targetH = Math.round(Math.max(leftH, rightH));

      if (aspectPreset === 'a4') {
        if (targetW > targetH) {
          targetH = Math.round(targetW / 1.414);
        } else {
          targetH = Math.round(targetW * 1.414);
        }
      } else if (aspectPreset === 'letter') {
        if (targetW > targetH) {
          targetH = Math.round(targetW / 1.294);
        } else {
          targetH = Math.round(targetW * 1.294);
        }
      }

      // Output canvas
      const destCanvas = document.createElement('canvas');
      destCanvas.width = targetW;
      destCanvas.height = targetH;
      const ctx = destCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize 2D context');

      // Grid mesh subdivision (16x16 cells) for bilinear / projective warping
      const SUBDIVS = 16;

      // Helper to interpolate quad point
      const lerpPoint = (u: number, v: number): Point => {
        const topX = tl.x + (tr.x - tl.x) * u;
        const topY = tl.y + (tr.y - tl.y) * u;
        const botX = bl.x + (br.x - bl.x) * u;
        const botY = bl.y + (br.y - bl.y) * u;
        return {
          x: topX + (botX - topX) * v,
          y: topY + (botY - topY) * v,
        };
      };

      // Helper to render an affine triangle from source to destination
      const drawTriangle = (
        p0: Point,
        p1: Point,
        p2: Point,
        d0: Point,
        d1: Point,
        d2: Point
      ) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(d0.x, d0.y);
        ctx.lineTo(d1.x, d1.y);
        ctx.lineTo(d2.x, d2.y);
        ctx.closePath();
        ctx.clip();

        // Calculate affine transformation matrix [a, b, c, d, e, f]
        const x0 = d0.x;
        const y0 = d0.y;
        const x1 = d1.x;
        const y1 = d1.y;
        const x2 = d2.x;
        const y2 = d2.y;

        const u0 = p0.x;
        const v0 = p0.y;
        const u1 = p1.x;
        const v1 = p1.y;
        const u2 = p2.x;
        const v2 = p2.y;

        const delta = u0 * (v1 - v2) - u1 * (v0 - v2) + u2 * (v0 - v1);
        if (Math.abs(delta) < 1e-6) {
          ctx.restore();
          return;
        }

        const a = (x0 * (v1 - v2) - x1 * (v0 - v2) + x2 * (v0 - v1)) / delta;
        const b = (y0 * (v1 - v2) - y1 * (v0 - v2) + y2 * (v0 - v1)) / delta;
        const c = (u0 * (x1 - x2) - u1 * (x0 - x2) + u2 * (x0 - x1)) / delta;
        const d = (u0 * (y1 - y2) - u1 * (y0 - y2) + u2 * (y0 - y1)) / delta;
        const e = (u0 * (v2 * x1 - v1 * x2) - v0 * (u2 * x1 - u1 * x2) + x0 * (u2 * v1 - u1 * v2)) / delta;
        const f = (u0 * (v2 * y1 - v1 * y2) - v0 * (u2 * y1 - u1 * y2) + y0 * (u2 * v1 - u1 * v2)) / delta;

        ctx.transform(a, b, c, d, e, f);
        ctx.drawImage(sourceImage, 0, 0);
        ctx.restore();
      };

      for (let i = 0; i < SUBDIVS; i++) {
        for (let j = 0; j < SUBDIVS; j++) {
          const u0 = i / SUBDIVS;
          const u1 = (i + 1) / SUBDIVS;
          const v0 = j / SUBDIVS;
          const v1 = (j + 1) / SUBDIVS;

          const pTL = lerpPoint(u0, v0);
          const pTR = lerpPoint(u1, v0);
          const pBL = lerpPoint(u0, v1);
          const pBR = lerpPoint(u1, v1);

          const dTL = { x: u0 * targetW, y: v0 * targetH };
          const dTR = { x: u1 * targetW, y: v0 * targetH };
          const dBL = { x: u0 * targetW, y: v1 * targetH };
          const dBR = { x: u1 * targetW, y: v1 * targetH };

          // Upper triangle
          drawTriangle(pTL, pTR, pBL, dTL, dTR, dBL);
          // Lower triangle
          drawTriangle(pTR, pBR, pBL, dTR, dBR, dBL);
        }
      }

      // Filter Enhancement Post-Processing
      if (filterPreset !== 'original') {
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imgData.data;

        for (let idx = 0; idx < data.length; idx += 4) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

          if (filterPreset === 'clean-bw') {
            // High contrast Otsu-style threshold for sharp printed text
            const threshold = 135;
            const val = luminance > threshold ? 255 : 0;
            data[idx] = val;
            data[idx + 1] = val;
            data[idx + 2] = val;
          } else if (filterPreset === 'grayscale') {
            data[idx] = luminance;
            data[idx + 1] = luminance;
            data[idx + 2] = luminance;
          } else if (filterPreset === 'magic-color') {
            // Boost document contrast and whiten paper background
            const boost = (val: number) => {
              if (val > 180) return Math.min(255, val * 1.12);
              if (val < 70) return Math.max(0, val * 0.85);
              return val;
            };
            data[idx] = boost(r);
            data[idx + 1] = boost(g);
            data[idx + 2] = boost(b);
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // Apply rotation if requested
      if (rotation !== 0) {
        const rotCanvas = document.createElement('canvas');
        if (rotation === 90 || rotation === 270) {
          rotCanvas.width = targetH;
          rotCanvas.height = targetW;
        } else {
          rotCanvas.width = targetW;
          rotCanvas.height = targetH;
        }
        const rotCtx = rotCanvas.getContext('2d');
        if (rotCtx) {
          rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
          rotCtx.rotate((rotation * Math.PI) / 180);
          rotCtx.drawImage(destCanvas, -targetW / 2, -targetH / 2);
          setFlattenedDataUrl(rotCanvas.toDataURL('image/jpeg', 0.92));
        }
      } else {
        setFlattenedDataUrl(destCanvas.toDataURL('image/jpeg', 0.92));
      }

      addToast({
        type: 'success',
        title: 'Perspective Flattened',
        message: 'Tilted photograph rectified into flat rectangular sheet.',
      });
    } catch (err: any) {
      console.error('Perspective warp failed:', err);
      addToast({
        type: 'error',
        title: 'Warp Failed',
        message: err?.message || 'Error occurred during perspective transform.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!flattenedDataUrl || !file) return;

    try {
      const pdfDoc = await PDFDocument.create();
      const imageBytes = await fetch(flattenedDataUrl).then((r) => r.arrayBuffer());
      const embedded = await pdfDoc.embedJpg(new Uint8Array(imageBytes));

      // A4 default
      let pageW = 595.28;
      let pageH = 841.89;

      if (embedded.width > embedded.height) {
        pageW = 841.89;
        pageH = 595.28;
      }

      const margin = 20;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;
      const scale = Math.min(usableW / embedded.width, usableH / embedded.height);

      const drawW = embedded.width * scale;
      const drawH = embedded.height * scale;

      const page = pdfDoc.addPage([pageW, pageH]);
      page.drawImage(embedded, {
        x: (pageW - drawW) / 2,
        y: (pageH - drawH) / 2,
        width: drawW,
        height: drawH,
      });

      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const filename = sanitizeFilename(file.name, 'flattened', 'pdf');
      downloadBlob(blob, filename);

      addToast({
        type: 'success',
        title: 'Flattened PDF Saved',
        message: `${filename} downloaded.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'PDF Export Failed',
        message: err?.message || 'Could not assemble PDF document.',
      });
    }
  };

  const handleDownloadJpg = () => {
    if (!flattenedDataUrl || !file) return;
    fetch(flattenedDataUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const filename = sanitizeFilename(file.name, 'flattened', 'jpg');
        downloadBlob(blob, filename);
        addToast({
          type: 'success',
          title: 'Flattened Image Saved',
          message: `${filename} downloaded.`,
        });
      });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-brand-gold/25 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-3">
          <Crop className="w-4 h-4" />
          Camera Scan Rectifier
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
          Perspective Auto-Crop & <span className="text-brand-gold">Document Flattener</span>
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto">
          Rectify tilted phone photos of receipts, notes, and certificates into flat, scanner-grade documents using 4-point perspective warp and paper background enhancement.
        </p>
      </div>

      {!file ? (
        <div className="max-w-3xl mx-auto">
          <FileUploader
            accept="image/*,.jpg,.jpeg,.png,.webp,.pdf,application/pdf"
            fileType="any"
            subtitle="Upload photos taken from angled phone cameras, tilted documents, or scanned receipts"
            onFilesSelected={handleFilesSelected}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 text-center">
              <div className="w-9 h-9 mx-auto rounded-lg bg-amber-500/10 text-brand-gold flex items-center justify-center mb-2">
                <Crop className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">4-Point Draggable Corners</h3>
              <p className="text-xs text-zinc-400 mt-1">Easily grab corners to enclose skewed document boundaries.</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 text-center">
              <div className="w-9 h-9 mx-auto rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">Bilinear Mesh Warp</h3>
              <p className="text-xs text-zinc-400 mt-1">High fidelity perspective unwarping rectifies tilt without geometric distortion.</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 text-center">
              <div className="w-9 h-9 mx-auto rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2">
                <SunMedium className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">Magic Scan Enhancement</h3>
              <p className="text-xs text-zinc-400 mt-1">Whiten dark shadowed backgrounds and boost text ink sharpness.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Interactive Canvas Quad Editor */}
          <div className="lg:col-span-7 space-y-3">
            <div className="bg-[#121216] border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Adjust 4 Corner Handles</span>
                  <span className="text-[10px] text-zinc-500">
                    ({naturalSize.width}x{naturalSize.height} px)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetCorners}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition-colors"
                  >
                    Reset Corners
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setSourceImage(null);
                      setFlattenedDataUrl(null);
                    }}
                    className="text-xs text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* Canvas viewport container */}
              <div
                ref={containerRef}
                className="relative rounded-lg overflow-hidden border border-zinc-800 bg-black/60 flex items-center justify-center min-h-[380px] touch-none select-none cursor-crosshair"
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                  className="max-w-full max-h-[500px] w-auto h-auto object-contain block"
                />
              </div>

              <p className="text-[11px] text-zinc-500 mt-2 text-center">
                Tip: Drag the 🟢 Top-Left, 🔵 Top-Right, 🟣 Bottom-Right, and 🟡 Bottom-Left circles directly to the document corners.
              </p>
            </div>
          </div>

          {/* Right: Flattening Options & Output Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#121216] border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider pb-2 border-b border-zinc-800">
                Warp & Enhancement Settings
              </h3>

              {/* Aspect Ratio Preset */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Output Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAspectPreset('a4')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
                      aspectPreset === 'a4'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold'
                        : 'bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    Standard A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectPreset('letter')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
                      aspectPreset === 'letter'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold'
                        : 'bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    US Letter
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectPreset('auto')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
                      aspectPreset === 'auto'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold'
                        : 'bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    Auto Bounds
                  </button>
                </div>
              </div>

              {/* Filter Enhancements */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Document Filter Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterPreset('magic-color')}
                    className={`p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                      filterPreset === 'magic-color'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold'
                        : 'bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span className="block text-xs font-semibold">✨ Magic Enhanced</span>
                    <span className="text-[10px] opacity-75">Boost contrast & whiten</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterPreset('clean-bw')}
                    className={`p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                      filterPreset === 'clean-bw'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold'
                        : 'bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span className="block text-xs font-semibold">📄 Clean B&W</span>
                    <span className="text-[10px] opacity-75">High-contrast text</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterPreset('grayscale')}
                    className={`p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                      filterPreset === 'grayscale'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold'
                        : 'bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span className="block text-xs font-semibold">🌑 Grayscale</span>
                    <span className="text-[10px] opacity-75">Smooth tonal gray</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterPreset('original')}
                    className={`p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                      filterPreset === 'original'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold'
                        : 'bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span className="block text-xs font-semibold">🎨 Original Color</span>
                    <span className="text-[10px] opacity-75">Unmodified hues</span>
                  </button>
                </div>
              </div>

              {/* Rotation */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <span className="text-xs text-zinc-300 font-medium">Rotate Orientation</span>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-1.5 transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate 90° ({rotation}°)</span>
                </button>
              </div>

              {/* Flatten Action Button */}
              <button
                type="button"
                onClick={applyPerspectiveWarp}
                disabled={isProcessing}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Unwarping Geometry...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Flatten & Rectify Document</span>
                  </>
                )}
              </button>
            </div>

            {/* Output Preview & Download */}
            {flattenedDataUrl && (
              <div className="bg-[#121216] border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Flattened Rectified Sheet
                  </span>
                  <span className="text-[11px] text-zinc-400">Ready to save</span>
                </div>

                <div className="rounded-lg overflow-hidden border border-zinc-700/60 bg-white p-1 max-h-56 flex items-center justify-center">
                  <img
                    src={flattenedDataUrl}
                    alt="Flattened document result"
                    className="max-h-52 w-auto object-contain"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="py-2.5 px-3 rounded-lg bg-gradient-to-r from-brand-gold to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save as PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadJpg}
                    className="py-2.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>Save as JPG</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
