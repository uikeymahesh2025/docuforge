import React, { useState } from 'react';
import { FileDown, Download, AlertCircle } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { pdfToWordDocx } from '../pdf/pdfModifier';
import { useToastStore } from '../stores/useToastStore';
import { sanitizeFilename } from '../utils/downloadHelpers';

export const PdfToWordPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null);
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
        message: `${f.name} loaded. Click Convert to Word.`,
      });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Could not read PDF.' });
    }
  };

  const handleConvert = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const blob = await pdfToWordDocx(pdfBytes);
      setDocxBlob(blob);
      addToast({
        type: 'success',
        title: 'Word Document Ready',
        message: 'Successfully generated valid Microsoft Word (.docx) file.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Conversion Error', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <FileDown className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          PDF to <span className="text-brand-gold">Word (.docx)</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Extract structured text, paragraphs and headings into a real editable Microsoft Word document.
        </p>
      </div>

      <div className="mb-6 p-4 rounded-2xl bg-zinc-900 border border-white/10 text-zinc-400 text-xs flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-brand-gold shrink-0" />
        <span>Notice: Complex multi-column layouts and custom graphics may require slight manual adjustment in Word.</span>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop PDF to convert to Word"
          subtitle="Generate standard DOCX file"
          onFilesSelected={handleFileSelected}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">{file?.name}</p>
              <p className="text-xs text-zinc-500">Ready to extract text &amp; build DOCX</p>
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
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <FileDown className="w-4 h-4" />
            <span>Convert to Word Document (.docx)</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Extracting structure & generating DOCX..." />
      <ResultModal
        isOpen={Boolean(docxBlob)}
        onClose={() => setDocxBlob(null)}
        resultData={docxBlob}
        defaultFileName={file ? sanitizeFilename(file.name, 'converted', 'docx') : 'document.docx'}
        onReset={() => {
          setDocxBlob(null);
          setPdfBytes(null);
          setFile(null);
        }}
      />
    </div>
  );
};
