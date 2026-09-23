import React, { useRef, useState } from 'react';
import { UploadCloud, File as FileIcon, AlertCircle, RefreshCw, Sparkles, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { validatePdfFile, validateImageFiles, ValidationResult, MAX_FILE_SIZE_MB, APP_CONFIG } from '../../utils/fileValidators';
import { getSamplePdfBytes } from '../../utils/samplePdf';

interface FileUploaderProps {
  accept?: string;
  multiple?: boolean;
  fileType?: 'pdf' | 'image' | 'any';
  title?: string;
  subtitle?: string;
  onFilesSelected: (files: File[]) => void;
  showSampleButton?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  accept = '.pdf,application/pdf',
  multiple = false,
  fileType = 'pdf',
  title = 'Drop your PDF here',
  subtitle = 'or click to browse from your device',
  onFilesSelected,
  showSampleButton = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);

    const files = Array.from(fileList);

    if (fileType === 'pdf') {
      for (const f of files) {
        const val: ValidationResult = validatePdfFile(f);
        if (!val.valid) {
          setErrorMessage(val.error || 'Unable to open this PDF. It may be corrupted, encrypted or unsupported.');
          return;
        }
      }
    } else if (fileType === 'image') {
      const val = validateImageFiles(files);
      if (!val.valid) {
        setErrorMessage(val.error || 'Invalid image file.');
        return;
      }
    }

    onFilesSelected(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    // Reset value so same file can be uploaded again if needed
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const handleLoadSample = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGeneratingSample(true);
    try {
      const sampleBytes = await getSamplePdfBytes();
      const sampleFile = new File([sampleBytes.buffer as ArrayBuffer], 'sample-service-agreement.pdf', {
        type: 'application/pdf',
      });
      onFilesSelected([sampleFile]);
    } catch (err) {
      console.error('Failed generating sample PDF', err);
      setErrorMessage('Could not load sample PDF. Please choose a file from your device.');
    } finally {
      setIsGeneratingSample(false);
    }
  };

  return (
    <div className="w-full">
      {errorMessage ? (
        <div
          role="alert"
          aria-live="assertive"
          className="border border-rose-500/30 bg-rose-950/20 rounded-3xl p-8 text-center animate-fadeIn"
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-rose-200 mb-2">Unable to process file</h3>
          <p className="text-zinc-400 text-xs max-w-md mx-auto mb-6 leading-relaxed">
            {errorMessage}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                setErrorMessage(null);
                inputRef.current?.click();
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold rounded-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Choose Another File
            </button>
            {showSampleButton && fileType === 'pdf' && (
              <button
                onClick={handleLoadSample}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-brand-gold border border-brand-gold/30 text-xs font-semibold rounded-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              >
                <Sparkles className="w-3.5 h-3.5" /> Try Sample PDF Instead
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label={`${title}. ${subtitle}. Drag and drop or press Enter to browse files`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={handleKeyDown}
          className={`relative cursor-pointer border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${isDragging
              ? 'border-brand-gold bg-amber-500/5 scale-[0.99]'
              : 'border-white/10 hover:border-brand-gold/50 bg-[#0E0E14] hover:bg-[#12121A]'
            }`}
        >
          <input
            ref={inputRef}
            id="file-upload-input"
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleChange}
            className="hidden"
            aria-label="Upload document file input"
          />

          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-brand-gold group-hover:border-brand-gold/40 group-hover:scale-105 transition duration-200 shadow-xl">
            <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5 group-hover:text-brand-gold transition">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mb-5 max-w-sm mx-auto">
            {subtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-gold text-black font-bold text-xs sm:text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              <FileIcon className="w-4 h-4" />
              <span>Choose {multiple ? 'Files' : 'PDF File'}</span>
            </button>

            {showSampleButton && fileType === 'pdf' && (
              <button
                type="button"
                onClick={handleLoadSample}
                disabled={isGeneratingSample}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-900/90 border border-white/15 hover:border-brand-gold/50 text-zinc-200 hover:text-brand-gold font-semibold text-xs sm:text-sm transition active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-brand-gold" />
                <span>{isGeneratingSample ? 'Preparing Sample...' : 'Try a Sample PDF'}</span>
              </button>
            )}
          </div>

          {/* Real limits and verified privacy note */}
          <div className="mt-6 pt-5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Processed locally in browser • No file uploads</span>
            </div>
            <span className="hidden sm:inline text-zinc-600">•</span>
            <span className="text-zinc-500 font-mono">Max {MAX_FILE_SIZE_MB}MB • PDF format</span>
            <span className="hidden sm:inline text-zinc-600">•</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPrivacyDetails(!showPrivacyDetails);
              }}
              className="text-amber-400/90 hover:text-amber-300 underline font-medium flex items-center gap-1"
            >
              <span>Privacy details</span>
              {showPrivacyDetails ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* Expandable Privacy Details Accordion */}
          {showPrivacyDetails && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-4 p-4 rounded-2xl bg-black/60 border border-white/10 text-left text-xs text-zinc-300 animate-fadeIn space-y-2"
            >
              <div className="font-bold text-white flex items-center gap-1.5 text-xs text-brand-gold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>DocuForge Local Privacy Guarantee</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                • <strong>Where files are processed:</strong> 100% locally on your machine using JavaScript and WebAssembly (PDF.js and pdf-lib).
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                • <strong>Storage policy:</strong> Your document is kept in browser memory and is discarded immediately when you close or refresh this tab.
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                • <strong>No server tracking:</strong> Filenames and document text are never uploaded, logged, or sent to external servers.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
