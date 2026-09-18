import React, { useState } from 'react';
import { EyeOff, Download, ShieldAlert, Check } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { redactPdf } from '../pdf/pdfModifier';
import { loadPdfDocument } from '../pdf/pdfManager';
import { useToastStore } from '../stores/useToastStore';
import { sanitizeFilename } from '../utils/downloadHelpers';

export const RedactPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [redactColor, setRedactColor] = useState<'black' | 'white'>('black');
  const [redactionZone, setRedactionZone] = useState<'header-banner' | 'signatures' | 'ssn-box'>('ssn-box');
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
      addToast({ type: 'success', title: 'Document Ready', message: 'Configure redaction zones.' });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Could not load PDF.' });
    }
  };

  const handleApplyRedaction = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const redactions = [];
      for (let p = 1; p <= totalPages; p++) {
        if (redactionZone === 'ssn-box') {
          redactions.push({
            pageNumber: p,
            x: 100,
            y: 400,
            width: 380,
            height: 60,
            color: redactColor,
          });
        } else if (redactionZone === 'header-banner') {
          redactions.push({
            pageNumber: p,
            x: 50,
            y: 30,
            width: 500,
            height: 90,
            color: redactColor,
          });
        } else if (redactionZone === 'signatures') {
          redactions.push({
            pageNumber: p,
            x: 300,
            y: 650,
            width: 250,
            height: 90,
            color: redactColor,
          });
        }
      }

      const redacted = await redactPdf(pdfBytes, redactions);
      setResultData(redacted);
      addToast({
        type: 'success',
        title: 'Redaction Applied',
        message: 'Underlying data permanently blocked out.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Redaction Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <EyeOff className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Redact <span className="text-brand-gold">Sensitive Data</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Permanently blackout or whiteout personal data, financial information and signatures before sharing.
        </p>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop PDF here to redact"
          subtitle="Permanently black-box sensitive areas"
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

            {/* Redaction Zone Presets */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Redaction Zone Preset
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'ssn-box', label: 'Midpage ID/SSN Block' },
                  { id: 'header-banner', label: 'Top Header / Address' },
                  { id: 'signatures', label: 'Signature & Signoff' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setRedactionZone(item.id as any)}
                    className={`p-3.5 rounded-xl border text-xs font-semibold transition ${
                      redactionZone === item.id
                        ? 'border-brand-gold bg-amber-500/10 text-white'
                        : 'border-white/10 bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Redaction Color */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Redaction Style
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setRedactColor('black')}
                  className={`flex-1 py-3 px-4 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-2 ${
                    redactColor === 'black'
                      ? 'border-brand-gold bg-amber-500/10 text-white'
                      : 'border-white/10 text-zinc-400'
                  }`}
                >
                  <span className="w-3.5 h-3.5 bg-black border border-white/20 rounded"></span>
                  <span>Solid Black Bar</span>
                </button>
                <button
                  onClick={() => setRedactColor('white')}
                  className={`flex-1 py-3 px-4 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-2 ${
                    redactColor === 'white'
                      ? 'border-brand-gold bg-amber-500/10 text-white'
                      : 'border-white/10 text-zinc-400'
                  }`}
                >
                  <span className="w-3.5 h-3.5 bg-white rounded"></span>
                  <span>Solid White Mask</span>
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleApplyRedaction}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <EyeOff className="w-4 h-4" />
            <span>Apply Permanent Redaction</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Baking permanent redaction boxes..." />
      <ResultModal
        isOpen={Boolean(resultData)}
        onClose={() => setResultData(null)}
        resultData={resultData}
        defaultFileName={file ? sanitizeFilename(file.name, 'redacted') : 'document_redacted.pdf'}
        onReset={() => {
          setResultData(null);
          setPdfBytes(null);
          setFile(null);
        }}
      />
    </div>
  );
};
