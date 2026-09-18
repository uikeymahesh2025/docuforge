import React, { useState } from 'react';
import { Binary, Download } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { applyPageNumbers } from '../pdf/pdfModifier';
import { PageNumberSettings } from '../types';
import { useToastStore } from '../stores/useToastStore';
import { sanitizeFilename } from '../utils/downloadHelpers';

export const PageNumbersPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [settings, setSettings] = useState<PageNumberSettings>({
    format: 'page-of-total',
    position: 'bottom-center',
    startNumber: 1,
    fontSize: 11,
    color: '#000000',
    fontFamily: 'Helvetica',
    margin: 30,
    pageRange: 'all',
    customRange: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    try {
      const buffer = await f.arrayBuffer();
      setPdfBytes(new Uint8Array(buffer));
      setFile(f);
      addToast({ type: 'success', title: 'Document Loaded', message: 'Configure numbering format and position.' });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Could not load PDF.' });
    }
  };

  const handleApply = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const numbered = await applyPageNumbers(pdfBytes, settings);
      setResultData(numbered);
      addToast({ type: 'success', title: 'Page Numbers Added', message: 'Ready to download.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Operation Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <Binary className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Add <span className="text-brand-gold">Page Numbers</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Number all document pages automatically with flexible positions, font sizes and numbering formats.
        </p>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop your PDF to add page numbers"
          subtitle="Supports single and multi-page documents"
          onFilesSelected={handleFileSelected}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-sm font-bold text-white">{file?.name}</span>
              <button
                onClick={() => {
                  setPdfBytes(null);
                  setFile(null);
                }}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Change File
              </button>
            </div>

            {/* Position 3x2 Grid */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Number Position on Page
              </label>
              <div className="grid grid-cols-3 gap-2 bg-zinc-900/80 p-3 rounded-2xl border border-white/5">
                {[
                  { id: 'top-left', label: 'Top Left' },
                  { id: 'top-center', label: 'Top Center' },
                  { id: 'top-right', label: 'Top Right' },
                  { id: 'bottom-left', label: 'Bottom Left' },
                  { id: 'bottom-center', label: 'Bottom Center' },
                  { id: 'bottom-right', label: 'Bottom Right' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => setSettings((s) => ({ ...s, position: pos.id as any }))}
                    className={`py-3 px-2 rounded-xl text-xs font-semibold border transition ${
                      settings.position === pos.id
                        ? 'border-brand-gold bg-amber-500/10 text-white shadow-sm'
                        : 'border-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Numbering Format
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSettings((s) => ({ ...s, format: 'page-of-total' }))}
                    className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-medium transition ${
                      settings.format === 'page-of-total'
                        ? 'border-brand-gold bg-amber-500/10 text-white'
                        : 'border-white/10 text-zinc-400'
                    }`}
                  >
                    Page 1 of 10
                  </button>
                  <button
                    onClick={() => setSettings((s) => ({ ...s, format: 'number' }))}
                    className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-medium transition ${
                      settings.format === 'number'
                        ? 'border-brand-gold bg-amber-500/10 text-white'
                        : 'border-white/10 text-zinc-400'
                    }`}
                  >
                    1, 2, 3...
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Starting Page Number
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.startNumber}
                  onChange={(e) => setSettings((s) => ({ ...s, startNumber: parseInt(e.target.value, 10) || 1 }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs"
                />
              </div>
            </div>

            {/* Styling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Font Size ({settings.fontSize}pt)
                </label>
                <input
                  type="range"
                  min="8"
                  max="24"
                  value={settings.fontSize}
                  onChange={(e) => setSettings((s) => ({ ...s, fontSize: parseInt(e.target.value, 10) }))}
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Font Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.color}
                    onChange={(e) => setSettings((s) => ({ ...s, color: e.target.value }))}
                    className="w-10 h-8 rounded bg-transparent border-0 cursor-pointer"
                  />
                  <span className="text-xs text-zinc-400 font-mono">{settings.color}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleApply}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <Binary className="w-4 h-4" />
            <span>Apply Page Numbers</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Stamping page numbers..." />
      <ResultModal
        isOpen={Boolean(resultData)}
        onClose={() => setResultData(null)}
        resultData={resultData}
        defaultFileName={file ? sanitizeFilename(file.name, 'numbered') : 'numbered.pdf'}
        onReset={() => {
          setResultData(null);
          setPdfBytes(null);
          setFile(null);
        }}
      />
    </div>
  );
};
