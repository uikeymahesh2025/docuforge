import React, { useState } from 'react';
import { PanelTop, Download } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { applyHeaderFooter } from '../pdf/pdfModifier';
import { HeaderFooterSettings } from '../types';
import { useToastStore } from '../stores/useToastStore';
import { sanitizeFilename } from '../utils/downloadHelpers';

export const HeaderFooterPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [settings, setSettings] = useState<HeaderFooterSettings>({
    headerLeft: '',
    headerCenter: 'CONFIDENTIAL',
    headerRight: '',
    footerLeft: 'UIKEY AI',
    footerCenter: '',
    footerRight: '',
    fontSize: 10,
    color: '#666666',
    margin: 25,
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
      addToast({ type: 'success', title: 'Document Loaded', message: 'Configure header and footer text.' });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Could not load PDF.' });
    }
  };

  const handleApply = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const res = await applyHeaderFooter(pdfBytes, settings);
      setResultData(res);
      addToast({ type: 'success', title: 'Header & Footer Stamped', message: 'Ready to download.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <PanelTop className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Header &amp; <span className="text-brand-gold">Footer</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Add professional titles, dates, confidentiality notices or copyright to your document margins.
        </p>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop PDF to add Header & Footer"
          subtitle="Configure multi-column margin text"
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

            {/* Header row */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-gold">
                Top Header
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-zinc-500 mb-1 block">Left</span>
                  <input
                    type="text"
                    value={settings.headerLeft}
                    onChange={(e) => setSettings((s) => ({ ...s, headerLeft: e.target.value }))}
                    placeholder="Left title..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 mb-1 block">Center</span>
                  <input
                    type="text"
                    value={settings.headerCenter}
                    onChange={(e) => setSettings((s) => ({ ...s, headerCenter: e.target.value }))}
                    placeholder="Center notice..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 mb-1 block">Right</span>
                  <input
                    type="text"
                    value={settings.headerRight}
                    onChange={(e) => setSettings((s) => ({ ...s, headerRight: e.target.value }))}
                    placeholder="Right reference..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Footer row */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-gold">
                Bottom Footer
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-zinc-500 mb-1 block">Left</span>
                  <input
                    type="text"
                    value={settings.footerLeft}
                    onChange={(e) => setSettings((s) => ({ ...s, footerLeft: e.target.value }))}
                    placeholder="Left info..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 mb-1 block">Center</span>
                  <input
                    type="text"
                    value={settings.footerCenter}
                    onChange={(e) => setSettings((s) => ({ ...s, footerCenter: e.target.value }))}
                    placeholder="Center copyright..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 mb-1 block">Right</span>
                  <input
                    type="text"
                    value={settings.footerRight}
                    onChange={(e) => setSettings((s) => ({ ...s, footerRight: e.target.value }))}
                    placeholder="Right date..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleApply}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <PanelTop className="w-4 h-4" />
            <span>Apply Header &amp; Footer</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Applying headers and footers..." />
      <ResultModal
        isOpen={Boolean(resultData)}
        onClose={() => setResultData(null)}
        resultData={resultData}
        defaultFileName={file ? sanitizeFilename(file.name, 'headed') : 'document_header.pdf'}
        onReset={() => {
          setResultData(null);
          setPdfBytes(null);
          setFile(null);
        }}
      />
    </div>
  );
};
