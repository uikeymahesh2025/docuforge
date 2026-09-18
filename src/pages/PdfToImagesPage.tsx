import React, { useState } from 'react';
import { Images, Download, FileArchive } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { pdfToImagesZip } from '../pdf/pdfModifier';
import { useToastStore } from '../stores/useToastStore';
import { loadPdfDocument } from '../pdf/pdfManager';

export const PdfToImagesPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [quality, setQuality] = useState(0.9);
  const [totalPages, setTotalPages] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; isZip: boolean; filename: string } | null>(null);

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
      addToast({
        type: 'success',
        title: 'PDF Loaded',
        message: `${f.name} (${doc.numPages} ${doc.numPages === 1 ? 'page' : 'pages'}) ready to convert.`,
      });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Could not read PDF.' });
    }
  };

  const handleConvert = async () => {
    if (!pdfBytes || !file) return;
    setIsProcessing(true);
    try {
      const res = await pdfToImagesZip(
        pdfBytes,
        format,
        quality,
        file.name.replace(/\.pdf$/i, '')
      );
      setResult({ blob: res.blob, isZip: res.isZip, filename: res.filename });
      addToast({
        type: 'success',
        title: 'Conversion Complete',
        message: res.isZip ? 'Images packaged into a ZIP archive.' : 'Image rendered successfully.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Conversion Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <Images className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          PDF to <span className="text-brand-gold">Images</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Convert each page of your PDF into high-resolution JPG or PNG pictures packaged in a ZIP file.
        </p>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop PDF to convert to images"
          subtitle="Extract high-resolution JPG or PNG page images"
          onFilesSelected={handleFileSelected}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <p className="text-sm font-bold text-white">{file?.name}</p>
                <p className="text-xs text-zinc-500">{totalPages} pages will be rendered</p>
              </div>
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

            {/* Format Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Image Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat('jpeg')}
                  className={`p-3.5 rounded-xl border text-center font-bold text-xs transition ${
                    format === 'jpeg'
                      ? 'border-brand-gold bg-amber-500/10 text-white'
                      : 'border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  JPG (Smaller size, great for photos &amp; text)
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('png')}
                  className={`p-3.5 rounded-xl border text-center font-bold text-xs transition ${
                    format === 'png'
                      ? 'border-brand-gold bg-amber-500/10 text-white'
                      : 'border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  PNG (Lossless sharpness, best for graphics)
                </button>
              </div>
            </div>

            {/* Quality Slider (for JPG) */}
            {format === 'jpeg' && (
              <div>
                <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-1.5">
                  <span>Image Quality</span>
                  <span className="text-brand-gold font-mono">{Math.round(quality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={Math.round(quality * 100)}
                  onChange={(e) => setQuality(parseInt(e.target.value, 10) / 100)}
                  className="w-full accent-amber-400"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleConvert}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <Images className="w-4 h-4" />
            <span>Convert to {format === 'jpeg' ? 'JPG' : 'PNG'}</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Rendering high-res pages & creating archive..." />
      <ResultModal
        isOpen={Boolean(result)}
        onClose={() => setResult(null)}
        resultData={result?.blob || null}
        defaultFileName={result?.filename || 'document_images.zip'}
        isZip={result?.isZip}
        onReset={() => {
          setResult(null);
          setPdfBytes(null);
          setFile(null);
        }}
      />
    </div>
  );
};
