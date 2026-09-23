import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, CheckCircle2, FileEdit, RefreshCw, FolderDown, ShieldCheck } from 'lucide-react';
import { downloadBlob, formatBytes } from '../../utils/downloadHelpers';
import { useEditorStore } from '../../stores/useEditorStore';

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultData: Uint8Array | Blob | null;
  defaultFileName: string;
  title?: string;
  subtitle?: string;
  previewUrl?: string;
  originalSize?: number;
  newSize?: number;
  isZip?: boolean;
  onReset: () => void;
  onRetry?: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  onClose,
  resultData,
  defaultFileName,
  title,
  subtitle,
  previewUrl,
  originalSize,
  newSize,
  isZip = false,
  onReset,
  onRetry,
}) => {
  const [fileName, setFileName] = useState(defaultFileName);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const navigate = useNavigate();
  const setPdf = useEditorStore((state) => state.setPdf);

  // Synchronize fileName state whenever defaultFileName or isOpen changes
  React.useEffect(() => {
    if (defaultFileName) {
      setFileName(defaultFileName);
    }
    if (isOpen) {
      setHasDownloaded(false);
    }
  }, [defaultFileName, isOpen]);

  if (!isOpen || !resultData) return null;

  const handleDownload = () => {
    let blob: Blob;
    if (resultData instanceof Blob) {
      blob = resultData;
    } else {
      blob = new Blob([resultData as any], { type: isZip ? 'application/zip' : 'application/pdf' });
    }

    let finalName = fileName.trim();
    // Intelligently preserve existing extension or derive from defaultFileName/isZip
    const hasKnownExt = /\.(pdf|zip|docx|jpe?g|png|webp|txt|svg)$/i.test(finalName);
    if (!hasKnownExt) {
      if (isZip) {
        finalName += '.zip';
      } else if (defaultFileName) {
        const match = defaultFileName.match(/\.[a-zA-Z0-9]+$/);
        finalName += match ? match[0] : '.pdf';
      } else {
        finalName += '.pdf';
      }
    }

    downloadBlob(blob, finalName);
    setHasDownloaded(true);
  };

  const handleOpenInEditor = async () => {
    if (isZip || !(resultData instanceof Uint8Array)) {
      return;
    }
    setPdf(resultData, fileName, 1);
    navigate('/pdf-editor');
  };

  const reductionPercent =
    originalSize && newSize && originalSize > newSize
      ? Math.round(((originalSize - newSize) / originalSize) * 100)
      : null;

  const displayTitle = title || (isZip ? 'Your Images are Ready!' : defaultFileName.match(/\.(jpe?g|png|webp)$/i) ? 'Your Image is Ready!' : defaultFileName.endsWith('.docx') ? 'Your Word Document is Ready!' : 'Your PDF is Ready!');
  const displaySubtitle = subtitle || 'File processed privately in your browser and ready for download.';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
    >
      <div className="w-full max-w-md bg-[#121218] border border-brand-gold/30 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/40 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>

        <h3 id="result-modal-title" className="text-xl font-bold text-white mb-1">
          {displayTitle}
        </h3>
        <p className="text-xs text-zinc-400 mb-5">{displaySubtitle}</p>

        {/* Optional Image Preview */}
        {previewUrl && (
          <div className="mb-5 rounded-2xl overflow-hidden border border-white/10 bg-black/50 max-h-52 flex items-center justify-center p-2">
            <img
              src={previewUrl}
              alt="Converted Preview"
              className="max-h-48 object-contain rounded-xl shadow-md"
            />
          </div>
        )}

        {/* Compression Statistics Card */}
        {originalSize && newSize && (
          <div className="mb-6 p-4 rounded-2xl bg-black/40 border border-white/10 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Original</p>
              <p className="text-xs font-bold text-zinc-300 mt-0.5">{formatBytes(originalSize)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-brand-gold font-semibold">New Size</p>
              <p className="text-xs font-bold text-white mt-0.5">{formatBytes(newSize)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">Reduction</p>
              <p className="text-xs font-bold text-emerald-400 mt-0.5">
                {reductionPercent !== null ? `-${reductionPercent}%` : 'Optimized'}
              </p>
            </div>
          </div>
        )}

        {/* Filename editor */}
        <div className="mb-5 text-left">
          <label htmlFor="save-as-filename" className="block text-xs font-medium text-zinc-400 mb-1.5">
            Save As Filename
          </label>
          <input
            id="save-as-filename"
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-100 text-xs focus:outline-none focus:border-brand-gold"
          />
        </div>

        {/* Download destination info */}
        <div className="mb-5 p-3 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center gap-2.5 text-left text-[11px] text-zinc-400">
          <FolderDown className="w-4 h-4 text-brand-gold shrink-0" />
          <span>Saved directly to your browser's default <strong>Downloads</strong> folder.</span>
        </div>

        {/* Download Confirmation Badge */}
        {hasDownloaded && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 animate-fadeIn"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Download triggered successfully! Check your downloads folder.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <Download className="w-4 h-4" /> Download File Now
          </button>

          {!isZip && resultData instanceof Uint8Array && (
            <button
              onClick={handleOpenInEditor}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
            >
              <FileEdit className="w-3.5 h-3.5" /> Continue in PDF Editor
            </button>
          )}

          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 text-xs transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Export
            </button>
          )}

          <button
            onClick={() => {
              onReset();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 text-zinc-400 hover:text-zinc-200 text-xs transition mt-2"
          >
            <RefreshCw className="w-3 h-3" /> Process Another Document
          </button>
        </div>
      </div>
    </div>
  );
};
