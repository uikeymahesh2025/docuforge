import React, { useState } from 'react';
import { FileSpreadsheet, Download, Table, CheckCircle2, Sparkles, Layers, FileDown } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { useToastStore } from '../stores/useToastStore';
import { sanitizeFilename } from '../utils/downloadHelpers';

export const PdfToExcelPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [xlsxBlob, setXlsxBlob] = useState<Blob | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    try {
      const buffer = await f.arrayBuffer();
      setPdfBytes(new Uint8Array(buffer));
      setFile(f);
      addToast({
        type: 'success',
        title: 'Document Ready',
        message: `${f.name} loaded. Click Extract to Excel.`,
      });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Could not read PDF document.' });
    }
  };

  const handleConvert = async () => {
    if (!pdfBytes || !file) return;
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' }), file.name);

      const hostName = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
      const endpoints = [
        '/api/convert/pdf-to-excel',
        `http://${hostName}:4000/api/convert/pdf-to-excel`,
        'http://localhost:4000/api/convert/pdf-to-excel',
        'http://127.0.0.1:4000/api/convert/pdf-to-excel',
      ];

      let resp: Response | null = null;
      for (const url of endpoints) {
        try {
          const candidate = await fetch(url, {
            method: 'POST',
            body: formData,
          });
          if (candidate && candidate.ok) {
            resp = candidate;
            break;
          }
        } catch {
          // Try next candidate
        }
      }

      if (resp && resp.ok) {
        const blob = await resp.blob();
        if (blob.size > 100) {
          setXlsxBlob(blob);
          addToast({
            type: 'success',
            title: 'Excel Workbook Ready',
            message: 'Successfully extracted PDF tables into Microsoft Excel (.xlsx).',
          });
          return;
        }
      }

      throw new Error('Backend table extraction engine was unreachable. Ensure backend is running.');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Extraction Error',
        message: err?.message || 'Failed to extract tables to Excel.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <Table className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          PDF to <span className="text-emerald-400">Excel (.xlsx)</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Automatically detect tables, rows, columns and numbers from PDF documents and extract them into editable spreadsheets.
        </p>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop PDF here to extract tables"
          subtitle="Extract structured tables into Microsoft Excel (.xlsx)"
          onFilesSelected={handleFileSelected}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">{file?.name}</p>
              <p className="text-xs text-zinc-500">Ready to scan and extract tabular structure</p>
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

          <button
            onClick={handleConvert}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] transition active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Extract to Excel Workbook (.xlsx)</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Detecting table grids & building Excel workbook..." />
      <ResultModal
        isOpen={Boolean(xlsxBlob)}
        onClose={() => setXlsxBlob(null)}
        resultData={xlsxBlob}
        defaultFileName={file ? sanitizeFilename(file.name, 'extracted', 'xlsx') : 'extracted_tables.xlsx'}
        onReset={() => {
          setXlsxBlob(null);
          setPdfBytes(null);
          setFile(null);
        }}
      />
    </div>
  );
};
