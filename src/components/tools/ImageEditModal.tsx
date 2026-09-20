import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  RotateCw,
  RotateCcw,
  Crop as CropIcon,
  Wand2,
  Sliders,
  Check,
  RotateCcw as ResetIcon,
  Sparkles,
  Maximize2,
  Square,
  FileText,
} from 'lucide-react';
import {
  Point,
  QuadPoints,
  CropRect,
  rotateImage,
  cropImage,
  autoDetectDocumentQuad,
  defaultQuad,
  warpPerspective,
  applyDocumentFilter,
  loadImage,
} from '../../utils/imageProcessor';

interface ImageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: {
    id: string;
    name: string;
    dataUrl: string;
    width: number;
    height: number;
  } | null;
  onSave: (updated: {
    id: string;
    name: string;
    dataUrl: string;
    width: number;
    height: number;
  }) => void;
}

type TabType = 'perspective' | 'crop' | 'rotate' | 'filter';

export const ImageEditModal: React.FC<ImageEditModalProps> = ({
  isOpen,
  onClose,
  image,
  onSave,
}) => {
  if (!isOpen || !image) return null;

  // Working state (current processed image dataUrl)
  const [currentDataUrl, setCurrentDataUrl] = useState<string>(image.dataUrl);
  const [currentDims, setCurrentDims] = useState<{ width: number; height: number }>({
    width: image.width,
    height: image.height,
  });
  const [activeTab, setActiveTab] = useState<TabType>('perspective');
  const [isBusy, setIsBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState('');

  // Auto Perspective quad state (in native image coordinates)
  const [quad, setQuad] = useState<QuadPoints>(() => defaultQuad(image.width, image.height));
  const [activeCorner, setActiveCorner] = useState<'tl' | 'tr' | 'br' | 'bl' | null>(null);

  // Crop state (in native image coordinates)
  const [cropRect, setCropRect] = useState<CropRect>({
    x: Math.round(image.width * 0.05),
    y: Math.round(image.height * 0.05),
    width: Math.round(image.width * 0.9),
    height: Math.round(image.height * 0.9),
  });
  const [cropAspect, setCropAspect] = useState<'free' | '1:1' | 'A4-p' | 'A4-l' | '4:3' | '16:9'>('free');
  const [activeCropHandle, setActiveCropHandle] = useState<string | null>(null);
  const [cropDragStart, setCropDragStart] = useState<{ mouseX: number; mouseY: number; rect: CropRect } | null>(null);

  // Rotate state
  const [fineAngle, setFineAngle] = useState(0);

  // Active filter
  const [activeFilter, setActiveFilter] = useState<'none' | 'magic' | 'bw' | 'grayscale'>('none');

  // Preview container references for scaling coordinate mapping
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const [displayScale, setDisplayScale] = useState({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });

  // Reset when image changes
  useEffect(() => {
    setCurrentDataUrl(image.dataUrl);
    setCurrentDims({ width: image.width, height: image.height });
    const def = defaultQuad(image.width, image.height);
    setQuad(def);
    setCropRect({
      x: Math.round(image.width * 0.05),
      y: Math.round(image.height * 0.05),
      width: Math.round(image.width * 0.9),
      height: Math.round(image.height * 0.9),
    });
    setFineAngle(0);
    setActiveFilter('none');
    setActiveTab('perspective');
  }, [image]);

  // Update display scale mapping whenever preview image loads or window resizes
  const updateDisplayScale = () => {
    if (!previewImgRef.current || !previewContainerRef.current) return;
    const imgEl = previewImgRef.current;
    const rect = imgEl.getBoundingClientRect();
    const containerRect = previewContainerRef.current.getBoundingClientRect();

    setDisplayScale({
      scaleX: rect.width / currentDims.width,
      scaleY: rect.height / currentDims.height,
      offsetX: rect.left - containerRect.left,
      offsetY: rect.top - containerRect.top,
    });
  };

  useEffect(() => {
    updateDisplayScale();
    window.addEventListener('resize', updateDisplayScale);
    return () => window.removeEventListener('resize', updateDisplayScale);
  }, [currentDataUrl, currentDims]);

  // 1. AUTO PERSPECTIVE / STRAIGHTEN
  const handleAutoDetect = async () => {
    setIsBusy(true);
    setBusyMessage('Detecting document boundaries...');
    try {
      const img = await loadImage(currentDataUrl);
      const detected = autoDetectDocumentQuad(img);
      setQuad(detected);
    } catch (err) {
      console.error('Auto detect failed:', err);
    } finally {
      setIsBusy(false);
    }
  };

  const handleApplyPerspective = async () => {
    setIsBusy(true);
    setBusyMessage('Straightening document & warping perspective...');
    try {
      const result = await warpPerspective(currentDataUrl, quad);
      setCurrentDataUrl(result.dataUrl);
      setCurrentDims({ width: result.width, height: result.height });
      setQuad(defaultQuad(result.width, result.height));
      setCropRect({
        x: Math.round(result.width * 0.05),
        y: Math.round(result.height * 0.05),
        width: Math.round(result.width * 0.9),
        height: Math.round(result.height * 0.9),
      });
    } catch (err: any) {
      alert('Perspective correction error: ' + err.message);
    } finally {
      setIsBusy(false);
    }
  };

  // 2. ROTATE HANDLERS
  const handleRotateStep = async (deg: number) => {
    setIsBusy(true);
    setBusyMessage(`Rotating ${deg}°...`);
    try {
      const result = await rotateImage(currentDataUrl, deg);
      setCurrentDataUrl(result.dataUrl);
      setCurrentDims({ width: result.width, height: result.height });
      setQuad(defaultQuad(result.width, result.height));
      setCropRect({
        x: Math.round(result.width * 0.05),
        y: Math.round(result.height * 0.05),
        width: Math.round(result.width * 0.9),
        height: Math.round(result.height * 0.9),
      });
    } catch (err: any) {
      alert('Rotation error: ' + err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleApplyFineRotation = async () => {
    if (fineAngle === 0) return;
    setIsBusy(true);
    setBusyMessage(`Applying ${fineAngle}° rotation...`);
    try {
      const result = await rotateImage(currentDataUrl, fineAngle);
      setCurrentDataUrl(result.dataUrl);
      setCurrentDims({ width: result.width, height: result.height });
      setFineAngle(0);
      setQuad(defaultQuad(result.width, result.height));
    } catch (err: any) {
      alert('Fine rotation error: ' + err.message);
    } finally {
      setIsBusy(false);
    }
  };

  // 3. CROP HANDLERS
  const handleApplyCrop = async () => {
    setIsBusy(true);
    setBusyMessage('Cropping image...');
    try {
      const result = await cropImage(currentDataUrl, cropRect);
      setCurrentDataUrl(result.dataUrl);
      setCurrentDims({ width: result.width, height: result.height });
      setQuad(defaultQuad(result.width, result.height));
      setCropRect({
        x: Math.round(result.width * 0.05),
        y: Math.round(result.height * 0.05),
        width: Math.round(result.width * 0.9),
        height: Math.round(result.height * 0.9),
      });
    } catch (err: any) {
      alert('Crop error: ' + err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSetAspect = (aspect: typeof cropAspect) => {
    setCropAspect(aspect);
    const { width: w, height: h } = currentDims;
    let targetRatio = 1;
    if (aspect === 'A4-p') targetRatio = 1 / 1.414;
    else if (aspect === 'A4-l') targetRatio = 1.414;
    else if (aspect === '1:1') targetRatio = 1;
    else if (aspect === '4:3') targetRatio = 4 / 3;
    else if (aspect === '16:9') targetRatio = 16 / 9;
    else return;

    let newW = w * 0.85;
    let newH = newW / targetRatio;
    if (newH > h * 0.85) {
      newH = h * 0.85;
      newW = newH * targetRatio;
    }
    setCropRect({
      x: Math.round((w - newW) / 2),
      y: Math.round((h - newH) / 2),
      width: Math.round(newW),
      height: Math.round(newH),
    });
  };

  // 4. FILTER HANDLERS
  const handleFilterSelect = async (filter: typeof activeFilter) => {
    setActiveFilter(filter);
    setIsBusy(true);
    setBusyMessage('Applying filter...');
    try {
      const result = await applyDocumentFilter(currentDataUrl, filter);
      setCurrentDataUrl(result);
    } catch (err: any) {
      alert('Filter error: ' + err.message);
    } finally {
      setIsBusy(false);
    }
  };

  // Reset to initial original image
  const handleReset = () => {
    setCurrentDataUrl(image.dataUrl);
    setCurrentDims({ width: image.width, height: image.height });
    setQuad(defaultQuad(image.width, image.height));
    setCropRect({
      x: Math.round(image.width * 0.05),
      y: Math.round(image.height * 0.05),
      width: Math.round(image.width * 0.9),
      height: Math.round(image.height * 0.9),
    });
    setFineAngle(0);
    setActiveFilter('none');
  };

  // Save changes
  const handleSave = () => {
    onSave({
      id: image.id,
      name: image.name,
      dataUrl: currentDataUrl,
      width: currentDims.width,
      height: currentDims.height,
    });
    onClose();
  };

  // Screen-to-Image Coordinate mapping for Perspective pins & Crop handles
  const handlePointerDownCorner = (corner: 'tl' | 'tr' | 'br' | 'bl') => {
    setActiveCorner(corner);
  };

  useEffect(() => {
    if (!activeCorner) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!previewImgRef.current || !activeCorner) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const imgRect = previewImgRef.current.getBoundingClientRect();
      const normX = Math.max(0, Math.min(clientX - imgRect.left, imgRect.width));
      const normY = Math.max(0, Math.min(clientY - imgRect.top, imgRect.height));

      const imgX = Math.round((normX / imgRect.width) * currentDims.width);
      const imgY = Math.round((normY / imgRect.height) * currentDims.height);

      setQuad((prev) => ({
        ...prev,
        [activeCorner]: { x: imgX, y: imgY },
      }));
    };

    const handlePointerUp = () => {
      setActiveCorner(null);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [activeCorner, currentDims]);

  // Convert image coord (x, y) to container preview pixel coord
  const toDisplayCoord = (pt: Point) => {
    return {
      x: pt.x * displayScale.scaleX + displayScale.offsetX,
      y: pt.y * displayScale.scaleY + displayScale.offsetY,
    };
  };

  const tlDisp = toDisplayCoord(quad.tl);
  const trDisp = toDisplayCoord(quad.tr);
  const brDisp = toDisplayCoord(quad.br);
  const blDisp = toDisplayCoord(quad.bl);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-50 animate-fadeIn">
      <div className="bg-[#121218] border border-white/10 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0C0C12]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Enhance &amp; Straighten Image</span>
                <span className="text-[10px] font-mono font-normal text-zinc-400 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                  {currentDims.width} × {currentDims.height}px
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400 truncate max-w-xs sm:max-w-md">{image.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium border border-white/10 flex items-center gap-1.5 transition"
              title="Reset all changes to original"
            >
              <ResetIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Controls Bar */}
        <div className="bg-[#161620] px-4 py-2 border-b border-white/10 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-[#0C0C12] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('perspective')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'perspective'
                  ? 'bg-brand-gold text-black shadow-gold-glow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Auto Perspective</span>
            </button>

            <button
              onClick={() => setActiveTab('crop')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'crop'
                  ? 'bg-brand-gold text-black shadow-gold-glow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <CropIcon className="w-3.5 h-3.5" />
              <span>Crop</span>
            </button>

            <button
              onClick={() => setActiveTab('rotate')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'rotate'
                  ? 'bg-brand-gold text-black shadow-gold-glow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate</span>
            </button>

            <button
              onClick={() => setActiveTab('filter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'filter'
                  ? 'bg-brand-gold text-black shadow-gold-glow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>

          {/* Context Tab Actions */}
          {activeTab === 'perspective' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoDetect}
                disabled={isBusy}
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-brand-gold/30 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                <span>⚡ Auto Detect</span>
              </button>
              <button
                onClick={handleApplyPerspective}
                disabled={isBusy}
                className="px-3.5 py-1.5 rounded-xl bg-brand-gold text-black text-xs font-bold hover:brightness-110 shadow-gold-glow flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Straighten Document</span>
              </button>
            </div>
          )}

          {activeTab === 'crop' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-[#0C0C12] p-1 rounded-lg border border-white/10 text-xs">
                {(['free', '1:1', 'A4-p', 'A4-l', '4:3', '16:9'] as const).map((asp) => (
                  <button
                    key={asp}
                    onClick={() => handleSetAspect(asp)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      cropAspect === asp ? 'bg-white/20 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {asp === 'free' ? 'Free' : asp === 'A4-p' ? 'A4 📄' : asp === 'A4-l' ? 'A4 📃' : asp}
                  </button>
                ))}
              </div>
              <button
                onClick={handleApplyCrop}
                disabled={isBusy}
                className="px-3.5 py-1.5 rounded-xl bg-brand-gold text-black text-xs font-bold hover:brightness-110 shadow-gold-glow flex items-center gap-1.5 transition active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Crop</span>
              </button>
            </div>
          )}

          {activeTab === 'rotate' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRotateStep(-90)}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs flex items-center gap-1"
                title="Rotate 90° Left"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>90° Left</span>
              </button>
              <button
                onClick={() => handleRotateStep(90)}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs flex items-center gap-1"
                title="Rotate 90° Right"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>90° Right</span>
              </button>
              <button
                onClick={() => handleRotateStep(180)}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs flex items-center gap-1"
                title="Flip 180°"
              >
                <span>180°</span>
              </button>
            </div>
          )}

          {activeTab === 'filter' && (
            <div className="flex items-center gap-1.5 text-xs">
              {(['none', 'magic', 'bw', 'grayscale'] as const).map((flt) => (
                <button
                  key={flt}
                  onClick={() => handleFilterSelect(flt)}
                  className={`px-3 py-1.5 rounded-lg font-semibold border transition ${
                    activeFilter === flt
                      ? 'border-brand-gold bg-amber-500/10 text-brand-gold shadow-gold-glow'
                      : 'border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {flt === 'none'
                    ? 'Original'
                    : flt === 'magic'
                    ? '⚡ Magic Scan'
                    : flt === 'bw'
                    ? 'B&W Document'
                    : 'Grayscale'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Viewport Canvas Center */}
        <div
          ref={previewContainerRef}
          className="flex-1 bg-[#09090D] relative overflow-hidden flex items-center justify-center p-4 select-none"
        >
          {/* Main Image */}
          <img
            ref={previewImgRef}
            src={currentDataUrl}
            alt="Preview"
            onLoad={updateDisplayScale}
            className="max-h-full max-w-full object-contain rounded shadow-lg pointer-events-none"
            style={{
              transform: activeTab === 'rotate' && fineAngle !== 0 ? `rotate(${fineAngle}deg)` : undefined,
              transition: activeTab === 'rotate' ? 'transform 0.1s ease' : undefined,
            }}
          />

          {/* Perspective Interactive Quad Pins & Polygon Overlay */}
          {activeTab === 'perspective' && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ overflow: 'visible' }}
            >
              {/* Semi-transparent mask over excluded area */}
              <defs>
                <mask id="quad-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <polygon
                    points={`${tlDisp.x},${tlDisp.y} ${trDisp.x},${trDisp.y} ${brDisp.x},${brDisp.y} ${blDisp.x},${blDisp.y}`}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#quad-mask)" />

              {/* Polygon Outline */}
              <polygon
                points={`${tlDisp.x},${tlDisp.y} ${trDisp.x},${trDisp.y} ${brDisp.x},${brDisp.y} ${blDisp.x},${blDisp.y}`}
                fill="rgba(212, 175, 55, 0.12)"
                stroke="#D4AF37"
                strokeWidth="2.5"
                strokeDasharray="6 4"
              />
            </svg>
          )}

          {/* Interactive 4 Corner Pin Handles */}
          {activeTab === 'perspective' && (
            <>
              {/* Top-Left */}
              <div
                onMouseDown={() => handlePointerDownCorner('tl')}
                onTouchStart={() => handlePointerDownCorner('tl')}
                style={{ left: tlDisp.x, top: tlDisp.y }}
                className="absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full bg-brand-gold border-2 border-white shadow-xl cursor-move flex items-center justify-center text-[9px] font-extrabold text-black hover:scale-125 transition-transform"
                title="Drag Top-Left Corner"
              >
                TL
              </div>
              {/* Top-Right */}
              <div
                onMouseDown={() => handlePointerDownCorner('tr')}
                onTouchStart={() => handlePointerDownCorner('tr')}
                style={{ left: trDisp.x, top: trDisp.y }}
                className="absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full bg-brand-gold border-2 border-white shadow-xl cursor-move flex items-center justify-center text-[9px] font-extrabold text-black hover:scale-125 transition-transform"
                title="Drag Top-Right Corner"
              >
                TR
              </div>
              {/* Bottom-Right */}
              <div
                onMouseDown={() => handlePointerDownCorner('br')}
                onTouchStart={() => handlePointerDownCorner('br')}
                style={{ left: brDisp.x, top: brDisp.y }}
                className="absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full bg-brand-gold border-2 border-white shadow-xl cursor-move flex items-center justify-center text-[9px] font-extrabold text-black hover:scale-125 transition-transform"
                title="Drag Bottom-Right Corner"
              >
                BR
              </div>
              {/* Bottom-Left */}
              <div
                onMouseDown={() => handlePointerDownCorner('bl')}
                onTouchStart={() => handlePointerDownCorner('bl')}
                style={{ left: blDisp.x, top: blDisp.y }}
                className="absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full bg-brand-gold border-2 border-white shadow-xl cursor-move flex items-center justify-center text-[9px] font-extrabold text-black hover:scale-125 transition-transform"
                title="Drag Bottom-Left Corner"
              >
                BL
              </div>
            </>
          )}

          {/* Crop Bounding Box Overlay */}
          {activeTab === 'crop' && (
            <div
              style={{
                left: cropRect.x * displayScale.scaleX + displayScale.offsetX,
                top: cropRect.y * displayScale.scaleY + displayScale.offsetY,
                width: cropRect.width * displayScale.scaleX,
                height: cropRect.height * displayScale.scaleY,
              }}
              className="absolute border-2 border-brand-gold bg-amber-500/10 shadow-2xl pointer-events-none"
            >
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-brand-gold border border-white rounded-full pointer-events-auto cursor-nwse-resize" />
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-brand-gold border border-white rounded-full pointer-events-auto cursor-nesw-resize" />
              <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-brand-gold border border-white rounded-full pointer-events-auto cursor-nesw-resize" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-brand-gold border border-white rounded-full pointer-events-auto cursor-nwse-resize" />
            </div>
          )}

          {/* Busy Loading Overlay */}
          {isBusy && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
              <div className="w-9 h-9 border-3 border-brand-gold border-t-transparent rounded-full animate-spin shadow-gold-glow" />
              <p className="text-xs font-semibold text-amber-200">{busyMessage}</p>
            </div>
          )}
        </div>

        {/* Fine Angle Slider (when in Rotate mode) */}
        {activeTab === 'rotate' && (
          <div className="px-6 py-2.5 bg-[#121218] border-t border-white/10 flex items-center justify-between gap-4 text-xs text-zinc-300">
            <span className="text-zinc-400 font-medium">Fine Angle Level:</span>
            <div className="flex-1 flex items-center gap-3">
              <span className="font-mono text-zinc-500 w-8 text-right">-45°</span>
              <input
                type="range"
                min="-45"
                max="45"
                value={fineAngle}
                onChange={(e) => setFineAngle(parseInt(e.target.value, 10))}
                className="flex-1 accent-brand-gold cursor-pointer"
              />
              <span className="font-mono text-zinc-500 w-8">+45°</span>
            </div>
            <span className="font-mono font-bold text-brand-gold w-12 text-center">
              {fineAngle > 0 ? `+${fineAngle}°` : `${fineAngle}°`}
            </span>
            <button
              onClick={handleApplyFineRotation}
              disabled={fineAngle === 0 || isBusy}
              className="px-3 py-1.5 rounded-lg bg-brand-gold text-black font-semibold text-xs hover:brightness-110 disabled:opacity-30 transition"
            >
              Apply Angle
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#0C0C12] flex items-center justify-between shrink-0">
          <div className="text-xs text-zinc-400 flex items-center gap-2">
            {activeTab === 'perspective' && (
              <span>Tip: Click <strong>⚡ Auto Detect</strong> or drag the 4 corner handles to align with the paper edges.</span>
            )}
            {activeTab === 'crop' && (
              <span>Tip: Drag the crop box or choose an aspect ratio preset to trim margins.</span>
            )}
            {activeTab === 'rotate' && (
              <span>Tip: Use 90° buttons or the fine angle slider to align crooked photos.</span>
            )}
            {activeTab === 'filter' && (
              <span>Tip: <strong>Magic Scan</strong> automatically enhances document contrast and cleans paper background.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-brand-gold text-black text-xs font-bold hover:brightness-110 shadow-gold-glow flex items-center gap-1.5 transition active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Save &amp; Update Image</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
