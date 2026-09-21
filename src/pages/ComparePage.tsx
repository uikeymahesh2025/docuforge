import React, { useState, useRef, useEffect } from 'react';
import {
  Columns2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
  Sliders,
  RefreshCw,
  CheckCircle2,
  Flame,
  FileText,
  PlusCircle,
  MinusCircle,
  Sparkles,
} from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { loadPdfDocument, renderPageToCanvas } from '../pdf/pdfManager';
import { useToastStore } from '../stores/useToastStore';

interface TextDiffItem {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}

export const ComparePage: React.FC = () => {
  const [docABytes, setDocABytes] = useState<Uint8Array | null>(null);
  const [docBBytes, setDocBBytes] = useState<Uint8Array | null>(null);
  const [nameA, setNameA] = useState('');
  const [nameB, setNameB] = useState('');
  const [pageA, setPageA] = useState(1);
  const [pageB, setPageB] = useState(1);
  const [countA, setCountA] = useState(1);
  const [countB, setCountB] = useState(1);
  const [syncPages, setSyncPages] = useState(true);
  const [viewMode, setViewMode] = useState<'split' | 'diff' | 'text'>('split');
  const [diffStats, setDiffStats] = useState<{ similarity: number; diffPixels: number } | null>(null);

  // Text diff states
  const [textA, setTextA] = useState<string>('');
  const [textB, setTextB] = useState<string>('');
  const [textDiffs, setTextDiffs] = useState<TextDiffItem[]>([]);
  const [textStats, setTextStats] = useState<{ added: number; removed: number; matched: number }>({
    added: 0,
    removed: 0,
    matched: 0,
  });
  const [isLoadingText, setIsLoadingText] = useState<boolean>(false);

  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const canvasDiffRef = useRef<HTMLCanvasElement>(null);

  const addToast = useToastStore((state) => state.addToast);

  const extractPageText = async (bytes: Uint8Array, pageNum: number): Promise<string> => {
    try {
      const doc = await loadPdfDocument(bytes);
      if (pageNum < 1 || pageNum > doc.numPages) return '';
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const lines: string[] = [];
      let currentLine = '';
      let lastY: number | null = null;

      for (const item of textContent.items as any[]) {
        if (!item.str) continue;
        const y = Math.round(item.transform[5]);
        if (lastY === null || Math.abs(y - lastY) > 5) {
          if (currentLine) lines.push(currentLine.trim());
          currentLine = item.str;
          lastY = y;
        } else {
          currentLine += (currentLine.endsWith(' ') ? '' : ' ') + item.str;
        }
      }
      if (currentLine) lines.push(currentLine.trim());
      return lines.join('\n');
    } catch {
      return '';
    }
  };

  const computeTextDiff = (rawA: string, rawB: string) => {
    const wordsA = rawA.split(/(\s+)/);
    const wordsB = rawB.split(/(\s+)/);

    const diffs: TextDiffItem[] = [];
    const setB = new Set(wordsB.filter((w) => w.trim()));
    const setA = new Set(wordsA.filter((w) => w.trim()));

    let addedCount = 0;
    let removedCount = 0;
    let matchCount = 0;

    // Simple LCS-like word diff approximation
    let ptrA = 0;
    let ptrB = 0;

    while (ptrA < wordsA.length || ptrB < wordsB.length) {
      if (ptrA < wordsA.length && ptrB < wordsB.length && wordsA[ptrA] === wordsB[ptrB]) {
        diffs.push({ type: 'unchanged', text: wordsA[ptrA] });
        if (wordsA[ptrA].trim()) matchCount++;
        ptrA++;
        ptrB++;
      } else if (ptrA < wordsA.length && !setB.has(wordsA[ptrA]) && wordsA[ptrA].trim()) {
        diffs.push({ type: 'removed', text: wordsA[ptrA] });
        removedCount++;
        ptrA++;
      } else if (ptrB < wordsB.length && !setA.has(wordsB[ptrB]) && wordsB[ptrB].trim()) {
        diffs.push({ type: 'added', text: wordsB[ptrB] });
        addedCount++;
        ptrB++;
      } else if (ptrA < wordsA.length) {
        diffs.push({ type: 'removed', text: wordsA[ptrA] });
        if (wordsA[ptrA].trim()) removedCount++;
        ptrA++;
      } else {
        diffs.push({ type: 'added', text: wordsB[ptrB] });
        if (wordsB[ptrB].trim()) addedCount++;
        ptrB++;
      }
    }

    setTextDiffs(diffs);
    setTextStats({ added: addedCount, removed: removedCount, matched: matchCount });
  };

  const loadTextDiffsForCurrentPages = async () => {
    if (!docABytes || !docBBytes) return;
    setIsLoadingText(true);
    try {
      const [tA, tB] = await Promise.all([
        extractPageText(docABytes, pageA),
        extractPageText(docBBytes, pageB),
      ]);
      setTextA(tA);
      setTextB(tB);
      computeTextDiff(tA, tB);
    } finally {
      setIsLoadingText(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'text' && docABytes && docBBytes) {
      loadTextDiffsForCurrentPages();
    }
  }, [viewMode, pageA, pageB, docABytes, docBBytes]);

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
        await renderPageToCanvas(doc, 1, canvasARef.current, 0.9, 0);
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
        await renderPageToCanvas(doc, 1, canvasBRef.current, 0.9, 0);
      }
    } catch {
      addToast({ type: 'error', title: 'Error loading Document B' });
    }
  };

  const renderA = async (p: number) => {
    if (!docABytes || !canvasARef.current) return;
    const doc = await loadPdfDocument(docABytes);
    await renderPageToCanvas(doc, p, canvasARef.current, 0.9, 0);
    setPageA(p);
  };

  const renderB = async (p: number) => {
    if (!docBBytes || !canvasBRef.current) return;
    const doc = await loadPdfDocument(docBBytes);
    await renderPageToCanvas(doc, p, canvasBRef.current, 0.9, 0);
    setPageB(p);
  };

  const handlePageChange = (targetPage: number) => {
    const pA = Math.max(1, Math.min(countA, targetPage));
    const pB = Math.max(1, Math.min(countB, targetPage));
    renderA(pA);
    renderB(pB);
  };

  // Compute visual diff between canvasA and canvasB
  const computeVisualDiff = () => {
    const cA = canvasARef.current;
    const cB = canvasBRef.current;
    const cDiff = canvasDiffRef.current;
    if (!cA || !cB || !cDiff) return;

    const ctxA = cA.getContext('2d');
    const ctxB = cB.getContext('2d');
    const ctxDiff = cDiff.getContext('2d');
    if (!ctxA || !ctxB || !ctxDiff) return;

    const width = Math.max(cA.width, cB.width);
    const height = Math.max(cA.height, cB.height);
    cDiff.width = width;
    cDiff.height = height;

    const imgDataA = ctxA.getImageData(0, 0, cA.width, cA.height);
    const imgDataB = ctxB.getImageData(0, 0, cB.width, cB.height);
    const diffImgData = ctxDiff.createImageData(width, height);

    const dataA = imgDataA.data;
    const dataB = imgDataB.data;
    const dataDiff = diffImgData.data;

    let diffCount = 0;
    const totalPixels = width * height;

    for (let i = 0; i < totalPixels * 4; i += 4) {
      const rA = dataA[i] ?? 255;
      const gA = dataA[i + 1] ?? 255;
      const bA = dataA[i + 2] ?? 255;

      const rB = dataB[i] ?? 255;
      const gB = dataB[i + 1] ?? 255;
      const bB = dataB[i + 2] ?? 255;

      const delta = Math.abs(rA - rB) + Math.abs(gA - gB) + Math.abs(bA - bB);

      if (delta > 40) {
        diffCount++;
        dataDiff[i] = 239;
        dataDiff[i + 1] = 68;
        dataDiff[i + 2] = 68;
        dataDiff[i + 3] = 255;
      } else {
        const gray = Math.round(0.299 * rA + 0.587 * gA + 0.114 * bA);
        dataDiff[i] = gray;
        dataDiff[i + 1] = gray;
        dataDiff[i + 2] = gray;
        dataDiff[i + 3] = 160;
      }
    }

    ctxDiff.putImageData(diffImgData, 0, 0);

    const similarity = Math.max(0, Math.min(100, ((totalPixels - diffCount) / totalPixels) * 100));
    setDiffStats({
      similarity: parseFloat(similarity.toFixed(1)),
      diffPixels: diffCount,
    });
  };

  useEffect(() => {
    if (viewMode === 'diff') {
      const t = setTimeout(() => {
        computeVisualDiff();
      }, 200);
      return () => clearTimeout(t);
    }
  }, [viewMode, pageA, pageB, docABytes, docBBytes]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <Columns2 className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Side-by-Side <span className="text-brand-gold">PDF Diff Checker</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
          Compare contracts, legal clauses, and revised drafts with side-by-side visual rendering, line/word text diff, and pixel heatmap.
        </p>
      </div>

      {/* Control Bar: Mode Toggle & Sync Setting */}
      <div className="mb-6 p-4 rounded-2xl bg-[#121218] border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              viewMode === 'split'
                ? 'bg-brand-gold text-black shadow-gold-glow/30'
                : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Side-by-Side</span>
          </button>
          <button
            onClick={() => setViewMode('text')}
            disabled={!docABytes || !docBBytes}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-30 ${
              viewMode === 'text'
                ? 'bg-brand-gold text-black shadow-gold-glow/30'
                : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Text & Clause Diff</span>
          </button>
          <button
            onClick={() => setViewMode('diff')}
            disabled={!docABytes || !docBBytes}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-30 ${
              viewMode === 'diff'
                ? 'bg-brand-gold text-black shadow-gold-glow/30'
                : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Visual Heatmap</span>
          </button>
        </div>

        {/* Sync Page Flipping checkbox */}
        <label className="flex items-center gap-2 text-xs font-medium text-zinc-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={syncPages}
            onChange={(e) => setSyncPages(e.target.checked)}
            className="rounded accent-amber-400"
          />
          <span>Synchronize Page Navigation</span>
        </label>
      </div>

      {/* Metrics Banner if in Visual Diff Mode */}
      {viewMode === 'diff' && diffStats && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-brand-gold" />
            <div>
              <p className="text-sm font-bold text-white">Visual Similarity: {diffStats.similarity}%</p>
              <p className="text-xs text-zinc-400">
                {diffStats.diffPixels === 0
                  ? 'Both pages are visually identical.'
                  : `Red highlighted regions mark ${diffStats.diffPixels.toLocaleString()} modified pixels.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-3 h-3 rounded-full bg-zinc-600"></span>
              <span>Matching</span>
            </span>
            <span className="flex items-center gap-1.5 text-red-400 font-bold">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
              <span>Differences</span>
            </span>
          </div>
        </div>
      )}

      {/* Metrics Banner if in Text Diff Mode */}
      {viewMode === 'text' && (
        <div className="mb-6 p-4 rounded-2xl bg-[#121218] border border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-800/40">
              <PlusCircle className="w-4 h-4" />
              <span>+{textStats.added} Words Added</span>
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-800/40">
              <MinusCircle className="w-4 h-4" />
              <span>-{textStats.removed} Words Deleted</span>
            </span>
            <span className="text-zinc-400">
              Comparing Page {pageA} vs Page {pageB}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => handlePageChange(Math.max(1, pageA - 1))}
              disabled={pageA <= 1}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
            >
              Prev Page
            </button>
            <span className="text-zinc-300 font-mono">
              {pageA} / {Math.max(countA, countB)}
            </span>
            <button
              onClick={() => handlePageChange(Math.min(Math.max(countA, countB), pageA + 1))}
              disabled={pageA >= Math.max(countA, countB)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
            >
              Next Page
            </button>
          </div>
        </div>
      )}

      {/* View Containers */}
      {viewMode === 'text' ? (
        /* Text Diff View */
        <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
          {isLoadingText ? (
            <div className="py-16 text-center text-zinc-400 flex flex-col items-center gap-3">
              <RefreshCw className="w-7 h-7 animate-spin text-brand-gold" />
              <p className="text-sm">Extracting and computing clause differences...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Document A Text */}
              <div className="p-4 rounded-xl bg-[#09090C] border border-white/5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold uppercase text-brand-gold">Document A (Original)</span>
                  <span className="text-xs text-zinc-500 font-mono">Page {pageA}</span>
                </div>
                <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto text-zinc-300 p-2">
                  {textA ? (
                    textA
                  ) : (
                    <span className="text-zinc-600 italic">No text extracted on this page.</span>
                  )}
                </div>
              </div>

              {/* Document B Text with Inline Additions/Deletions */}
              <div className="p-4 rounded-xl bg-[#09090C] border border-white/5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold uppercase text-emerald-400">Document B (Revision & Diff)</span>
                  <span className="text-xs text-zinc-500 font-mono">Page {pageB}</span>
                </div>
                <div className="font-mono text-xs leading-relaxed max-h-[500px] overflow-y-auto p-2">
                  {textDiffs.length > 0 ? (
                    textDiffs.map((d, idx) => {
                      if (d.type === 'added') {
                        return (
                          <span
                            key={idx}
                            className="bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded font-bold border border-emerald-500/30"
                          >
                            {d.text}
                          </span>
                        );
                      }
                      if (d.type === 'removed') {
                        return (
                          <span
                            key={idx}
                            className="bg-rose-500/20 text-rose-300 px-1 py-0.5 rounded line-through border border-rose-500/30 opacity-80"
                          >
                            {d.text}
                          </span>
                        );
                      }
                      return <span key={idx} className="text-zinc-300">{d.text}</span>;
                    })
                  ) : (
                    <span className="text-zinc-600 italic">No differences detected or page is blank.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'diff' ? (
        /* Visual Heatmap View */
        <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col items-center">
          <div className="flex items-center gap-4 mb-6 text-xs text-zinc-300">
            <button
              onClick={() => handlePageChange(Math.max(1, pageA - 1))}
              disabled={pageA <= 1}
              className="p-2 rounded-xl bg-zinc-900 border border-white/10 hover:border-brand-gold/50 disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-white">Comparing Page {pageA}</span>
            <button
              onClick={() => handlePageChange(Math.min(Math.min(countA, countB), pageA + 1))}
              disabled={pageA >= Math.min(countA, countB)}
              className="p-2 rounded-xl bg-zinc-900 border border-white/10 hover:border-brand-gold/50 disabled:opacity-30 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full flex justify-center bg-[#070709] p-6 rounded-xl border border-white/5 overflow-auto">
            <canvas ref={canvasDiffRef} className="rounded shadow-xl bg-white" />
          </div>
        </div>
      ) : (
        /* Side-by-Side Split View */
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
                accept=".pdf,application/pdf"
                onFilesSelected={handleUploadA}
              />
            ) : (
              <div className="flex flex-col items-center w-full">
                <div className="flex items-center gap-3 mb-4 text-xs text-zinc-300">
                  <button
                    onClick={() => {
                      const nextP = Math.max(1, pageA - 1);
                      renderA(nextP);
                      if (syncPages) renderB(nextP);
                    }}
                    disabled={pageA <= 1}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>Page {pageA} of {countA}</span>
                  <button
                    onClick={() => {
                      const nextP = Math.min(countA, pageA + 1);
                      renderA(nextP);
                      if (syncPages) renderB(nextP);
                    }}
                    disabled={pageA >= countA}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
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
                accept=".pdf,application/pdf"
                onFilesSelected={handleUploadB}
              />
            ) : (
              <div className="flex flex-col items-center w-full">
                <div className="flex items-center gap-3 mb-4 text-xs text-zinc-300">
                  <button
                    onClick={() => {
                      const nextP = Math.max(1, pageB - 1);
                      renderB(nextP);
                      if (syncPages) renderA(nextP);
                    }}
                    disabled={pageB <= 1}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>Page {pageB} of {countB}</span>
                  <button
                    onClick={() => {
                      const nextP = Math.min(countB, pageB + 1);
                      renderB(nextP);
                      if (syncPages) renderA(nextP);
                    }}
                    disabled={pageB >= countB}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
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
      )}
    </div>
  );
};
