import React, { useState } from 'react';
import { Split, Download, CheckCircle2 } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { splitPdf, SplitResult } from '../pdf/pdfModifier';
import { loadPdfDocument } from '../pdf/pdfManager';
import { useToastStore } from '../stores/useToastStore';

export const SplitPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [mode, setMode] = useState<'ranges' | 'all'>('ranges');
  const [rangesInput, setRangesInput] = useState('1-2, 3');
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitResult, setSplitResult] = useState<SplitResult | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    try {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const doc = await loadPdfDocument(bytes);
      setFile(f);
      setPdfBytes(bytes);
      setTotalPages(doc.numPages);
      if (doc.numPages > 1) {
        setRangesInput(`1-${Math.ceil(doc.numPages / 2)}, ${Math.ceil(doc.numPages / 2) + 1}-${doc.numPages}`);
      } else {
        setRangesInput('1');
      }
      addToast({
        type: 'success',
        title: 'PDF Loaded',
        message: `${f.name} has ${doc.numPages} ${doc.numPages === 1 ? 'page' : 'pages'}.`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Error loading file',
        message: 'Could not read PDF structure.',
      });
    }
  };

  const handleSplit = async () => {
    if (!pdfBytes || !file) return;

    setIsProcessing(true);
    try {
      const rangesToUse = mode === 'all' ? '' : rangesInput;
      const res = await splitPdf(pdfBytes, rangesToUse, file.name.replace(/\.pdf$/i, ''));
      setSplitResult(res);
      addToast({
        type: 'success',
        title: 'Split Complete',
        message: res.isZip ? 'Generated ZIP package with split documents.' : 'Split document is ready.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Split Failed',
        message: err?.message || 'Could not split document.',
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
          <Split className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Split <span className="text-brand-gold">PDF</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Extract specific pages or separate a large PDF into multiple individual files.
        </p>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop your PDF here to split"
          subtitle="Choose a document to extract or separate pages"
          onFilesSelected={handleFileSelected}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <p className="text-sm font-bold text-white">{file?.name}</p>
                <p className="text-xs text-zinc-500">Total: {totalPages} {totalPages === 1 ? 'page' : 'pages'}</p>
              </div>
              <button
                onClick={() => {
                  setPdfBytes(null);
                  setFile(null);
                }}
                className="text-xs text-zinc-400 hover:text-white transition"
              >
                Change File
              </button>
            </div>

            {/* Mode selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('ranges')}
                className={`p-4 rounded-xl border text-left transition ${
                  mode === 'ranges'
                    ? 'border-brand-gold bg-amber-500/10 text-white'
                    : 'border-white/10 bg-zinc-900/50 text-zinc-400 hover:text-white'
                }`}
              >
                <p className="text-xs font-bold mb-1">Custom Page Ranges</p>
                <p className="text-[11px] text-zinc-500">e.g. 1-3, 5-7, 10</p>
              </button>
              <button
                onClick={() => setMode('all')}
                className={`p-4 rounded-xl border text-left transition ${
                  mode === 'all'
                    ? 'border-brand-gold bg-amber-500/10 text-white'
                    : 'border-white/10 bg-zinc-900/50 text-zinc-400 hover:text-white'
                }`}
              >
                <p className="text-xs font-bold mb-1">Split Every Page</p>
                <p className="text-[11px] text-zinc-500">Each page into separate PDF</p>
              </button>
            </div>

            {/* Custom Range Input */}
            {mode === 'ranges' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">
                  Page Ranges
                </label>
                <input
                  type="text"
                  value={rangesInput}
                  onChange={(e) => setRangesInput(e.target.value)}
                  placeholder="e.g. 1-2, 3, 4-5"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-brand-gold"
                />
                <p className="text-[11px] text-zinc-500">
                  Separate ranges with commas. Example: <code className="text-brand-gold">1-3, 5, 8-10</code>
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleSplit}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <Split className="w-4 h-4" />
            <span>Split PDF Now</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Splitting document..." />
      <ResultModal
        isOpen={Boolean(splitResult)}
        onClose={() => setSplitResult(null)}
        resultData={splitResult?.data || null}
        defaultFileName={splitResult?.filename || 'split_document.pdf'}
        isZip={splitResult?.isZip}
        onReset={() => {
          setSplitResult(null);
          setPdfBytes(null);
          setFile(null);
        }}
      />
    </div>
  );
};
