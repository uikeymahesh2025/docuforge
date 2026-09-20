import React, { useState } from 'react';
import { Images, Download, FileArchive, Eye, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { ConvertedPageImage, PdfToImagesResult, pdfToImagesZip } from '../pdf/pdfModifier';
import { useToastStore } from '../stores/useToastStore';
import { loadPdfDocument } from '../pdf/pdfManager';
import { downloadBlob } from '../utils/downloadHelpers';

export const PdfToImagesPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [quality, setQuality] = useState(0.9);
  const [dpi, setDpi] = useState<number>(300);
  const [totalPages, setTotalPages] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PdfToImagesResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewModalPage, setPreviewModalPage] = useState<ConvertedPageImage | null>(null);

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
      setResult(null);
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
        file.name.replace(/\.pdf$/i, ''),
        dpi
      );
      setResult(res);
      setIsModalOpen(true);
      addToast({
        type: 'success',
        title: 'Conversion Complete',
        message: res.isZip
          ? `All ${res.totalPages} pages exported at ${dpi} DPI into a ZIP archive.`
          : `Page 1 exported cleanly at ${dpi} DPI.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Conversion Failed', message: err?.message || 'Could not convert PDF to images.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setPdfBytes(null);
    setFile(null);
    setIsModalOpen(false);
    setPreviewModalPage(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <Images className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          PDF to <span className="text-brand-gold">Images</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Convert each page of your PDF into high-resolution JPG or PNG pictures with instant visual preview and direct download.
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
                <p className="text-xs text-zinc-500">{totalPages} {totalPages === 1 ? 'page' : 'pages'} will be rendered</p>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-zinc-400 hover:text-white transition"
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

            {/* DPI Resolution Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-300">
                  Rendering Resolution (DPI)
                </label>
                <span className="text-[11px] font-mono text-brand-gold bg-amber-500/10 px-2 py-0.5 rounded border border-brand-gold/20">
                  {dpi === 150 ? 'Standard Web (~1240 × 1754 px)' : dpi === 300 ? 'Print-Ready 300 DPI (~2480 × 3508 px)' : 'Ultra HD 600 DPI (~4960 × 7016 px)'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 150, title: '150 DPI', desc: 'Fast & Lightweight' },
                  { value: 300, title: '300 DPI (Recommended)', desc: 'Official Print Sharpness' },
                  { value: 600, title: '600 DPI', desc: 'Ultra-High Fidelity' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setDpi(item.value)}
                    className={`p-3 rounded-xl border text-left transition ${
                      dpi === item.value
                        ? 'border-brand-gold bg-amber-500/10 text-white shadow-gold-glow/20'
                        : 'border-white/10 text-zinc-400 hover:text-white bg-zinc-900/50'
                    }`}
                  >
                    <div className="text-xs font-bold text-white mb-0.5">{item.title}</div>
                    <div className="text-[10px] text-zinc-400">{item.desc}</div>
                  </button>
                ))}
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

          {/* Converted Pages Gallery & Previews */}
          {result && (
            <div className="mt-8 bg-[#121218] border border-brand-gold/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {result.isZip ? 'Rendered Images' : 'Rendered Image'}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {result.totalPages} {result.totalPages === 1 ? 'page' : 'pages'} rendered at {dpi} DPI ({format.toUpperCase()})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {result.isZip && (
                    <button
                      onClick={() => downloadBlob(result.blob, result.filename)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-gold text-black font-bold text-xs hover:brightness-110 shadow-gold-glow transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Download All (ZIP)
                    </button>
                  )}
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Quick Download
                  </button>
                </div>
              </div>

              {/* Grid of Pages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {result.pages.map((pg) => (
                  <div
                    key={pg.pageNumber}
                    className="group relative bg-black/40 border border-white/10 hover:border-brand-gold/50 rounded-xl p-3 flex flex-col items-center transition shadow-md"
                  >
                    <div
                      onClick={() => setPreviewModalPage(pg)}
                      className="relative w-full h-48 bg-black/60 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer mb-3"
                    >
                      <img
                        src={pg.dataUrl}
                        alt={`Page ${pg.pageNumber}`}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition gap-2">
                        <span className="p-2 bg-brand-gold text-black rounded-full shadow-lg">
                          <Eye className="w-4 h-4" />
                        </span>
                      </div>
                    </div>

                    <div className="w-full flex items-center justify-between text-xs mb-2.5">
                      <span className="font-bold text-white">Page {pg.pageNumber}</span>
                      <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded">
                        {pg.width} × {pg.height} px
                      </span>
                    </div>

                    <button
                      onClick={() => downloadBlob(pg.blob, pg.filename)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/10 hover:bg-brand-gold hover:text-black text-white font-semibold text-xs transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Download {format.toUpperCase()}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox / Expanded Page Preview Modal */}
      {previewModalPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="relative max-w-4xl max-h-[92vh] w-full flex flex-col items-center">
            <button
              onClick={() => setPreviewModalPage(null)}
              className="absolute -top-12 right-0 p-2 text-zinc-400 hover:text-white transition"
              title="Close Preview"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="bg-[#121218] border border-brand-gold/30 rounded-2xl p-4 w-full flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-xs">
                <span className="font-bold text-white">
                  Page {previewModalPage.pageNumber} ({previewModalPage.width} × {previewModalPage.height} px)
                </span>
                <button
                  onClick={() => downloadBlob(previewModalPage.blob, previewModalPage.filename)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-gold text-black font-bold text-xs hover:brightness-110 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Download {format.toUpperCase()}
                </button>
              </div>
              <div className="max-h-[72vh] overflow-auto flex items-center justify-center w-full">
                <img
                  src={previewModalPage.dataUrl}
                  alt={`Page ${previewModalPage.pageNumber} Preview`}
                  className="max-h-[70vh] object-contain rounded shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Rendering high-res pages & creating images..." />
      <ResultModal
        isOpen={isModalOpen && Boolean(result)}
        onClose={() => setIsModalOpen(false)}
        resultData={result?.blob || null}
        defaultFileName={result?.filename || 'document_images.zip'}
        title={result?.isZip ? 'Your Images are Ready!' : 'Your Image is Ready!'}
        subtitle={
          result?.isZip
            ? `All ${result?.totalPages} pages rendered at ${dpi} DPI and packaged into a ZIP archive.`
            : `Page 1 rendered at ${dpi} DPI as high-definition ${format.toUpperCase()}.`
        }
        previewUrl={result?.singleDataUrl}
        isZip={result?.isZip}
        onReset={handleReset}
      />
    </div>
  );
};
