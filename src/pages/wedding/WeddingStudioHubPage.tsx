import React from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Heart,
  FileText,
  Printer,
  Minimize2,
  Stamp,
  Images,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Award,
  Layers,
  Star,
} from 'lucide-react';

export const WeddingStudioHubPage: React.FC = () => {
  const modules = [
    {
      id: 'proofing',
      title: 'Photo Proofing & Selection',
      tagline: 'Client Photo Selection & Rating',
      description:
        'Upload 500+ RAW/JPG photos or album PDFs. Let clients rate with 5-stars, heart favorites, reject shots, and export clean Lightroom filenames or contact sheet PDFs.',
      icon: Heart,
      badge: 'Client Favorite',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      path: '/wedding-studio/proofing',
      features: [
        'Star ratings (1-5★) & Heart tags',
        'Contact Sheet PDF export with filenames',
        'Clean .TXT & .CSV list for Lightroom',
        'Lightning-fast in-browser rendering',
      ],
      cta: 'Launch Photo Proofing',
    },
    {
      id: 'quotation',
      title: 'Wedding Quotation & Contract',
      tagline: 'Pro Invoice & Legal Agreement Maker',
      description:
        'Create bespoke event quotations with photography packages (Candid, Drone, Albums), GST taxes, milestone payment schedules, and dual HTML5 e-signatures.',
      icon: FileText,
      badge: 'Bestseller',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      path: '/wedding-studio/quotation',
      features: [
        'Pre-filled wedding packages & items',
        'Auto tax & milestone payment calculations',
        'Dual photographer & client e-signatures',
        'Download luxury print-ready PDF contract',
      ],
      cta: 'Create Quotation & Contract',
    },
    {
      id: 'guest-cards',
      title: 'Guest Badges & Table Tent Cards',
      tagline: 'Foldable Seating & VIP Passes',
      description:
        'Generate printable A4 sheets of luxury folding table tent cards and VIP guest badges with ornamental frames, table numbers, and folding cut lines.',
      icon: Printer,
      badge: 'Print Ready',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      path: '/wedding-studio/guest-cards',
      features: [
        'A4 folding tent cards & VIP badges',
        'Luxury ornamental gold border frames',
        'Bulk CSV paste or manual guest entry',
        'Instant print-ready PDF with cut guides',
      ],
      cta: 'Generate Table & Guest Cards',
    },
  ];

  const quickTools = [
    {
      title: 'WhatsApp Album Compressor',
      desc: 'Shrink wedding preview albums under 15MB for quick WhatsApp delivery.',
      icon: Minimize2,
      path: '/compress-pdf',
    },
    {
      title: 'Studio Watermark Stamp',
      desc: 'Add custom studio logos or copyright stamps to protect unreleased proofs.',
      icon: Stamp,
      path: '/add-watermark',
    },
    {
      title: 'Photo Album to PDF',
      desc: 'Combine high-res JPG/PNG photos into a bound wedding storybook PDF.',
      icon: Images,
      path: '/image-to-pdf',
    },
    {
      title: 'PDF Album Proofing (Multi-Page)',
      desc: 'Proof multi-page PDF albums with lossless page extraction.',
      icon: Layers,
      path: '/photo-proofing',
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090C] text-zinc-100 flex flex-col">
      {/* Hero Banner */}
      <section className="relative pt-12 pb-16 sm:pt-16 sm:pb-20 border-b border-white/5 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none"></div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-5 shadow-gold-glow">
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>Dedicated Studio & Event Suite</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Wedding & Event <span className="gold-gradient-text">Studio Hub</span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            All-in-one browser workspace for wedding photographers, cinematographers, and event planners. Zero cloud uploads, 100% private, and completely free.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-300">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Client-Side Privacy</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>High-Res Lossless PDF Engine</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/5">
              <Star className="w-4 h-4 text-amber-400" />
              <span>Lightroom & Studio Compatible</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Studio Modules */}
      <section className="py-12 sm:py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex-1">
        <div className="text-center mb-10">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Core Studio Workflows
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Select a specialized tool designed specifically for wedding and event operations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                className="group flex flex-col justify-between p-6 rounded-3xl bg-[#0E0E14] border border-white/10 hover:border-amber-400/50 hover:bg-[#12121B] transition-all duration-300 shadow-xl relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${mod.badgeColor}`}
                    >
                      {mod.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-amber-400 transition">
                    {mod.title}
                  </h3>
                  <p className="text-xs font-semibold text-amber-400/80 mb-3">
                    {mod.tagline}
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                    {mod.description}
                  </p>

                  <div className="space-y-2 mb-6 pt-4 border-t border-white/5">
                    {mod.features.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to={mod.path}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold text-xs hover:brightness-110 shadow-gold-glow transition active:scale-95"
                >
                  <span>{mod.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Companion Studio Tools Grid */}
        <div className="border-t border-white/10 pt-12">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Companion Wedding Studio Utilities
              </h3>
              <p className="text-xs text-zinc-400">
                Speed up file delivery, watermark proofs, and assemble photobooks.
              </p>
            </div>
            <Link
              to="/"
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition"
            >
              <span>View All 35+ Tools</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickTools.map((tool) => {
              const ToolIcon = tool.icon;
              return (
                <Link
                  key={tool.title}
                  to={tool.path}
                  className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-amber-400/40 hover:bg-zinc-900/90 transition group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition">
                      <ToolIcon className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition mb-1">
                      {tool.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {tool.desc}
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 group-hover:text-zinc-300">
                    <span>Open Tool</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition text-amber-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
