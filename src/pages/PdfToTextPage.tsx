import React, { useState } from 'react';
import { AlignLeft, Copy, Download, Check } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { extractAllText, loadPdfDocument } from '../pdf/pdfManager';
import { useToastStore } from '../stores/useToastStore';
import { downloadBlob, sanitizeFilename } from '../utils/downloadHelpers';

export const PdfToTextPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [pagesData, setPagesData] = useState<{ pageNumber: number; text: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    setIsProcessing(true);
    try {
      const buffer = await f.arrayBuffer();
      const doc = await loadPdfDocument(new Uint8Array(buffer));
      const res = await extractAllText(doc);
      setFile(f);
      setExtractedText(res.fullText);
      setPagesData(res.pages);
      addToast({
        type: 'success',
        title: 'Text Extracted',
        message: `Parsed ${res.pages.length} pages.`,
      });
    } catch {
      addToast({ type: 'error', title: 'Extraction Error', message: 'Could not extract text.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    addToast({ type: 'success', title: 'Copied to Clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const name = file ? sanitizeFilename(file.name, 'extracted', 'txt') : 'document_text.txt';
    downloadBlob(blob, name);
  };

  const handleDownloadMd = () => {
    const blob = new Blob([`# ${file?.name || 'Document'}\n\n${extractedText}`], {
      type: 'text/markdown;charset=utf-8',
    });
    const name = file ? sanitizeFilename(file.name, 'extracted', 'md') : 'document.md';
    downloadBlob(blob, name);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <AlignLeft className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          PDF to <span className="text-brand-gold">Text</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Extract all selectable text from your PDF file to copy or download as TXT or Markdown.
        </p>
      </div>

      {!extractedText ? (
        <FileUploader
          title="Drop PDF here to extract text"
          subtitle="Instant browser-based text extraction"
          onFilesSelected={handleFileSelected}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#121218] border border-white/10">
            <div>
              <p className="text-sm font-bold text-white">{file?.name}</p>
              <p className="text-xs text-zinc-500">{pagesData.length} pages processed</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
              <button
                onClick={handleDownloadTxt}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-gold text-black text-xs font-semibold hover:brightness-110 transition shadow-gold-glow"
              >
                <Download className="w-3.5 h-3.5" /> Download .TXT
              </button>
              <button
                onClick={handleDownloadMd}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition"
              >
                <Download className="w-3.5 h-3.5" /> .MD
              </button>
              <button
                onClick={() => {
                  setExtractedText('');
                  setFile(null);
                }}
                className="text-xs text-zinc-500 hover:text-white px-2"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl">
            <textarea
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              className="w-full h-96 bg-zinc-950 p-4 rounded-xl border border-white/5 text-zinc-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-brand-gold resize-y"
            />
          </div>
        </div>
      )}

      <ProcessingModal isOpen={isProcessing} statusText="Extracting text layers..." />
    </div>
  );
};
