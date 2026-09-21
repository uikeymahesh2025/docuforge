import React, { useState, useRef, useEffect } from 'react';
import {
  Stamp,
  QrCode,
  Download,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Move,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Barcode,
  Calendar,
  Building,
} from 'lucide-react';
import { FileUploader } from '../../components/tools/FileUploader';
import { loadPdfDocument, renderPageToCanvas } from '../../pdf/pdfManager';
import { bakeCustomStampOrQrOnPdf, StampQrOverlayItem } from '../../pdf/pdfModifier';
import { generateQrDataUrl, generateBarcodeCanvas } from '../../utils/qrGenerator';
import { useToastStore } from '../../stores/useToastStore';

export const StampQrOverlayPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  // Tool generator tab: 'stamp' | 'qr'
  const [activeTab, setActiveTab] = useState<'stamp' | 'qr'>('stamp');

  // Stamp Generator settings
  const [stampText, setStampText] = useState<string>('APPROVED');
  const [stampOrg, setStampOrg] = useState<string>('OFFICIAL VERIFIED');
  const [stampDate, setStampDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [stampShape, setStampShape] = useState<'circle' | 'rect'>('circle');
  const [stampColor, setStampColor] = useState<string>('#DC2626'); // Red
  const [stampRotation, setStampRotation] = useState<number>(-12); // subtle tilt
  const [stampSize, setStampSize] = useState<number>(140);
  const [stampOpacity, setStampOpacity] = useState<number>(0.9);

  // QR / Barcode settings
  const [qrText, setQrText] = useState<string>('https://docuforge.ai');
  const [qrMode, setQrMode] = useState<'qr' | 'barcode'>('qr');
  const [qrColor, setQrColor] = useState<string>('#000000');
  const [qrSize, setQrSize] = useState<number>(130);

  // Overlay state for current document
  const [overlays, setOverlays] = useState<StampQrOverlayItem[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; overlayX: number; overlayY: number } | null>(null);

  // Load PDF file
  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);

    try {
      const buffer = await selected.arrayBuffer();
      const raw = new Uint8Array(buffer);
      setPdfBytes(raw);
      const doc = await loadPdfDocument(raw);
      setPdfDocProxy(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setOverlays([]);
      setSelectedOverlayId(null);

      addToast({
        type: 'success',
        title: 'PDF Loaded',
        message: `${selected.name} (${doc.numPages} pages) ready for stamps & QR codes.`,
      });
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Load Failed',
        message: 'Could not load PDF document.',
      });
    }
  };

  // Render current page to canvas
  useEffect(() => {
    if (!pdfDocProxy || !pdfCanvasRef.current) return;
    let isCancelled = false;

    renderPageToCanvas(pdfDocProxy, currentPage, pdfCanvasRef.current, scale).catch((err) => {
      if (!isCancelled) console.warn('Render page error:', err);
    });

    return () => {
      isCancelled = true;
    };
  }, [pdfDocProxy, currentPage, scale]);

  // Generate Stamp DataURL on offscreen canvas
  const generateStampDataUrl = (): string => {
    const canvas = document.createElement('canvas');
    const dpr = 2; // high-dpi
    canvas.width = stampSize * dpr;
    canvas.height = stampSize * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.scale(dpr, dpr);
    ctx.translate(stampSize / 2, stampSize / 2);
    ctx.rotate((stampRotation * Math.PI) / 180);

    ctx.strokeStyle = stampColor;
    ctx.fillStyle = stampColor;

    if (stampShape === 'circle') {
      const radius = stampSize / 2 - 8;

      // Outer ring
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner decorative ring
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius - 5, 0, Math.PI * 2);
      ctx.stroke();

      // Top Curving Org Text
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stampOrg.toUpperCase().substring(0, 24), 0, -radius * 0.52);

      // Center Banner Stamp Main Word (e.g. APPROVED)
      ctx.font = `900 ${Math.max(14, Math.floor(stampSize * 0.16))}px sans-serif`;
      ctx.fillText(stampText.toUpperCase(), 0, 0);

      // Horizontal Divider lines across center word
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.75, -radius * 0.22);
      ctx.lineTo(radius * 0.75, -radius * 0.22);
      ctx.moveTo(-radius * 0.75, radius * 0.22);
      ctx.lineTo(radius * 0.75, radius * 0.22);
      ctx.stroke();

      // Date Text at bottom
      if (stampDate) {
        ctx.font = 'bold 9px monospace';
        ctx.fillText(stampDate, 0, radius * 0.52);
      }
    } else {
      // Rectangular Stamp Box
      const boxW = stampSize - 16;
      const boxH = stampSize * 0.55;

      ctx.lineWidth = 3.5;
      ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

      ctx.lineWidth = 1.5;
      ctx.strokeRect(-boxW / 2 + 3, -boxH / 2 + 3, boxW - 6, boxH - 6);

      // Organization Header
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(stampOrg.toUpperCase().substring(0, 24), 0, -boxH * 0.25);

      // Main Text
      ctx.font = `900 ${Math.max(13, Math.floor(stampSize * 0.15))}px sans-serif`;
      ctx.fillText(stampText.toUpperCase(), 0, 2);

      // Date
      if (stampDate) {
        ctx.font = 'bold 8px monospace';
        ctx.fillText(stampDate, 0, boxH * 0.28);
      }
    }

    return canvas.toDataURL('image/png');
  };

  // Add generated Stamp to current page
  const handleAddStamp = () => {
    const dataUrl = generateStampDataUrl();
    const newOverlay: StampQrOverlayItem = {
      id: `stamp-${Date.now()}`,
      pageNumber: currentPage,
      x: 100,
      y: 100,
      width: stampSize,
      height: stampShape === 'circle' ? stampSize : stampSize * 0.55,
      dataUrl,
      opacity: stampOpacity,
    };

    setOverlays((prev) => [...prev, newOverlay]);
    setSelectedOverlayId(newOverlay.id);

    addToast({
      type: 'success',
      title: 'Stamp Added',
      message: 'Stamp placed on page. You can drag and position it anywhere.',
    });
  };

  // Add generated QR Code or Barcode to current page
  const handleAddQr = () => {
    let dataUrl = '';
    let w = qrSize;
    let h = qrSize;

    if (qrMode === 'qr') {
      dataUrl = generateQrDataUrl(qrText, 300, qrColor, '#ffffff');
    } else {
      const bcCanvas = generateBarcodeCanvas(qrText, 360, 110, qrColor);
      dataUrl = bcCanvas.toDataURL('image/png');
      w = qrSize * 1.8;
      h = qrSize * 0.65;
    }

    const newOverlay: StampQrOverlayItem = {
      id: `qr-${Date.now()}`,
      pageNumber: currentPage,
      x: 120,
      y: 120,
      width: w,
      height: h,
      dataUrl,
      opacity: 1,
    };

    setOverlays((prev) => [...prev, newOverlay]);
    setSelectedOverlayId(newOverlay.id);

    addToast({
      type: 'success',
      title: qrMode === 'qr' ? 'QR Code Added' : 'Barcode Added',
      message: 'Placed on page. Drag and position to desired location.',
    });
  };

  // Handle Dragging overlays
  const handleOverlayMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedOverlayId(id);
    const item = overlays.find((o) => o.id === id);
    if (!item) return;

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      overlayX: item.x,
      overlayY: item.y,
    };
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!dragStartRef.current || !selectedOverlayId) return;

    const deltaX = (e.clientX - dragStartRef.current.x) / scale;
    const deltaY = (e.clientY - dragStartRef.current.y) / scale;

    const nextX = Math.max(0, Math.round(dragStartRef.current.overlayX + deltaX));
    const nextY = Math.max(0, Math.round(dragStartRef.current.overlayY + deltaY));

    setOverlays((prev) =>
      prev.map((o) => (o.id === selectedOverlayId ? { ...o, x: nextX, y: nextY } : o))
    );
  };

  const handleContainerMouseUp = () => {
    dragStartRef.current = null;
  };

  const handleDeleteSelected = () => {
    if (!selectedOverlayId) return;
    setOverlays((prev) => prev.filter((o) => o.id !== selectedOverlayId));
    setSelectedOverlayId(null);
  };

  // Bake overlays and download
  const handleBakeAndDownload = async () => {
    if (!pdfBytes || !file) return;

    setIsProcessing(true);
    try {
      const outputBytes = await bakeCustomStampOrQrOnPdf(pdfBytes, overlays);
      const blob = new Blob([outputBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanName = file.name.replace(/\.pdf$/i, '');
      link.download = `${cleanName}_stamped.pdf`;
      link.click();

      addToast({
        type: 'success',
        title: 'PDF Downloaded',
        message: 'All stamps and QR codes baked into PDF successfully.',
      });
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Baking Failed',
        message: 'Could not bake stamps into the PDF.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const currentOverlays = overlays.filter((o) => o.pageNumber === currentPage);

  return (
    <div
      className="min-h-screen bg-[#09090C] text-zinc-100 flex flex-col"
      onMouseMove={handleContainerMouseMove}
      onMouseUp={handleContainerMouseUp}
    >
      {/* Hero Header */}
      <section className="relative pt-12 pb-10 sm:pt-16 sm:pb-12 border-b border-white/5 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[280px] bg-red-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold mb-4 shadow-gold-glow">
            <Stamp className="w-3.5 h-3.5" />
            <span>Official Rubber Seals, Stamps & QR Overlays</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight">
            Stamp & <span className="gold-gradient-text">QR Code Inserter</span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Generate official rubber stamps (Approved, Paid, Confidential, Verified) and scannable UPI/Web QR codes. Drag and bake directly onto any PDF page.
          </p>
        </div>
      </section>

      {/* Main Workspace */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {!file ? (
          <div className="max-w-xl mx-auto">
            <FileUploader
              onFilesSelected={handleFilesSelected}
              accept=".pdf,application/pdf"
              multiple={false}
              fileType="pdf"
              title="Upload PDF to add Stamps & QR Codes"
              subtitle="Supports contracts, invoices, application receipts, certificates & official reports"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Stamp / QR Generator Panel */}
            <div className="lg:col-span-4 bg-[#121218] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-5">
              {/* Tab Selector */}
              <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('stamp')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition ${
                    activeTab === 'stamp'
                      ? 'bg-brand-gold text-black shadow-xs font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Stamp className="w-3.5 h-3.5" />
                  <span>Official Stamp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('qr')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition ${
                    activeTab === 'qr'
                      ? 'bg-brand-gold text-black shadow-xs font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR & Barcode</span>
                </button>
              </div>

              {activeTab === 'stamp' ? (
                /* Stamp Form Controls */
                <div className="space-y-4 text-xs">
                  {/* Preset Pills */}
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 mb-1.5 block">Preset Stamp Word:</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['APPROVED', 'CONFIDENTIAL', 'PAID', 'VERIFIED', 'REJECTED', 'ORIGINAL'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setStampText(p)}
                          className={`px-2 py-1 rounded-md border text-[10px] font-bold transition ${
                            stampText === p
                              ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                              : 'border-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Word Input */}
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Stamp Main Title:</label>
                    <input
                      type="text"
                      value={stampText}
                      onChange={(e) => setStampText(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-gold uppercase font-bold"
                      placeholder="e.g. APPROVED, CLEARED"
                    />
                  </div>

                  {/* Organization / Firm Name */}
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 mb-1 flex items-center gap-1.5">
                      <Building className="w-3 h-3 text-zinc-400" />
                      <span>Firm / Organization Subtitle:</span>
                    </label>
                    <input
                      type="text"
                      value={stampOrg}
                      onChange={(e) => setStampOrg(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-gold"
                      placeholder="e.g. GOVT OF INDIA / CYBER PRO"
                    />
                  </div>

                  {/* Date Input */}
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      <span>Stamp Date:</span>
                    </label>
                    <input
                      type="date"
                      value={stampDate}
                      onChange={(e) => setStampDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-gold"
                    />
                  </div>

                  {/* Shape & Color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Shape:</label>
                      <select
                        value={stampShape}
                        onChange={(e: any) => setStampShape(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-gold"
                      >
                        <option value="circle">Circular Seal</option>
                        <option value="rect">Rectangle Box</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Color:</label>
                      <div className="flex items-center gap-1.5">
                        {['#DC2626', '#2563EB', '#16A34A', '#111827', '#D4AF37'].map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => setStampColor(col)}
                            style={{ backgroundColor: col }}
                            className={`w-6 h-6 rounded-md border transition ${
                              stampColor === col ? 'ring-2 ring-white scale-110' : 'border-black/30'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rotation Tilt */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 mb-1">
                      <span>Realistic Ink Tilt:</span>
                      <span className="font-mono text-brand-gold">{stampRotation}&deg;</span>
                    </div>
                    <input
                      type="range"
                      min={-30}
                      max={30}
                      step={1}
                      value={stampRotation}
                      onChange={(e) => setStampRotation(parseInt(e.target.value, 10))}
                      className="w-full accent-brand-gold cursor-pointer"
                    />
                  </div>

                  {/* Add Stamp Button */}
                  <button
                    type="button"
                    onClick={handleAddStamp}
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <Stamp className="w-4 h-4" />
                    <span>Generate & Place Stamp</span>
                  </button>
                </div>
              ) : (
                /* QR / Barcode Form Controls */
                <div className="space-y-4 text-xs">
                  {/* Mode switch: QR vs Barcode */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="qrmode"
                        checked={qrMode === 'qr'}
                        onChange={() => setQrMode('qr')}
                        className="accent-brand-gold"
                      />
                      <span className="text-zinc-300 font-medium">QR Code</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="qrmode"
                        checked={qrMode === 'barcode'}
                        onChange={() => setQrMode('barcode')}
                        className="accent-brand-gold"
                      />
                      <span className="text-zinc-300 font-medium">Code 128 Barcode</span>
                    </label>
                  </div>

                  {/* Content Input */}
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 mb-1 block">
                      {qrMode === 'qr' ? 'URL / UPI Payment ID / Text:' : 'Barcode Text / Serial:'}
                    </label>
                    <textarea
                      rows={3}
                      value={qrText}
                      onChange={(e) => setQrText(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-gold resize-none"
                      placeholder={
                        qrMode === 'qr'
                          ? 'e.g. https://myfirm.com or upi://pay?pa=name@upi'
                          : 'e.g. DOC-948291'
                      }
                    />
                  </div>

                  {/* Size Slider */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 mb-1">
                      <span>Size (px):</span>
                      <span className="font-mono text-brand-gold">{qrSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={60}
                      max={240}
                      step={10}
                      value={qrSize}
                      onChange={(e) => setQrSize(parseInt(e.target.value, 10))}
                      className="w-full accent-brand-gold cursor-pointer"
                    />
                  </div>

                  {/* Add QR Button */}
                  <button
                    type="button"
                    onClick={handleAddQr}
                    className="w-full py-2.5 rounded-xl bg-brand-gold hover:brightness-110 text-black font-bold text-xs shadow-gold-glow transition flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Generate & Place {qrMode === 'qr' ? 'QR Code' : 'Barcode'}</span>
                  </button>
                </div>
              )}

              {/* Placed Overlays List & Actions */}
              <div className="pt-4 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Overlays ({overlays.length})
                  </span>
                  {selectedOverlayId && (
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="text-[11px] text-red-400 hover:text-red-300 font-medium"
                    >
                      Delete Selected
                    </button>
                  )}
                </div>

                <div className="max-h-32 overflow-y-auto space-y-1.5 no-scrollbar">
                  {overlays.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 italic">No stamps or QR placed yet.</p>
                  ) : (
                    overlays.map((item, idx) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedOverlayId(item.id)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition ${
                          selectedOverlayId === item.id
                            ? 'border-brand-gold bg-brand-gold/10 text-white font-semibold'
                            : 'border-white/5 text-zinc-400 hover:bg-white/5'
                        }`}
                      >
                        <span className="truncate">
                          #{idx + 1} {item.id.startsWith('stamp') ? 'Stamp' : 'QR/Barcode'} (Page {item.pageNumber})
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {item.x}px, {item.y}px
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Master Download Action */}
              <button
                type="button"
                onClick={handleBakeAndDownload}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isProcessing ? 'Baking Overlays...' : 'Bake & Download PDF'}</span>
              </button>
            </div>

            {/* Right Column: PDF Page Canvas & Drag-and-Drop Viewport */}
            <div className="lg:col-span-8 space-y-4">
              {/* Pagination Bar */}
              <div className="bg-[#121218] border border-white/10 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-semibold text-white">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-400 hidden sm:inline">
                    Drag stamp or QR to position
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPdfBytes(null);
                      setPdfDocProxy(null);
                    }}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Change File</span>
                  </button>
                </div>
              </div>

              {/* Canvas Interactive Wrapper */}
              <div
                ref={canvasContainerRef}
                className="bg-[#0e0e14] border border-white/10 rounded-2xl p-4 overflow-auto max-h-[750px] flex justify-center shadow-inner relative select-none"
              >
                <div className="relative inline-block shadow-2xl">
                  <canvas ref={pdfCanvasRef} className="block rounded-sm bg-white" />

                  {/* Interactive Floating Overlays */}
                  {currentOverlays.map((item) => {
                    const isSelected = selectedOverlayId === item.id;
                    return (
                      <div
                        key={item.id}
                        onMouseDown={(e) => handleOverlayMouseDown(e, item.id)}
                        style={{
                          position: 'absolute',
                          left: `${item.x * scale}px`,
                          top: `${item.y * scale}px`,
                          width: `${item.width * scale}px`,
                          height: `${item.height * scale}px`,
                          opacity: item.opacity ?? 1,
                        }}
                        className={`cursor-move transition-shadow ${
                          isSelected
                            ? 'ring-2 ring-brand-gold shadow-2xl bg-brand-gold/10'
                            : 'hover:ring-1 hover:ring-brand-gold/60'
                        }`}
                        title="Click and drag to position anywhere on this page."
                      >
                        <img
                          src={item.dataUrl}
                          alt="Overlay"
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
