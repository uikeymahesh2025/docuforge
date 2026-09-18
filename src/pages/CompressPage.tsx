import React, { useState } from 'react';
import { Minimize2, Download, Zap, Shield, Sparkles } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { compressPdf } from '../pdf/pdfModifier';
import { useToastStore } from '../stores/useToastStore';
import { formatBytes, sanitizeFilename } from '../utils/downloadHelpers';

export const CompressPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [level, setLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    compressedBytes: Uint8Array;
    originalSize: number;
    compressedSize: number;
  } | null>(null);

  const addToast = useToastStore((state) => state.addToast);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    try {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setFile(f);
      setPdfBytes(bytes);
      addToast({
        type: 'success',
        title: 'File Ready for Compression',
        message: `${f.name} (${formatBytes(f.size)})`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Unable to open file',
        message: 'Could not read PDF.',
      });
    }
  };

  const handleCompress = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const compRes = await compressPdf(pdfBytes, level);
      setResult(compRes);

      const saved = compRes.originalSize > compRes.compressedSize
        ? Math.round(((compRes.originalSize - compRes.compressedSize) / compRes.originalSize) * 100)
        : 0;

      addToast({
        type: 'success',
        title: 'Compression Finished',
        message: `Reduced by ${saved}%. New size: ${formatBytes(compRes.compressedSize)}`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Compression Error',
        message: err?.message || 'Failed to compress document.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <Minimize2 className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Compress <span className="text-brand-gold">PDF</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Reduce PDF file size while maintaining excellent document clarity and image fidelity.
        </p>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop your PDF here to compress"
          subtitle="Supports single and multi-page documents"
          onFilesSelected={handleFileSelected}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <p className="text-sm font-bold text-white">{file?.name}</p>
                <p className="text-xs text-zinc-500">Original Size: {file ? formatBytes(file.size) : ''}</p>
              </div>
              <button
                onClick={() => {
                  setPdfBytes(null);
                  setFile(null);
                  setResult(null);
                }}
                className="text-xs text-zinc-400 hover:text-white transition"
              >
                Change File
              </button>
            </div>

            {/* Compression Presets */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Select Compression Level
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setLevel('low')}
                  className={`p-4 rounded-2xl border text-left transition ${
                    level === 'low'
                      ? 'border-brand-gold bg-amber-500/10 shadow-sm'
                      : 'border-white/10 bg-zinc-900/50 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">Low Compression</span>
                    <span className="text-[10px] text-zinc-400">High Quality</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Slight size reduction with almost no visible difference.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setLevel('medium')}
                  className={`p-4 rounded-2xl border text-left transition ${
                    level === 'medium'
                      ? 'border-brand-gold bg-amber-500/10 shadow-sm'
                      : 'border-white/10 bg-zinc-900/50 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">Medium</span>
                    <span className="text-[10px] text-brand-gold font-bold">Recommended</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Best balance between file size and image sharpness.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setLevel('high')}
                  className={`p-4 rounded-2xl border text-left transition ${
                    level === 'high'
                      ? 'border-brand-gold bg-amber-500/10 shadow-sm'
                      : 'border-white/10 bg-zinc-900/50 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">High Compression</span>
                    <span className="text-[10px] text-zinc-400">Smallest Size</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Maximum compression, ideal for email and online sharing.
                  </p>
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleCompress}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <Minimize2 className="w-4 h-4" />
            <span>Compress Document</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Optimizing & compressing PDF..." />
      <ResultModal
        isOpen={Boolean(result)}
        onClose={() => setResult(null)}
        resultData={result?.compressedBytes || null}
        defaultFileName={file ? sanitizeFilename(file.name, 'compressed') : 'document_compressed.pdf'}
        originalSize={result?.originalSize}
        newSize={result?.compressedSize}
        onReset={() => {
          setResult(null);
          setPdfBytes(null);
          setFile(null);
        }}
      />
    </div>
  );
};
