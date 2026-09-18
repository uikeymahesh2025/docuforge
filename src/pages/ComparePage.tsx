import React, { useState } from 'react';
import { Columns2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { loadPdfDocument, renderPageToCanvas } from '../pdf/pdfManager';
import { useToastStore } from '../stores/useToastStore';

export const ComparePage: React.FC = () => {
  const [docABytes, setDocABytes] = useState<Uint8Array | null>(null);
  const [docBBytes, setDocBBytes] = useState<Uint8Array | null>(null);
  const [nameA, setNameA] = useState('');
  const [nameB, setNameB] = useState('');
  const [pageA, setPageA] = useState(1);
  const [pageB, setPageB] = useState(1);
  const [countA, setCountA] = useState(1);
  const [countB, setCountB] = useState(1);

  const canvasARef = React.useRef<HTMLCanvasElement>(null);
  const canvasBRef = React.useRef<HTMLCanvasElement>(null);

  const addToast = useToastStore((state) => state.addToast);

  const handleUploadA = async (files: File[]) => {
    if (!files[0]) return;
    try {
      const buffer = await files[0].arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const doc = await loadPdfDocument(bytes);
      setDocABytes(bytes);
      setNameA(files[0].name);
      setCountA(doc.numPages);
      setPageA(1);
      if (canvasARef.current) {
        await renderPageToCanvas(doc, 1, canvasARef.current, 0.8, 0);
      }
    } catch {
      addToast({ type: 'error', title: 'Error loading Document A' });
    }
  };

  const handleUploadB = async (files: File[]) => {
    if (!files[0]) return;
    try {
      const buffer = await files[0].arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const doc = await loadPdfDocument(bytes);
      setDocBBytes(bytes);
      setNameB(files[0].name);
      setCountB(doc.numPages);
      setPageB(1);
      if (canvasBRef.current) {
        await renderPageToCanvas(doc, 1, canvasBRef.current, 0.8, 0);
      }
    } catch {
      addToast({ type: 'error', title: 'Error loading Document B' });
    }
  };

  const renderA = async (p: number) => {
    if (!docABytes || !canvasARef.current) return;
    const doc = await loadPdfDocument(docABytes);
    await renderPageToCanvas(doc, p, canvasARef.current, 0.8, 0);
    setPageA(p);
  };

  const renderB = async (p: number) => {
    if (!docBBytes || !canvasBRef.current) return;
    const doc = await loadPdfDocument(docBBytes);
    await renderPageToCanvas(doc, p, canvasBRef.current, 0.8, 0);
    setPageB(p);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <Columns2 className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Compare <span className="text-brand-gold">Two PDFs</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Side-by-side synchronized document inspection to compare versions, drafts, and contract revisions.
        </p>
      </div>

      <div className="mb-6 p-4 rounded-2xl bg-zinc-900/80 border border-white/10 text-zinc-400 text-xs flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-brand-gold shrink-0" />
        <span>Side-by-side visual comparison mode. Check revisions, margin changes, and layout differences simultaneously.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document A */}
        <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-gold">Document A (Original)</span>
            {nameA && <span className="text-xs text-zinc-400 truncate max-w-[200px]">{nameA}</span>}
          </div>

          {!docABytes ? (
            <FileUploader
              title="Upload First PDF (Doc A)"
              subtitle="Choose baseline version"
              onFilesSelected={handleUploadA}
            />
          ) : (
            <div className="flex flex-col items-center w-full">
              <div className="flex items-center gap-3 mb-4 text-xs text-zinc-300">
                <button
                  onClick={() => renderA(Math.max(1, pageA - 1))}
                  disabled={pageA <= 1}
                  className="p-1.5 rounded-lg bg-zinc-800 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>Page {pageA} of {countA}</span>
                <button
                  onClick={() => renderA(Math.min(countA, pageA + 1))}
                  disabled={pageA >= countA}
                  className="p-1.5 rounded-lg bg-zinc-800 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="w-full flex justify-center bg-[#070709] p-4 rounded-xl border border-white/5 overflow-auto">
                <canvas ref={canvasARef} className="rounded shadow-md bg-white" />
              </div>
            </div>
          )}
        </div>

        {/* Document B */}
        <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-gold">Document B (Revision)</span>
            {nameB && <span className="text-xs text-zinc-400 truncate max-w-[200px]">{nameB}</span>}
          </div>

          {!docBBytes ? (
            <FileUploader
              title="Upload Second PDF (Doc B)"
              subtitle="Choose revised version"
              onFilesSelected={handleUploadB}
            />
          ) : (
            <div className="flex flex-col items-center w-full">
              <div className="flex items-center gap-3 mb-4 text-xs text-zinc-300">
                <button
                  onClick={() => renderB(Math.max(1, pageB - 1))}
                  disabled={pageB <= 1}
                  className="p-1.5 rounded-lg bg-zinc-800 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>Page {pageB} of {countB}</span>
                <button
                  onClick={() => renderB(Math.min(countB, pageB + 1))}
                  disabled={pageB >= countB}
                  className="p-1.5 rounded-lg bg-zinc-800 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="w-full flex justify-center bg-[#070709] p-4 rounded-xl border border-white/5 overflow-auto">
                <canvas ref={canvasBRef} className="rounded shadow-md bg-white" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
