import React, { useState } from 'react';
import { RotateCw, RotateCcw, Download } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { organizePdfPages } from '../pdf/pdfModifier';
import { loadPdfDocument } from '../pdf/pdfManager';
import { useToastStore } from '../stores/useToastStore';
import { sanitizeFilename } from '../utils/downloadHelpers';

export const RotatePage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [rotationAngle, setRotationAngle] = useState(90);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    try {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const doc = await loadPdfDocument(bytes);
      setPdfBytes(bytes);
      setFile(f);
      setTotalPages(doc.numPages);
      addToast({ type: 'success', title: 'Document Loaded', message: `${doc.numPages} pages ready to rotate.` });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Could not load PDF.' });
    }
  };

  const handleApply = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const ops = [];
      for (let i = 0; i < totalPages; i++) {
        ops.push({ originalIndex: i, rotation: rotationAngle });
      }
      const rotated = await organizePdfPages(pdfBytes, ops);
      setResultData(rotated);
      addToast({ type: 'success', title: 'Rotation Applied', message: 'Ready to download.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Rotation Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <RotateCw className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Rotate <span className="text-brand-gold">PDF Pages</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Rotate your PDF pages 90° clockwise, 90° counter-clockwise, or 180° upside down.
        </p>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop PDF here to rotate"
          subtitle="Rotate landscape or portrait pages"
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

            {/* Rotation angle options */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">Rotation Angle</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { angle: 90, label: '90° Clockwise', icon: RotateCw },
                  { angle: 180, label: '180° Flip', icon: RotateCw },
                  { angle: 270, label: '90° Counter-CW', icon: RotateCcw },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.angle}
                      onClick={() => setRotationAngle(item.angle)}
                      className={`p-4 rounded-xl border text-center transition flex flex-col items-center gap-2 ${
                        rotationAngle === item.angle
                          ? 'border-brand-gold bg-amber-500/10 text-white shadow-sm'
                          : 'border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-brand-gold" />
                      <span className="text-xs font-semibold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            onClick={handleApply}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <RotateCw className="w-4 h-4" />
            <span>Apply Rotation to All {totalPages} Pages</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Rotating pages..." />
      <ResultModal
        isOpen={Boolean(resultData)}
        onClose={() => setResultData(null)}
        resultData={resultData}
        defaultFileName={file ? sanitizeFilename(file.name, 'rotated') : 'document_rotated.pdf'}
        onReset={() => {
          setResultData(null);
          setPdfBytes(null);
          setFile(null);
        }}
      />
    </div>
  );
};
