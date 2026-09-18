import React, { useState } from 'react';
import { Combine, ArrowUp, ArrowDown, Trash2, Plus, Download, RefreshCw } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { mergePdfs } from '../pdf/pdfModifier';
import { loadPdfDocument } from '../pdf/pdfManager';
import { useToastStore } from '../stores/useToastStore';
import { formatBytes } from '../utils/downloadHelpers';

interface FileItem {
  id: string;
  file: File;
  bytes: Uint8Array;
  pageCount: number;
}

export const MergePage: React.FC = () => {
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  const handleFilesSelected = async (files: File[]) => {
    const newItems: FileItem[] = [];

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const doc = await loadPdfDocument(bytes);
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          bytes,
          pageCount: doc.numPages,
        });
      } catch {
        addToast({
          type: 'warning',
          title: 'Skipped file',
          message: `Could not parse ${file.name}. It may be corrupted or password protected.`,
        });
      }
    }

    setFileItems((prev) => [...prev, ...newItems]);
    if (newItems.length > 0) {
      addToast({
        type: 'success',
        title: 'Files Added',
        message: `Added ${newItems.length} ${newItems.length === 1 ? 'file' : 'files'}.`,
      });
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setFileItems((prev) => {
      const arr = [...prev];
      const temp = arr[index - 1];
      arr[index - 1] = arr[index];
      arr[index] = temp;
      return arr;
    });
  };

  const moveDown = (index: number) => {
    if (index === fileItems.length - 1) return;
    setFileItems((prev) => {
      const arr = [...prev];
      const temp = arr[index + 1];
      arr[index + 1] = arr[index];
      arr[index] = temp;
      return arr;
    });
  };

  const removeItem = (id: string) => {
    setFileItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMerge = async () => {
    if (fileItems.length < 2) {
      addToast({
        type: 'warning',
        title: 'Select more files',
        message: 'Please add at least 2 PDF files to merge.',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const pdfBytesList = fileItems.map((item) => item.bytes);
      const merged = await mergePdfs(pdfBytesList);
      setResultData(merged);
      addToast({
        type: 'success',
        title: 'Merge Complete',
        message: `Successfully merged ${fileItems.length} documents into one.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Merge Failed',
        message: err?.message || 'Could not combine documents.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <Combine className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Merge <span className="text-brand-gold">PDF Files</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Combine multiple PDF documents into a single organized file. Reorder pages and files as needed.
        </p>
      </div>

      {fileItems.length === 0 ? (
        <FileUploader
          multiple={true}
          title="Drop multiple PDF files here"
          subtitle="or select files to combine them into one"
          onFilesSelected={handleFilesSelected}
        />
      ) : (
        <div className="space-y-6">
          {/* File list */}
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Documents to Merge ({fileItems.length})
              </span>
              <button
                onClick={() => setFileItems([])}
                className="text-xs text-zinc-500 hover:text-rose-400 transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            </div>

            <div className="space-y-2">
              {fileItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/70 border border-white/5 hover:border-white/20 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-black/50 text-zinc-400 text-xs font-mono flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-md">
                        {item.file.name}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'} • {formatBytes(item.file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-20 rounded-lg hover:bg-white/5 transition"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === fileItems.length - 1}
                      className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-20 rounded-lg hover:bg-white/5 transition"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition ml-1"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add more files dropzone */}
            <div className="pt-2">
              <FileUploader
                multiple={true}
                title="Add more files"
                subtitle="Upload additional documents to include in the merged output"
                onFilesSelected={handleFilesSelected}
              />
            </div>
          </div>

          {/* Merge Action CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0E0E14] border border-white/10">
            <span className="text-xs text-zinc-400">
              Total pages: <strong className="text-white">{fileItems.reduce((a, b) => a + b.pageCount, 0)}</strong>
            </span>
            <button
              onClick={handleMerge}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
            >
              <Combine className="w-4 h-4" />
              <span>Merge {fileItems.length} PDFs</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Combining documents..." />
      <ResultModal
        isOpen={Boolean(resultData)}
        onClose={() => setResultData(null)}
        resultData={resultData}
        defaultFileName="merged.pdf"
        onReset={() => {
          setResultData(null);
          setFileItems([]);
        }}
      />
    </div>
  );
};
