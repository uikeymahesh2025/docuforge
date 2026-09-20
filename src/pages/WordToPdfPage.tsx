import React, { useState } from 'react';
import { FileText, Download, Code, Sparkles, UploadCloud, Sliders } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { useToastStore } from '../stores/useToastStore';

export const WordToPdfPage: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [docTitle, setDocTitle] = useState('My Document');
  const [fileName, setFileName] = useState('');
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [marginSetting, setMarginSetting] = useState<'normal' | 'compact' | 'wide'>('normal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setRawFile(file);
    try {
      if (file.name.endsWith('.docx')) {
        const zip = await JSZip.loadAsync(file);
        const docXml = zip.file('word/document.xml');
        if (!docXml) throw new Error('Invalid Word .docx file structure');

        const xmlStr = await docXml.async('string');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
        const pNodes = xmlDoc.getElementsByTagName('w:p');
        const lines: string[] = [];

        for (let i = 0; i < pNodes.length; i++) {
          const p = pNodes[i];
          const styleNode = p.getElementsByTagName('w:pStyle')[0];
          const styleVal = styleNode?.getAttribute('w:val') || '';
          const isHeading = /heading/i.test(styleVal);
          const textRuns = Array.from(p.getElementsByTagName('w:t')).map((t) => t.textContent || '').join('');

          if (textRuns.trim()) {
            lines.push(isHeading ? `# ${textRuns.trim()}` : textRuns);
          }
        }

        const extracted = lines.join('\n\n');
        setInputText(extracted || 'No readable text found in document.');
        setDocTitle(file.name.replace(/\.docx$/i, ''));
        addToast({
          type: 'success',
          title: 'Word Document Loaded',
          message: `Loaded ${file.name}. Ready for high-fidelity conversion.`,
        });
      } else if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const content = await file.text();
        setInputText(content);
        setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
        addToast({
          type: 'success',
          title: 'Text File Loaded',
          message: `Imported text content from ${file.name}.`,
        });
      } else {
        addToast({ type: 'warning', title: 'Unsupported format', message: 'Please upload a .docx, .txt, or .md file.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to read file', message: err?.message || 'Error processing document.' });
    }
  };

  const handleConvert = async () => {
    if (!inputText.trim() && !rawFile) {
      addToast({ type: 'warning', title: 'Empty Content', message: 'Please upload a Word document or enter text to convert.' });
      return;
    }

    setIsProcessing(true);

    // 1. Try Backend High-Fidelity Word-to-PDF if raw .docx is available
    if (rawFile && rawFile.name.endsWith('.docx')) {
      try {
        const formData = new FormData();
        formData.append('file', rawFile);

        const hostName = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
        const endpoints = [
          '/api/convert/word-to-pdf',
          `http://${hostName}:4000/api/convert/word-to-pdf`,
          'http://localhost:4000/api/convert/word-to-pdf',
          'http://127.0.0.1:4000/api/convert/word-to-pdf',
        ];

        let resp: Response | null = null;
        for (const url of endpoints) {
          try {
            const candidate = await fetch(url, { method: 'POST', body: formData });
            if (candidate && candidate.ok) {
              resp = candidate;
              break;
            }
          } catch {
            // Next candidate
          }
        }

        if (resp && resp.ok) {
          const blob = await resp.blob();
          if (blob.size > 200) {
            const buffer = await blob.arrayBuffer();
            setResultBytes(new Uint8Array(buffer));
            addToast({
              type: 'success',
              title: 'PDF Document Ready',
              message: 'High-fidelity Word to PDF conversion complete.',
            });
            setIsProcessing(false);
            return;
          }
        }
      } catch (backendErr) {
        console.warn('Backend Word to PDF unreachable; using client-side renderer:', backendErr);
      }
    }
    try {
      const pdfDoc = await PDFDocument.create();
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const margin = marginSetting === 'compact' ? 30 : marginSetting === 'wide' ? 70 : 50;
      const pageWidth = pageSize === 'letter' ? 612 : 595.28;
      const pageHeight = pageSize === 'letter' ? 792 : 841.89;

      let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let currentY = pageHeight - margin;

      // Document Title
      if (docTitle.trim()) {
        currentPage.drawText(docTitle, {
          x: margin,
          y: currentY - 24,
          size: 20,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.12),
        });
        currentY -= 55;
      }

      // Wrap and render lines with precise line-height
      const paragraphs = inputText.split('\n');
      for (const p of paragraphs) {
        if (!p.trim()) {
          currentY -= 14;
          continue;
        }

        const isHeading = p.startsWith('#');
        const cleanP = isHeading ? p.replace(/^#+\s*/, '') : p;
        const font = isHeading ? fontBold : fontRegular;
        const fontSize = isHeading ? 14 : 10.5;
        const color = isHeading ? rgb(0.15, 0.15, 0.2) : rgb(0.22, 0.22, 0.25);
        const lineHeight = fontSize * 1.45;

        // Word wrap
        const words = cleanP.split(' ');
        let line = '';

        for (const word of words) {
          const testLine = line ? `${line} ${word}` : word;
          const width = font.widthOfTextAtSize(testLine, fontSize);

          if (width > pageWidth - margin * 2) {
            if (currentY < margin + 40) {
              currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
              currentY = pageHeight - margin;
            }
            currentPage.drawText(line, {
              x: margin,
              y: currentY,
              size: fontSize,
              font,
              color,
            });
            currentY -= lineHeight;
            line = word;
          } else {
            line = testLine;
          }
        }

        if (line) {
          if (currentY < margin + 40) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            currentY = pageHeight - margin;
          }
          currentPage.drawText(line, {
            x: margin,
            y: currentY,
            size: fontSize,
            font,
          color,
          });
          currentY -= isHeading ? lineHeight * 1.6 : lineHeight * 1.4;
        }
      }

      const bytes = await pdfDoc.save({ useObjectStreams: true });
      setResultBytes(bytes);
      addToast({ type: 'success', title: 'PDF Created', message: 'Document typeset and generated successfully.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Conversion Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <FileText className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Word &amp; Text to <span className="text-brand-gold">PDF</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Convert Word copy, markdown, and formatted text directly into a styled PDF document.
        </p>
      </div>

      <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Upload Docx file button or text drop */}
        <div className="border-2 border-dashed border-white/10 hover:border-brand-gold/50 rounded-2xl p-6 text-center transition bg-zinc-900/30">
          <label className="cursor-pointer flex flex-col items-center justify-center">
            <UploadCloud className="w-8 h-8 text-brand-gold mb-2 animate-pulse" />
            <span className="text-sm font-bold text-white">Upload Word (.docx) or Text Document</span>
            <span className="text-xs text-zinc-400 mt-1">Supports Microsoft Word (.docx), Plain Text (.txt), and Markdown (.md)</span>
            <input
              type="file"
              accept=".docx,.txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
            {fileName && (
              <span className="mt-3 text-xs text-brand-gold bg-amber-500/10 px-3 py-1 rounded-full border border-brand-gold/20 font-mono">
                Loaded: {fileName}
              </span>
            )}
          </label>
        </div>

        {/* Layout & Page Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Page Size</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPageSize('a4')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  pageSize === 'a4'
                    ? 'border-brand-gold bg-amber-500/10 text-white'
                    : 'border-white/10 text-zinc-400 hover:text-white bg-zinc-900'
                }`}
              >
                A4 (Standard)
              </button>
              <button
                type="button"
                onClick={() => setPageSize('letter')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  pageSize === 'letter'
                    ? 'border-brand-gold bg-amber-500/10 text-white'
                    : 'border-white/10 text-zinc-400 hover:text-white bg-zinc-900'
                }`}
              >
                US Letter
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Page Margins</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'compact', label: 'Compact' },
                { id: 'normal', label: 'Normal' },
                { id: 'wide', label: 'Wide' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMarginSetting(m.id as any)}
                  className={`py-2 px-2 rounded-xl border text-xs font-semibold transition text-center ${
                    marginSetting === m.id
                      ? 'border-brand-gold bg-amber-500/10 text-white'
                      : 'border-white/10 text-zinc-400 hover:text-white bg-zinc-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Document Title / Header</label>
          <input
            type="text"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-gold"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-300">Document Content &amp; Paragraphs</label>
            <span className="text-[11px] text-zinc-500">Tip: Lines starting with # become section headings</span>
          </div>
          <textarea
            rows={12}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your Word document text, article, or notes here..."
            className="w-full p-4 rounded-xl bg-zinc-950 border border-white/10 text-zinc-200 text-xs leading-relaxed focus:outline-none focus:border-brand-gold font-sans resize-y"
          />
        </div>

        <button
          onClick={handleConvert}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
        >
          <FileText className="w-4 h-4" />
          <span>Generate Standard PDF</span>
        </button>
      </div>

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Typesetting and building PDF..." />
      <ResultModal
        isOpen={Boolean(resultBytes)}
        onClose={() => setResultBytes(null)}
        resultData={resultBytes}
        defaultFileName={`${docTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`}
        onReset={() => {
          setResultBytes(null);
          setInputText('');
        }}
      />
    </div>
  );
};
