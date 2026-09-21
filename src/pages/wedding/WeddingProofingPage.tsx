import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Star,
  X,
  Check,
  Download,
  Filter,
  FileText,
  Images,
  Trash2,
  Eye,
  Copy,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Upload,
  Layers,
  Sparkles,
  Camera,
  CheckCircle2,
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { useToastStore } from '../../stores/useToastStore';

interface ProofingPhoto {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  rating: number; // 0 to 5
  isHearted: boolean;
  isRejected: boolean;
}

export const WeddingProofingPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);
  const [photos, setPhotos] = useState<ProofingPhoto[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'hearted' | '5' | '4' | '3' | 'unrated' | 'rejected'>('all');
  const [enlargedIndex, setEnlargedIndex] = useState<number | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newPhotos: ProofingPhoto[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (!f.type.startsWith('image/')) continue;
      newPhotos.push({
        id: `${f.name}-${f.size}-${Date.now()}-${i}`,
        file: f,
        url: URL.createObjectURL(f),
        name: f.name,
        size: f.size,
        rating: 0,
        isHearted: false,
        isRejected: false,
      });
    }

    if (newPhotos.length === 0) {
      addToast({
        type: 'error',
        title: 'No Images Found',
        message: 'Please select valid image files (JPG, PNG, WebP).',
      });
      return;
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
    addToast({
      type: 'success',
      title: 'Photos Added',
      message: `Loaded ${newPhotos.length} photos into proofing workspace.`,
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const setRating = (id: string, rating: number) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const newRating = p.rating === rating ? 0 : rating;
        return {
          ...p,
          rating: newRating,
          // If rated, remove rejected
          isRejected: newRating > 0 ? false : p.isRejected,
        };
      })
    );
  };

  const toggleHeart = (id: string) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextHeart = !p.isHearted;
        return {
          ...p,
          isHearted: nextHeart,
          isRejected: nextHeart ? false : p.isRejected,
        };
      })
    );
  };

  const toggleReject = (id: string) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextReject = !p.isRejected;
        return {
          ...p,
          isRejected: nextReject,
          isHearted: nextReject ? false : p.isHearted,
          rating: nextReject ? 0 : p.rating,
        };
      })
    );
  };

  const clearAll = () => {
    if (window.confirm('Clear all loaded photos from this proofing session?')) {
      photos.forEach((p) => URL.revokeObjectURL(p.url));
      setPhotos([]);
      setEnlargedIndex(null);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = photos.length;
    const hearted = photos.filter((p) => p.isHearted).length;
    const rejected = photos.filter((p) => p.isRejected).length;
    const fiveStar = photos.filter((p) => p.rating === 5).length;
    const fourStar = photos.filter((p) => p.rating === 4).length;
    const threeStar = photos.filter((p) => p.rating === 3).length;
    const unrated = photos.filter((p) => p.rating === 0 && !p.isHearted && !p.isRejected).length;
    return { total, hearted, rejected, fiveStar, fourStar, threeStar, unrated };
  }, [photos]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      if (activeFilter === 'hearted') return p.isHearted;
      if (activeFilter === '5') return p.rating === 5;
      if (activeFilter === '4') return p.rating === 4;
      if (activeFilter === '3') return p.rating === 3;
      if (activeFilter === 'unrated') return p.rating === 0 && !p.isHearted && !p.isRejected;
      if (activeFilter === 'rejected') return p.isRejected;
      return true;
    });
  }, [photos, activeFilter]);

  // Export 1: Contact Sheet PDF
  const exportContactSheetPdf = async () => {
    if (photos.length === 0) return;
    setIsExportingPdf(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // A4 Landscape: 842 x 595
      const pageWidth = 842;
      const pageHeight = 595;

      const cols = 4;
      const rows = 3;
      const itemsPerPage = cols * rows; // 12 photos per sheet
      const margin = 36;
      const headerHeight = 50;

      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2 - headerHeight;
      const cellWidth = usableWidth / cols;
      const cellHeight = usableHeight / rows;

      const totalPages = Math.ceil(photos.length / itemsPerPage);

      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Background
        page.drawRectangle({
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
          color: rgb(0.05, 0.05, 0.07),
        });

        // Header
        page.drawText('WEDDING & EVENT PHOTO PROOFING CONTACT SHEET', {
          x: margin,
          y: pageHeight - margin - 16,
          size: 14,
          font: fontBold,
          color: rgb(0.9, 0.75, 0.3),
        });

        page.drawText(
          `Sheet ${pageIdx + 1} of ${totalPages} • Total Photos: ${photos.length} • Selected: ${metrics.hearted} • Generated via UIKEY AI Studio`,
          {
            x: margin,
            y: pageHeight - margin - 32,
            size: 9,
            font,
            color: rgb(0.7, 0.7, 0.7),
          }
        );

        const pagePhotos = photos.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);

        for (let i = 0; i < pagePhotos.length; i++) {
          const item = pagePhotos[i];
          const col = i % cols;
          const row = Math.floor(i / cols);

          const cellX = margin + col * cellWidth;
          const cellY = pageHeight - margin - headerHeight - (row + 1) * cellHeight;

          // Cell background border
          page.drawRectangle({
            x: cellX + 4,
            y: cellY + 4,
            width: cellWidth - 8,
            height: cellHeight - 8,
            color: rgb(0.09, 0.09, 0.12),
            borderColor: item.isHearted ? rgb(0.9, 0.2, 0.4) : rgb(0.2, 0.2, 0.25),
            borderWidth: item.isHearted ? 1.5 : 0.8,
          });

          // Draw image thumbnail
          try {
            const imgBuffer = await item.file.arrayBuffer();
            let embeddedImg;
            if (item.file.type === 'image/jpeg' || item.name.toLowerCase().endsWith('.jpg') || item.name.toLowerCase().endsWith('.jpeg')) {
              embeddedImg = await pdfDoc.embedJpg(imgBuffer);
            } else {
              // Convert canvas to PNG
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const tempImg = new Image();
              await new Promise<void>((resolve, reject) => {
                tempImg.onload = () => resolve();
                tempImg.onerror = reject;
                tempImg.src = item.url;
              });
              canvas.width = Math.min(tempImg.width, 600);
              canvas.height = Math.round((canvas.width / tempImg.width) * tempImg.height);
              ctx?.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/png');
              const pngBytes = await fetch(dataUrl).then((r) => r.arrayBuffer());
              embeddedImg = await pdfDoc.embedPng(pngBytes);
            }

            const imgBoxW = cellWidth - 20;
            const imgBoxH = cellHeight - 42;

            const scale = Math.min(imgBoxW / embeddedImg.width, imgBoxH / embeddedImg.height);
            const drawW = embeddedImg.width * scale;
            const drawH = embeddedImg.height * scale;
            const drawX = cellX + 10 + (imgBoxW - drawW) / 2;
            const drawY = cellY + 28 + (imgBoxH - drawH) / 2;

            page.drawImage(embeddedImg, {
              x: drawX,
              y: drawY,
              width: drawW,
              height: drawH,
            });
          } catch (e) {
            console.warn('Error embedding image in contact sheet', e);
          }

          // Filename label
          const truncatedName =
            item.name.length > 20 ? `${item.name.slice(0, 10)}...${item.name.slice(-7)}` : item.name;
          page.drawText(truncatedName, {
            x: cellX + 10,
            y: cellY + 14,
            size: 8,
            font: fontBold,
            color: rgb(0.9, 0.9, 0.9),
          });

          // Status label (Stars or Heart)
          let statusLabel = '';
          if (item.isHearted) statusLabel += '[SELECTED] ';
          if (item.rating > 0) statusLabel += `${item.rating}* `;
          if (item.isRejected) statusLabel += '[REJECTED]';

          if (statusLabel) {
            page.drawText(statusLabel, {
              x: cellX + 10,
              y: cellY + 6,
              size: 7,
              font,
              color: item.isHearted
                ? rgb(0.95, 0.3, 0.5)
                : item.isRejected
                ? rgb(0.8, 0.3, 0.3)
                : rgb(0.9, 0.75, 0.3),
            });
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `photo_proofing_contact_sheet_${Date.now()}.pdf`;
      link.click();

      addToast({
        type: 'success',
        title: 'Contact Sheet Exported',
        message: 'Your A4 contact sheet PDF is ready!',
      });
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Export Failed',
        message: 'Could not render contact sheet PDF. Try with fewer photos.',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export 2: Clean filenames for Lightroom / Editors
  const exportFilenamesText = (onlySelected = true) => {
    const list = onlySelected
      ? photos.filter((p) => p.isHearted || p.rating >= 3)
      : photos;

    if (list.length === 0) {
      addToast({
        type: 'info',
        title: 'No Photos to Export',
        message: 'No photos have been selected or hearted yet.',
      });
      return;
    }

    const textContent = list.map((p) => p.name).join(', ');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `selected_photo_filenames_${Date.now()}.txt`;
    link.click();

    addToast({
      type: 'success',
      title: 'Filenames Exported',
      message: `Exported ${list.length} selected filenames for Lightroom/Bridge filter!`,
    });
  };

  const copyFilenamesToClipboard = () => {
    const list = photos.filter((p) => p.isHearted || p.rating >= 3);
    const targetList = list.length > 0 ? list : photos;
    const textContent = targetList.map((p) => p.name).join(', ');
    navigator.clipboard.writeText(textContent).then(() => {
      addToast({
        type: 'success',
        title: 'Copied to Clipboard',
        message: `Copied ${targetList.length} filenames ready to paste into Lightroom search!`,
      });
    });
  };

  const exportCsv = () => {
    if (photos.length === 0) return;
    const rows = [
      ['Filename', 'Status', 'Rating', 'Hearted', 'Rejected', 'FileSizeBytes'],
      ...photos.map((p) => [
        `"${p.name}"`,
        p.isHearted ? 'Selected' : p.isRejected ? 'Rejected' : p.rating > 0 ? `${p.rating} Stars` : 'Unrated',
        p.rating,
        p.isHearted ? 'YES' : 'NO',
        p.isRejected ? 'YES' : 'NO',
        p.size,
      ]),
    ];

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `photo_selection_report_${Date.now()}.csv`;
    link.click();

    addToast({
      type: 'success',
      title: 'CSV Report Downloaded',
      message: 'Full proofing report exported as CSV.',
    });
  };

  return (
    <div className="min-h-screen bg-[#09090C] text-zinc-100 flex flex-col">
      {/* Top Banner */}
      <div className="bg-[#0C0C12] border-b border-white/10 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                  Photo Proofing & Client Selection
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 text-[10px] font-bold border border-amber-400/20 uppercase">
                  Studio Pro
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Bulk rate, heart favorites, export Lightroom lists and contact sheet PDFs.
              </p>
            </div>
          </div>

          {photos.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={copyFilenamesToClipboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold hover:border-amber-400/30 transition"
                title="Copy filenames to clipboard"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Copy Filenames</span>
              </button>

              <button
                onClick={() => exportFilenamesText(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold hover:border-amber-400/30 transition"
                title="Download .txt list of selected photos"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Lightroom .TXT</span>
              </button>

              <button
                onClick={exportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold hover:border-amber-400/30 transition"
                title="Export detailed CSV report"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>CSV Report</span>
              </button>

              <button
                onClick={exportContactSheetPdf}
                disabled={isExportingPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black text-xs font-bold hover:brightness-110 shadow-gold-glow transition disabled:opacity-50"
              >
                <Images className="w-3.5 h-3.5" />
                <span>{isExportingPdf ? 'Generating PDF...' : 'Contact Sheet PDF'}</span>
              </button>

              <button
                onClick={clearAll}
                className="p-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-500 hover:text-rose-400 hover:border-rose-500/30 transition"
                title="Clear All Photos"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {photos.length === 0 ? (
        /* Empty / Upload State */
        <div className="flex-1 max-w-4xl mx-auto px-4 py-16 sm:py-24 flex flex-col items-center justify-center text-center">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="w-full max-w-2xl border-2 border-dashed border-white/15 hover:border-amber-400/60 rounded-3xl p-10 sm:p-14 bg-[#0E0E14] hover:bg-[#12121B] transition-all cursor-pointer group shadow-2xl flex flex-col items-center justify-center"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFiles(e.target.files)}
              multiple
              accept="image/*"
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition mb-4">
              <Camera className="w-8 h-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-amber-400 transition">
              Upload Wedding / Event Photos
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
              Drag and drop 50 to 500+ client preview images here, or click to browse.
              Processed 100% locally in browser memory.
            </p>

            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-black font-bold text-xs group-hover:brightness-110 shadow-gold-glow transition">
              <Upload className="w-4 h-4" />
              <span>Select Photos from Computer</span>
            </span>

            <div className="mt-8 pt-6 border-t border-white/5 w-full flex items-center justify-center gap-6 text-[11px] text-zinc-500">
              <span>Supports JPG, PNG, WebP</span>
              <span>•</span>
              <span>Fast Client-Side Memory</span>
              <span>•</span>
              <span>No Cloud Uploads</span>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-2 text-xs text-zinc-400">
            <span>Already have a multi-page PDF album?</span>
            <Link
              to="/photo-proofing"
              className="text-amber-400 hover:text-amber-300 font-semibold underline flex items-center gap-1"
            >
              <span>Use PDF Album Proofing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        /* Workspace Active State */
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-6 text-xs">
            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-white/5 flex flex-col">
              <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">Total</span>
              <span className="text-xl font-extrabold text-white mt-0.5">{metrics.total}</span>
            </div>
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col">
              <span className="text-[11px] text-rose-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Heart className="w-3 h-3 fill-rose-400" /> Hearted
              </span>
              <span className="text-xl font-extrabold text-rose-400 mt-0.5">{metrics.hearted}</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col">
              <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400" /> 5 Stars
              </span>
              <span className="text-xl font-extrabold text-amber-400 mt-0.5">{metrics.fiveStar}</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex flex-col">
              <span className="text-[11px] text-amber-300 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-300" /> 4 Stars
              </span>
              <span className="text-xl font-extrabold text-amber-300 mt-0.5">{metrics.fourStar}</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex flex-col">
              <span className="text-[11px] text-amber-300/80 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-300/80" /> 3 Stars
              </span>
              <span className="text-xl font-extrabold text-amber-300/80 mt-0.5">{metrics.threeStar}</span>
            </div>
            <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5 flex flex-col">
              <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Unrated</span>
              <span className="text-xl font-extrabold text-zinc-300 mt-0.5">{metrics.unrated}</span>
            </div>
            <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5 flex flex-col">
              <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                <X className="w-3 h-3 text-zinc-500" /> Rejected
              </span>
              <span className="text-xl font-extrabold text-zinc-400 mt-0.5">{metrics.rejected}</span>
            </div>
          </div>

          {/* Filter Pills and Add More */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: 'all', label: `All (${photos.length})` },
                { id: 'hearted', label: `Hearted (${metrics.hearted})` },
                { id: '5', label: `5 Stars (${metrics.fiveStar})` },
                { id: '4', label: `4 Stars (${metrics.fourStar})` },
                { id: '3', label: `3 Stars (${metrics.threeStar})` },
                { id: 'unrated', label: `Unrated (${metrics.unrated})` },
                { id: 'rejected', label: `Rejected (${metrics.rejected})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    activeFilter === tab.id
                      ? 'bg-amber-400 text-black shadow-sm font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Add More Photos</span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFiles(e.target.files)}
                multiple
                accept="image/*"
                className="hidden"
              />
            </button>
          </div>

          {/* Photos Grid */}
          {filteredPhotos.length === 0 ? (
            <div className="p-12 text-center bg-zinc-950/50 rounded-3xl border border-white/5">
              <p className="text-zinc-400 text-sm">No photos match the selected filter.</p>
              <button
                onClick={() => setActiveFilter('all')}
                className="mt-3 text-xs text-amber-400 font-semibold underline"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredPhotos.map((photo, index) => {
                return (
                  <div
                    key={photo.id}
                    className={`group relative rounded-2xl bg-[#0E0E14] border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                      photo.isHearted
                        ? 'border-rose-500/60 shadow-lg shadow-rose-950/20'
                        : photo.isRejected
                        ? 'border-zinc-800 opacity-50'
                        : 'border-white/10 hover:border-amber-400/40'
                    }`}
                  >
                    {/* Image Preview */}
                    <div className="relative aspect-[4/3] bg-black/40 overflow-hidden cursor-pointer">
                      <img
                        src={photo.url}
                        alt={photo.name}
                        loading="lazy"
                        onClick={() => setEnlargedIndex(index)}
                        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                          photo.isRejected ? 'grayscale' : ''
                        }`}
                      />

                      {/* Top Action Buttons Overlay */}
                      <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleHeart(photo.id);
                          }}
                          className={`p-1.5 rounded-full backdrop-blur-md transition ${
                            photo.isHearted
                              ? 'bg-rose-500 text-white shadow-lg'
                              : 'bg-black/50 text-white/80 hover:text-rose-400 hover:bg-black/80'
                          }`}
                          title="Heart / Select this photo"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${photo.isHearted ? 'fill-white' : ''}`}
                          />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleReject(photo.id);
                          }}
                          className={`p-1.5 rounded-full backdrop-blur-md transition ${
                            photo.isRejected
                              ? 'bg-zinc-800 text-zinc-300'
                              : 'bg-black/50 text-white/80 hover:text-rose-400 hover:bg-black/80'
                          }`}
                          title="Reject / Unselect"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Enlarge Hint */}
                      <div
                        onClick={() => setEnlargedIndex(index)}
                        className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition pointer-events-none"
                      >
                        <span className="p-2 rounded-full bg-black/60 text-white">
                          <Eye className="w-4 h-4" />
                        </span>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="p-2.5 bg-[#0E0E14] border-t border-white/5">
                      <p
                        className="text-[11px] font-semibold text-zinc-300 truncate mb-1.5"
                        title={photo.name}
                      >
                        {photo.name}
                      </p>

                      {/* Star Rating Bar */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(photo.id, star)}
                              className="p-0.5 transition hover:scale-125"
                              title={`Rate ${star} star`}
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  photo.rating >= star
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-zinc-600 hover:text-amber-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>

                        {photo.isHearted && (
                          <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                            PICK
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Enlarged Photo Modal */}
      {enlargedIndex !== null && filteredPhotos[enlargedIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4"
          onClick={() => setEnlargedIndex(null)}
        >
          <div
            className="w-full max-w-6xl flex items-center justify-between text-zinc-300 py-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-white">
                {filteredPhotos[enlargedIndex].name}
              </span>
              <span className="text-xs text-zinc-500">
                ({enlargedIndex + 1} of {filteredPhotos.length})
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleHeart(filteredPhotos[enlargedIndex].id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  filteredPhotos[enlargedIndex].isHearted
                    ? 'bg-rose-500 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:text-white'
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${
                    filteredPhotos[enlargedIndex].isHearted ? 'fill-white' : ''
                  }`}
                />
                <span>
                  {filteredPhotos[enlargedIndex].isHearted ? 'Selected' : 'Select Photo'}
                </span>
              </button>

              <button
                onClick={() => setEnlargedIndex(null)}
                className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div
            className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-auto p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={filteredPhotos[enlargedIndex].url}
              alt={filteredPhotos[enlargedIndex].name}
              className="max-h-[78vh] max-w-full object-contain rounded-xl shadow-2xl"
            />

            {/* Nav Arrows */}
            {enlargedIndex > 0 && (
              <button
                onClick={() => setEnlargedIndex(enlargedIndex - 1)}
                className="absolute left-2 p-3 rounded-full bg-black/60 text-white hover:bg-black/90 transition backdrop-blur-md"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {enlargedIndex < filteredPhotos.length - 1 && (
              <button
                onClick={() => setEnlargedIndex(enlargedIndex + 1)}
                className="absolute right-2 p-3 rounded-full bg-black/60 text-white hover:bg-black/90 transition backdrop-blur-md"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Star Bar */}
          <div
            className="flex items-center gap-2 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(filteredPhotos[enlargedIndex].id, star)}
                className="p-1.5 transition hover:scale-125"
              >
                <Star
                  className={`w-6 h-6 ${
                    filteredPhotos[enlargedIndex].rating >= star
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-zinc-600 hover:text-amber-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
