import React, { useState } from 'react';
import { Eraser, AlertTriangle, ShieldAlert, Check, RefreshCw } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { redactPdf } from '../pdf/pdfModifier';
import { loadPdfDocument } from '../pdf/pdfManager';
import { PDFDocument } from 'pdf-lib';
import { useToastStore } from '../stores/useToastStore';
import { sanitizeFilename } from '../utils/downloadHelpers';

export const RemoveWatermarkPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [coverColor, setCoverColor] = useState<'white' | 'black'>('white');
  const [coverageArea, setCoverageArea] = useState<'center' | 'header' | 'footer'>('center');
  const [pageScope, setPageScope] = useState<'all' | 'first' | 'odd' | 'even'>('all');
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
      addToast({
        type: 'info',
        title: 'Document Loaded',
        message: 'Configure watermark removal area below.',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Unable to open PDF',
        message: 'Could not read document.',
      });
    }
  };

  const handleRemoveWatermark = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const numPages = doc.getPageCount();
      const patches = [];

      for (let p = 1; p <= numPages; p++) {
        if (pageScope === 'first' && p !== 1) continue;
        if (pageScope === 'odd' && p % 2 === 0) continue;
        if (pageScope === 'even' && p % 2 !== 0) continue;

        const page = doc.getPage(p - 1);
        const { width, height } = page.getSize();

        if (coverageArea === 'center') {
          patches.push({
            pageNumber: p,
            x: width * 0.1,
            y: height * 0.25,
            width: width * 0.8,
            height: height * 0.5,
            color: coverColor,
          });
        } else if (coverageArea === 'header') {
          patches.push({
            pageNumber: p,
            x: width * 0.05,
            y: 15,
            width: width * 0.9,
            height: 70,
            color: coverColor,
          });
        } else if (coverageArea === 'footer') {
          patches.push({
            pageNumber: p,
            x: width * 0.05,
            y: height - 85,
            width: width * 0.9,
            height: 70,
            color: coverColor,
          });
        }
      }

      const modified = await redactPdf(pdfBytes, patches);
      setResultData(modified);
      addToast({
        type: 'success',
        title: 'Watermark Removal Applied',
        message: `Applied visual cover mask to ${patches.length} ${patches.length === 1 ? 'page' : 'pages'}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Operation Failed',
        message: err?.message || 'Could not remove watermark.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <Eraser className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Remove <span className="text-brand-gold">Watermark</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Apply visual cover and content-redaction workflows to mask watermark artifacts.
        </p>
      </div>

      {/* Honest Technical Transparency Alert */}
      <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
        <div>
          <p className="font-bold mb-1">Technical Notice on Watermark Removal</p>
          <p className="text-zinc-300 leading-relaxed text-[11px]">
            Watermarks embedded into flattened PDF raster layers cannot be magically removed without affecting underlying imagery. This tool applies targeted background-color masking and redaction to cover visual stamps.
          </p>
        </div>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop PDF to remove watermarks"
          subtitle="Select file to configure visual clean-up"
          onFilesSelected={handleFileSelected}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <p className="text-sm font-bold text-white">{file?.name}</p>
                <p className="text-xs text-zinc-500">{totalPages} pages</p>
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

            {/* Page Application Scope */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Apply Watermark Removal To
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'all', label: 'All Pages' },
                  { id: 'first', label: 'First Page' },
                  { id: 'odd', label: 'Odd Pages' },
                  { id: 'even', label: 'Even Pages' },
                ].map((scope) => (
                  <button
                    key={scope.id}
                    type="button"
                    onClick={() => setPageScope(scope.id as any)}
                    className={`py-2 px-2 rounded-xl border text-xs font-semibold transition text-center ${
                      pageScope === scope.id
                        ? 'border-brand-gold bg-amber-500/10 text-white'
                        : 'border-white/10 bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {scope.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Coverage Area Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Watermark Location Zone
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'center', label: 'Diagonal Center' },
                  { id: 'header', label: 'Top Header' },
                  { id: 'footer', label: 'Bottom Footer' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCoverageArea(item.id as any)}
                    className={`py-3 px-2 rounded-xl border text-xs font-semibold transition text-center ${
                      coverageArea === item.id
                        ? 'border-brand-gold bg-amber-500/10 text-white'
                        : 'border-white/10 bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mask color */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Mask Fill Color
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setCoverColor('white')}
                  className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition ${
                    coverColor === 'white'
                      ? 'border-brand-gold bg-amber-500/10 text-white'
                      : 'border-white/10 text-zinc-400'
                  }`}
                >
                  White Mask (For standard white pages)
                </button>
                <button
                  onClick={() => setCoverColor('black')}
                  className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition ${
                    coverColor === 'black'
                      ? 'border-brand-gold bg-amber-500/10 text-white'
                      : 'border-white/10 text-zinc-400'
                  }`}
                >
                  Black Redaction Mask
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleRemoveWatermark}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <Eraser className="w-4 h-4" />
            <span>Apply Watermark Cleanup</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Removing watermark..." />
      <ResultModal
        isOpen={Boolean(resultData)}
        onClose={() => setResultData(null)}
        resultData={resultData}
        defaultFileName={file ? sanitizeFilename(file.name, 'cleaned') : 'document_cleaned.pdf'}
        onReset={() => {
          setResultData(null);
          setPdfBytes(null);
          setFile(null);
        }}
      />
    </div>
  );
};
