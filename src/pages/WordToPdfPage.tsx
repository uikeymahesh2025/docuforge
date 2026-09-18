import React, { useState } from 'react';
import { FileText, Download, Code, Sparkles } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { useToastStore } from '../stores/useToastStore';

export const WordToPdfPage: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [docTitle, setDocTitle] = useState('My Document');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  const handleConvert = async () => {
    if (!inputText.trim()) {
      addToast({ type: 'warning', title: 'Empty Content', message: 'Please enter or paste some content to convert.' });
      return;
    }

    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const margin = 50;
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let currentY = pageHeight - margin;

      // Title
      currentPage.drawText(docTitle, {
        x: margin,
        y: currentY - 24,
        size: 20,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.12),
      });
      currentY -= 60;

      // Wrap and render lines
      const paragraphs = inputText.split('\n');
      for (const p of paragraphs) {
        if (!p.trim()) {
          currentY -= 14;
          continue;
        }

        const isHeading = p.startsWith('#');
        const cleanP = isHeading ? p.replace(/^#+\s*/, '') : p;
        const font = isHeading ? fontBold : fontRegular;
        const fontSize = isHeading ? 14 : 11;
        const color = isHeading ? rgb(0.15, 0.15, 0.2) : rgb(0.25, 0.25, 0.28);

        // Simple word wrapping
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
            currentY -= fontSize * 1.5;
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
          currentY -= fontSize * 1.8;
        }
      }

      const bytes = await pdfDoc.save({ useObjectStreams: true });
      setResultBytes(bytes);
      addToast({ type: 'success', title: 'PDF Created', message: 'Document generated successfully.' });
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

      <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Document Title</label>
          <input
            type="text"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-gold"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Content</label>
          <textarea
            rows={12}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your Word document text, article, or notes here. Use # for headings..."
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
