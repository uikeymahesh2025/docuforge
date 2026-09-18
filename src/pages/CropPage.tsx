import React, { useState } from 'react';
import { Crop, Download } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { cropPdf } from '../pdf/pdfModifier';
import { useToastStore } from '../stores/useToastStore';
import { sanitizeFilename } from '../utils/downloadHelpers';

export const CropPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [crops, setCrops] = useState({ top: 5, right: 5, bottom: 5, left: 5 });
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
      addToast({ type: 'success', title: 'Document Loaded', message: 'Adjust crop borders.' });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Could not load PDF.' });
    }
  };

  const handleApply = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const cropped = await cropPdf(pdfBytes, crops);
      setResultData(cropped);
      addToast({ type: 'success', title: 'Crop Complete', message: 'Document margins trimmed.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Crop Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <Crop className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Crop <span className="text-brand-gold">PDF Margins</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Trim unwanted margins, scanner edges, and headers from PDF pages.
        </p>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop PDF here to crop"
          subtitle="Trim whitespace and margins"
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                <div key={side} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-zinc-300 capitalize">
                    <span>{side}</span>
                    <span className="text-brand-gold">{crops[side]}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="35"
                    value={crops[side]}
                    onChange={(e) =>
                      setCrops((prev) => ({ ...prev, [side]: parseInt(e.target.value, 10) }))
                    }
                    className="w-full accent-amber-400"
                  />
                </div>
              ))}
            </div>

            {/* Visual Box Preview */}
            <div className="border border-white/10 rounded-2xl p-8 bg-zinc-900/40 flex items-center justify-center">
              <div className="w-44 h-60 border-2 border-dashed border-zinc-600 rounded bg-white relative overflow-hidden flex items-center justify-center shadow-md">
                <div
                  className="absolute border-2 border-brand-gold bg-amber-500/10 transition-all duration-200"
                  style={{
                    top: `${crops.top}%`,
                    right: `${crops.right}%`,
                    bottom: `${crops.bottom}%`,
                    left: `${crops.left}%`,
                  }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-600 font-mono">
                    Keep Area
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleApply}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <Crop className="w-4 h-4" />
            <span>Apply Crop to Document</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Cropping page bounding boxes..." />
      <ResultModal
        isOpen={Boolean(resultData)}
        onClose={() => setResultData(null)}
        resultData={resultData}
        defaultFileName={file ? sanitizeFilename(file.name, 'cropped') : 'document_cropped.pdf'}
        onReset={() => {
          setResultData(null);
          setPdfBytes(null);
          setFile(null);
        }}
      />
    </div>
  );
};
