import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  SlidersHorizontal,
  Clock,
  ExternalLink,
  ChevronRight,
  X,
  FileSignature,
  Camera,
} from 'lucide-react';
import { TOOLS, CATEGORY_LABELS } from '../utils/toolsCatalog';
import { ICON_MAP } from '../components/common/MegaMenu';
import { FileUploader } from '../components/tools/FileUploader';
import { useEditorStore } from '../stores/useEditorStore';
import { loadPdfDocument } from '../pdf/pdfManager';
import { useToastStore } from '../stores/useToastStore';
import { ToolCategory, ToolItem } from '../types';

export const Home: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentToolIds, setRecentToolIds] = useState<string[]>([]);

  const navigate = useNavigate();
  const setPdf = useEditorStore((state) => state.setPdf);
  const addToast = useToastStore((state) => state.addToast);

  // Load recently used tools from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('uikey_recent_tools');
      if (stored) {
        setRecentToolIds(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const trackToolClick = (toolId: string) => {
    try {
      const updated = [toolId, ...recentToolIds.filter((id) => id !== toolId)].slice(0, 5);
      setRecentToolIds(updated);
      localStorage.setItem('uikey_recent_tools', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

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
    { id: 'edit-sign', label: 'Edit & Sign' },
    { id: 'pages', label: 'Pages' },
    { id: 'convert', label: 'Convert' },
    { id: 'compress', label: 'Compress' },
    { id: 'secure', label: 'Secure' },
    { id: 'more-tools', label: 'More Tools' },
    { id: 'hubs', label: 'Specialized Hubs' },
  ];

  // Filter tools based on search and category
  const filteredTools = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return TOOLS.filter((tool) => {
      // Category match
      const matchesCategory =
        activeCategory === 'all'
          ? !tool.isNicheHub // In 'all', focus on core tools; hubs in dedicated section or 'hubs' tab
          : tool.category === activeCategory;

      if (!matchesCategory) return false;

      // Search match by name, description, category, or user intent keywords
      if (!q) return true;

      const nameMatch = tool.name.toLowerCase().includes(q);
      const descMatch = tool.description.toLowerCase().includes(q);
      const keywordMatch = tool.keywords?.some((k) => k.toLowerCase().includes(q));

      return nameMatch || descMatch || keywordMatch;
    });
  }, [activeCategory, searchQuery]);

  // Specialized Hubs for dedicated showcase
  const nicheHubs = useMemo(() => TOOLS.filter((t) => t.isNicheHub), []);

  // Popular and Recommended Tools
  const popularTools = useMemo(
    () => TOOLS.filter((t) => t.badge === 'Popular' || t.badge === 'Flagship').slice(0, 4),
    []
  );

  const recentTools = useMemo(
    () =>
      recentToolIds
        .map((id) => TOOLS.find((t) => t.id === id))
        .filter(Boolean) as ToolItem[],
    [recentToolIds]
  );

  return (
    <div className="min-h-screen bg-[#09090C] text-zinc-100 flex flex-col selection:bg-brand-gold/30">
      {/* -------------------------------------------------------- */}
      {/* HERO SECTION (Kept prominently above the fold) */}
      {/* -------------------------------------------------------- */}
      <section className="relative pt-10 pb-12 sm:pt-16 sm:pb-16 overflow-hidden border-b border-white/5">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-gold/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-brand-gold/30 text-brand-gold text-xs font-semibold mb-5 shadow-gold-glow">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Private Browser-First PDF Suite • 100% Client-Side</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Edit, sign, organize and convert PDFs <span className="gold-gradient-text">privately in your browser.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            All document processing runs 100% locally on your machine with zero server uploads, no logins, and zero file limits.
          </p>

          {/* Hero Upload Zone */}
          <div className="max-w-xl mx-auto mb-8">
            <FileUploader
              title="Drop a PDF to edit or manage"
              subtitle="or click to browse from your device"
              onFilesSelected={handleHeroFileUpload}
              showSampleButton={true}
            />
          </div>

          {/* Three-step visual workflow helper */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left p-3.5 max-w-3xl mx-auto rounded-2xl bg-[#0D0D14] border border-white/5 shadow-md">
            <div className="flex items-start gap-2.5 p-2">
              <span className="w-5 h-5 rounded-full bg-brand-gold text-black font-extrabold text-[11px] flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <span className="font-bold text-white text-xs block">Choose a tool</span>
                <span className="text-[11px] text-zinc-400">Edit, Sign, Merge, Convert or Compress</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2">
              <span className="w-5 h-5 rounded-full bg-brand-gold text-black font-extrabold text-[11px] flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <span className="font-bold text-white text-xs block">Process in browser</span>
                <span className="text-[11px] text-zinc-400">Zero file uploads • 100% private memory</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2">
              <span className="w-5 h-5 rounded-full bg-brand-gold text-black font-extrabold text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <span className="font-bold text-white text-xs block">Save &amp; Download</span>
                <span className="text-[11px] text-zinc-400">Instant download with custom name &amp; options</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- */}
      {/* FAST ACCESS POPULAR SHORTCUTS STRIP */}
      {/* -------------------------------------------------------- */}
      <section className="py-5 bg-[#0C0C12] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider shrink-0 mr-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-brand-gold" />
              <span>Quick Actions:</span>
            </span>
            {[
              { label: 'PDF Editor', icon: FileEdit, path: '/pdf-editor' },
              { label: 'Merge PDF', icon: Combine, path: '/merge-pdf' },
              { label: 'Sign PDF', icon: FileSignature, path: '/pdf-editor?tool=signature' },
              { label: 'Compress PDF', icon: Minimize2, path: '/compress-pdf' },
              { label: 'Organize Pages', icon: LayoutGrid, path: '/organize-pdf' },
              { label: 'PDF to Word', icon: FileDown, path: '/pdf-to-word' },
              { label: 'Image to PDF', icon: Image, path: '/image-to-pdf' },
              { label: 'Camera Scan', icon: Camera, path: '/scan-to-pdf' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/5 hover:border-brand-gold/40 hover:bg-white/5 transition text-xs font-medium text-zinc-300 hover:text-white shrink-0 group"
                >
                  <Icon className="w-3.5 h-3.5 text-brand-gold group-hover:scale-110 transition-transform" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- */}
      {/* RECENTLY USED TOOLS (If available in localStorage) */}
      {/* -------------------------------------------------------- */}
      {recentTools.length > 0 && (
        <section className="py-4 bg-[#09090E] border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-gold" />
                <span>Recently Used Tools</span>
              </span>
              <button
                onClick={() => {
                  setRecentToolIds([]);
                  localStorage.removeItem('uikey_recent_tools');
                }}
                className="text-[11px] text-zinc-500 hover:text-zinc-300"
              >
                Clear History
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {recentTools.map((tool) => {
                const Icon = ICON_MAP[tool.icon] || FileEdit;
                return (
                  <Link
                    key={tool.id}
                    to={tool.path}
                    className="p-2.5 rounded-xl bg-[#121218] border border-white/5 hover:border-brand-gold/30 flex items-center gap-2 transition group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-brand-gold shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-zinc-200 group-hover:text-brand-gold truncate">
                      {tool.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------- */}
      {/* MAIN TOOL CATALOG & DISCOVERY SECTION */}
      {/* -------------------------------------------------------- */}
      <section id="tools" className="py-10 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 w-full">
        {/* Search Bar & Intent Discovery */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto mb-6">
            <Search className="w-5 h-5 text-brand-gold absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools by name or intent (e.g. e-sign, compress under 200kb, extract tables)..."
              aria-label="Search tools by name or user intent"
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-[#121218] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-gold shadow-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* User-Focused Category Filter Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar justify-start sm:justify-center">
            {categories.map((cat) => {
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  aria-pressed={isSelected}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 border ${isSelected
                      ? 'bg-brand-gold text-black border-brand-gold shadow-gold-glow font-bold scale-[1.02]'
                      : 'bg-zinc-900/80 text-zinc-300 border-white/10 hover:border-amber-400/40 hover:text-white hover:bg-zinc-800'
                    }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tools Results Grid */}
        <div className="mb-14">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{searchQuery ? `Search Results (${filteredTools.length})` : activeCategory === 'all' ? 'All PDF Tools' : CATEGORY_LABELS[activeCategory]}</span>
            </h2>
            <span className="text-xs text-zinc-500 font-mono">
              Showing {filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'}
            </span>
          </div>

          {filteredTools.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#0E0E14] border border-white/5 my-6">
              <SlidersHorizontal className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-300 mb-1">No matching tools found</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-4">
                We couldn't find any tool matching "{searchQuery}". Try broader keywords like "edit", "merge", "sign" or "pages".
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="px-4 py-2 bg-brand-gold text-black text-xs font-bold rounded-xl hover:brightness-110 transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTools.map((tool) => {
                const ToolIcon = ICON_MAP[tool.icon] || FileEdit;

                return (
                  <Link
                    key={tool.id}
                    to={tool.path}
                    onClick={() => trackToolClick(tool.id)}
                    className="group relative flex flex-col justify-between p-5 rounded-2xl bg-[#0E0E14] border border-white/10 hover:border-brand-gold/50 hover:bg-[#12121B] transition-all duration-300 shadow-md hover:shadow-gold-glow"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-brand-gold/20 flex items-center justify-center text-brand-gold group-hover:scale-105 group-hover:bg-amber-500/20 transition">
                          <ToolIcon className="w-5 h-5" />
                        </div>
                        {tool.badge && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tool.badge === 'Popular'
                                ? 'bg-amber-500/20 text-brand-gold border border-brand-gold/30'
                                : tool.badge === 'New'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-zinc-800 text-zinc-300 border border-white/10'
                              }`}
                          >
                            {tool.badge}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-white group-hover:text-brand-gold transition mb-1.5">
                        {tool.name}
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                        {tool.description}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-zinc-500 group-hover:text-brand-gold transition">
                      <span className="text-[10px] uppercase font-bold text-zinc-500">
                        {CATEGORY_LABELS[tool.category] || 'Tool'}
                      </span>
                      <div className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>Open</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* -------------------------------------------------------- */}
        {/* SPECIALIZED WORKFLOW HUBS (Separated & Clearly Labeled) */}
        {/* -------------------------------------------------------- */}
        <div className="mb-14 p-6 sm:p-8 rounded-3xl bg-[#0D0D14] border border-amber-500/20 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-gold" />
                <span className="text-xs uppercase font-extrabold tracking-wider text-brand-gold">
                  Specialized Industry Hubs
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                Dedicated Workflows for Photographers, Cyber Cafes &amp; Exams
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Specialized suites organized into standalone workspaces for specific job requirements.
              </p>
            </div>
            <Link
              to="/wedding-studio"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-brand-gold/30 text-brand-gold font-bold text-xs hover:bg-amber-500/20 transition self-start sm:self-center"
            >
              <span>Explore Wedding Studio</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {nicheHubs.map((hub) => {
              const HubIcon = ICON_MAP[hub.icon] || FileEdit;
              return (
                <Link
                  key={hub.id}
                  to={hub.path}
                  onClick={() => trackToolClick(hub.id)}
                  className="p-4.5 rounded-2xl bg-[#12121A] border border-white/10 hover:border-brand-gold/40 hover:bg-[#161622] transition group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-brand-gold/20 flex items-center justify-center text-brand-gold group-hover:scale-105 transition">
                        <HubIcon className="w-5 h-5" />
                      </div>
                      {hub.badge && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-brand-gold border border-brand-gold/20">
                          {hub.badge}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-brand-gold transition mb-1">
                      {hub.name}
                    </h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-2">
                      {hub.description}
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-semibold text-zinc-400 group-hover:text-brand-gold">
                    <span>Launch Hub</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* -------------------------------------------------------- */}
        {/* HOW IT WORKS & TECHNICAL PRIVACY GUARANTEE */}
        {/* -------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 sm:p-8 rounded-3xl bg-[#0E0E14] border border-white/10">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">100% In-Browser Privacy</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Documents are read and modified entirely inside your browser using WebAssembly &amp; HTML5 Canvas. No data is ever sent to a remote server.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shrink-0">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Instant Local Processing</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Zero upload latency or waiting queues. Even multi-hundred page documents render and export at native device speeds.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shrink-0">
              <CheckCircle2 className="w-5 h-5 text-brand-gold" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">No Account or Hidden Limits</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Edit and save standard PDFs up to 100MB completely free. No watermarks added to your exports, ever.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
