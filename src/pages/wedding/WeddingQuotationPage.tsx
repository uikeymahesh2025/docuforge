import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  FileText,
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  Sparkles,
  PenTool,
  RotateCcw,
  IndianRupee,
  ShieldCheck,
  Printer,
  Calendar,
  Building,
  User,
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { useToastStore } from '../../stores/useToastStore';

interface LineItem {
  id: string;
  name: string;
  description: string;
  qty: number;
  rate: number;
}

export const WeddingQuotationPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  // Studio details
  const [studioName, setStudioName] = useState('ROYAL WEDDING CINEMAS & PHOTOGRAPHY');
  const [studioTagline, setStudioTagline] = useState('Luxury Destination Wedding Films & Photography');
  const [studioPhone, setStudioPhone] = useState('+91 98765 43210');
  const [studioEmail, setStudioEmail] = useState('info@royalweddingcinemas.com');
  const [studioAddress, setStudioAddress] = useState('Studio 42, Heritage Enclave, Civil Lines, New Delhi - 110001');
  const [studioGstin, setStudioGstin] = useState('07AAAAA0000A1Z5');

  // Client details
  const [clientName, setClientName] = useState('Rohan Sharma & Ananya Verma');
  const [clientPhone, setClientPhone] = useState('+91 91234 56789');
  const [clientEmail, setClientEmail] = useState('rohan.ananya.wedding@gmail.com');
  const [eventDates, setEventDates] = useState('Dec 14 - Dec 16, 2026 (Sangeet, Haldi, Wedding & Reception)');
  const [eventVenue, setEventVenue] = useState('The Oberoi Udaivilas, Udaipur, Rajasthan');
  const [quotationNo, setQuotationNo] = useState(`RWC-QUO-${new Date().getFullYear()}-089`);

  // Line items
  const [items, setItems] = useState<LineItem[]>([
    {
      id: '1',
      name: 'Candid Photography (2 Senior Photographers)',
      description: 'Bride & Groom side candid emotion capture, high-end prime lenses',
      qty: 1,
      rate: 45000,
    },
    {
      id: '2',
      name: 'Cinematic 4K Wedding Film & Teaser',
      description: 'Gimbal, prime lenses, 3-5 min teaser + 25-35 min full cinematic feature film',
      qty: 1,
      rate: 55000,
    },
    {
      id: '3',
      name: 'Traditional Photography & Full Event Video',
      description: 'Complete family stage portraits, rituals coverage with LED setup',
      qty: 1,
      rate: 35000,
    },
    {
      id: '4',
      name: 'Dual Drone 4K Aerial Videography',
      description: 'Baraat aerial shots, venue landscape, floral shower drone capture',
      qty: 1,
      rate: 20000,
    },
    {
      id: '5',
      name: 'Royal Canvera Photobook Albums (2 Premium Sets)',
      description: '40 sheets (80 pages) each, velvet finish, feather touch, heirloom box',
      qty: 2,
      rate: 18000,
    },
    {
      id: '6',
      name: 'Pre-Wedding Shoot (1 Day Outdoor Session)',
      description: 'Costume changes, cinematic short video, 50 edited portraits',
      qty: 1,
      rate: 25000,
    },
  ]);

  // Pricing & taxes
  const [discountPercent, setDiscountPercent] = useState<number>(5);
  const [gstPercent, setGstPercent] = useState<number>(18);
  const [advancePercent, setAdvancePercent] = useState<number>(20);
  const [eventDayPercent, setEventDayPercent] = useState<number>(60);
  const [deliveryPercent, setDeliveryPercent] = useState<number>(20);

  // E-Signatures Canvas state
  const studioCanvasRef = useRef<HTMLCanvasElement>(null);
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isStudioSigning, setIsStudioSigning] = useState(false);
  const [isClientSigning, setIsClientSigning] = useState(false);
  const [studioSigned, setStudioSigned] = useState(false);
  const [clientSigned, setClientSigned] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const taxableAmount = subtotal - discountAmount;
  const gstAmount = Math.round((taxableAmount * gstPercent) / 100);
  const grandTotal = taxableAmount + gstAmount;

  const advanceAmount = Math.round((grandTotal * advancePercent) / 100);
  const eventDayAmount = Math.round((grandTotal * eventDayPercent) / 100);
  const deliveryAmount = grandTotal - advanceAmount - eventDayAmount;

  // Initialize Canvas
  const setupCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  useEffect(() => {
    setupCanvas(studioCanvasRef.current);
    setupCanvas(clientCanvasRef.current);
  }, []);

  const handleStartDraw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    type: 'studio' | 'client'
  ) => {
    const canvas = type === 'studio' ? studioCanvasRef.current : clientCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (type === 'studio') {
      setIsStudioSigning(true);
      setStudioSigned(true);
    } else {
      setIsClientSigning(true);
      setClientSigned(true);
    }
  };

  const handleDrawMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    type: 'studio' | 'client'
  ) => {
    const isDrawing = type === 'studio' ? isStudioSigning : isClientSigning;
    if (!isDrawing) return;

    const canvas = type === 'studio' ? studioCanvasRef.current : clientCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleStopDraw = (type: 'studio' | 'client') => {
    if (type === 'studio') setIsStudioSigning(false);
    else setIsClientSigning(false);
  };

  const clearCanvas = (type: 'studio' | 'client') => {
    const canvas = type === 'studio' ? studioCanvasRef.current : clientCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (type === 'studio') setStudioSigned(false);
    else setClientSigned(false);
  };

  // Line item modifiers
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        name: 'Custom Event Service',
        description: 'Detail specification of deliverable',
        qty: 1,
        rate: 10000,
      },
    ]);
  };

  const updateItem = (id: string, field: keyof LineItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Generate PDF Contract & Invoice
  const generatePdfContract = async () => {
    setIsExporting(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // A4 portrait
      const width = 595.28;
      const height = 841.89;
      const page = pdfDoc.addPage([width, height]);

      // Luxury dark card styling
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: rgb(0.04, 0.04, 0.06),
      });

      // Gold top accent bar
      page.drawRectangle({
        x: 0,
        y: height - 8,
        width,
        height: 8,
        color: rgb(0.85, 0.7, 0.25),
      });

      // Header Studio Name
      page.drawText(studioName, {
        x: 36,
        y: height - 44,
        size: 14,
        font: fontBold,
        color: rgb(0.95, 0.8, 0.3),
      });

      page.drawText(studioTagline, {
        x: 36,
        y: height - 58,
        size: 8,
        font,
        color: rgb(0.7, 0.7, 0.7),
      });

      page.drawText(`Phone: ${studioPhone} | Email: ${studioEmail}`, {
        x: 36,
        y: height - 70,
        size: 7.5,
        font,
        color: rgb(0.55, 0.55, 0.55),
      });

      // Right Side: Quotation / Contract Meta
      page.drawText('EVENT QUOTATION & CONTRACT', {
        x: width - 210,
        y: height - 44,
        size: 11,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      page.drawText(`Quotation No: ${quotationNo}`, {
        x: width - 210,
        y: height - 58,
        size: 8,
        font: fontBold,
        color: rgb(0.85, 0.7, 0.25),
      });

      page.drawText(`Date: ${new Date().toLocaleDateString('en-GB')}`, {
        x: width - 210,
        y: height - 70,
        size: 7.5,
        font,
        color: rgb(0.65, 0.65, 0.65),
      });

      // Divider
      page.drawLine({
        start: { x: 36, y: height - 84 },
        end: { x: width - 36, y: height - 84 },
        thickness: 0.8,
        color: rgb(0.25, 0.25, 0.3),
      });

      // Client & Event Details Box
      page.drawRectangle({
        x: 36,
        y: height - 146,
        width: width - 72,
        height: 54,
        color: rgb(0.08, 0.08, 0.11),
        borderColor: rgb(0.2, 0.2, 0.25),
        borderWidth: 0.6,
      });

      page.drawText('CLIENT & EVENT PARTICULARS', {
        x: 46,
        y: height - 102,
        size: 7.5,
        font: fontBold,
        color: rgb(0.85, 0.7, 0.25),
      });

      page.drawText(`Client / Couple: ${clientName}`, {
        x: 46,
        y: height - 116,
        size: 8.5,
        font: fontBold,
        color: rgb(0.95, 0.95, 0.95),
      });

      page.drawText(`Contact: ${clientPhone} | Email: ${clientEmail}`, {
        x: 46,
        y: height - 128,
        size: 7.5,
        font,
        color: rgb(0.7, 0.7, 0.7),
      });

      page.drawText(`Dates: ${eventDates}`, {
        x: 310,
        y: height - 116,
        size: 8,
        font,
        color: rgb(0.85, 0.85, 0.85),
      });

      page.drawText(`Venue: ${eventVenue}`, {
        x: 310,
        y: height - 128,
        size: 7.5,
        font,
        color: rgb(0.7, 0.7, 0.7),
      });

      // Deliverables Table Header
      const tableY = height - 164;
      page.drawRectangle({
        x: 36,
        y: tableY - 14,
        width: width - 72,
        height: 18,
        color: rgb(0.12, 0.12, 0.16),
      });

      page.drawText('SERVICE DELIVERABLES / PACKAGE', {
        x: 46,
        y: tableY - 10,
        size: 8,
        font: fontBold,
        color: rgb(0.85, 0.7, 0.25),
      });

      page.drawText('QTY', {
        x: 375,
        y: tableY - 10,
        size: 8,
        font: fontBold,
        color: rgb(0.85, 0.7, 0.25),
      });

      page.drawText('RATE (INR)', {
        x: 420,
        y: tableY - 10,
        size: 8,
        font: fontBold,
        color: rgb(0.85, 0.7, 0.25),
      });

      page.drawText('TOTAL', {
        x: 505,
        y: tableY - 10,
        size: 8,
        font: fontBold,
        color: rgb(0.85, 0.7, 0.25),
      });

      // Table Rows
      let currentY = tableY - 32;
      for (let i = 0; i < items.length; i++) {
        const itm = items[i];
        const lineTotal = itm.qty * itm.rate;

        page.drawText(`${i + 1}. ${itm.name}`, {
          x: 46,
          y: currentY,
          size: 8,
          font: fontBold,
          color: rgb(0.9, 0.9, 0.9),
        });

        if (itm.description) {
          page.drawText(itm.description.slice(0, 68), {
            x: 56,
            y: currentY - 10,
            size: 6.8,
            font,
            color: rgb(0.55, 0.55, 0.55),
          });
        }

        page.drawText(`${itm.qty}`, {
          x: 382,
          y: currentY,
          size: 8,
          font,
          color: rgb(0.8, 0.8, 0.8),
        });

        page.drawText(`₹${itm.rate.toLocaleString('en-IN')}`, {
          x: 420,
          y: currentY,
          size: 8,
          font,
          color: rgb(0.8, 0.8, 0.8),
        });

        page.drawText(`₹${lineTotal.toLocaleString('en-IN')}`, {
          x: 505,
          y: currentY,
          size: 8,
          font: fontBold,
          color: rgb(0.95, 0.95, 0.95),
        });

        currentY -= 24;
      }

      // Financials Summary Box
      const summaryY = currentY - 10;
      page.drawRectangle({
        x: 310,
        y: summaryY - 80,
        width: width - 310 - 36,
        height: 80,
        color: rgb(0.08, 0.08, 0.11),
        borderColor: rgb(0.2, 0.2, 0.25),
        borderWidth: 0.6,
      });

      page.drawText(`Subtotal:`, { x: 325, y: summaryY - 16, size: 8, font, color: rgb(0.7, 0.7, 0.7) });
      page.drawText(`₹${subtotal.toLocaleString('en-IN')}`, { x: 495, y: summaryY - 16, size: 8, font, color: rgb(0.9, 0.9, 0.9) });

      page.drawText(`Discount (${discountPercent}%):`, { x: 325, y: summaryY - 30, size: 8, font, color: rgb(0.7, 0.7, 0.7) });
      page.drawText(`- ₹${discountAmount.toLocaleString('en-IN')}`, { x: 495, y: summaryY - 30, size: 8, font, color: rgb(0.9, 0.4, 0.4) });

      page.drawText(`GST (${gstPercent}%):`, { x: 325, y: summaryY - 44, size: 8, font, color: rgb(0.7, 0.7, 0.7) });
      page.drawText(`+ ₹${gstAmount.toLocaleString('en-IN')}`, { x: 495, y: summaryY - 44, size: 8, font, color: rgb(0.9, 0.9, 0.9) });

      // Grand Total Highlight
      page.drawRectangle({
        x: 310,
        y: summaryY - 78,
        width: width - 310 - 36,
        height: 24,
        color: rgb(0.85, 0.7, 0.25),
      });

      page.drawText(`GRAND TOTAL:`, { x: 325, y: summaryY - 68, size: 9, font: fontBold, color: rgb(0, 0, 0) });
      page.drawText(`₹${grandTotal.toLocaleString('en-IN')}`, { x: 485, y: summaryY - 68, size: 10, font: fontBold, color: rgb(0, 0, 0) });

      // Payment Milestone Terms on left
      page.drawText('PAYMENT MILESTONE SCHEDULE', {
        x: 36,
        y: summaryY - 16,
        size: 8,
        font: fontBold,
        color: rgb(0.85, 0.7, 0.25),
      });

      page.drawText(`1. Advance Booking (${advancePercent}%): ₹${advanceAmount.toLocaleString('en-IN')} (Confirms dates)`, {
        x: 36,
        y: summaryY - 30,
        size: 7.5,
        font,
        color: rgb(0.8, 0.8, 0.8),
      });

      page.drawText(`2. On Event Day (${eventDayPercent}%): ₹${eventDayAmount.toLocaleString('en-IN')} (During rituals)`, {
        x: 36,
        y: summaryY - 44,
        size: 7.5,
        font,
        color: rgb(0.8, 0.8, 0.8),
      });

      page.drawText(`3. Final Delivery (${deliveryPercent}%): ₹${deliveryAmount.toLocaleString('en-IN')} (Album & films)`, {
        x: 36,
        y: summaryY - 58,
        size: 7.5,
        font,
        color: rgb(0.8, 0.8, 0.8),
      });

      // Dual Signatures Area
      const sigY = summaryY - 180;
      page.drawLine({
        start: { x: 36, y: sigY + 80 },
        end: { x: width - 36, y: sigY + 80 },
        thickness: 0.5,
        color: rgb(0.2, 0.2, 0.25),
      });

      // Embed Studio Signature if available
      if (studioCanvasRef.current && studioSigned) {
        try {
          const dataUrl = studioCanvasRef.current.toDataURL('image/png');
          const pngBytes = await fetch(dataUrl).then((r) => r.arrayBuffer());
          const embedSig = await pdfDoc.embedPng(pngBytes);
          page.drawImage(embedSig, {
            x: 46,
            y: sigY + 20,
            width: 150,
            height: 50,
          });
        } catch (e) {
          console.warn(e);
        }
      }

      // Embed Client Signature if available
      if (clientCanvasRef.current && clientSigned) {
        try {
          const dataUrl = clientCanvasRef.current.toDataURL('image/png');
          const pngBytes = await fetch(dataUrl).then((r) => r.arrayBuffer());
          const embedSig = await pdfDoc.embedPng(pngBytes);
          page.drawImage(embedSig, {
            x: width - 200,
            y: sigY + 20,
            width: 150,
            height: 50,
          });
        } catch (e) {
          console.warn(e);
        }
      }

      // Signature line bars
      page.drawLine({
        start: { x: 46, y: sigY + 16 },
        end: { x: 210, y: sigY + 16 },
        thickness: 0.8,
        color: rgb(0.85, 0.7, 0.25),
      });

      page.drawText('Authorized Studio Signature / Stamp', {
        x: 46,
        y: sigY + 4,
        size: 7.5,
        font: fontBold,
        color: rgb(0.7, 0.7, 0.7),
      });

      page.drawLine({
        start: { x: width - 200, y: sigY + 16 },
        end: { x: width - 36, y: sigY + 16 },
        thickness: 0.8,
        color: rgb(0.85, 0.7, 0.25),
      });

      page.drawText('Accepted & Confirmed by Client', {
        x: width - 190,
        y: sigY + 4,
        size: 7.5,
        font: fontBold,
        color: rgb(0.7, 0.7, 0.7),
      });

      // Bottom footer notes
      page.drawText(
        '* Terms: Raw unedited footage delivered on client hard disk within 7 days. Final edited album delivered within 30 days of photo proofing selection.',
        {
          x: 36,
          y: 20,
          size: 6.5,
          font,
          color: rgb(0.5, 0.5, 0.5),
        }
      );

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `wedding_contract_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
      link.click();

      addToast({
        type: 'success',
        title: 'Contract PDF Downloaded',
        message: 'Your official quotation & signed contract PDF is ready!',
      });
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'PDF Generation Failed',
        message: 'Could not generate contract PDF. Please check details.',
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
              to="/wedding-studio"
              className="p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition"
              title="Back to Studio Hub"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Wedding Quotation & Contract Maker
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 text-[10px] font-bold border border-amber-400/20 uppercase">
                  Contract Engine
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Custom photography packages, tax breakdown, dual e-signatures & print PDF.
              </p>
            </div>
          </div>

          <button
            onClick={generatePdfContract}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black text-xs font-bold hover:brightness-110 shadow-gold-glow transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating PDF...' : 'Download Signed PDF Contract'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Studio & Client Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Studio Profile Card */}
          <div className="p-6 rounded-3xl bg-[#0E0E14] border border-white/10 shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-amber-400">
              <Building className="w-4 h-4" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Studio Details
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Studio / Brand Name</label>
                <input
                  type="text"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Tagline</label>
                <input
                  type="text"
                  value={studioTagline}
                  onChange={(e) => setStudioTagline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:border-amber-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={studioPhone}
                    onChange={(e) => setStudioPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Email</label>
                  <input
                    type="text"
                    value={studioEmail}
                    onChange={(e) => setStudioEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Address</label>
                  <input
                    type="text"
                    value={studioAddress}
                    onChange={(e) => setStudioAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">GSTIN / Reg No.</label>
                  <input
                    type="text"
                    value={studioGstin}
                    onChange={(e) => setStudioGstin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Client & Event Profile Card */}
          <div className="p-6 rounded-3xl bg-[#0E0E14] border border-white/10 shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-amber-400">
              <User className="w-4 h-4" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Client & Event Specifics
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Couple / Client Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Quotation Ref No.</label>
                  <input
                    type="text"
                    value={quotationNo}
                    onChange={(e) => setQuotationNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Client Phone</label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Client Email</label>
                  <input
                    type="text"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Event Dates & Functions</label>
                <input
                  type="text"
                  value={eventDates}
                  onChange={(e) => setEventDates(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Event Venue & City</label>
                <input
                  type="text"
                  value={eventVenue}
                  onChange={(e) => setEventVenue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:border-amber-400 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Deliverables Line Items Section */}
        <div className="p-6 rounded-3xl bg-[#0E0E14] border border-white/10 shadow-xl">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Photography & Videography Deliverables
              </h2>
              <p className="text-xs text-zinc-400">
                Custom line items for candid, traditional, cinematic films, drone, and albums.
              </p>
            </div>
            <button
              onClick={addItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-amber-400 hover:text-white hover:bg-zinc-800 text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service Item</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Service Name & Description</th>
                  <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                  <th className="py-2.5 px-3 w-32 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-3 w-32 text-right">Total (₹)</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((item) => (
                  <tr key={item.id} className="group hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        className="w-full px-2 py-1 rounded-lg bg-zinc-900/60 border border-white/5 text-white font-medium text-xs mb-1 outline-none focus:border-amber-400"
                      />
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Deliverable specifications..."
                        className="w-full px-2 py-1 rounded-lg bg-transparent border border-transparent hover:border-white/10 text-zinc-400 text-[11px] outline-none focus:border-amber-400"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 text-center rounded-lg bg-zinc-900 border border-white/10 text-white text-xs outline-none focus:border-amber-400"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-28 px-2 py-1 text-right rounded-lg bg-zinc-900 border border-white/10 text-white text-xs outline-none focus:border-amber-400"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                      ₹{(item.qty * item.rate).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={items.length <= 1}
                        className="p-1 rounded text-zinc-500 hover:text-rose-400 disabled:opacity-30 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pricing Summary & Payment Terms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Milestone Payment Terms */}
          <div className="p-6 rounded-3xl bg-[#0E0E14] border border-white/10 shadow-xl space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Milestone Payment Schedule</span>
            </h3>

            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white block">1. Advance Booking</span>
                  <span className="text-[11px] text-zinc-400">Locks & confirms event dates</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-amber-400 font-bold block">{advancePercent}%</span>
                  <span className="text-xs font-extrabold text-white">
                    ₹{advanceAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white block">2. On Event Dates</span>
                  <span className="text-[11px] text-zinc-400">During principal wedding ceremonies</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-amber-400 font-bold block">{eventDayPercent}%</span>
                  <span className="text-xs font-extrabold text-white">
                    ₹{eventDayAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white block">3. Final Delivery</span>
                  <span className="text-[11px] text-zinc-400">Handover of printed albums & films</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-amber-400 font-bold block">{deliveryPercent}%</span>
                  <span className="text-xs font-extrabold text-white">
                    ₹{deliveryAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Totals Card */}
          <div className="p-6 rounded-3xl bg-[#0E0E14] border border-white/10 shadow-xl space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-amber-400" />
              <span>Investment & Taxes</span>
            </h3>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Subtotal ({items.length} services):</span>
                <span className="font-semibold text-white">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-400">
                <div className="flex items-center gap-2">
                  <span>Special Discount:</span>
                  <select
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
                    className="px-2 py-0.5 rounded bg-zinc-900 border border-white/10 text-white text-[11px]"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="10">10%</option>
                    <option value="15">15%</option>
                    <option value="20">20%</option>
                  </select>
                </div>
                <span className="text-rose-400 font-semibold">
                  - ₹{discountAmount.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-400">
                <div className="flex items-center gap-2">
                  <span>Applicable GST:</span>
                  <select
                    value={gstPercent}
                    onChange={(e) => setGstPercent(parseInt(e.target.value) || 0)}
                    className="px-2 py-0.5 rounded bg-zinc-900 border border-white/10 text-white text-[11px]"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18% (Standard)</option>
                  </select>
                </div>
                <span className="text-white font-semibold">
                  + ₹{gstAmount.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-sm">
                <span className="font-extrabold text-white">Grand Total:</span>
                <span className="text-xl font-black text-amber-400">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dual HTML5 E-Signature Pads */}
        <div className="p-6 rounded-3xl bg-[#0E0E14] border border-white/10 shadow-xl">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <PenTool className="w-4 h-4 text-amber-400" />
              <span>Dual Digital E-Signatures</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Sign directly on the screen (touch or mouse). Both signatures are securely embedded in the final contract PDF.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Studio Signature Pad */}
            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-200">
                  Photographer / Studio Sign
                </span>
                <button
                  onClick={() => clearCanvas('studio')}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-amber-400 transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="border border-white/10 rounded-xl bg-black/40 overflow-hidden relative touch-none">
                <canvas
                  ref={studioCanvasRef}
                  width={380}
                  height={120}
                  onMouseDown={(e) => handleStartDraw(e, 'studio')}
                  onMouseMove={(e) => handleDrawMove(e, 'studio')}
                  onMouseUp={() => handleStopDraw('studio')}
                  onMouseLeave={() => handleStopDraw('studio')}
                  onTouchStart={(e) => handleStartDraw(e, 'studio')}
                  onTouchMove={(e) => handleDrawMove(e, 'studio')}
                  onTouchEnd={() => handleStopDraw('studio')}
                  className="w-full h-28 cursor-crosshair"
                />
                {!studioSigned && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-600 text-xs italic">
                    Draw Photographer Signature here
                  </div>
                )}
              </div>
            </div>

            {/* Client Signature Pad */}
            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-200">
                  Client / Couple Sign
                </span>
                <button
                  onClick={() => clearCanvas('client')}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-amber-400 transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="border border-white/10 rounded-xl bg-black/40 overflow-hidden relative touch-none">
                <canvas
                  ref={clientCanvasRef}
                  width={380}
                  height={120}
                  onMouseDown={(e) => handleStartDraw(e, 'client')}
                  onMouseMove={(e) => handleDrawMove(e, 'client')}
                  onMouseUp={() => handleStopDraw('client')}
                  onMouseLeave={() => handleStopDraw('client')}
                  onTouchStart={(e) => handleStartDraw(e, 'client')}
                  onTouchMove={(e) => handleDrawMove(e, 'client')}
                  onTouchEnd={() => handleStopDraw('client')}
                  className="w-full h-28 cursor-crosshair"
                />
                {!clientSigned && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-600 text-xs italic">
                    Draw Client Signature here
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
