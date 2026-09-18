import React, { useState } from 'react';
import { FileCode, Download, Save, RefreshCw } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { readPdfMetadata, updatePdfMetadata, PdfMetadata } from '../pdf/pdfModifier';
import { useToastStore } from '../stores/useToastStore';
import { sanitizeFilename } from '../utils/downloadHelpers';

export const MetadataPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [metadata, setMetadata] = useState<PdfMetadata>({
    title: '',
    author: '',
    subject: '',
    keywords: [],
    creator: 'UIKEY AI',
    producer: 'UIKEY AI PDF Suite',
  });
  const [keywordsStr, setKeywordsStr] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    try {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const meta = await readPdfMetadata(bytes);
      setPdfBytes(bytes);
      setFile(f);
      setMetadata(meta);
      setKeywordsStr(meta.keywords ? meta.keywords.join(', ') : '');
      addToast({ type: 'success', title: 'Metadata Loaded', message: 'Current properties parsed.' });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Could not read PDF metadata.' });
    }
  };

  const handleSave = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const kw = keywordsStr
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      const updated = await updatePdfMetadata(pdfBytes, { ...metadata, keywords: kw });
      setResultData(updated);
      addToast({ type: 'success', title: 'Metadata Updated', message: 'Ready to download.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Save Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <FileCode className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          PDF <span className="text-brand-gold">Metadata Editor</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Inspect, update or clear PDF properties including Title, Author, Subject, Keywords and Creator.
        </p>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop PDF to edit metadata"
          subtitle="View and edit embedded PDF properties"
          onFilesSelected={handleFileSelected}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
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
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Document Title</label>
              <input
                type="text"
                value={metadata.title || ''}
                onChange={(e) => setMetadata((m) => ({ ...m, title: e.target.value }))}
                placeholder="e.g. Annual Financial Report 2026"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Author</label>
              <input
                type="text"
                value={metadata.author || ''}
                onChange={(e) => setMetadata((m) => ({ ...m, author: e.target.value }))}
                placeholder="e.g. John Doe / UIKEY AI"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Subject</label>
              <input
                type="text"
                value={metadata.subject || ''}
                onChange={(e) => setMetadata((m) => ({ ...m, subject: e.target.value }))}
                placeholder="e.g. Q3 Summary and Growth Analysis"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Keywords (comma separated)
              </label>
              <input
                type="text"
                value={keywordsStr}
                onChange={(e) => setKeywordsStr(e.target.value)}
                placeholder="e.g. report, audit, financial, 2026"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Creator / Tool</label>
                <input
                  type="text"
                  value={metadata.creator || ''}
                  onChange={(e) => setMetadata((m) => ({ ...m, creator: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Producer</label>
                <input
                  type="text"
                  value={metadata.producer || ''}
                  onChange={(e) => setMetadata((m) => ({ ...m, producer: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Updated Metadata &amp; Export</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Rewriting metadata dictionary..." />
      <ResultModal
        isOpen={Boolean(resultData)}
        onClose={() => setResultData(null)}
        resultData={resultData}
        defaultFileName={file ? sanitizeFilename(file.name, 'meta') : 'document_meta.pdf'}
        onReset={() => {
          setResultData(null);
          setPdfBytes(null);
          setFile(null);
        }}
      />
    </div>
  );
};
