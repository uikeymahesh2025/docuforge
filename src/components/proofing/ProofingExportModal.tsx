import React, { useState } from 'react';
import {
  X,
  Download,
  Share2,
  Check,
  Star,
  Sparkles,
  ArrowUpDown,
  Filter,
  BadgePercent,
  Copy,
  MessageCircle,
} from 'lucide-react';
import { PhotoCardItem } from './PhotoCard';
import { exportProofedPdf, ProofingExportOptions } from '../../pdf/proofingExporter';
import { downloadBlob, sanitizeFilename } from '../../utils/downloadHelpers';
import { useToastStore } from '../../stores/useToastStore';

interface ProofingExportModalProps {
  sourceBytes: Uint8Array;
  fileName: string;
  items: PhotoCardItem[];
  onClose: () => void;
}

export const ProofingExportModal: React.FC<ProofingExportModalProps> = ({
  sourceBytes,
  fileName,
  items,
  onClose,
}) => {
  const addToast = useToastStore((state) => state.addToast);

  // Export configuration options
  const [options, setOptions] = useState<ProofingExportOptions>({
    sortStarWise: true,
    exportOnlySelected: true,
    stampStarBadge: false,
  });

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [exportedPdfBytes, setExportedPdfBytes] = useState<Uint8Array | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Statistics calculation
  const totalCount = items.length;
  const count5 = items.filter((i) => i.rating === 5 && !i.rejected).length;
  const count4 = items.filter((i) => i.rating === 4 && !i.rejected).length;
  const count3 = items.filter((i) => i.rating === 3 && !i.rejected).length;
  const count12 = items.filter((i) => (i.rating === 1 || i.rating === 2) && !i.rejected).length;
  const totalSelected = count5 + count4 + count3 + count12;
  const unratedCount = items.filter((i) => i.rating === 0 && !i.rejected).length;
  const rejectedCount = items.filter((i) => i.rejected).length;

  const exportCount = options.exportOnlySelected
    ? totalSelected
    : totalCount - rejectedCount;

  // Generate formatted WhatsApp message text
  const getWhatsAppMessage = (): string => {
    return (
      `Hello! I have completed my photo selection.\n\n` +
      `📸 Total Selected: ${totalSelected} photos\n` +
      `⭐⭐⭐⭐⭐ 5-Star: ${count5}\n` +
      `⭐⭐⭐⭐ 4-Star: ${count4}\n` +
      `⭐⭐⭐ 3-Star: ${count3}\n` +
      (count12 > 0 ? `⭐ 1-2 Star: ${count12}\n` : '') +
      `\nPlease find the sorted selection PDF attached.`
    );
  };

  const handleStartExport = async () => {
    if (exportCount === 0) {
      addToast({
        type: 'warning',
        title: 'No Photos Selected',
        message: 'Please rate at least one photo with 1-5 stars before exporting.',
      });
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress(10);
      setExportStatus('Preparing lossless export...');

      const result = await exportProofedPdf(
        sourceBytes,
        items.map((i) => ({
          originalIndex: i.originalIndex,
          rating: i.rating,
          rejected: i.rejected,
        })),
        options,
        (progress, status) => {
          setExportProgress(progress);
          setExportStatus(status);
        }
      );

      setExportedPdfBytes(result);
      addToast({
        type: 'success',
        title: 'Lossless PDF Ready!',
        message: `Exported ${exportCount} proofed photos in 100% original quality.`,
      });
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Export Failed',
        message: err.message || 'Could not export proofed PDF.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getExportFileName = (): string => {
    return sanitizeFilename(fileName || 'photo_album', 'Proofed_Selection', 'pdf');
  };

  const handleDownload = () => {
    if (!exportedPdfBytes) return;
    const blob = new Blob([exportedPdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    downloadBlob(blob, getExportFileName());
  };

  const handleWhatsAppShare = async () => {
    if (!exportedPdfBytes) return;
    const shareText = getWhatsAppMessage();
    const outName = getExportFileName();

    const file = new File([exportedPdfBytes as unknown as BlobPart], outName, {
      type: 'application/pdf',
    });

    // 1. Check native Web Share API with File attachment support
    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          title: 'Photo Proofing Selection',
          text: shareText,
          files: [file],
        });
        addToast({
          type: 'success',
          title: 'Shared Successfully',
          message: 'Selection document sent via WhatsApp / native share.',
        });
        return;
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') return;
        console.warn('Native share error, falling back to WhatsApp link:', shareErr);
      }
    }

    // 2. Fallback: Automatically trigger direct download and open WhatsApp Web/App with pre-filled text
    handleDownload();
    const encodedText = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    addToast({
      type: 'info',
      title: 'WhatsApp Opened',
      message: 'PDF downloaded! Please attach the downloaded PDF to your WhatsApp chat.',
    });
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(getWhatsAppMessage());
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
      addToast({
        type: 'success',
        title: 'Summary Copied',
        message: 'WhatsApp selection summary copied to clipboard.',
      });
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#12121A] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-brand-gold">
              <Star className="w-5 h-5 fill-brand-gold" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Export Proofed Selection</h3>
              <p className="text-xs text-zinc-400">
                100% Lossless PDF with original DPI & color profiles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Selection Summary Pill Grid */}
        <div className="bg-black/40 rounded-2xl p-4 border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Total Album Pages:</span>
            <span className="font-bold text-white">{totalCount}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-2.5">
              <span className="text-brand-gold font-bold block text-sm">{count5}</span>
              <span className="text-[10px] text-zinc-400">5-Star ★★★★★</span>
            </div>
            <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-2.5">
              <span className="text-brand-gold font-bold block text-sm">{count4}</span>
              <span className="text-[10px] text-zinc-400">4-Star ★★★★</span>
            </div>
            <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-2.5">
              <span className="text-brand-gold font-bold block text-sm">{count3}</span>
              <span className="text-[10px] text-zinc-400">3-Star ★★★</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
            <span>
              Selected to Export: <strong className="text-brand-gold">{exportCount}</strong> photos
            </span>
            <span>
              Rejected: <strong className="text-red-400">{rejectedCount}</strong> | Unrated:{' '}
              <strong className="text-zinc-500">{unratedCount}</strong>
            </span>
          </div>
        </div>

        {!exportedPdfBytes ? (
          <>
            {/* Export Configuration Options */}
            <div className="space-y-3 text-xs">
              {/* Option 1: Sort Star-wise */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-white/10 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={options.sortStarWise}
                  onChange={(e) =>
                    setOptions({ ...options, sortStarWise: e.target.checked })
                  }
                  className="mt-0.5 rounded text-brand-gold focus:ring-brand-gold accent-amber-400"
                />
                <div>
                  <span className="font-bold text-zinc-200 block flex items-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-brand-gold" />
                    Sort Star-wise (High to Low)
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Place 5-star photos first, followed by 4-star, 3-star, etc.
                  </span>
                </div>
              </label>

              {/* Option 2: Export Only Selected */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-white/10 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={options.exportOnlySelected}
                  onChange={(e) =>
                    setOptions({ ...options, exportOnlySelected: e.target.checked })
                  }
                  className="mt-0.5 rounded text-brand-gold focus:ring-brand-gold accent-amber-400"
                />
                <div>
                  <span className="font-bold text-zinc-200 block flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-brand-gold" />
                    Export Only Selected Photos
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Automatically drop unrated (0★) and rejected photos from the output PDF.
                  </span>
                </div>
              </label>

              {/* Option 3: Optional Corner Badge */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-white/10 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={options.stampStarBadge}
                  onChange={(e) =>
                    setOptions({ ...options, stampStarBadge: e.target.checked })
                  }
                  className="mt-0.5 rounded text-brand-gold focus:ring-brand-gold accent-amber-400"
                />
                <div>
                  <span className="font-bold text-zinc-200 block flex items-center gap-1.5">
                    <BadgePercent className="w-3.5 h-3.5 text-brand-gold" />
                    Stamp Star Rating Badge on Corner
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Embeds an elegant pill badge in the corner of each exported page.
                  </span>
                </div>
              </label>
            </div>

            {/* Progress Bar (if generating) */}
            {isExporting && (
              <div className="space-y-2 py-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{exportStatus}</span>
                  <span className="font-mono text-brand-gold">{exportProgress}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-amber-500 to-amber-300 transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartExport}
                disabled={isExporting || exportCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-gold text-black font-bold text-xs hover:brightness-110 shadow-gold-glow transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Build Lossless Selection PDF</span>
              </button>
            </div>
          </>
        ) : (
          /* Post-Export Success Actions (Download & WhatsApp Direct Share) */
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h4 className="text-sm font-bold text-white">Lossless PDF Ready!</h4>
              <p className="text-xs text-zinc-400">
                {exportCount} photos sorted and compiled at 100% original print quality.
              </p>
            </div>

            {/* Direct Download & WhatsApp Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs transition shadow-sm"
              >
                <Download className="w-4 h-4 text-brand-gold" />
                <span>Download Sorted PDF</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg hover:shadow-emerald-600/30"
              >
                <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                <span>Share via WhatsApp</span>
              </button>
            </div>

            {/* Copy WhatsApp Formatted Summary Text */}
            <div className="pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={handleCopyText}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-zinc-400 hover:text-white transition rounded-xl hover:bg-white/5"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">
                      Summary Text Copied!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy WhatsApp Summary Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
