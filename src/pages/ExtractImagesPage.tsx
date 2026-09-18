import React, { useState } from 'react';
import { ImageDown, Download, CheckCircle2 } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { pdfToImagesZip } from '../pdf/pdfModifier';
import { useToastStore } from '../stores/useToastStore';

export const ExtractImagesPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zipResult, setZipResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    try {
      const buffer = await f.arrayBuffer();
      setPdfBytes(new Uint8Array(buffer));
      setFile(f);
      addToast({ type: 'success', title: 'Document Loaded', message: 'Ready to extract images.' });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Could not load PDF.' });
    }
  };

  const handleExtract = async () => {
    if (!pdfBytes || !file) return;
    setIsProcessing(true);
    try {
      const res = await pdfToImagesZip(pdfBytes, 'png', 1.0, file.name.replace(/\.pdf$/i, '') + '_extracted_images');
      setZipResult({ blob: res.blob, filename: res.filename });
      addToast({ type: 'success', title: 'Images Extracted', message: 'Packaged into ZIP archive.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Extraction Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <ImageDown className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Extract <span className="text-brand-gold">Images from PDF</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Extract every picture, illustration and embedded graphic contained in your PDF document into high-res image files.
        </p>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop PDF here to extract images"
          subtitle="Extract embedded JPG and PNG photos"
          onFilesSelected={handleFileSelected}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl flex items-center justify-between">
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

          <button
            onClick={handleExtract}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <ImageDown className="w-4 h-4" />
            <span>Extract All Images to ZIP</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Extracting embedded graphics..." />
      <ResultModal
        isOpen={Boolean(zipResult)}
        onClose={() => setZipResult(null)}
        resultData={zipResult?.blob || null}
        defaultFileName={zipResult?.filename || 'extracted_images.zip'}
        isZip={true}
        onReset={() => {
          setZipResult(null);
          setPdfBytes(null);
          setFile(null);
        }}
      />
    </div>
  );
};
