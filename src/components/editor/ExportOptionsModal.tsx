import React, { useState } from 'react';
import { X, Download, FileText, CheckCircle2, ShieldCheck, Layers, FileDown } from 'lucide-react';

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFileName: string;
  pageCount: number;
  annotationCount: number;
  directEditCount: number;
  onConfirmExport: (options: {
    fileName: string;
    pageRange: string;
    flatten: boolean;
  }) => void;
}

export const ExportOptionsModal: React.FC<ExportOptionsModalProps> = ({
  isOpen,
  onClose,
  defaultFileName,
  pageCount,
  annotationCount,
  directEditCount,
  onConfirmExport,
}) => {
  const [fileName, setFileName] = useState(
    defaultFileName.endsWith('.pdf') ? defaultFileName.replace(/\.pdf$/i, '-edited.pdf') : `${defaultFileName}-edited.pdf`
  );
  const [rangeMode, setRangeMode] = useState<'all' | 'custom'>('all');
  const [customRange, setCustomRange] = useState('');
  const [flatten, setFlatten] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalName = fileName.trim();
    if (!finalName.toLowerCase().endsWith('.pdf')) {
      finalName += '.pdf';
    }

    onConfirmExport({
      fileName: finalName,
      pageRange: rangeMode === 'all' ? 'all' : customRange.trim() || 'all',
      flatten,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-options-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#121218] border border-brand-gold/30 rounded-3xl p-6 sm:p-7 shadow-2xl relative max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 id="export-options-title" className="text-base font-bold text-white">
                Export &amp; Download PDF
              </h2>
              <p className="text-[11px] text-zinc-400">
                Configure your final document output
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
            aria-label="Close export dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Edits Summary */}
        <div className="mb-5 p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-around text-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Pages</span>
            <p className="text-xs font-bold text-white mt-0.5">{pageCount}</p>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div>
            <span className="text-[10px] uppercase font-bold text-brand-gold tracking-wider">Annotations</span>
            <p className="text-xs font-bold text-brand-gold mt-0.5">{annotationCount}</p>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Direct Edits</span>
            <p className="text-xs font-bold text-emerald-400 mt-0.5">{directEditCount}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Filename Input */}
          <div>
            <label htmlFor="export-filename" className="block text-zinc-300 font-semibold mb-1.5">
              Output Filename
            </label>
            <div className="relative">
              <input
                id="export-filename"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-gold pr-12 text-xs"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-[11px] pointer-events-none">
                .pdf
              </span>
            </div>
          </div>

          {/* Page Range Selection */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1.5">
              Page Range
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 cursor-pointer hover:bg-zinc-900 transition">
                <input
                  type="radio"
                  name="pageRange"
                  checked={rangeMode === 'all'}
                  onChange={() => setRangeMode('all')}
                  className="accent-brand-gold"
                />
                <span className="text-zinc-200">All Pages (1 to {pageCount})</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 cursor-pointer hover:bg-zinc-900 transition">
                <input
                  type="radio"
                  name="pageRange"
                  checked={rangeMode === 'custom'}
                  onChange={() => setRangeMode('custom')}
                  className="accent-brand-gold"
                />
                <span className="text-zinc-200">Custom Page Range</span>
              </label>

              {rangeMode === 'custom' && (
                <div className="pt-1 pl-6">
                  <input
                    type="text"
                    value={customRange}
                    onChange={(e) => setCustomRange(e.target.value)}
                    placeholder="e.g. 1-3, 5 (comma-separated)"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-gold text-xs"
                    autoFocus
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Enter individual page numbers or ranges separated by commas.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Flatten Option */}
          <div className="p-3 rounded-2xl bg-zinc-900/50 border border-white/5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={flatten}
                onChange={(e) => setFlatten(e.target.checked)}
                className="mt-0.5 accent-brand-gold"
              />
              <div>
                <span className="font-semibold text-zinc-200 block text-xs">
                  Flatten Annotations (Recommended)
                </span>
                <span className="text-[11px] text-zinc-400 leading-relaxed block mt-0.5">
                  Bakes text, marks, shapes and signatures directly into page streams so they display identically on any phone, browser, or print shop.
                </span>
              </div>
            </label>
          </div>

          {/* Action CTAs */}
          <div className="pt-3 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-brand-gold text-black font-bold text-xs hover:brightness-110 shadow-gold-glow transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export &amp; Download</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
