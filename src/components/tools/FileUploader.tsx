import React, { useRef, useState } from 'react';
import { UploadCloud, File, AlertCircle, RefreshCw } from 'lucide-react';
import { validatePdfFile, validateImageFiles, ValidationResult } from '../../utils/fileValidators';

interface FileUploaderProps {
  accept?: string;
  multiple?: boolean;
  fileType?: 'pdf' | 'image' | 'any';
  title?: string;
  subtitle?: string;
  onFilesSelected: (files: File[]) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  accept = '.pdf,application/pdf',
  multiple = false,
  fileType = 'pdf',
  title = 'Drop your PDF here',
  subtitle = 'or click to browse from your device',
  onFilesSelected,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  return (
    <div className="w-full">
      {errorMessage ? (
        <div className="border border-rose-500/30 bg-rose-950/20 rounded-2xl p-8 text-center animate-fadeIn">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-rose-200 mb-2">Unable to process file</h3>
          <p className="text-zinc-400 text-xs max-w-md mx-auto mb-6 leading-relaxed">
            {errorMessage}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setErrorMessage(null);
                inputRef.current?.click();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Choose Another File
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative cursor-pointer border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center transition-all duration-200 group ${
            isDragging
              ? 'border-brand-gold bg-amber-500/5 scale-[0.99]'
              : 'border-white/10 hover:border-brand-gold/50 bg-[#0E0E14] hover:bg-[#12121A]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleChange}
            className="hidden"
          />

          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-brand-gold group-hover:border-brand-gold/40 group-hover:scale-105 transition duration-200 shadow-xl">
            <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-brand-gold transition">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mb-6 max-w-sm mx-auto">
            {subtitle}
          </p>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-gold text-black font-semibold text-xs sm:text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <File className="w-4 h-4" />
            <span>Choose {multiple ? 'Files' : 'File'}</span>
          </button>

          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
            <span>🔒 100% Private &amp; Secure • Files processed in your browser</span>
          </div>
        </div>
      )}
    </div>
  );
};
