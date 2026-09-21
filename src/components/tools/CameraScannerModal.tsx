import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  X,
  RotateCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  Wand2,
  Plus,
  RefreshCw,
  Zap,
  ZapOff,
} from 'lucide-react';
import {
  Point,
  QuadPoints,
  defaultQuad,
  autoDetectDocumentQuad,
  warpPerspective,
  rotateImage,
  loadImage,
} from '../../utils/imageProcessor';

export interface ScannedPage {
  id: string;
  name: string;
  originalDataUrl: string;
  currentDataUrl: string;
  width: number;
  height: number;
  rotation: number;
  mode: 'default' | 'perspective';
  quad: QuadPoints;
}

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (pages: { id: string; name: string; dataUrl: string; width: number; height: number }[]) => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  // 1. Stream Lifecycle strictly via useRef (NO STATE RE-RENDERS)
  const streamRef = useRef<MediaStream | null>(null);
  const facingModeRef = useRef<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  // Pages scanned
  const [pages, setPages] = useState<ScannedPage[]>([]);
  // Active view: null means live camera viewfinder, otherwise index of inspected page
  const [activePageIndex, setActivePageIndex] = useState<number | null>(null);

  // Perspective drag state for currently inspected page
  const [activeCorner, setActiveCorner] = useState<'tl' | 'tr' | 'br' | 'bl' | null>(null);
  const [isProcessingPage, setIsProcessingPage] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [displayScale, setDisplayScale] = useState({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });

  // 4. Cleanup helper to safely stop all media tracks
  const stopMediaTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
  }, []);

  // 2. Simple Video Attachment (NO STATE RE-RENDERS):
  // When stream is acquired, attach directly to videoRef with onloadedmetadata
  const attachStreamToVideo = useCallback((stream: MediaStream) => {
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(() => {});
      };
    }
  }, []);

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser or connection.');
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      attachStreamToVideo(stream);
    } catch (err: any) {
      setCameraError(err?.message || 'Unable to access camera. Please allow camera permissions.');
    }
  }, [attachStreamToVideo]);

  // 4. Strict lifecycle: stream acquired on mount, full cleanup on unmount
  useEffect(() => {
    let isCancelled = false;

    const init = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported by your browser or connection.');
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: facingModeRef.current },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        attachStreamToVideo(stream);
      } catch (err: any) {
        if (!isCancelled) {
          setCameraError(err?.message || 'Unable to access camera. Please allow camera permissions.');
        }
      }
    };

    init();

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [attachStreamToVideo]);

  // Switch camera facing mode
  const handleFlipCamera = async () => {
    const nextMode = facingModeRef.current === 'environment' ? 'user' : 'environment';
    facingModeRef.current = nextMode;
    setTorchOn(false);
    await startCamera(nextMode);
  };

  // Toggle torch / flashlight safely without webcam driver lockup
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (!videoTrack) return;
      try {
        if (typeof (videoTrack as any).getCapabilities === 'function') {
          const caps = (videoTrack as any).getCapabilities();
          if (caps && !caps.torch) {
            console.warn('Torch not supported by webcam driver');
            return;
          }
        }
      } catch (capErr) {
        console.warn('getCapabilities error suppressed safely:', capErr);
      }
      const nextState = !torchOn;
      await (videoTrack as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Torch toggle failed or unsupported:', err);
    }
  };

  // Close modal and terminate camera
  const handleClose = () => {
    stopMediaTracks();
    onClose();
  };

  // Shutter Capture
  const handleCapture = async () => {
    if (!videoRef.current || isCapturing) return;
    const video = videoRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    setIsCapturing(true);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 150);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      const newPage: ScannedPage = {
        id: Math.random().toString(36).substring(2, 9),
        name: `Scanned Page ${pages.length + 1}.jpg`,
        originalDataUrl: dataUrl,
        currentDataUrl: dataUrl,
        width: canvas.width,
        height: canvas.height,
        rotation: 0,
        mode: 'default',
        quad: defaultQuad(canvas.width, canvas.height),
      };

      setPages((prev) => [...prev, newPage]);
    } catch (err) {
      console.error('Capture frame error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Active page selection
  const activePage = activePageIndex !== null ? pages[activePageIndex] : null;

  // Toggle mode for inspected page (Default vs Auto Perspective / Crop)
  const handleTogglePageMode = async (mode: 'default' | 'perspective') => {
    if (activePageIndex === null || !activePage) return;
    if (mode === 'perspective' && activePage.mode === 'default') {
      try {
        const img = await loadImage(activePage.currentDataUrl);
        const detected = autoDetectDocumentQuad(img);
        setPages((prev) =>
          prev.map((p, idx) => (idx === activePageIndex ? { ...p, mode, quad: detected } : p))
        );
        return;
      } catch (err) {
        console.warn('Auto perspective detection error:', err);
      }
    }
    setPages((prev) =>
      prev.map((p, idx) => (idx === activePageIndex ? { ...p, mode } : p))
    );
  };

  // Rotate inspected or tray page
  const handleRotatePage = async (idx: number) => {
    const target = pages[idx];
    if (!target) return;

    try {
      const res = await rotateImage(target.currentDataUrl, 90);
      const newQuad = defaultQuad(res.width, res.height);

      setPages((prev) =>
        prev.map((p, i) =>
          i === idx
            ? {
                ...p,
                currentDataUrl: res.dataUrl,
                originalDataUrl: res.dataUrl,
                width: res.width,
                height: res.height,
                rotation: (p.rotation + 90) % 360,
                quad: newQuad,
              }
            : p
        )
      );
    } catch (err) {
      console.error('Rotate failed:', err);
    }
  };

  // Re-detect perspective boundaries for inspected page
  const handleReDetectQuad = async () => {
    if (activePageIndex === null || !activePage) return;
    setIsProcessingPage(true);
    setProcessingMsg('Auto-detecting document boundaries...');
    try {
      const img = await loadImage(activePage.currentDataUrl);
      const detected = autoDetectDocumentQuad(img);
      setPages((prev) =>
        prev.map((p, i) => (i === activePageIndex ? { ...p, quad: detected } : p))
      );
    } catch (err) {
      console.error('Auto detect error:', err);
    } finally {
      setIsProcessingPage(false);
    }
  };

  // Reset quad to full margin bounds
  const handleResetQuad = () => {
    if (activePageIndex === null || !activePage) return;
    const def = defaultQuad(activePage.width, activePage.height);
    setPages((prev) =>
      prev.map((p, i) => (i === activePageIndex ? { ...p, quad: def } : p))
    );
  };

  // Delete page
  const handleDeletePage = (idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPages((prev) => prev.filter((_, i) => i !== idx));
    if (activePageIndex === idx) {
      setActivePageIndex(null); // return to viewfinder
    } else if (activePageIndex !== null && activePageIndex > idx) {
      setActivePageIndex(activePageIndex - 1);
    }
  };

  // Reorder pages
  const handleMovePage = (idx: number, dir: 'left' | 'right', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetIdx = dir === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= pages.length) return;

    setPages((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });

    if (activePageIndex === idx) {
      setActivePageIndex(targetIdx);
    } else if (activePageIndex === targetIdx) {
      setActivePageIndex(idx);
    }
  };

  // Update display scale for SVG polygon overlay
  const updateDisplayScale = () => {
    if (!previewImgRef.current || !previewContainerRef.current || !activePage) return;
    const imgEl = previewImgRef.current;
    const rect = imgEl.getBoundingClientRect();
    const containerRect = previewContainerRef.current.getBoundingClientRect();

    setDisplayScale({
      scaleX: rect.width / activePage.width,
      scaleY: rect.height / activePage.height,
      offsetX: rect.left - containerRect.left,
      offsetY: rect.top - containerRect.top,
    });
  };

  useEffect(() => {
    updateDisplayScale();
    window.addEventListener('resize', updateDisplayScale);
    return () => window.removeEventListener('resize', updateDisplayScale);
  }, [activePageIndex, activePage?.currentDataUrl, activePage?.width, activePage?.height]);

  // Pointer drag corner handles
  const handlePointerDownCorner = (corner: 'tl' | 'tr' | 'br' | 'bl') => {
    setActiveCorner(corner);
  };

  useEffect(() => {
    if (!activeCorner || activePageIndex === null || !activePage) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!previewImgRef.current || !activeCorner) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const imgRect = previewImgRef.current.getBoundingClientRect();
      const normX = Math.max(0, Math.min(clientX - imgRect.left, imgRect.width));
      const normY = Math.max(0, Math.min(clientY - imgRect.top, imgRect.height));

      const imgX = Math.round((normX / imgRect.width) * activePage.width);
      const imgY = Math.round((normY / imgRect.height) * activePage.height);

      setPages((prev) =>
        prev.map((p, idx) => {
          if (idx !== activePageIndex) return p;
          return {
            ...p,
            quad: {
              ...p.quad,
              [activeCorner]: { x: imgX, y: imgY },
            },
          };
        })
      );
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
  }, [activeCorner, activePageIndex, activePage]);

  // Finish & Compile all pages
  const handleFinishAndCompile = async () => {
    if (pages.length === 0) return;

    setIsProcessingPage(true);
    setProcessingMsg('Processing and finalizing scanned pages...');

    try {
      const finalizedPages: {
        id: string;
        name: string;
        dataUrl: string;
        width: number;
        height: number;
      }[] = [];

      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        setProcessingMsg(`Straightening page ${i + 1} of ${pages.length}...`);

        let finalUrl = p.currentDataUrl;
        let finalW = p.width;
        let finalH = p.height;

        // If page has Auto Perspective / Crop mode enabled, warp perspective
        if (p.mode === 'perspective') {
          const warped = await warpPerspective(p.currentDataUrl, p.quad);
          finalUrl = warped.dataUrl;
          finalW = warped.width;
          finalH = warped.height;
        }

        finalizedPages.push({
          id: p.id,
          name: p.name,
          dataUrl: finalUrl,
          width: finalW,
          height: finalH,
        });
      }

      // Stop video hardware stream cleanly
      stopMediaTracks();

      // Send to parent component to compile into PDF or add to list
      onComplete(finalizedPages);
      onClose();
    } catch (err: any) {
      console.error('Finalize scan error:', err);
      alert('Error finalizing scanned pages: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessingPage(false);
    }
  };

  if (!isOpen) return null;

  // Convert image coord (x, y) to container preview pixel coord for SVG pins
  const toDisplayCoord = (pt: Point) => {
    return {
      x: pt.x * displayScale.scaleX + displayScale.offsetX,
      y: pt.y * displayScale.scaleY + displayScale.offsetY,
    };
  };

  const currentQuad = activePage?.quad || defaultQuad(100, 100);
  const tlDisp = toDisplayCoord(currentQuad.tl);
  const trDisp = toDisplayCoord(currentQuad.tr);
  const brDisp = toDisplayCoord(currentQuad.br);
  const blDisp = toDisplayCoord(currentQuad.bl);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col select-none animate-fadeIn overflow-hidden">
      {/* Flash visual effect on capture */}
      {showFlash && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-150 opacity-90" />
      )}

      {/* Top Header Bar */}
      <div className="h-14 sm:h-16 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition active:scale-95"
            title="Cancel & Close Scanner"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              <Camera className="w-4 h-4 text-brand-gold" />
              <span>Multi-Page Scanner</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold border border-brand-gold/30 text-xs font-mono font-bold">
              {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
            </span>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Torch toggle */}
          {activePageIndex === null && (
            <button
              onClick={handleToggleTorch}
              className={`p-2 rounded-xl border transition ${
                torchOn
                  ? 'bg-amber-500/20 text-brand-gold border-brand-gold shadow-gold-glow'
                  : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
              }`}
              title={torchOn ? 'Turn Flash Off' : 'Turn Flash On'}
            >
              {torchOn ? <Zap className="w-4 h-4 fill-brand-gold" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {/* Camera Flip */}
          {activePageIndex === null && (
            <button
              onClick={handleFlipCamera}
              className="p-2 rounded-xl bg-white/5 text-zinc-300 border border-white/10 hover:text-white hover:bg-white/10 transition"
              title="Switch Front / Rear Camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Finish & Compile Button */}
          <button
            onClick={handleFinishAndCompile}
            disabled={pages.length === 0 || isProcessingPage}
            className="px-3 sm:px-4 py-2 rounded-xl bg-brand-gold text-black font-bold text-xs sm:text-sm hover:brightness-110 shadow-gold-glow flex items-center gap-1.5 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Check className="w-4 h-4" />
            <span>Finish &amp; Compile ({pages.length})</span>
          </button>
        </div>
      </div>

      {/* Main View Area: Either Live Viewfinder OR Inspected Page Corner Editor */}
      <div className="flex-1 relative bg-[#09090D] overflow-hidden flex items-center justify-center">
        {/* VIEW 1: LIVE CAMERA VIEWFINDER */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
            activePageIndex === null ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          {cameraError ? (
            <div className="max-w-md p-6 text-center bg-zinc-900 border border-rose-500/30 rounded-2xl mx-4">
              <p className="text-rose-400 font-bold mb-2">Camera Access Denied or Unavailable</p>
              <p className="text-zinc-400 text-xs mb-4 leading-relaxed">{cameraError}</p>
              <button
                onClick={() => startCamera(facingModeRef.current)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
              >
                Retry Camera
              </button>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />

              {/* Document Alignment Viewfinder Guidelines */}
              <div className="absolute inset-8 sm:inset-16 pointer-events-none border border-white/20 rounded-2xl flex flex-col justify-between p-4">
                {/* 4 Corner brackets */}
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-2 border-l-2 border-brand-gold rounded-tl" />
                  <div className="w-6 h-6 border-t-2 border-r-2 border-brand-gold rounded-tr" />
                </div>
                <div className="text-center">
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] text-zinc-300 border border-white/10 font-medium">
                    Align document within frame &amp; tap shutter
                  </span>
                </div>
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-2 border-l-2 border-brand-gold rounded-bl" />
                  <div className="w-6 h-6 border-b-2 border-r-2 border-brand-gold rounded-br" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* VIEW 2: INSPECTED PAGE PREVIEW & AUTO PERSPECTIVE CORNER HANDLES */}
        {activePage && activePageIndex !== null && (
          <div
            ref={previewContainerRef}
            className={`absolute inset-0 flex flex-col items-center justify-center p-3 select-none transition-opacity duration-200 ${
              activePageIndex !== null ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Top Toolbar for Inspected Page */}
            <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between bg-[#121218]/90 backdrop-blur-md border border-white/10 p-2 rounded-2xl shadow-xl flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActivePageIndex(null)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold flex items-center gap-1 border border-white/10 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Camera</span>
                </button>

                <span className="text-xs font-bold text-white pl-1">
                  Page {activePageIndex + 1} of {pages.length}
                </span>
              </div>

              {/* Mode Selector: "Default (Original)" vs "Auto Perspective / Crop" */}
              <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => handleTogglePageMode('default')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    activePage.mode === 'default'
                      ? 'bg-white/20 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Default (Original)
                </button>
                <button
                  onClick={() => handleTogglePageMode('perspective')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    activePage.mode === 'perspective'
                      ? 'bg-brand-gold text-black shadow-gold-glow font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Auto Perspective / Crop</span>
                </button>
              </div>

              {/* Actions for Perspective Mode */}
              <div className="flex items-center gap-1.5">
                {activePage.mode === 'perspective' && (
                  <>
                    <button
                      onClick={handleReDetectQuad}
                      disabled={isProcessingPage}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-brand-gold/30 text-xs font-bold flex items-center gap-1 transition active:scale-95"
                      title="Re-detect document corners automatically"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                      <span className="hidden sm:inline">⚡ Auto Detect</span>
                    </button>
                    <button
                      onClick={handleResetQuad}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs font-medium transition"
                      title="Reset corners to full frame"
                    >
                      Reset
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleRotatePage(activePageIndex)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition"
                  title="Rotate 90° Clockwise"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) => handleDeletePage(activePageIndex, e)}
                  className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                  title="Delete this Page"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Page Image */}
            <img
              ref={previewImgRef}
              src={activePage.currentDataUrl}
              alt={activePage.name}
              onLoad={updateDisplayScale}
              className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-2xl pointer-events-none mt-10"
            />

            {/* Draggable Corner Polygon Overlay (when mode is 'perspective') */}
            {activePage.mode === 'perspective' && (
              <>
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    <mask id="camera-quad-mask">
                      <rect width="100%" height="100%" fill="white" />
                      <polygon
                        points={`${tlDisp.x},${tlDisp.y} ${trDisp.x},${trDisp.y} ${brDisp.x},${brDisp.y} ${blDisp.x},${blDisp.y}`}
                        fill="black"
                      />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#camera-quad-mask)" />
                  <polygon
                    points={`${tlDisp.x},${tlDisp.y} ${trDisp.x},${trDisp.y} ${brDisp.x},${brDisp.y} ${blDisp.x},${blDisp.y}`}
                    fill="rgba(212, 175, 55, 0.15)"
                    stroke="#D4AF37"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                  />
                </svg>

                {/* 4 Interactive Corner Handles */}
                {/* Top-Left */}
                <div
                  onMouseDown={() => handlePointerDownCorner('tl')}
                  onTouchStart={() => handlePointerDownCorner('tl')}
                  style={{ left: tlDisp.x, top: tlDisp.y }}
                  className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full bg-brand-gold border-2 border-white shadow-2xl cursor-move flex items-center justify-center text-[10px] font-extrabold text-black hover:scale-125 active:scale-135 transition-transform"
                  title="Drag Top-Left Corner"
                >
                  TL
                </div>
                {/* Top-Right */}
                <div
                  onMouseDown={() => handlePointerDownCorner('tr')}
                  onTouchStart={() => handlePointerDownCorner('tr')}
                  style={{ left: trDisp.x, top: trDisp.y }}
                  className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full bg-brand-gold border-2 border-white shadow-2xl cursor-move flex items-center justify-center text-[10px] font-extrabold text-black hover:scale-125 active:scale-135 transition-transform"
                  title="Drag Top-Right Corner"
                >
                  TR
                </div>
                {/* Bottom-Right */}
                <div
                  onMouseDown={() => handlePointerDownCorner('br')}
                  onTouchStart={() => handlePointerDownCorner('br')}
                  style={{ left: brDisp.x, top: brDisp.y }}
                  className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full bg-brand-gold border-2 border-white shadow-2xl cursor-move flex items-center justify-center text-[10px] font-extrabold text-black hover:scale-125 active:scale-135 transition-transform"
                  title="Drag Bottom-Right Corner"
                >
                  BR
                </div>
                {/* Bottom-Left */}
                <div
                  onMouseDown={() => handlePointerDownCorner('bl')}
                  onTouchStart={() => handlePointerDownCorner('bl')}
                  style={{ left: blDisp.x, top: blDisp.y }}
                  className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full bg-brand-gold border-2 border-white shadow-2xl cursor-move flex items-center justify-center text-[10px] font-extrabold text-black hover:scale-125 active:scale-135 transition-transform"
                  title="Drag Bottom-Left Corner"
                >
                  BL
                </div>
              </>
            )}

            {/* Helper label */}
            <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
              <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] text-zinc-300 border border-white/10">
                {activePage.mode === 'perspective'
                  ? 'Drag the 4 corner handles to align with the document paper boundary'
                  : 'Default original frame active. Toggle Auto Perspective to crop and straighten.'}
              </span>
            </div>
          </div>
        )}

        {/* Shutter Button (only shown in Live Viewfinder mode) */}
        {activePageIndex === null && (
          <div className="absolute bottom-4 inset-x-0 flex items-center justify-center z-20 pointer-events-auto">
            <button
              onClick={handleCapture}
              disabled={isCapturing}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-4 border-white bg-white/20 backdrop-blur-md flex items-center justify-center p-1.5 transition active:scale-90 hover:scale-105 shadow-2xl group"
              title="Capture Document Page"
            >
              <div className="w-full h-full rounded-full bg-white group-hover:bg-brand-gold transition duration-200 flex items-center justify-center shadow-gold-glow">
                <Camera className="w-7 h-7 text-black" />
              </div>
            </button>
          </div>
        )}

        {/* Busy / Loading Spinner Overlay */}
        {isProcessingPage && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-40">
            <div className="w-10 h-10 border-3 border-brand-gold border-t-transparent rounded-full animate-spin shadow-gold-glow" />
            <p className="text-sm font-semibold text-amber-200">{processingMsg}</p>
          </div>
        )}
      </div>

      {/* Live Bottom Thumbnail Tray */}
      <div className="h-28 sm:h-32 bg-[#0C0C12]/95 backdrop-blur-md border-t border-white/10 px-4 py-2 flex items-center gap-3 overflow-x-auto z-20 shrink-0">
        {/* Button to Switch Back to Camera Viewfinder */}
        <button
          onClick={() => setActivePageIndex(null)}
          className={`h-20 sm:h-24 w-16 sm:w-18 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 shrink-0 transition active:scale-95 ${
            activePageIndex === null
              ? 'border-brand-gold bg-amber-500/15 text-brand-gold shadow-gold-glow'
              : 'border-white/20 hover:border-white/40 text-zinc-400 hover:text-white bg-white/5'
          }`}
          title="Return to Camera to scan more pages"
        >
          <Plus className="w-5 h-5" />
          <span className="text-[10px] font-bold">Scan +</span>
        </button>

        {/* Thumbnail Cards for Scanned Pages */}
        {pages.map((p, idx) => {
          const isSelected = activePageIndex === idx;
          return (
            <div
              key={p.id}
              onClick={() => setActivePageIndex(idx)}
              className={`h-20 sm:h-24 w-18 sm:w-20 rounded-xl overflow-hidden relative cursor-pointer border-2 shrink-0 transition-all flex flex-col justify-between group ${
                isSelected
                  ? 'border-brand-gold ring-2 ring-brand-gold/40 scale-105 shadow-gold-glow'
                  : 'border-white/15 hover:border-white/40 bg-zinc-900'
              }`}
            >
              <img
                src={p.currentDataUrl}
                alt={p.name}
                className="w-full h-full object-cover"
              />

              {/* Top badges: Page number & mode */}
              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono font-bold text-white border border-white/10">
                P{idx + 1}
              </div>

              {p.mode === 'perspective' && (
                <div className="absolute top-1 right-1 p-0.5 rounded bg-brand-gold text-black text-[9px]" title="Auto Perspective Enabled">
                  <Wand2 className="w-2.5 h-2.5" />
                </div>
              )}

              {/* Hover overlay quick controls */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1">
                <div className="flex justify-between items-center">
                  <button
                    onClick={(e) => handleMovePage(idx, 'left', e)}
                    disabled={idx === 0}
                    className="p-0.5 text-zinc-300 hover:text-white disabled:opacity-20"
                    title="Move Page Left"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleMovePage(idx, 'right', e)}
                    disabled={idx === pages.length - 1}
                    className="p-0.5 text-zinc-300 hover:text-white disabled:opacity-20"
                    title="Move Page Right"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex justify-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRotatePage(idx);
                    }}
                    className="p-1 rounded bg-white/20 hover:bg-brand-gold hover:text-black text-white"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeletePage(idx, e)}
                    className="p-1 rounded bg-rose-500/30 hover:bg-rose-500 text-rose-200"
                    title="Delete Page"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {pages.length === 0 && (
          <div className="text-zinc-500 text-xs italic pl-2">
            Captured pages will appear here in sequence. Tap the camera shutter above to take your first page.
          </div>
        )}
      </div>
    </div>
  );
};
