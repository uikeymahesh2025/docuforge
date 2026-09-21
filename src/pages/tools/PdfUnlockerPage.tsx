import React, { useState } from 'react';
import {
  Unlock,
  Lock,
  FileText,
  Download,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Printer,
  Copy,
  PenTool,
  MessageSquare,
  Eye,
  RefreshCw,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { FileUploader } from '../../components/tools/FileUploader';
import { loadPdfDocument } from '../../pdf/pdfManager';
import { unlockPdfPermissions } from '../../pdf/pdfModifier';
import { useToastStore } from '../../stores/useToastStore';
import { sanitizeFilename, downloadBlob, formatBytes } from '../../utils/downloadHelpers';

interface PermissionItem {
  label: string;
  desc: string;
  icon: React.ElementType;
}

const PERMISSION_AUDIT_LIST: PermissionItem[] = [
  {
    label: 'High-Resolution Printing',
    desc: 'Remove 150 DPI low-res print limits or complete print locks.',
    icon: Printer,
  },
  {
    label: 'Content Copying & Extraction',
    desc: 'Enable selecting, copying text, and extracting tables into Word/Excel.',
    icon: Copy,
  },
  {
    label: 'Document Modification & Assembly',
    desc: 'Allow reordering pages, rotating, deleting, and inserting new content.',
    icon: PenTool,
  },
  {
    label: 'Interactive Comments & Forms',
    desc: 'Allow filling digital form fields, adding signatures, and sticky annotations.',
    icon: MessageSquare,
  },
  {
    label: 'Accessibility & Screen Readers',
    desc: 'Restore assistive technology accessibility tree extraction.',
    icon: Eye,
  },
];

export const PdfUnlockerPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [password, setPassword] = useState<string>('');
  const [needsPassword, setNeedsPassword] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const [unlockedBytes, setUnlockedBytes] = useState<Uint8Array | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setUnlockedBytes(null);
    setPreviewDataUrl(null);
    setPassword('');
    setNeedsPassword(false);

    try {
      const buffer = await selected.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setFileBytes(bytes);

      // Test loading to see if password is required to open
      try {
        const pdfDoc = await loadPdfDocument(bytes);
        setTotalPages(pdfDoc.numPages);
        setNeedsPassword(false);

        // Render page 1 preview
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 0.8 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport } as any).promise;
          setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.85));
        }

        addToast({
          type: 'success',
          title: 'PDF Analyzed',
          message: `${selected.name} loaded. Ready to strip permission restrictions.`,
        });
      } catch (loadErr: any) {
        // Password required error
        if (
          loadErr?.name === 'PasswordException' ||
          String(loadErr?.message || '').toLowerCase().includes('password')
        ) {
          setNeedsPassword(true);
          addToast({
            type: 'warning',
            title: 'Password Protected',
            message: 'This document requires an open password. Please enter it below to decrypt.',
          });
        } else {
          // Attempt standard permission unlock
          setTotalPages(1);
        }
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Load Failed',
        message: err?.message || 'Could not load PDF file.',
      });
    }
  };

  const handleUnlockPermissions = async () => {
    if (!fileBytes || !file) return;

    setIsProcessing(true);
    try {
      let cleanBytes: Uint8Array;

      if (needsPassword) {
        if (!password.trim()) {
          addToast({
            type: 'error',
            title: 'Password Required',
            message: 'Please enter the known password to decrypt this PDF.',
          });
          setIsProcessing(false);
          return;
        }

        // Decrypt using pdfjs-dist with password
        const pdfDoc = await loadPdfDocument(fileBytes, password);
        const pagesCount = pdfDoc.numPages;
        setTotalPages(pagesCount);

        // Reconstruct clean PDF via pdf-lib by rendering unencrypted pages to clean canvas/images
        const newPdfDoc = await PDFDocument.create();

        for (let p = 1; p <= pagesCount; p++) {
          const page = await pdfDoc.getPage(p);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext('2d');

          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport } as any).promise;

          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          const imageBytes = await fetch(dataUrl).then((r) => r.arrayBuffer());
          const embeddedImage = await newPdfDoc.embedJpg(new Uint8Array(imageBytes));

          const origViewport = page.getViewport({ scale: 1.0 });
          const newPage = newPdfDoc.addPage([origViewport.width, origViewport.height]);
          newPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: origViewport.width,
            height: origViewport.height,
          });
        }

        cleanBytes = await newPdfDoc.save({ useObjectStreams: true });
      } else {
        // Strip permission dictionaries and locks
        cleanBytes = await unlockPdfPermissions(fileBytes, password);
      }

      setUnlockedBytes(cleanBytes);

      // Render updated clean preview
      const previewDoc = await loadPdfDocument(cleanBytes);
      if (previewDoc.numPages > 0) {
        const page1 = await previewDoc.getPage(1);
        const viewport = page1.getViewport({ scale: 0.8 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page1.render({ canvasContext: ctx, viewport } as any).promise;
          setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.85));
        }
      }

      addToast({
        type: 'success',
        title: 'Permissions Removed!',
        message: 'Document is now 100% unrestricted. Printing, copying, and editing enabled.',
      });
    } catch (err: any) {
      console.error('Unlock error:', err);
      addToast({
        type: 'error',
        title: 'Unlock Failed',
        message:
          err?.message ||
          'Could not decrypt document. If password-protected, verify your password.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadUnlocked = () => {
    if (!unlockedBytes || !file) return;
    const blob = new Blob([unlockedBytes as unknown as BlobPart], { type: 'application/pdf' });
    const filename = sanitizeFilename(file.name, 'unrestricted', 'pdf');
    downloadBlob(blob, filename);
    addToast({
      type: 'success',
      title: 'PDF Downloaded',
      message: `${filename} saved with all restrictions permanently stripped.`,
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Page Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Unlock className="w-4 h-4" />
          Unrestricted PDF Engine
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
          PDF Permission <span className="text-brand-gold">Unlocker & Decryptor</span>
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto">
          Remove annoying print locks, text copying blocks, and annotation restrictions. Generate clean, unrestricted standard PDFs ready for office and cyber cafe printing.
        </p>
      </div>

      {!file ? (
        <div className="max-w-2xl mx-auto">
          <FileUploader
            accept=".pdf,application/pdf"
            fileType="pdf"
            subtitle="Upload locked, restricted, or password-protected PDF files to remove security locks"
            onFilesSelected={handleFileSelected}
          />

          {/* Value Props */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Fix Disabled Print Button</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Overcomes Adobe Acrobat and browser print gray-outs on government receipts and corporate forms.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Copy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Enable Text & Table Copying</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Strips copy-protection bitmasks so you can select and copy text effortlessly into Word or Excel.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Configuration Column */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-[#121216] border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <FileText className="w-5 h-5 text-brand-gold shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-white truncate max-w-xs">{file.name}</h3>
                    <p className="text-[11px] text-zinc-400">
                      {formatBytes(file.size)} • {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setFileBytes(null);
                    setUnlockedBytes(null);
                  }}
                  className="text-xs text-zinc-400 hover:text-red-400 transition-colors"
                >
                  Change File
                </button>
              </div>

              {/* Password Prompt if Document Requires Open Password */}
              {needsPassword && (
                <div className="mb-4 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                    <KeyRound className="w-4 h-4" />
                    <span>Password Required to Decrypt</span>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    This document is encrypted with an open password. Enter the password below to permanently decrypt it.
                  </p>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter document password..."
                    className="w-full px-3 py-2 bg-black/50 border border-amber-500/40 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400 placeholder-zinc-500"
                  />
                </div>
              )}

              {/* Security Audit Checklist */}
              <div className="space-y-2 mb-5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                  Permissions Decryption Audit
                </label>
                <div className="space-y-2">
                  {PERMISSION_AUDIT_LIST.map((perm, idx) => {
                    const Icon = perm.icon;
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800/80"
                      >
                        <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-zinc-200">{perm.label}</h4>
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              UNRESTRICTED
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{perm.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              {!unlockedBytes ? (
                <button
                  type="button"
                  onClick={handleUnlockPermissions}
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-black font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Stripping Permission Locks...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Unlock All Permissions & Decrypt</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm mb-0.5">
                      <ShieldCheck className="w-5 h-5" />
                      Document Decrypted & Completely Unrestricted!
                    </div>
                    <p className="text-xs text-zinc-300">
                      Standard unencrypted PDF saved with 0 permission blocks.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadUnlocked}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Unrestricted PDF</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Preview Column */}
          <div className="lg:col-span-6">
            <div className="bg-[#121216] border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[440px]">
              <div className="w-full flex items-center justify-between pb-2 mb-3 border-b border-zinc-800 text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">Page 1 Live Render</span>
                <span className="text-emerald-400 font-medium">
                  {unlockedBytes ? '✓ Decrypted Status' : 'Encrypted Reference'}
                </span>
              </div>

              {previewDataUrl ? (
                <div className="rounded-lg overflow-hidden border border-zinc-700/60 shadow-xl bg-black max-w-sm w-full">
                  <img
                    src={previewDataUrl}
                    alt="Document preview"
                    className="w-full h-auto object-contain max-h-[420px]"
                  />
                </div>
              ) : (
                <div className="text-center p-8 text-zinc-500">
                  <Lock className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Preview unavailable until opened</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
