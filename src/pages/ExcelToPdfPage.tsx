import React, { useState } from 'react';
import { Table, Download, FileSpreadsheet, Eye, Sparkles, Layers, Sliders, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { useToastStore } from '../stores/useToastStore';
import { sanitizeFilename } from '../utils/downloadHelpers';

interface SheetPreview {
  name: string;
  rows: string[][];
  totalRows: number;
  totalCols: number;
}

export const ExcelToPdfPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [sheets, setSheets] = useState<SheetPreview[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    try {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setFileBytes(bytes);
      setFile(f);

      // Parse with SheetJS for live client-side preview
      const workbook = XLSX.read(bytes, { type: 'array' });
      const parsedSheets: SheetPreview[] = [];

      for (const sName of workbook.SheetNames) {
        const ws = workbook.Sheets[sName];
        const rawRows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, blankrows: false });
        const cleanRows = rawRows.slice(0, 15).map((r) => r.map((c) => String(c ?? '')));
        parsedSheets.push({
          name: sName,
          rows: cleanRows,
          totalRows: rawRows.length,
          totalCols: Math.max(...rawRows.map((r) => r.length), 0),
        });
      }

      setSheets(parsedSheets);
      setActiveSheetIdx(0);
      addToast({
        type: 'success',
        title: 'Spreadsheet Loaded',
        message: `${f.name} loaded with ${parsedSheets.length} sheet(s).`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'File Read Error',
        message: err?.message || 'Could not parse spreadsheet.',
      });
    }
  };

  const handleConvert = async () => {
    if (!fileBytes || !file) return;
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', new Blob([fileBytes.buffer as ArrayBuffer], { type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), file.name);

      const hostName = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
      const endpoints = [
        '/api/convert/excel-to-pdf',
        `http://${hostName}:4000/api/convert/excel-to-pdf`,
        'http://localhost:4000/api/convert/excel-to-pdf',
        'http://127.0.0.1:4000/api/convert/excel-to-pdf',
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
        if (blob.size > 200) {
          setPdfBlob(blob);
          addToast({
            type: 'success',
            title: 'PDF Ready',
            message: 'Spreadsheet successfully converted into a high-fidelity PDF document.',
          });
          return;
        }
      }

      throw new Error('Backend conversion service was unreachable. Please ensure the backend server is running.');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Conversion Failed',
        message: err?.message || 'Could not convert spreadsheet to PDF.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const activeSheet = sheets[activeSheetIdx];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <FileSpreadsheet className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Excel to <span className="text-emerald-400">PDF (.pdf)</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Convert Microsoft Excel (.xlsx, .xls) and CSV sheets into beautifully paginated, crisp vector PDF documents.
        </p>
      </div>

      {!fileBytes ? (
        <FileUploader
          title="Drop Excel or CSV file here"
          subtitle="Supports .xlsx, .xls, and .csv spreadsheets"
          accept=".xlsx,.xls,.csv"
          fileType="any"
          onFilesSelected={handleFileSelected}
        />
      ) : (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">{file?.name}</h3>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {sheets.length} Sheet(s) • Total ~{sheets.reduce((acc, s) => acc + s.totalRows, 0)} Rows
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setFile(null);
                  setFileBytes(null);
                  setSheets([]);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 transition"
              >
                Change File
              </button>
              <button
                onClick={handleConvert}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] transition active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Convert to PDF</span>
              </button>
            </div>
          </div>

          {/* Sheet Selector Tabs */}
          {sheets.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10">
              {sheets.map((s, idx) => (
                <button
                  key={s.name}
                  onClick={() => setActiveSheetIdx(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                    activeSheetIdx === idx
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-zinc-400 hover:text-white bg-zinc-900 border border-white/5'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>{s.name}</span>
                  <span className="text-[10px] opacity-60">({s.totalRows} rows)</span>
                </button>
              ))}
            </div>
          )}

          {/* Live Data Preview Grid */}
          {activeSheet && (
            <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  Preview: {activeSheet.name} (Showing first {activeSheet.rows.length} rows)
                </h4>
                <span className="text-xs text-zinc-500">
                  {activeSheet.totalCols} Columns × {activeSheet.totalRows} Rows
                </span>
              </div>

              <div className="overflow-x-auto max-h-[420px] rounded-xl border border-white/10">
                <table className="w-full text-left text-xs text-zinc-300 border-collapse">
                  <tbody>
                    {activeSheet.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={
                          rIdx === 0
                            ? 'bg-zinc-800 text-white font-bold border-b border-white/20'
                            : rIdx % 2 === 1
                            ? 'bg-zinc-900/50 hover:bg-zinc-800/40 border-b border-white/5'
                            : 'bg-[#121218] hover:bg-zinc-800/40 border-b border-white/5'
                        }
                      >
                        {row.map((cellVal, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 border-r border-white/5 whitespace-nowrap max-w-[200px] truncate">
                            {cellVal}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Auto-formatting layout & generating PDF..." />
      <ResultModal
        isOpen={Boolean(pdfBlob)}
        onClose={() => setPdfBlob(null)}
        resultData={pdfBlob}
        defaultFileName={file ? sanitizeFilename(file.name, 'spreadsheet', 'pdf') : 'spreadsheet.pdf'}
        onReset={() => {
          setPdfBlob(null);
          setFile(null);
          setFileBytes(null);
          setSheets([]);
        }}
      />
    </div>
  );
};
