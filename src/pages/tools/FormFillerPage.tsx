import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool,
  CheckSquare,
  Calendar,
  Type,
  Trash2,
  Download,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { FileUploader } from '../../components/tools/FileUploader';
import { loadPdfDocument, renderPageToCanvas } from '../../pdf/pdfManager';
import { bakeFormFieldsOnPdf, FormFieldValue } from '../../pdf/pdfModifier';
import { useToastStore } from '../../stores/useToastStore';

export const FormFillerPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Field dropping mode
  const [activeTool, setActiveTool] = useState<'text' | 'checkbox' | 'date'>('text');
  const [fields, setFields] = useState<FormFieldValue[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);

    try {
      const buffer = await selected.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setFileBytes(bytes);
      const pdf = await loadPdfDocument(bytes);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      setFields([]);

      addToast({
        type: 'success',
        title: 'Document Loaded',
        message: `${selected.name} (${pdf.numPages} pages) ready to fill. Click on the document to add form fields.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Load Failed',
        message: err?.message || 'Could not load PDF file.',
      });
    }
  };

  const renderCurrentPage = async () => {
    if (!fileBytes || !canvasRef.current) return;
    try {
      const doc = await loadPdfDocument(fileBytes);
      await renderPageToCanvas(doc, currentPage, canvasRef.current, 1.2, 0);
    } catch (err) {
      console.warn('Page render error:', err);
    }
  };

  useEffect(() => {
    if (fileBytes) {
      renderCurrentPage();
    }
  }, [fileBytes, currentPage]);

  // Click on canvas container to drop a field
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !containerRef.current) return;

    // Check if clicked an existing field
    if ((e.target as HTMLElement).closest('.interactive-form-field')) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (clickX < 0 || clickY < 0 || clickX > rect.width || clickY > rect.height) return;

    const newField: FormFieldValue = {
      id: `field-${Date.now()}`,
      type: activeTool,
      pageNumber: currentPage,
      x: Math.round(clickX),
      y: Math.round(clickY),
      width: activeTool === 'checkbox' ? 24 : activeTool === 'date' ? 140 : 180,
      height: activeTool === 'checkbox' ? 24 : 32,
      value: activeTool === 'checkbox' ? false : activeTool === 'date' ? new Date().toISOString().split('T')[0] : '',
      fontSize: 13,
    };

    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  const handleUpdateFieldValue = (id: string, value: any) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, value } : f))
    );
  };

  const handleDeleteField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const handleExport = async () => {
    if (!fileBytes || fields.length === 0) return;
    setIsExporting(true);
    try {
      // In canvas, coordinates were scaled at 1.2x. Rescale to PDF pt coordinates (divide by 1.2)
      const scale = 1.2;
      const pdfFields: FormFieldValue[] = fields.map((f) => ({
        ...f,
        x: Math.round(f.x / scale),
        y: Math.round(f.y / scale),
        width: Math.round(f.width / scale),
        height: Math.round(f.height / scale),
        fontSize: Math.round((f.fontSize || 13) / scale),
      }));

      const outputBytes = await bakeFormFieldsOnPdf(fileBytes, pdfFields);
      const blob = new Blob([outputBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const baseName = file?.name.replace(/\.pdf$/i, '') || 'completed_form';
      link.href = url;
      link.download = `${baseName}_filled.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'Form Baked & Exported!',
        message: `Saved ${baseName}_filled.pdf with ${fields.length} form field inputs permanently baked.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Export Failed',
        message: err?.message || 'Could not bake form fields.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const currentPageFields = fields.filter((f) => f.pageNumber === currentPage);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <PenTool className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Interactive Form Field Creator & Filler
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-800">
                  Fill & Sign
                </span>
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Click anywhere on scanned application forms or contracts to drop fillable text boxes, checkboxes, and date stamps. Bakes permanently into the exported PDF.
              </p>
            </div>
          </div>
        </div>

        {!file ? (
          <div className="max-w-xl mx-auto py-10">
            <FileUploader
              onFilesSelected={handleFilesSelected}
              accept=".pdf,application/pdf"
              multiple={false}
              fileType="pdf"
              title="Select PDF Form or Document to Fill"
              subtitle="Drop any scanned application form, admission form, or contract"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-wrap items-center justify-between gap-4">
              {/* Tool selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
                  Field Type:
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTool('text')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTool === 'text'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Text Field</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool('checkbox')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTool === 'checkbox'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Checkbox</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool('date')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTool === 'date'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Date Stamp</span>
                </button>
              </div>

              {/* Page Navigator */}
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Download / Export Button */}
              <button
                type="button"
                onClick={handleExport}
                disabled={fields.length === 0 || isExporting}
                className="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/25 flex items-center gap-2 transition-all disabled:opacity-40"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Baking Form...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Export Completed PDF ({fields.length} Fields)</span>
                  </>
                )}
              </button>
            </div>

            {/* Instruction Tip */}
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <span>
                💡 <strong>Tip:</strong> Click anywhere on the document below to drop a <strong>{activeTool}</strong> field. Type or check the value directly.
              </span>
              <span className="text-[11px] font-mono">
                {currentPageFields.length} field(s) on this page
              </span>
            </div>

            {/* Interactive Canvas Board */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-900/60 shadow-inner flex justify-center overflow-auto min-h-[600px]">
              <div
                ref={containerRef}
                onClick={handleCanvasClick}
                className="relative bg-white shadow-2xl rounded border border-slate-300 dark:border-slate-700 select-none cursor-crosshair inline-block"
              >
                <canvas ref={canvasRef} className="block pointer-events-none rounded" />

                {/* Overlaid Form Fields */}
                {currentPageFields.map((field) => (
                  <div
                    key={field.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFieldId(field.id);
                    }}
                    className={`interactive-form-field absolute rounded transition-all shadow-md group ${
                      field.type === 'checkbox' ? 'bg-white/90 p-1' : 'bg-white/95 p-1'
                    } ${
                      selectedFieldId === field.id
                        ? 'ring-2 ring-emerald-500 border border-emerald-500'
                        : 'border border-slate-400 hover:border-emerald-400'
                    }`}
                    style={{
                      left: `${field.x}px`,
                      top: `${field.y}px`,
                      width: `${field.width}px`,
                      height: `${field.height}px`,
                    }}
                  >
                    {field.type === 'checkbox' ? (
                      <label className="flex items-center justify-center w-full h-full cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(field.value)}
                          onChange={(e) => handleUpdateFieldValue(field.id, e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                      </label>
                    ) : field.type === 'date' ? (
                      <input
                        type="date"
                        value={String(field.value || '')}
                        onChange={(e) => handleUpdateFieldValue(field.id, e.target.value)}
                        className="w-full h-full bg-transparent border-none text-xs text-slate-900 font-bold focus:outline-none px-1"
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder="Type here..."
                        value={String(field.value || '')}
                        onChange={(e) => handleUpdateFieldValue(field.id, e.target.value)}
                        className="w-full h-full bg-transparent border-none text-xs text-slate-900 font-semibold focus:outline-none px-1.5"
                      />
                    )}

                    {/* Delete button on hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteField(field.id);
                      }}
                      className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110"
                      title="Delete field"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
