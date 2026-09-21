import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  Printer,
  Download,
  Plus,
  Trash2,
  Users,
  Sparkles,
  Layers,
  FileText,
  Upload,
  CheckCircle2,
  Scissors,
  Bookmark,
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { useToastStore } from '../../stores/useToastStore';

export interface GuestItem {
  id: string;
  name: string;
  tableNumber: string;
  tag: 'VIP' | 'Groom Family' | 'Bride Family' | 'Friends' | 'Special Guest';
}

const SAMPLE_GUESTS: GuestItem[] = [
  { id: '1', name: 'Shri Vikramaditya & Family', tableNumber: 'Table 1', tag: 'VIP' },
  { id: '2', name: 'Dr. Rajeshwar Sharma', tableNumber: 'Table 1', tag: 'VIP' },
  { id: '3', name: 'Kabir & Meera Singhania', tableNumber: 'Table 2', tag: 'Groom Family' },
  { id: '4', name: 'Col. Devendra Rathore', tableNumber: 'Table 2', tag: 'Groom Family' },
  { id: '5', name: 'Smt. Suniti Devi Verma', tableNumber: 'Table 3', tag: 'Bride Family' },
  { id: '6', name: 'Prof. Alok & Neeta Mathur', tableNumber: 'Table 3', tag: 'Bride Family' },
  { id: '7', name: 'Aarav Mehta & Friends', tableNumber: 'Table 4', tag: 'Friends' },
  { id: '8', name: 'Kavya & Siddharth Roy', tableNumber: 'Table 4', tag: 'Friends' },
];

