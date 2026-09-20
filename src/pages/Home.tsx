import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileEdit,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  Sparkles,
  Combine,
  Split,
  LayoutGrid,
  Minimize2,
  Stamp,
  FileDown,
  Image,
  Images,
  Binary,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { TOOLS, CATEGORY_LABELS } from '../utils/toolsCatalog';
import { ICON_MAP } from '../components/common/MegaMenu';
import { FileUploader } from '../components/tools/FileUploader';
import { useEditorStore } from '../stores/useEditorStore';
import { loadPdfDocument } from '../pdf/pdfManager';
import { useToastStore } from '../stores/useToastStore';

export const Home: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const navigate = useNavigate();
  const setPdf = useEditorStore((state) => state.setPdf);
  const addToast = useToastStore((state) => state.addToast);

  const handleHeroFileUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const doc = await loadPdfDocument(bytes);
      setPdf(bytes, file.name, doc.numPages);
      addToast({
        type: 'success',
        title: 'Document Loaded',
        message: 'Opening PDF Editor...',
      });
      navigate('/pdf-editor');
    } catch {
      addToast({
        type: 'error',
        title: 'Error loading file',
        message: 'Could not parse this PDF. It may be corrupted or encrypted.',
      });
    }
  };

  const categories = [
    { id: 'all', label: 'All Tools' },
    { id: 'organize', label: 'Organize' },
    { id: 'edit', label: 'Edit & Sign' },
    { id: 'convert-to', label: 'Convert to PDF' },
    { id: 'convert-from', label: 'Convert from PDF' },
    { id: 'optimize', label: 'Optimize' },
    { id: 'page-tools', label: 'Page Tools' },
    { id: 'security', label: 'Security' },
  ];

  const filteredTools =
    activeCategory === 'all'
      ? TOOLS
      : TOOLS.filter((t) => t.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#09090C] text-zinc-100 flex flex-col">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden border-b border-white/5">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-gold/10 blur-[130px] rounded-full pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-brand-gold/30 text-brand-gold text-xs font-semibold mb-6 shadow-gold-glow">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Browser-First • 100% Private • No Login Required</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-5 leading-tight sm:leading-none">
            PDF tools that <span className="gold-gradient-text">just work.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Edit, convert, organize, compress and manage your PDF files without creating an account or paying for subscriptions.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
            <Link
              to="/pdf-editor"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
            >
              <FileEdit className="w-4 h-4" />
              <span>Edit PDF</span>
            </Link>

            <a
              href="#tools"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-zinc-900 border border-white/10 hover:border-brand-gold/40 text-zinc-200 font-semibold text-sm transition"
            >
              <span>All PDF Tools</span>
              <ArrowRight className="w-4 h-4 text-brand-gold" />
            </a>
          </div>

          {/* Hero Upload Zone */}
          <div className="max-w-xl mx-auto">
            <FileUploader
              title="Drop a PDF here"
              subtitle="or click to choose a PDF from your device"
              onFilesSelected={handleHeroFileUpload}
            />
          </div>
        </div>
      </section>

      {/* Featured Fast Actions Banner */}
      <section className="py-8 bg-[#0C0C12] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Merge PDF', icon: Combine, path: '/merge-pdf' },
              { label: 'Split PDF', icon: Split, path: '/split-pdf' },
              { label: 'Compress PDF', icon: Minimize2, path: '/compress-pdf' },
              { label: 'Watermark', icon: Stamp, path: '/add-watermark' },
              { label: 'PDF to Word', icon: FileDown, path: '/pdf-to-word' },
              { label: 'Organize', icon: LayoutGrid, path: '/organize-pdf' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-brand-gold/30 hover:bg-white/5 transition group"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-brand-gold shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Tool Catalog Section */}
      <section id="tools" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
              Comprehensive <span className="text-brand-gold">PDF Suite</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Every tool is fully functional, browser-powered, and free of subscriptions.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                  activeCategory === cat.id
                    ? 'bg-brand-gold text-black shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/5'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTools.map((tool) => {
            const ToolIcon = ICON_MAP[tool.icon] || FileEdit;
            return (
              <Link
                key={tool.id}
                to={tool.path}
                className="group relative flex flex-col justify-between p-5 rounded-2xl bg-[#0E0E14] border border-white/10 hover:border-brand-gold/40 hover:bg-[#12121A] transition-all duration-200 shadow-sm hover:shadow-gold-glow"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:text-brand-gold group-hover:border-amber-500/30 transition">
                      <ToolIcon className="w-5 h-5" />
                    </div>
                    {tool.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-brand-gold border border-amber-500/20">
                        {tool.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-brand-gold transition mb-1.5">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                    {tool.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 group-hover:text-zinc-300 transition">
                  <span className="uppercase tracking-wider font-semibold text-[10px] text-zinc-500">
                    {CATEGORY_LABELS[tool.category]}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-brand-gold group-hover:translate-x-1 transition" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Privacy Guarantee Manifesto Section */}
      <section className="py-16 bg-[#0B0B0F] border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#121218] border border-brand-gold/20 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand-gold/5 blur-[90px] rounded-full pointer-events-none"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-brand-gold/30 text-brand-gold text-xs font-bold mb-4">
                <ShieldCheck className="w-4 h-4" />
                <span>The UIKEY AI Privacy Promise</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Your documents stay yours. Forever.
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-6 max-w-2xl">
                Unlike traditional PDF editors that upload your sensitive legal, financial, and personal records to cloud servers, UIKEY AI processes your documents directly inside your browser. No registration, no tracking, no permanent file retention.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs text-zinc-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" />
                  <span>No user login or registration</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" />
                  <span>Zero database document storage</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" />
                  <span>Stateless temporary processing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
