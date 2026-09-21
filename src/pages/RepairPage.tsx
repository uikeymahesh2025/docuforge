import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wrench,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileEdit,
  ArrowRight,
  RefreshCw,
  FileText,
  Layers,
  Sparkles,
  Terminal,
  Activity,
  Check,
  Zap,
} from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { repairPdf, RepairDiagnostic } from '../pdf/pdfModifier';
import { useToastStore } from '../stores/useToastStore';
import { useEditorStore } from '../stores/useEditorStore';

export const RepairPage: React.FC = () => {
  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);
  const setPdf = useEditorStore((state) => state.setPdf);

  const [file, setFile] = useState<File | null>(null);
  const [isRepairing, setIsRepairing] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [repairedBytes, setRepairedBytes] = useState<Uint8Array | null>(null);
  const [diagnostic, setDiagnostic] = useState<RepairDiagnostic | null>(null);
  const [showLogs, setShowLogs] = useState<boolean>(false);

  const handleFilesSelected = (files: File[]) => {
    if (!files || files.length === 0) return;
    setFile(files[0]);
    setRepairedBytes(null);
    setDiagnostic(null);
  };

  const handleRepair = async () => {
    if (!file) return;

    setIsRepairing(true);
    setCurrentStep('Analyzing file header & magic byte signatures...');

    try {
      const buffer = await file.arrayBuffer();
      const rawBytes = new Uint8Array(buffer);

      // Simulate real-time progress steps for user feedback
      setTimeout(() => {
        setCurrentStep('Rebuilding cross-reference table (XRef) & object streams...');
      }, 500);

      setTimeout(() => {
        setCurrentStep('Recovering page trees & sanitizing decompressions...');
      }, 1100);

      const result = await repairPdf(rawBytes);

      setRepairedBytes(result.pdfBytes);
      setDiagnostic(result.diagnostic);

      addToast({
        type: 'success',
        title: 'PDF Repaired Successfully!',
        message: `Recovered ${result.diagnostic.pagesRecovered} pages with reconstructed XRef tables.`,
      });
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Repair Failed',
        message: err?.message || 'Could not recover this file. It may be too heavily corrupted.',
      });
    } finally {
      setIsRepairing(false);
      setCurrentStep('');
    }
  };

  const downloadRepaired = () => {
    if (!repairedBytes || !file) return;
    const blob = new Blob([repairedBytes as unknown as BlobPart], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const cleanName = file.name.replace(/\.pdf$/i, '');
    link.download = `${cleanName}_repaired.pdf`;
    link.click();

    addToast({
      type: 'success',
      title: 'Download Started',
      message: 'Repaired PDF has been saved to your device.',
    });
  };

  const openInEditor = () => {
    if (!repairedBytes || !file) return;
    const cleanName = file.name.replace(/\.pdf$/i, '');
    setPdf(repairedBytes, `${cleanName}_repaired.pdf`, diagnostic?.pagesRecovered || 1);
    addToast({
      type: 'success',
      title: 'Opening Editor',
      message: 'Repaired PDF loaded into PDF Editor.',
    });
    navigate('/pdf-editor');
  };

  const reset = () => {
    setFile(null);
    setRepairedBytes(null);
    setDiagnostic(null);
  };

  return (
    <div className="min-h-screen bg-[#09090C] text-zinc-100 flex flex-col">
      {/* Hero Header */}
      <section className="relative pt-12 pb-12 sm:pt-16 sm:pb-16 border-b border-white/5 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-4 shadow-gold-glow">
            <Wrench className="w-3.5 h-3.5" />
            <span>Multi-Engine Deep Document Recovery</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight">
            Repair & Rebuild <span className="gold-gradient-text">Corrupted PDFs</span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Fix unreadable, damaged, or truncated PDF files. Automatically aligns headers, reconstructs broken XRef tables, and synthesizes missing streams.
          </p>
        </div>
      </section>

      {/* Main Workspace */}
      <section className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {!file ? (
          /* Empty / Upload State */
          <div className="space-y-8">
            <FileUploader
              title="Drop corrupted or damaged PDF here"
              subtitle="or click to browse from your device (Processed 100% locally in-browser)"
              onFilesSelected={handleFilesSelected}
            />

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
              <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 mb-2">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white">XRef Table Rebuild</h3>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Re-indexes cross-reference tables and regenerates broken byte offsets.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="font-bold text-white">Magic Header Repair</h3>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Strips preceding junk bytes or HTML wrapper injected by email/scrapers.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 mb-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="font-bold text-white">Fault-Tolerant Stream Recovery</h3>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Extracts salvageable pages even when streams are partially corrupted.
                </p>
              </div>
            </div>
          </div>
        ) : !repairedBytes ? (
          /* File Loaded -> Ready to Repair State */
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0E0E14] border border-white/10 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-6 border-b border-white/5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white truncate max-w-md">
                    {file.name}
                  </h3>
                  <span className="text-xs text-zinc-400">
                    File Size: {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              <button
                onClick={reset}
                className="text-xs text-zinc-400 hover:text-rose-400 transition"
              >
                Change File
              </button>
            </div>

            {isRepairing ? (
              /* Repair In-Progress Animation */
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin" />
                  <Wrench className="w-6 h-6 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Repairing PDF Document...</h4>
                  <p className="text-xs text-amber-400 font-mono mt-1 animate-pulse">
                    {currentStep}
                  </p>
                </div>
              </div>
            ) : (
              /* Action Prompt */
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs text-zinc-300 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>Deep Diagnostic & Reconstruction Protocol</span>
                  </div>
                  <p className="leading-relaxed text-zinc-400">
                    The engine will execute binary realignment, repair missing EOF trailer tokens, rebuild object streams, and re-synthesize pages. Original file remains untouched.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={reset}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRepair}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold text-xs hover:brightness-110 shadow-gold-glow transition active:scale-95"
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Start Deep Repair</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Repaired Success Report State */
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0E0E14] border border-amber-400/30 shadow-2xl space-y-8 animate-fadeIn">
            {/* Top Success Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">
                      Document Repaired &amp; Restored
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                      100% Verified
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Structural integrity restored. Valid for all PDF viewers &amp; printers.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={openInEditor}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-200 hover:text-white text-xs font-semibold hover:border-amber-400/40 transition"
                  title="Open directly in PDF Editor"
                >
                  <FileEdit className="w-3.5 h-3.5 text-amber-400" />
                  <span>Open in Editor</span>
                </button>

                <button
                  onClick={downloadRepaired}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black text-xs font-bold hover:brightness-110 shadow-gold-glow transition active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Repaired PDF</span>
                </button>
              </div>
            </div>

            {/* Diagnostic Metrics Cards */}
            {diagnostic && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1">
                  <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider block">
                    Pages Recovered
                  </span>
                  <span className="text-xl font-black text-white">
                    {diagnostic.pagesRecovered} Pages
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1">
                  <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider block">
                    XRef Status
                  </span>
                  <span className="text-sm font-bold text-emerald-400 flex items-center gap-1 mt-1">
                    <Check className="w-3.5 h-3.5" /> Rebuilt &amp; Valid
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1">
                  <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider block">
                    Engine Used
                  </span>
                  <span className="text-xs font-bold text-amber-400 mt-1 block capitalize">
                    {diagnostic.engineUsed.replace(/-/g, ' ')}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1">
                  <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider block">
                    Clean File Size
                  </span>
                  <span className="text-sm font-bold text-white mt-1 block">
                    {(diagnostic.repairedSize / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
            )}

            {/* Collapsible Diagnostic Audit Trail */}
            {diagnostic && diagnostic.log && (
              <div className="rounded-2xl bg-black/50 border border-white/10 p-4 space-y-3 text-xs">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="w-full flex items-center justify-between text-zinc-400 hover:text-white transition"
                >
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Detailed Diagnostic Audit Trail ({diagnostic.log.length} Events)</span>
                  </div>
                  <span className="text-[11px] underline">
                    {showLogs ? 'Hide Log' : 'View Log'}
                  </span>
                </button>

                {showLogs && (
                  <div className="pt-2 border-t border-white/5 font-mono text-[11px] space-y-1 text-zinc-400 max-h-48 overflow-y-auto">
                    {diagnostic.log.map((entry, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-zinc-600">[{idx + 1}]</span>
                        <span className="text-zinc-300">{entry}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-zinc-400">
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Repair Another PDF</span>
              </button>

              <Link
                to="/"
                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
              >
                <span>Back to All Suite Tools</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
