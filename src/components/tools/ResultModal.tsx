import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, CheckCircle2, FileEdit, RefreshCw, Sparkles } from 'lucide-react';
import { downloadBlob, formatBytes } from '../../utils/downloadHelpers';
import { useEditorStore } from '../../stores/useEditorStore';

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultData: Uint8Array | Blob | null;
  defaultFileName: string;
  originalSize?: number;
  newSize?: number;
  isZip?: boolean;
  onReset: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  onClose,
  resultData,
  defaultFileName,
  originalSize,
  newSize,
  isZip = false,
  onReset,
}) => {
  const [fileName, setFileName] = useState(defaultFileName);
  const navigate = useNavigate();
  const setPdf = useEditorStore((state) => state.setPdf);

  if (!isOpen || !resultData) return null;

  const handleDownload = () => {
    let blob: Blob;
    if (resultData instanceof Blob) {
      blob = resultData;
    } else {
      blob = new Blob([resultData as any], { type: isZip ? 'application/zip' : 'application/pdf' });
    }

    let finalName = fileName.trim();
    const ext = isZip ? '.zip' : fileName.endsWith('.docx') ? '.docx' : '.pdf';
    if (!finalName.toLowerCase().endsWith(ext)) {
      finalName += ext;
    }

    downloadBlob(blob, finalName);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#121218] border border-brand-gold/30 rounded-3xl p-8 text-center shadow-2xl relative">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/40 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-bold text-white mb-1">Your PDF is Ready!</h3>
        <p className="text-xs text-zinc-400 mb-6">File processed successfully and ready for download.</p>

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
        <div className="mb-6 text-left">
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Save As Filename</label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-100 text-xs focus:outline-none focus:border-brand-gold"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-gold text-black font-semibold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <Download className="w-4 h-4" /> Download File
          </button>

          {!isZip && resultData instanceof Uint8Array && (
            <button
              onClick={handleOpenInEditor}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
            >
              <FileEdit className="w-3.5 h-3.5" /> Continue in PDF Editor
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
