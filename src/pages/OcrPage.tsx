import React, { useState } from 'react';
import { ScanText, Download, Copy, Check, FileText, Globe, Sparkles, FileCode, CheckCircle2 } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { useToastStore } from '../stores/useToastStore';
import { sanitizeFilename } from '../utils/downloadHelpers';

export const OcrPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [language, setLanguage] = useState<'eng' | 'hin' | 'hin+eng'>('eng');
  const [exportFormat, setExportFormat] = useState<'txt' | 'docx'>('txt');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    try {
      const buffer = await f.arrayBuffer();
      setFileBytes(new Uint8Array(buffer));
      setFile(f);
      setExtractedText('');
      setResultBlob(null);
      addToast({
        type: 'success',
        title: 'Document Ready',
        message: `${f.name} loaded. Click Run OCR.`,
      });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Could not load file.' });
    }
  };

  const handleRunOcr = async () => {
    if (!fileBytes || !file) return;
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', new Blob([fileBytes.buffer as ArrayBuffer]), file.name);
      formData.append('format', exportFormat);
      formData.append('language', language);

      const hostName = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
      const endpoints = [
        '/api/ocr/extract',
        `http://${hostName}:4000/api/ocr/extract`,
        'http://localhost:4000/api/ocr/extract',
        'http://127.0.0.1:4000/api/ocr/extract',
      ];

      let resp: Response | null = null;
      for (const url of endpoints) {
        try {
          const candidate = await fetch(url, { method: 'POST', body: formData });
          if (candidate && candidate.ok) {
            resp = candidate;
            break;
          }
        } catch {
          // Next
        }
      }

      if (resp && resp.ok) {
        const blob = await resp.blob();
        setResultBlob(blob);

        if (exportFormat === 'txt') {
          const text = await blob.text();
          setExtractedText(text);
        } else {
          setExtractedText('[Word document (.docx) generated successfully. Click download to save.]');
        }

        addToast({
          type: 'success',
          title: 'OCR Complete',
          message: 'Text extracted successfully from document.',
        });
        return;
      }

      throw new Error('OCR backend engine was unreachable. Ensure backend service is running.');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'OCR Failed',
        message: err?.message || 'Could not perform OCR on document.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    addToast({ type: 'success', title: 'Copied!', message: 'Text copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <ScanText className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          OCR <span className="text-brand-gold">Document Scanner</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Extract editable text and create Microsoft Word documents from scanned PDFs, photos and receipts.
        </p>
      </div>

      {!fileBytes ? (
        <FileUploader
          title="Drop scanned PDF or document image here"
          subtitle="Supports PDF, PNG, JPG, JPEG, WEBP"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          fileType="any"
          onFilesSelected={handleFileSelected}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white">{file?.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">Ready for optical character recognition</p>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setFileBytes(null);
                  setExtractedText('');
                  setResultBlob(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800 transition"
              >
                Change File
              </button>
            </div>

            {/* Options Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-2 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-brand-gold" />
                  Recognition Language
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'eng', label: 'English' },
                    { id: 'hin', label: 'Hindi' },
                    { id: 'hin+eng', label: 'Both' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setLanguage(lang.id as any)}
                      className={`py-2 rounded-xl text-xs font-semibold transition ${
                        language === lang.id
                          ? 'bg-brand-gold text-black shadow-gold-glow'
                          : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-brand-gold" />
                  Export Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'txt', label: 'Text (.txt)' },
                    { id: 'docx', label: 'Word (.docx)' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setExportFormat(fmt.id as any)}
                      className={`py-2 rounded-xl text-xs font-semibold transition ${
                        exportFormat === fmt.id
                          ? 'bg-brand-gold text-black shadow-gold-glow'
                          : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleRunOcr}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
            >
              <ScanText className="w-4 h-4" />
              <span>Run OCR & Extract Text</span>
            </button>
          </div>

          {/* Extracted Text Preview Card */}
          {extractedText && (
            <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-gold" />
                  Extracted Content
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyText}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  {resultBlob && (
                    <button
                      onClick={() => {
                        const url = URL.createObjectURL(resultBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = file ? sanitizeFilename(file.name, 'ocr', exportFormat) : `ocr_result.${exportFormat}`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-gold text-black font-bold text-xs hover:brightness-110 transition shadow-gold-glow"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={extractedText}
                readOnly
                rows={12}
                className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-zinc-200 resize-none focus:outline-none focus:border-brand-gold/50"
              />
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Running OCR scanner & extracting text..." />
      <ResultModal
        isOpen={Boolean(resultBlob && exportFormat === 'docx')}
        onClose={() => setResultBlob(null)}
        resultData={resultBlob}
        defaultFileName={file ? sanitizeFilename(file.name, 'ocr', 'docx') : 'ocr_result.docx'}
        onReset={() => {
          setResultBlob(null);
          setFile(null);
          setFileBytes(null);
          setExtractedText('');
        }}
      />
    </div>
  );
};
