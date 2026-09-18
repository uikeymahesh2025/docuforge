import React, { useState } from 'react';
import { Hash, Download } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { applyBatesNumbering } from '../pdf/pdfModifier';
import { BatesSettings } from '../types';
import { useToastStore } from '../stores/useToastStore';
import { sanitizeFilename } from '../utils/downloadHelpers';

export const BatesPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [settings, setSettings] = useState<BatesSettings>({
    prefix: 'UIKEY-',
    suffix: '',
    startNumber: 1,
    digits: 6,
    position: 'bottom-right',
    fontSize: 10,
    color: '#000000',
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
      addToast({ type: 'success', title: 'Document Ready', message: 'Configure Bates indexing numbers.' });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Could not load PDF.' });
    }
  };

  const handleApply = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const res = await applyBatesNumbering(pdfBytes, settings);
      setResultData(res);
      addToast({ type: 'success', title: 'Bates Numbering Applied', message: 'Document indexed successfully.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const samplePreview = `${settings.prefix}${String(settings.startNumber).padStart(settings.digits, '0')}${settings.suffix}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <Hash className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Bates <span className="text-brand-gold">Numbering</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Sequential legal, forensic and corporate indexing with custom prefix, digit padding, and position.
        </p>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop PDF to add Bates numbering"
          subtitle="Indexed sequential legal stamps"
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

            {/* Live Sample Stamp Preview */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-xs text-zinc-400">Sample First Page Output:</span>
              <span className="font-mono text-sm font-bold text-brand-gold bg-amber-500/10 px-3 py-1 rounded border border-amber-500/20">
                {samplePreview}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Prefix</label>
                <input
                  type="text"
                  value={settings.prefix}
                  onChange={(e) => setSettings((s) => ({ ...s, prefix: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Starting Number</label>
                <input
                  type="number"
                  min="1"
                  value={settings.startNumber}
                  onChange={(e) => setSettings((s) => ({ ...s, startNumber: parseInt(e.target.value, 10) || 1 }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Digit Padding</label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={settings.digits}
                  onChange={(e) => setSettings((s) => ({ ...s, digits: parseInt(e.target.value, 10) || 6 }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">Stamp Location</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'top-left', label: 'Top Left' },
                  { id: 'top-right', label: 'Top Right' },
                  { id: 'bottom-center', label: 'Bottom Center' },
                  { id: 'bottom-right', label: 'Bottom Right' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => setSettings((s) => ({ ...s, position: pos.id as any }))}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                      settings.position === pos.id
                        ? 'border-brand-gold bg-amber-500/10 text-white'
                        : 'border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleApply}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <Hash className="w-4 h-4" />
            <span>Apply Bates Numbering &amp; Export</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Applying Bates numbering..." />
      <ResultModal
        isOpen={Boolean(resultData)}
        onClose={() => setResultData(null)}
        resultData={resultData}
        defaultFileName={file ? sanitizeFilename(file.name, 'bates') : 'document_bates.pdf'}
        onReset={() => {
          setResultData(null);
          setPdfBytes(null);
          setFile(null);
        }}
      />
    </div>
  );
};
