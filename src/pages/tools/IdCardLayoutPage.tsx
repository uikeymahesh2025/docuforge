import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  Printer,
  Download,
  Upload,
  CreditCard,
  Scissors,
  Layers,
  RotateCw,
  Trash2,
  Sparkles,
  CheckCircle2,
  FileCheck,
  LayoutGrid,
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { useToastStore } from '../../stores/useToastStore';

type LayoutMode = 'side-by-side' | 'stacked' | '4-in-1' | '8-in-1';

export const IdCardLayoutPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('side-by-side');
  const [showCutMarks, setShowCutMarks] = useState<boolean>(true);
  const [showBorder, setShowBorder] = useState<boolean>(true);
  const [cardWidthMm, setCardWidthMm] = useState<number>(85.6); // CR80 standard width
  const [cardHeightMm, setCardHeightMm] = useState<number>(54.0); // CR80 standard height
  const [gapMm, setGapMm] = useState<number>(10);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (frontUrl) URL.revokeObjectURL(frontUrl);
      if (backUrl) URL.revokeObjectURL(backUrl);
    };
  }, []);

  const handleFrontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (frontUrl) URL.revokeObjectURL(frontUrl);
    setFrontImage(file);
    setFrontUrl(URL.createObjectURL(file));
    addToast({
      type: 'success',
      title: 'Front Side Loaded',
      message: `${file.name} ready for layout.`,
    });
  };

  const handleBackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (backUrl) URL.revokeObjectURL(backUrl);
    setBackImage(file);
    setBackUrl(URL.createObjectURL(file));
    addToast({
      type: 'success',
      title: 'Back Side Loaded',
      message: `${file.name} ready for layout.`,
    });
  };

  // Convert mm to PDF points (1 inch = 25.4 mm = 72 points => 1 mm = 72 / 25.4 = 2.83465 pt)
  const mmToPt = (mm: number) => mm * 2.83465;

  const generatePrintPdf = async () => {
    if (!frontImage) {
      addToast({
        type: 'error',
        title: 'Missing Image',
        message: 'Please upload at least the Front side of the ID card.',
      });
      return;
    }

    setIsExporting(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // A4 portrait dimensions: 595.28 x 841.89 pt (210mm x 297mm)
      const a4Width = 595.28;
      const a4Height = 841.89;
      const page = pdfDoc.addPage([a4Width, a4Height]);

      // Draw pure white background for printer
      page.drawRectangle({
        x: 0,
        y: 0,
        width: a4Width,
        height: a4Height,
        color: rgb(1, 1, 1),
      });

      // Embed front image
      const frontBuf = await frontImage.arrayBuffer();
      let embedFront;
      if (frontImage.type === 'image/jpeg' || frontImage.name.toLowerCase().endsWith('.jpg') || frontImage.name.toLowerCase().endsWith('.jpeg')) {
        embedFront = await pdfDoc.embedJpg(frontBuf);
      } else {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const temp = new Image();
        await new Promise<void>((res, rej) => {
          temp.onload = () => res();
          temp.onerror = rej;
          temp.src = frontUrl!;
        });
        canvas.width = temp.width;
        canvas.height = temp.height;
        ctx?.drawImage(temp, 0, 0);
        const data = canvas.toDataURL('image/png');
        const pngBuf = await fetch(data).then((r) => r.arrayBuffer());
        embedFront = await pdfDoc.embedPng(pngBuf);
      }

      // Embed back image if exists, else repeat front
      let embedBack = embedFront;
      if (backImage && backUrl) {
        const backBuf = await backImage.arrayBuffer();
        if (backImage.type === 'image/jpeg' || backImage.name.toLowerCase().endsWith('.jpg') || backImage.name.toLowerCase().endsWith('.jpeg')) {
          embedBack = await pdfDoc.embedJpg(backBuf);
        } else {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const temp = new Image();
          await new Promise<void>((res, rej) => {
            temp.onload = () => res();
            temp.onerror = rej;
            temp.src = backUrl!;
          });
          canvas.width = temp.width;
          canvas.height = temp.height;
          ctx?.drawImage(temp, 0, 0);
          const data = canvas.toDataURL('image/png');
          const pngBuf = await fetch(data).then((r) => r.arrayBuffer());
          embedBack = await pdfDoc.embedPng(pngBuf);
        }
      }

      const cardW = mmToPt(cardWidthMm);
      const cardH = mmToPt(cardHeightMm);
      const gap = mmToPt(gapMm);

      // Helper to draw single card with optional cut border and scissor markers
      const drawCardSlot = (img: any, x: number, y: number, label: string) => {
        // Draw image stretched to exact standard CR80 card aspect ratio
        page.drawImage(img, {
          x,
          y,
          width: cardW,
          height: cardH,
        });

        // Cutting border
        if (showBorder) {
          page.drawRectangle({
            x,
            y,
            width: cardW,
            height: cardH,
            borderColor: rgb(0.7, 0.7, 0.7),
            borderWidth: 0.5,
          });
        }

        // Small cut guide line marks at 4 corners
        if (showCutMarks) {
          const markLen = 8;
          // Top-left
          page.drawLine({ start: { x: x - markLen, y: y + cardH }, end: { x, y: y + cardH }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
          page.drawLine({ start: { x, y: y + cardH }, end: { x, y: y + cardH + markLen }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });

          // Top-right
          page.drawLine({ start: { x: x + cardW, y: y + cardH }, end: { x: x + cardW + markLen, y: y + cardH }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
          page.drawLine({ start: { x: x + cardW, y: y + cardH }, end: { x: x + cardW, y: y + cardH + markLen }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });

          // Bottom-left
          page.drawLine({ start: { x: x - markLen, y }, end: { x, y }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
          page.drawLine({ start: { x, y: y - markLen }, end: { x, y }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });

          // Bottom-right
          page.drawLine({ start: { x: x + cardW, y }, end: { x: x + cardW + markLen, y }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
          page.drawLine({ start: { x: x + cardW, y: y - markLen }, end: { x: x + cardW, y }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
        }

        // Subdued label below card
        page.drawText(label, {
          x: x + 4,
          y: y - 10,
          size: 7,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
      };

      if (layoutMode === 'side-by-side') {
        // Center on A4 sheet horizontally side-by-side
        const totalW = cardW * 2 + gap;
        const startX = (a4Width - totalW) / 2;
        const startY = a4Height - 220; // Near top of A4 for easy cutting

        drawCardSlot(embedFront, startX, startY, 'ID Card - FRONT (Standard CR80: 85.6 x 54mm)');
        drawCardSlot(embedBack, startX + cardW + gap, startY, 'ID Card - BACK (Standard CR80: 85.6 x 54mm)');
      } else if (layoutMode === 'stacked') {
        // Center vertically stacked (Front on top, Back on bottom)
        const startX = (a4Width - cardW) / 2;
        const topY = a4Height - 200;
        const bottomY = topY - cardH - gap;

        drawCardSlot(embedFront, startX, topY, 'ID Card - FRONT');
        drawCardSlot(embedBack, startX, bottomY, 'ID Card - BACK');
      } else if (layoutMode === '4-in-1') {
        // 4 complete cards (4 Front + 4 Back = 8 slots) on one A4 sheet
        // 2 columns x 4 rows
        const cols = 2;
        const rows = 4;
        const startX = (a4Width - (cardW * cols + gap)) / 2;
        const topMargin = 50;

        for (let r = 0; r < rows; r++) {
          const rowY = a4Height - topMargin - (r + 1) * (cardH + gap);
          // Left col: Front
          drawCardSlot(embedFront, startX, rowY, `Card #${r + 1} - FRONT`);
          // Right col: Back
          drawCardSlot(embedBack, startX + cardW + gap, rowY, `Card #${r + 1} - BACK`);
        }
      } else if (layoutMode === '8-in-1') {
        // 8 cards grid (2 columns x 4 rows)
        const cols = 2;
        const rows = 4;
        const startX = (a4Width - (cardW * cols + gap)) / 2;
        const topMargin = 40;

        for (let r = 0; r < rows; r++) {
          const rowY = a4Height - topMargin - (r + 1) * (cardH + gap);
          drawCardSlot(embedFront, startX, rowY, `Card Slot ${r * 2 + 1}`);
          drawCardSlot(backImage ? embedBack : embedFront, startX + cardW + gap, rowY, `Card Slot ${r * 2 + 2}`);
        }
      }

      // Sheet Header Metadata for Cyber Cafe Operator
      page.drawText('Cyber Cafe ID Card Print Layout • Standard CR80 Dimensions (85.6mm x 54mm)', {
        x: 40,
        y: a4Height - 25,
        size: 8,
        font,
        color: rgb(0.6, 0.6, 0.6),
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `id_card_print_${layoutMode}_${Date.now()}.pdf`;
      link.click();

      addToast({
        type: 'success',
        title: 'Print PDF Ready',
        message: 'Your A4 ID card print sheet has been generated successfully!',
      });
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'PDF Generation Failed',
        message: 'Could not create ID print layout PDF.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090C] text-zinc-100 flex flex-col">
      {/* Top Banner */}
      <div className="bg-[#0C0C12] border-b border-white/10 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition"
              title="Back to Suite"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Cyber Cafe ID Card Print Layout
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 text-[10px] font-bold border border-amber-400/20 uppercase">
                  CR80 Standard
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Aadhaar, PAN, Voter ID front & back printable layout with scissor cutting guides.
              </p>
            </div>
          </div>

          <button
            onClick={generatePrintPdf}
            disabled={isExporting || !frontImage}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black text-xs font-bold hover:brightness-110 shadow-gold-glow transition disabled:opacity-40"
          >
            <Printer className="w-4 h-4" />
            <span>{isExporting ? 'Generating Print PDF...' : 'Download A4 Print PDF'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Uploads and Print Controls */}
          <div className="space-y-6">
            {/* Upload Front Side */}
            <div className="p-5 rounded-3xl bg-[#0E0E14] border border-white/10 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Front Side Image
                  </h3>
                </div>
                {frontImage && (
                  <button
                    onClick={() => {
                      setFrontImage(null);
                      setFrontUrl(null);
                    }}
                    className="text-zinc-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {frontUrl ? (
                <div className="relative aspect-[85.6/54] rounded-xl overflow-hidden border border-white/10 bg-black/40">
                  <img
                    src={frontUrl}
                    alt="Front ID"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => frontInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition"
                  >
                    Change Front Image
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => frontInputRef.current?.click()}
                  className="aspect-[85.6/54] rounded-2xl border-2 border-dashed border-white/15 hover:border-amber-400/60 bg-zinc-900/50 hover:bg-zinc-900 flex flex-col items-center justify-center text-center p-4 cursor-pointer group transition"
                >
                  <Upload className="w-6 h-6 text-amber-400 mb-2 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold text-white mb-1">
                    Upload ID Front Side
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Aadhaar, PAN, Voter ID front
                  </span>
                </div>
              )}
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*"
                onChange={handleFrontUpload}
                className="hidden"
              />
            </div>

            {/* Upload Back Side */}
            <div className="p-5 rounded-3xl bg-[#0E0E14] border border-white/10 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Back Side Image
                  </h3>
                </div>
                {backImage && (
                  <button
                    onClick={() => {
                      setBackImage(null);
                      setBackUrl(null);
                    }}
                    className="text-zinc-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {backUrl ? (
                <div className="relative aspect-[85.6/54] rounded-xl overflow-hidden border border-white/10 bg-black/40">
                  <img
                    src={backUrl}
                    alt="Back ID"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => backInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition"
                  >
                    Change Back Image
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => backInputRef.current?.click()}
                  className="aspect-[85.6/54] rounded-2xl border-2 border-dashed border-white/15 hover:border-amber-400/60 bg-zinc-900/50 hover:bg-zinc-900 flex flex-col items-center justify-center text-center p-4 cursor-pointer group transition"
                >
                  <Upload className="w-6 h-6 text-amber-400 mb-2 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold text-white mb-1">
                    Upload ID Back Side
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Address / QR barcode back side
                  </span>
                </div>
              )}
              <input
                ref={backInputRef}
                type="file"
                accept="image/*"
                onChange={handleBackUpload}
                className="hidden"
              />
            </div>

            {/* Layout Options */}
            <div className="p-5 rounded-3xl bg-[#0E0E14] border border-white/10 shadow-xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Print Sheet Arrangement
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'side-by-side', label: 'Side-by-Side', desc: 'Front & Back pair' },
                  { id: 'stacked', label: 'Stacked (Top/Bottom)', desc: 'Fold in pouch' },
                  { id: '4-in-1', label: '4-in-1 Sheet', desc: '4 pairs on 1 A4' },
                  { id: '8-in-1', label: '8-in-1 Bulk', desc: '8 slots on 1 A4' },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLayoutMode(l.id as any)}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition ${
                      layoutMode === l.id
                        ? 'bg-amber-400/10 border-amber-400 text-white'
                        : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="font-bold text-xs">{l.label}</span>
                    <span className="text-[10px] text-zinc-500">{l.desc}</span>
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-white/5 space-y-2.5 text-xs text-zinc-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCutMarks}
                    onChange={(e) => setShowCutMarks(e.target.checked)}
                    className="accent-amber-400 rounded"
                  />
                  <span>Scissor Cut Guides (Corner Marks)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBorder}
                    onChange={(e) => setShowBorder(e.target.checked)}
                    className="accent-amber-400 rounded"
                  />
                  <span>Subtle Card Trimming Border</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive A4 Sheet Visual Preview */}
          <div className="lg:col-span-2 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3 text-xs text-zinc-400">
              <span className="font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                <span>Live A4 Print Sheet Preview</span>
              </span>
              <span>Dimensions: 85.6 mm × 54.0 mm (CR80)</span>
            </div>

            {/* A4 Canvas Container */}
            <div className="w-full max-w-lg aspect-[1/1.414] bg-white rounded-2xl shadow-2xl p-6 relative overflow-hidden border border-zinc-700 flex flex-col justify-start">
              {/* Header on paper */}
              <div className="text-[9px] text-zinc-400 border-b border-zinc-200 pb-2 mb-6 flex items-center justify-between">
                <span>UIKEY AI ID Card Print Layout</span>
                <span>CR80 Card Standard</span>
              </div>

              {/* Rendering cards inside sheet preview */}
              {layoutMode === 'side-by-side' && (
                <div className="flex items-center justify-center gap-4 my-auto">
                  <div className="w-48 aspect-[85.6/54] rounded border border-zinc-400 bg-zinc-100 overflow-hidden relative shadow-sm">
                    {frontUrl ? (
                      <img src={frontUrl} alt="Front" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400 font-bold">
                        FRONT SIDE
                      </div>
                    )}
                  </div>
                  <div className="w-48 aspect-[85.6/54] rounded border border-zinc-400 bg-zinc-100 overflow-hidden relative shadow-sm">
                    {backUrl ? (
                      <img src={backUrl} alt="Back" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400 font-bold">
                        BACK SIDE
                      </div>
                    )}
                  </div>
                </div>
              )}

              {layoutMode === 'stacked' && (
                <div className="flex flex-col items-center justify-center gap-3 my-auto">
                  <div className="w-52 aspect-[85.6/54] rounded border border-zinc-400 bg-zinc-100 overflow-hidden relative shadow-sm">
                    {frontUrl ? (
                      <img src={frontUrl} alt="Front" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400 font-bold">
                        FRONT SIDE
                      </div>
                    )}
                  </div>
                  <div className="w-52 aspect-[85.6/54] rounded border border-zinc-400 bg-zinc-100 overflow-hidden relative shadow-sm">
                    {backUrl ? (
                      <img src={backUrl} alt="Back" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400 font-bold">
                        BACK SIDE
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(layoutMode === '4-in-1' || layoutMode === '8-in-1') && (
                <div className="grid grid-cols-2 gap-3 my-auto">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
                    const isFront = i % 2 !== 0;
                    const imgUrl = isFront ? frontUrl : backUrl || frontUrl;
                    return (
                      <div
                        key={i}
                        className="w-full aspect-[85.6/54] rounded border border-zinc-400 bg-zinc-100 overflow-hidden relative shadow-sm"
                      >
                        {imgUrl ? (
                          <img src={imgUrl} alt={`Slot ${i}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[9px] text-zinc-400 font-bold">
                            {isFront ? `CARD #${Math.ceil(i / 2)} FRONT` : `CARD #${Math.ceil(i / 2)} BACK`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Scissor guide hint */}
              <div className="mt-auto pt-4 border-t border-dashed border-zinc-300 text-center text-[9px] text-zinc-400 flex items-center justify-center gap-1">
                <Scissors className="w-3 h-3" />
                <span>Cutting guides enabled for clean edge trimming</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
