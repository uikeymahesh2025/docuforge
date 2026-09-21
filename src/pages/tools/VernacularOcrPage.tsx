import React, { useState, useRef } from 'react';
import {
  Languages,
  FileText,
  Download,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Eye,
  Settings2,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { Document, Paragraph, TextRun, Packer } from 'docx';
import { FileUploader } from '../../components/tools/FileUploader';
import { loadPdfDocument } from '../../pdf/pdfManager';
import { useToastStore } from '../../stores/useToastStore';
import { sanitizeFilename, downloadBlob } from '../../utils/downloadHelpers';

type OcrLanguage = 'hin' | 'eng' | 'hin+eng';

export const VernacularOcrPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [isPdf, setIsPdf] = useState<boolean>(true);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [language, setLanguage] = useState<OcrLanguage>('hin+eng');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const [extractedText, setExtractedText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(14);
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load Tesseract dynamically from CDN if not already present
  const loadTesseractEngine = async (): Promise<any> => {
    if ((window as any).Tesseract) {
      return (window as any).Tesseract;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.async = true;
      script.onload = () => {
        if ((window as any).Tesseract) {
          resolve((window as any).Tesseract);
        } else {
          reject(new Error('Tesseract global object missing after script load.'));
        }
      };
      script.onerror = () => {
        reject(new Error('Could not download Tesseract OCR engine. Check internet connection.'));
      };
      document.head.appendChild(script);
    });
  };

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setExtractedText('');
    setProgressPercent(0);
    setProgressStatus('');

    try {
      const buffer = await selected.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setFileBytes(bytes);

      const isPdfFile = selected.name.toLowerCase().endsWith('.pdf') || selected.type === 'application/pdf';
      setIsPdf(isPdfFile);

      if (isPdfFile) {
        const pdfDoc = await loadPdfDocument(bytes);
        setTotalPages(pdfDoc.numPages);

        // Render first page preview
        if (pdfDoc.numPages > 0) {
          const page = await pdfDoc.getPage(1);
          const viewport = page.getViewport({ scale: 1.0 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport } as any).promise;
            setPreviewImageUrl(canvas.toDataURL('image/jpeg', 0.8));
          }
        }
      } else {
        setTotalPages(1);
        const url = URL.createObjectURL(selected);
        setPreviewImageUrl(url);
      }

      addToast({
        type: 'success',
        title: 'Document Ready',
        message: `${selected.name} loaded. Select OCR language and click Start OCR.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Read File',
        message: err?.message || 'Could not parse document.',
      });
    }
  };

  const handleRunOcr = async () => {
    if (!fileBytes || !file) return;

    setIsProcessing(true);
    setProgressPercent(5);
    setProgressStatus('Initializing Tesseract OCR neural engine...');

    try {
      const Tesseract = await loadTesseractEngine();
      let fullExtractedText = '';

      if (isPdf) {
        const pdfDoc = await loadPdfDocument(fileBytes);
        const pagesCount = Math.min(pdfDoc.numPages, 15); // Process up to 15 pages safely

        for (let p = 1; p <= pagesCount; p++) {
          setProgressStatus(`Rendering page ${p} of ${pagesCount} at high resolution...`);
          const page = await pdfDoc.getPage(p);

          // 2.0x scale for crisp OCR rendering
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext('2d');

          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport } as any).promise;

          setProgressStatus(`Recognizing Hindi & English text on page ${p}/${pagesCount}...`);

          const result = await Tesseract.recognize(canvas, language, {
            logger: (m: any) => {
              if (m.status === 'recognizing text') {
                const pageProgress = (m.progress || 0) * (100 / pagesCount);
                const overall = Math.round(((p - 1) * (100 / pagesCount)) + pageProgress);
                setProgressPercent(Math.min(98, Math.max(5, overall)));
                setProgressStatus(`Page ${p}/${pagesCount}: ${(m.progress * 100).toFixed(0)}% scanned`);
              }
            },
          });

          const pageText = result?.data?.text?.trim() || '';
          if (pageText) {
            fullExtractedText += `--- Page ${p} ---\n\n${pageText}\n\n`;
          } else {
            fullExtractedText += `--- Page ${p} ---\n\n[No recognizable text detected]\n\n`;
          }
        }
      } else {
        // Single Image OCR
        setProgressStatus('Analyzing image dimensions and contrast...');
        const img = new Image();
        const objectUrl = URL.createObjectURL(new Blob([fileBytes.buffer as ArrayBuffer]));
        img.src = objectUrl;

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
        }
        URL.revokeObjectURL(objectUrl);

        setProgressStatus('Extracting characters via Tesseract OCR...');
        const result = await Tesseract.recognize(canvas, language, {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              setProgressPercent(Math.round((m.progress || 0) * 100));
              setProgressStatus(`Scanning document: ${(m.progress * 100).toFixed(0)}%`);
            }
          },
        });

        fullExtractedText = result?.data?.text?.trim() || '[No text detected]';
      }

      setExtractedText(fullExtractedText);
      setProgressPercent(100);
      setProgressStatus('OCR Completed successfully!');

      addToast({
        type: 'success',
        title: 'OCR Finished',
        message: 'Text extracted! You can now edit, copy, or export to Word (.docx).',
      });
    } catch (err: any) {
      console.error('OCR Error:', err);
      addToast({
        type: 'error',
        title: 'OCR Processing Failed',
        message: err?.message || 'Error occurred during character recognition.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    addToast({
      type: 'success',
      title: 'Copied!',
      message: 'Extracted text copied to your clipboard.',
    });
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDownloadTxt = () => {
    if (!extractedText || !file) return;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const filename = sanitizeFilename(file.name, 'ocr_extracted', 'txt');
    downloadBlob(blob, filename);
    addToast({
      type: 'success',
      title: 'Downloaded .TXT',
      message: `${filename} saved successfully.`,
    });
  };

  const handleDownloadDocx = async () => {
    if (!extractedText || !file) return;

    try {
      const lines = extractedText.split('\n');
      const paragraphs: Paragraph[] = [];

      for (const line of lines) {
        if (line.startsWith('--- Page')) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  bold: true,
                  size: 28, // 14pt
                  color: '888888',
                }),
              ],
              spacing: { before: 200, after: 120 },
            })
          );
        } else {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  size: 24, // 12pt
                }),
              ],
              spacing: { after: 80 },
            })
          );
        }
      }

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: paragraphs,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const filename = sanitizeFilename(file.name, 'ocr_word', 'docx');
      downloadBlob(blob, filename);

      addToast({
        type: 'success',
        title: 'Word Document Created',
        message: `${filename} exported successfully.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Word Export Failed',
        message: err?.message || 'Could not assemble .DOCX file.',
      });
    }
  };

  const wordCount = extractedText.trim() ? extractedText.trim().split(/\s+/).length : 0;
  const charCount = extractedText.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-3">
          <Languages className="w-4 h-4" />
          Hindi & English Client-Side OCR
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
          Regional Multi-Language <span className="text-brand-gold">OCR to Word</span>
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto">
          Extract text from Hindi, English, and bilingual scanned documents directly in your browser. Edit in real time and export to clean Microsoft Word (.docx) or .txt.
        </p>
      </div>

      {!file ? (
        <div className="max-w-3xl mx-auto">
          <FileUploader
            accept=".pdf,application/pdf,image/*,.jpg,.jpeg,.png,.webp"
            fileType="any"
            subtitle="Upload scanned Hindi/English PDF documents, question papers, legal agreements, or photo scans"
            onFilesSelected={handleFileSelected}
          />

          {/* Quick Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 text-center">
              <div className="w-9 h-9 mx-auto rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                <Languages className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">Hindi (हिन्दी) Devanagari</h3>
              <p className="text-xs text-zinc-400 mt-1">High accuracy recognition for Hindi letters, matras, and compound words.</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 text-center">
              <div className="w-9 h-9 mx-auto rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2">
                <FileCode className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">1-Click Word (.DOCX)</h3>
              <p className="text-xs text-zinc-400 mt-1">Export formatted paragraphs directly into Microsoft Word without formatting loss.</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 text-center">
              <div className="w-9 h-9 mx-auto rounded-lg bg-amber-500/10 text-brand-gold flex items-center justify-center mb-2">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">100% Client-Side Privacy</h3>
              <p className="text-xs text-zinc-400 mt-1">All OCR processing runs securely in your local browser engine. No files are uploaded.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Controls & Preview */}
          <div className="lg:col-span-5 space-y-4">
            {/* Document Info Card */}
            <div className="bg-[#121216] border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="w-5 h-5 text-brand-gold shrink-0" />
                  <span className="text-sm font-medium text-white truncate">{file.name}</span>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setFileBytes(null);
                    setExtractedText('');
                    setPreviewImageUrl(null);
                  }}
                  className="text-xs text-zinc-400 hover:text-red-400 transition-colors ml-2 shrink-0"
                >
                  Change File
                </button>
              </div>

              {isPdf && (
                <div className="text-xs text-zinc-400 mb-3 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                    {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
                  </span>
                  <span>(Batch OCR up to 15 pages)</span>
                </div>
              )}

              {/* Language Selection */}
              <div className="space-y-2 mt-4 pt-4 border-t border-zinc-800/80">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                  Select Language Model
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLanguage('hin+eng')}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      language === 'hin+eng'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold shadow-sm'
                        : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    Bilingual
                    <span className="block text-[10px] opacity-80">हिन्दी + Eng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('hin')}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      language === 'hin'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold shadow-sm'
                        : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    Hindi Only
                    <span className="block text-[10px] opacity-80">हिन्दी</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('eng')}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      language === 'eng'
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold shadow-sm'
                        : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    English Only
                    <span className="block text-[10px] opacity-80">English</span>
                  </button>
                </div>
              </div>

              {/* Run OCR Action Button */}
              <button
                type="button"
                onClick={handleRunOcr}
                disabled={isProcessing}
                className="w-full mt-5 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing OCR...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Start Vernacular OCR</span>
                  </>
                )}
              </button>

              {/* Progress Feedback */}
              {isProcessing && (
                <div className="mt-4 p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-2">
                  <div className="flex justify-between text-xs text-zinc-300">
                    <span className="truncate pr-2">{progressStatus}</span>
                    <span className="font-mono text-brand-gold shrink-0">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-brand-gold h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Document Thumbnail Preview */}
            {previewImageUrl && (
              <div className="bg-[#121216] border border-zinc-800 rounded-xl p-3">
                <div className="text-xs font-semibold text-zinc-400 mb-2 flex items-center justify-between">
                  <span>Document Preview</span>
                  <span className="text-[10px] text-zinc-500">Page 1 Reference</span>
                </div>
                <div className="max-h-60 overflow-hidden rounded-lg border border-zinc-800/80 bg-black/40 flex items-center justify-center">
                  <img
                    src={previewImageUrl}
                    alt="Document preview"
                    className="object-contain max-h-60 w-auto"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Text Editor & Export Suite */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="bg-[#121216] border border-zinc-800 rounded-xl p-4 flex-1 flex flex-col min-h-[460px]">
              {/* Editor Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-brand-gold" />
                    Recognized Text Editor
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    {wordCount} words • {charCount} chars
                  </span>
                </div>

                {/* Toolbar Tools */}
                <div className="flex items-center gap-2">
                  {/* Font Size Adjust */}
                  <div className="flex items-center gap-1 bg-zinc-800/80 rounded-lg p-0.5 border border-zinc-700/50">
                    <button
                      type="button"
                      onClick={() => setFontSize((f) => Math.max(11, f - 1))}
                      className="px-2 py-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700/60 rounded"
                      title="Smaller font"
                    >
                      A-
                    </button>
                    <span className="text-xs text-zinc-400 px-1 font-mono">{fontSize}</span>
                    <button
                      type="button"
                      onClick={() => setFontSize((f) => Math.min(22, f + 1))}
                      className="px-2 py-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700/60 rounded"
                      title="Larger font"
                    >
                      A+
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowLineNumbers(!showLineNumbers)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      showLineNumbers
                        ? 'bg-brand-gold/15 border-brand-gold text-brand-gold'
                        : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Toggle line numbers"
                  >
                    # Lines
                  </button>

                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!extractedText}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-colors disabled:opacity-40"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Editable Area */}
              <div className="flex-1 relative flex">
                <textarea
                  ref={textareaRef}
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  placeholder={
                    isProcessing
                      ? 'Performing neural character recognition... text will appear here as pages are processed.'
                      : 'Click "Start Vernacular OCR" on the left to extract Hindi & English text from your document. You can directly edit the results here.'
                  }
                  style={{ fontSize: `${fontSize}px` }}
                  className="w-full h-full min-h-[360px] bg-zinc-950/60 border border-zinc-800/90 rounded-lg p-3.5 text-zinc-100 placeholder-zinc-500 font-sans focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/30 resize-none leading-relaxed"
                />
              </div>

              {/* Export Action Bar */}
              <div className="pt-4 mt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-zinc-400">
                  Ready to export in universal editable formats:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTxt}
                    disabled={!extractedText}
                    className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>Save as .TXT</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadDocx}
                    disabled={!extractedText}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export to Word (.DOCX)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
