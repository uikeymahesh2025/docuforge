import React, { useState } from 'react';
import { Maximize, Download } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { resizePdf } from '../pdf/pdfModifier';
import { useToastStore } from '../stores/useToastStore';
import { sanitizeFilename } from '../utils/downloadHelpers';

export const ResizePage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [preset, setPreset] = useState<'A4' | 'Letter' | 'A3' | 'A5' | 'Legal'>('A4');
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
      addToast({ type: 'success', title: 'Document Loaded', message: 'Choose target page size preset.' });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Could not load PDF.' });
    }
  };

  const handleApply = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const resized = await resizePdf(pdfBytes, preset);
      setResultData(resized);
      addToast({ type: 'success', title: 'Resized Successfully', message: `Formatted to standard ${preset}.` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Resize Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <Maximize className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Resize <span className="text-brand-gold">PDF Dimensions</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Scale and format your PDF pages to standard paper sizes (A4, Letter, A3, Legal) while preserving content aspect ratio.
        </p>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop PDF to resize page size"
          subtitle="Change paper sizes to international standards"
          onFilesSelected={handleFileSelected}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
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

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-3">
                Target Page Dimension Preset
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: 'A4', label: 'A4 (210 × 297 mm)', sub: 'Standard document size' },
                  { id: 'Letter', label: 'US Letter (8.5 × 11 in)', sub: 'North America standard' },
                  { id: 'A3', label: 'A3 (297 × 420 mm)', sub: 'Large format & diagrams' },
                  { id: 'A5', label: 'A5 (148 × 210 mm)', sub: 'Booklet & pocket size' },
                  { id: 'Legal', label: 'US Legal (8.5 × 14 in)', sub: 'Extended contracts' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPreset(item.id as any)}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      preset === item.id
                        ? 'border-brand-gold bg-amber-500/10 text-white'
                        : 'border-white/10 bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-bold text-white mb-0.5">{item.label}</p>
                    <p className="text-[10px] text-zinc-500">{item.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleApply}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <Maximize className="w-4 h-4" />
            <span>Resize to {preset} Format</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Embedding and scaling pages..." />
      <ResultModal
        isOpen={Boolean(resultData)}
        onClose={() => setResultData(null)}
        resultData={resultData}
        defaultFileName={file ? sanitizeFilename(file.name, `resized_${preset.toLowerCase()}`) : 'resized.pdf'}
        onReset={() => {
          setResultData(null);
          setPdfBytes(null);
          setFile(null);
        }}
      />
    </div>
  );
};