export const WeddingGuestCardsPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [weddingTitle, setWeddingTitle] = useState('Rohan & Ananya');
  const [weddingDate, setWeddingDate] = useState('December 15, 2026');
  const [venueName, setVenueName] = useState('The Oberoi Udaivilas, Udaipur');
  const [cardLayout, setCardLayout] = useState<'tent' | 'badge'>('tent'); // 'tent' = 4 folding cards per A4, 'badge' = 8 lanyard badges per A4
  const [guests, setGuests] = useState<GuestItem[]>(SAMPLE_GUESTS);
  const [bulkText, setBulkText] = useState('');
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk'>('manual');
  const [isExporting, setIsExporting] = useState(false);

  // Manual guest input state
  const [newName, setNewName] = useState('');
  const [newTable, setNewTable] = useState('Table 1');
  const [newTag, setNewTag] = useState<GuestItem['tag']>('VIP');

  const addGuest = () => {
    if (!newName.trim()) return;
    setGuests((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        name: newName.trim(),
        tableNumber: newTable.trim() || 'Table 1',
        tag: newTag,
      },
    ]);
    setNewName('');
    addToast({
      type: 'success',
      title: 'Guest Added',
      message: `${newName} added to list.`,
    });
  };

  const removeGuest = (id: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== id));
  };

  const parseBulkCsv = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsed: GuestItem[] = [];

    lines.forEach((line, idx) => {
      // Split by comma or tab
      const parts = line.split(/[,\t]/).map((p) => p.trim());
      if (parts.length > 0 && parts[0]) {
        // Skip header if contains 'Name'
        if (parts[0].toLowerCase() === 'name' || parts[0].toLowerCase() === 'guest name') return;
        const name = parts[0];
        const tableNumber = parts[1] || 'Table 1';
        const tag = (parts[2] as any) || 'Special Guest';
        parsed.push({
          id: `${Date.now()}-${idx}`,
          name,
          tableNumber,
          tag,
        });
      }
    });

    if (parsed.length === 0) {
      addToast({
        type: 'error',
        title: 'Parse Error',
        message: 'No valid guest rows detected. Format: Name, Table, Tag',
      });
      return;
    }

    setGuests((prev) => [...prev, ...parsed]);
    setBulkText('');
    setActiveTab('manual');
    addToast({
      type: 'success',
      title: 'Bulk Guests Imported',
      message: `Imported ${parsed.length} guests into card generator!`,
    });
  };

  // Generate PDF with pdf-lib
  const generatePrintablePdf = async () => {
    if (guests.length === 0) {
      addToast({
        type: 'info',
        title: 'Guest List Empty',
        message: 'Please add at least one guest.',
      });
      return;
    }

    setIsExporting(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

      // A4 portrait: 595.28 x 841.89
      const pageWidth = 595.28;
      const pageHeight = 841.89;

      if (cardLayout === 'tent') {
        // 4 Folding Tent Cards per A4 Sheet (2 columns x 2 rows)
        // Each card folded horizontally in the middle: top half (upside down or blank) & bottom half (front view)
        const cols = 2;
        const rows = 2;
        const cardsPerPage = cols * rows; // 4
        const totalPages = Math.ceil(guests.length / cardsPerPage);

        const cardWidth = (pageWidth - 40) / cols;
        const cardHeight = (pageHeight - 40) / rows;

        for (let pIdx = 0; pIdx < totalPages; pIdx++) {
          const page = pdfDoc.addPage([pageWidth, pageHeight]);

          // Page background: clean bright ivory/white for crisp printing
          page.drawRectangle({
            x: 0,
            y: 0,
            width: pageWidth,
            height: pageHeight,
            color: rgb(0.99, 0.98, 0.96),
          });

          // Cutting guides around page edges
          page.drawLine({
            start: { x: 20, y: pageHeight / 2 },
            end: { x: pageWidth - 20, y: pageHeight / 2 },
            thickness: 0.5,
            color: rgb(0.75, 0.75, 0.75),
          });
          page.drawLine({
            start: { x: pageWidth / 2, y: 20 },
            end: { x: pageWidth / 2, y: pageHeight - 20 },
            thickness: 0.5,
            color: rgb(0.75, 0.75, 0.75),
          });

          const pageGuests = guests.slice(pIdx * cardsPerPage, (pIdx + 1) * cardsPerPage);

          for (let i = 0; i < pageGuests.length; i++) {
            const guest = pageGuests[i];
            const col = i % cols;
            const row = Math.floor(i / cols);

            const cardX = 20 + col * cardWidth;
            // row 0 is top half, row 1 is bottom half
            const cardY = pageHeight - 20 - (row + 1) * cardHeight;

            // Outer card frame
            page.drawRectangle({
              x: cardX + 5,
              y: cardY + 5,
              width: cardWidth - 10,
              height: cardHeight - 10,
              color: rgb(1, 1, 1),
              borderColor: rgb(0.85, 0.72, 0.35), // Royal Gold
              borderWidth: 1.2,
            });

            // Inner ornate double border
            page.drawRectangle({
              x: cardX + 10,
              y: cardY + 10,
              width: cardWidth - 20,
              height: cardHeight - 20,
              borderColor: rgb(0.88, 0.78, 0.45),
              borderWidth: 0.6,
            });

            // Fold guide line in center of this tent card
            const foldY = cardY + cardHeight / 2;
            page.drawLine({
              start: { x: cardX + 12, y: foldY },
              end: { x: cardX + cardWidth - 12, y: foldY },
              thickness: 0.5,
              color: rgb(0.7, 0.7, 0.7),
            });

            page.drawText('- - - FOLD HERE - - -', {
              x: cardX + cardWidth / 2 - 38,
              y: foldY + 2,
              size: 6,
              font,
              color: rgb(0.7, 0.7, 0.7),
            });

            // TOP HALF (Back of folded tent card)
            page.drawText(weddingTitle.toUpperCase(), {
              x: cardX + cardWidth / 2 - (weddingTitle.length * 4),
              y: cardY + cardHeight - 45,
              size: 11,
              font: fontBold,
              color: rgb(0.75, 0.6, 0.2),
            });

            page.drawText(`${weddingDate} • ${venueName}`, {
              x: cardX + cardWidth / 2 - 75,
              y: cardY + cardHeight - 62,
              size: 6.5,
              font: fontOblique,
              color: rgb(0.5, 0.5, 0.5),
            });

            // BOTTOM HALF (Front face of table tent card)
            // Welcome Header
            page.drawText('WELCOME TO THE CELEBRATION OF', {
              x: cardX + cardWidth / 2 - 68,
              y: foldY - 30,
              size: 6.5,
              font: fontBold,
              color: rgb(0.65, 0.5, 0.15),
            });

            page.drawText(weddingTitle, {
              x: cardX + cardWidth / 2 - (weddingTitle.length * 4.5),
              y: foldY - 48,
              size: 13,
              font: fontBold,
              color: rgb(0.15, 0.15, 0.2),
            });

            // Guest Name Box
            const nameBoxY = foldY - 110;
            page.drawRectangle({
              x: cardX + 22,
              y: nameBoxY,
              width: cardWidth - 44,
              height: 48,
              color: rgb(0.98, 0.96, 0.92),
              borderColor: rgb(0.85, 0.72, 0.35),
              borderWidth: 0.8,
            });

            page.drawText(guest.name, {
              x: cardX + cardWidth / 2 - (guest.name.length * 3.5),
              y: nameBoxY + 26,
              size: 11.5,
              font: fontBold,
              color: rgb(0.1, 0.1, 0.15),
            });

            // Table Number & Tag
            page.drawText(`${guest.tableNumber}   |   ${guest.tag.toUpperCase()}`, {
              x: cardX + cardWidth / 2 - 50,
              y: nameBoxY + 12,
              size: 8,
              font: fontBold,
              color: rgb(0.75, 0.55, 0.15),
            });
          }
        }
      } else {
        // Option B: 8 VIP Event Badges per A4 Sheet (2 cols x 4 rows)
        const cols = 2;
        const rows = 4;
        const cardsPerPage = cols * rows; // 8
        const totalPages = Math.ceil(guests.length / cardsPerPage);

        const cardWidth = (pageWidth - 40) / cols;
        const cardHeight = (pageHeight - 40) / rows;

        for (let pIdx = 0; pIdx < totalPages; pIdx++) {
          const page = pdfDoc.addPage([pageWidth, pageHeight]);

          page.drawRectangle({
            x: 0,
            y: 0,
            width: pageWidth,
            height: pageHeight,
            color: rgb(0.98, 0.98, 0.98),
          });

          const pageGuests = guests.slice(pIdx * cardsPerPage, (pIdx + 1) * cardsPerPage);

          for (let i = 0; i < pageGuests.length; i++) {
            const guest = pageGuests[i];
            const col = i % cols;
            const row = Math.floor(i / cols);

            const cardX = 20 + col * cardWidth;
            const cardY = pageHeight - 20 - (row + 1) * cardHeight;

            // Badge Background
            page.drawRectangle({
              x: cardX + 4,
              y: cardY + 4,
              width: cardWidth - 8,
              height: cardHeight - 8,
              color: rgb(0.08, 0.08, 0.11), // Elegant dark VIP card
              borderColor: rgb(0.85, 0.72, 0.35),
              borderWidth: 1.2,
            });

            // Punch hole guide circle
            page.drawCircle({
              x: cardX + cardWidth / 2,
              y: cardY + cardHeight - 18,
              size: 4,
              borderColor: rgb(0.5, 0.5, 0.5),
              borderWidth: 0.5,
              color: rgb(0.2, 0.2, 0.2),
            });

            // Header Event
            page.drawText(weddingTitle.toUpperCase(), {
              x: cardX + cardWidth / 2 - (weddingTitle.length * 3.8),
              y: cardY + cardHeight - 38,
              size: 9.5,
              font: fontBold,
              color: rgb(0.9, 0.75, 0.3),
            });

            page.drawText('HONOURED GUEST PASS', {
              x: cardX + cardWidth / 2 - 45,
              y: cardY + cardHeight - 50,
              size: 6.5,
              font: fontBold,
              color: rgb(0.65, 0.65, 0.65),
            });

            // Guest Name
            page.drawText(guest.name, {
              x: cardX + cardWidth / 2 - (guest.name.length * 3.2),
              y: cardY + cardHeight - 84,
              size: 10.5,
              font: fontBold,
              color: rgb(1, 1, 1),
            });

            // Tag & Table Box
            page.drawRectangle({
              x: cardX + 20,
              y: cardY + 20,
              width: cardWidth - 40,
              height: 32,
              color: rgb(0.14, 0.14, 0.18),
              borderColor: rgb(0.3, 0.3, 0.35),
              borderWidth: 0.6,
            });

            page.drawText(guest.tag.toUpperCase(), {
              x: cardX + cardWidth / 2 - 35,
              y: cardY + 38,
              size: 8,
              font: fontBold,
              color: rgb(0.95, 0.8, 0.3),
            });

            page.drawText(guest.tableNumber, {
              x: cardX + cardWidth / 2 - 22,
              y: cardY + 26,
              size: 7.5,
              font,
              color: rgb(0.7, 0.7, 0.7),
            });
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `wedding_guest_cards_${cardLayout}_${Date.now()}.pdf`;
      link.click();

      addToast({
        type: 'success',
        title: 'Print-Ready PDF Downloaded',
        message: `Generated ${cardLayout === 'tent' ? 'Tent Cards' : 'VIP Badges'} for ${guests.length} guests.`,
      });
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Export Failed',
        message: 'Could not generate printable PDF.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090C] text-zinc-100 flex flex-col">
      {/* Top Header */}
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
                  Guest Badges & Table Tent Cards
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20 uppercase">
                  Print Ready
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Generate printable A4 luxury tent cards & VIP passes with cut/fold lines.
              </p>
            </div>
          </div>

          <button
            onClick={generatePrintablePdf}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black text-xs font-bold hover:brightness-110 shadow-gold-glow transition disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>{isExporting ? 'Preparing Print PDF...' : 'Download Printable A4 PDF'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Event Meta and Layout Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-3xl bg-[#0E0E14] border border-white/10 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Couple & Event Title
            </h3>
            <input
              type="text"
              value={weddingTitle}
              onChange={(e) => setWeddingTitle(e.target.value)}
              placeholder="e.g. Rohan & Ananya"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs outline-none focus:border-amber-400"
            />
          </div>

          <div className="p-5 rounded-3xl bg-[#0E0E14] border border-white/10 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Event Date & Venue
            </h3>
            <input
              type="text"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
              placeholder="e.g. Dec 15, 2026"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs outline-none focus:border-amber-400 mb-2"
            />
            <input
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="Venue name..."
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs outline-none focus:border-amber-400"
            />
          </div>

          <div className="p-5 rounded-3xl bg-[#0E0E14] border border-white/10 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Print Sheet Layout
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setCardLayout('tent')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                  cardLayout === 'tent'
                    ? 'bg-amber-400/10 border-amber-400 text-amber-400 font-bold'
                    : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <Scissors className="w-4 h-4" />
                <span>Foldable Tent (4/A4)</span>
              </button>

              <button
                onClick={() => setCardLayout('badge')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                  cardLayout === 'badge'
                    ? 'bg-amber-400/10 border-amber-400 text-amber-400 font-bold'
                    : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>VIP Badges (8/A4)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Guest List Entry (Manual & Bulk) */}
        <div className="p-6 rounded-3xl bg-[#0E0E14] border border-white/10 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-bold text-white">
                Guest Roster ({guests.length} Guests)
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setActiveTab('manual')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  activeTab === 'manual'
                    ? 'bg-amber-400 text-black font-bold'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                Manual Entry
              </button>
              <button
                onClick={() => setActiveTab('bulk')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  activeTab === 'bulk'
                    ? 'bg-amber-400 text-black font-bold'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                Bulk CSV / Paste
              </button>
              <button
                onClick={() => setGuests(SAMPLE_GUESTS)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-amber-400 transition"
              >
                Reset Sample
              </button>
            </div>
          </div>

          {activeTab === 'manual' ? (
            <div>
              {/* Quick Add Form */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-white/5 mb-6 text-xs">
                <div className="sm:col-span-2">
                  <label className="text-zinc-400 block mb-1">Guest / Family Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                    placeholder="e.g. Mr. & Mrs. Kapoor"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Table #</label>
                  <input
                    type="text"
                    value={newTable}
                    onChange={(e) => setNewTable(e.target.value)}
                    placeholder="Table 1"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Badge Tag</label>
                  <div className="flex gap-2">
                    <select
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white outline-none focus:border-amber-400"
                    >
                      <option value="VIP">VIP</option>
                      <option value="Groom Family">Groom Family</option>
                      <option value="Bride Family">Bride Family</option>
                      <option value="Friends">Friends</option>
                      <option value="Special Guest">Special Guest</option>
                    </select>

                    <button
                      onClick={addGuest}
                      className="px-3.5 py-2 rounded-xl bg-amber-400 text-black font-bold hover:brightness-110 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Guests Table */}
              <div className="overflow-x-auto max-h-96 overflow-y-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#0E0E14] border-b border-white/10 text-zinc-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Guest Name</th>
                      <th className="py-2.5 px-3">Table</th>
                      <th className="py-2.5 px-3">Category Tag</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {guests.map((g, idx) => (
                      <tr key={g.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 text-zinc-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">{g.name}</td>
                        <td className="py-2.5 px-3 text-zinc-300">{g.tableNumber}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-400 text-[10px] font-bold border border-amber-400/20">
                            {g.tag}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => removeGuest(g.id)}
                            className="p-1 text-zinc-500 hover:text-rose-400"
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
          ) : (
            /* Bulk Paste Tab */
            <div className="space-y-4 text-xs">
              <p className="text-zinc-400">
                Paste your guest list from Excel or Google Sheets (one guest per line: <code>Name, Table, Tag</code>):
              </p>
              <textarea
                rows={8}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`Rohan Verma, Table 1, VIP\nAnanya Sharma, Table 1, Bride Family\nDr. K. K. Singhal, Table 2, VIP\nSimran Kaur, Table 3, Friends`}
                className="w-full p-3 rounded-2xl bg-zinc-900 border border-white/10 text-white font-mono text-xs outline-none focus:border-amber-400"
              />
              <button
                onClick={parseBulkCsv}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-black font-bold text-xs hover:brightness-110 shadow-gold-glow transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Parse & Add Guests to Cards</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
