import React, { useState, useRef } from 'react';
import { Code, Eye, FileText, Download, Sparkles, RefreshCw, Layout, Layers } from 'lucide-react';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { PDFDocument } from 'pdf-lib';
import { useToastStore } from '../stores/useToastStore';

const SAMPLE_INVOICE = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Roboto, sans-serif; color: #1e293b; margin: 0; padding: 40px; background: #fff; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #D4AF37; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: 800; color: #0f172a; }
    .logo span { color: #D4AF37; }
    .badge { background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f8fafc; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .total-box { margin-top: 24px; text-align: right; }
    .total-title { font-size: 14px; color: #64748b; }
    .total-amount { font-size: 28px; font-weight: 900; color: #0f172a; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">UIKEY <span>AI</span> INVOICE</div>
      <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Premium Autonomous Document Engine</p>
    </div>
    <div style="text-align: right;">
      <span class="badge">PAID IN FULL</span>
      <p style="font-size: 12px; color: #64748b; margin-top: 6px;">Invoice #: INV-2026-0882<br>Date: Sept 18, 2026</p>
    </div>
  </div>

  <div class="grid">
    <div>
      <h4 style="font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Billed To</h4>
      <p style="font-weight: bold; margin: 0;">Enterprise Customer</p>
      <p style="font-size: 13px; color: #475569; margin: 2px 0;">Suite 400, Innovation Way<br>Bengaluru, India</p>
    </div>
    <div style="text-align: right;">
      <h4 style="font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Payment Method</h4>
      <p style="font-size: 13px; color: #475569; margin: 0;">Digital Escrow & Wire<br>Ref: UKY-8770912734</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Hours / Qty</th>
        <th>Rate</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>AI PDF Engine Architecture &amp; Integration</strong></td>
        <td>1</td>
        <td>$1,200.00</td>
        <td style="text-align: right;">$1,200.00</td>
      </tr>
      <tr>
        <td><strong>Client-Side Vector Engine &amp; Security Auditing</strong></td>
        <td>1</td>
        <td>$800.00</td>
        <td style="text-align: right;">$800.00</td>
      </tr>
      <tr>
        <td><strong>Layout-Aware Document Pipeline Optimization</strong></td>
        <td>1</td>
        <td>$500.00</td>
        <td style="text-align: right;">$500.00</td>
      </tr>
    </tbody>
  </table>

  <div class="total-box">
    <div class="total-title">Total Due:</div>
    <div class="total-amount">$2,500.00</div>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Thank you for your business. Verified by UIKEY AI.</p>
  </div>
</body>
</html>`;

const SAMPLE_BRIEF = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Georgia', serif; line-height: 1.7; color: #1e293b; padding: 40px; }
    h1 { font-family: 'Segoe UI', sans-serif; font-size: 32px; color: #0f172a; margin-bottom: 8px; }
    .subtitle { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #D4AF37; font-weight: bold; }
    p { margin-bottom: 16px; font-size: 15px; }
    blockquote { border-left: 4px solid #D4AF37; padding-left: 16px; font-style: italic; color: #475569; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="subtitle">Executive Whitepaper</div>
  <h1>Autonomous Document Intelligence</h1>
  <p>Modern enterprise documentation demands privacy-first, client-driven orchestration without sacrificing vector fidelity or typography precision.</p>
  <blockquote>
    "Security is not an add-on; it is an architectural commitment to zero external data leakage and instantaneous processing."
  </blockquote>
  <p>By blending web client WASM runtimes with layout-aware structural reconstruction engines, UIKEY AI guarantees 100% vector retention across document transformations.</p>
</body>
</html>`;

export const HtmlToPdfPage: React.FC = () => {
  const [htmlContent, setHtmlContent] = useState(SAMPLE_INVOICE);
  const [docTitle, setDocTitle] = useState('HTML_Export');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);

  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const addToast = useToastStore((state) => state.addToast);

  const handleTemplateSelect = (type: 'invoice' | 'brief') => {
    if (type === 'invoice') {
      setHtmlContent(SAMPLE_INVOICE);
      setDocTitle('Invoice_Document');
    } else {
      setHtmlContent(SAMPLE_BRIEF);
      setDocTitle('Executive_Brief');
    }
    addToast({ type: 'info', title: 'Template Loaded', message: 'Sample layout inserted into editor.' });
  };

  const handleGeneratePdf = async () => {
    if (!htmlContent.trim()) {
      addToast({ type: 'warning', title: 'Empty Content', message: 'Please enter HTML code to convert.' });
      return;
    }

    setIsProcessing(true);
    try {
      // Dimensions in PDF points (72 DPI)
      let pageW = pageSize === 'letter' ? 612 : 595.28;
      let pageH = pageSize === 'letter' ? 792 : 841.89;

      if (orientation === 'landscape') {
        const temp = pageW;
        pageW = pageH;
        pageH = temp;
      }

      // Render HTML into an offscreen container
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-10000px';
      container.style.left = '-10000px';
      container.style.width = `${pageW}px`;
      container.style.background = '#ffffff';
      container.style.boxSizing = 'border-box';
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      // Give fonts/styles time to settle
      await new Promise((r) => setTimeout(r, 150));

      const scrollH = Math.max(container.scrollHeight, pageH);
      const numPages = Math.ceil(scrollH / pageH);

      const svgString = `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="${pageW}" height="${scrollH}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;">${container.innerHTML}</div></foreignObject></svg>`;

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed rendering HTML graphics'));
        img.src = svgString;
      });

      // Render to canvas with 2x resolution
      const renderScale = 2.0;
      const pdfDoc = await PDFDocument.create();

      for (let p = 0; p < numPages; p++) {
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = Math.floor(pageW * renderScale);
        pageCanvas.height = Math.floor(pageH * renderScale);
        const ctx = pageCanvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');

        ctx.scale(renderScale, renderScale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageW, pageH);

        const sourceY = p * pageH;
        ctx.drawImage(
          img,
          0,
          sourceY,
          pageW,
          Math.min(pageH, scrollH - sourceY),
          0,
          0,
          pageW,
          Math.min(pageH, scrollH - sourceY)
        );

        const imgDataUrl = pageCanvas.toDataURL('image/jpeg', 0.95);
        const embeddedImg = await pdfDoc.embedJpg(imgDataUrl);

        const newPage = pdfDoc.addPage([pageW, pageH]);
        newPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: pageW,
          height: pageH,
        });
      }

      document.body.removeChild(container);

      const bytes = await pdfDoc.save({ useObjectStreams: true });
      setResultBytes(bytes);
      addToast({
        type: 'success',
        title: 'PDF Rendered Successfully',
        message: `Exported ${numPages} ${numPages === 1 ? 'page' : 'pages'} with CSS styles and fonts.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Generation Failed',
        message: err?.message || 'Could not convert HTML to PDF.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <Code className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          HTML to <span className="text-brand-gold">PDF</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
          Convert web templates, invoices, CSS layouts, and HTML snippets into clean, paginated, high-resolution PDF documents.
        </p>
      </div>

      <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
        {/* Template buttons & Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400">Templates:</span>
            <button
              type="button"
              onClick={() => handleTemplateSelect('invoice')}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-brand-gold hover:border-brand-gold/40 transition"
            >
              Modern Invoice
            </button>
            <button
              type="button"
              onClick={() => handleTemplateSelect('brief')}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-brand-gold hover:border-brand-gold/40 transition"
            >
              Executive Report
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${
                viewMode === 'code'
                  ? 'border-brand-gold bg-amber-500/10 text-white'
                  : 'border-white/10 text-zinc-400 hover:text-white bg-zinc-900'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>HTML Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${
                viewMode === 'preview'
                  ? 'border-brand-gold bg-amber-500/10 text-white'
                  : 'border-white/10 text-zinc-400 hover:text-white bg-zinc-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview</span>
            </button>
          </div>
        </div>

        {/* Layout Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                A4
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
                Letter
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Orientation</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  orientation === 'portrait'
                    ? 'border-brand-gold bg-amber-500/10 text-white'
                    : 'border-white/10 text-zinc-400 hover:text-white bg-zinc-900'
                }`}
              >
                Portrait
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  orientation === 'landscape'
                    ? 'border-brand-gold bg-amber-500/10 text-white'
                    : 'border-white/10 text-zinc-400 hover:text-white bg-zinc-900'
                }`}
              >
                Landscape
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">File Name</label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-gold"
            />
          </div>
        </div>

        {/* Content Area (Editor vs Preview) */}
        {viewMode === 'code' ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300">HTML &amp; CSS Source Code</label>
              <span className="text-[11px] text-zinc-500">Supports inline &lt;style&gt; and embedded CSS</span>
            </div>
            <textarea
              rows={16}
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="Paste HTML here..."
              className="w-full p-4 rounded-xl bg-zinc-950 border border-white/10 text-zinc-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-brand-gold resize-y"
            />
          </div>
        ) : (
          <div className="border border-white/10 rounded-xl overflow-hidden bg-white shadow-inner min-h-[400px]">
            <iframe
              ref={previewIframeRef}
              title="HTML Preview"
              srcDoc={htmlContent}
              className="w-full h-[450px] border-0"
              sandbox="allow-same-origin"
            />
          </div>
        )}

        <button
          onClick={handleGeneratePdf}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
        >
          <Code className="w-4 h-4" />
          <span>Convert HTML to High-Res PDF</span>
        </button>
      </div>

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Rendering CSS layout and compiling PDF..." />
      <ResultModal
        isOpen={Boolean(resultBytes)}
        onClose={() => setResultBytes(null)}
        resultData={resultBytes}
        defaultFileName={`${docTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`}
        onReset={() => {
          setResultBytes(null);
        }}
      />
    </div>
  );
};
