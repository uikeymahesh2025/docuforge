import React from 'react';
import { ShieldCheck, Lock, Trash2, Cpu, Eye, FileCheck, CheckCircle2 } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-zinc-300">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
          Privacy <span className="text-brand-gold">Policy</span>
        </h1>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          At UIKEY AI, privacy is our fundamental engineering architecture, not just a marketing promise.
        </p>
      </div>

      {/* Mandatory Trust Callout Banner */}
      <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-emerald-950/50 via-zinc-900 to-black border-2 border-emerald-500/40 shadow-2xl flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider block">
            Official Privacy Guarantee
          </span>
          <p className="text-base font-bold text-white leading-relaxed">
            100% Client-Side Processing. Your documents, photos, and files are processed strictly inside your local browser and never uploaded, stored, or viewed on our servers.
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Engineered with web standards, WebAssembly, and local memory execution for total confidential document security.
          </p>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-[#121218] border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-gold" />
            <span>1. Zero Login &amp; Zero Account System</span>
          </h2>
          <p className="text-zinc-400">
            UIKEY AI does not require user registration, email addresses, phone numbers, or passwords. There is no account database, no user profile tracking, and no cookie fingerprinting. You can open any tool and process files anonymously as a guest without friction.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-gold" />
            <span>2. Browser-First Client Processing</span>
          </h2>
          <p className="text-zinc-400">
            All document operations—including PDF editing, signing, annotations, page rearranging, merging, splitting, watermarking, bates stamping, N-Up imposition, OCR, and compression—execute entirely inside your local web browser using client-side WebAssembly, pdf-lib, and modern JavaScript engines. Your document contents never touch external servers for client-handled operations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-brand-gold" />
            <span>3. Stateless Ephemeral Fallback Handling</span>
          </h2>
          <p className="text-zinc-400">
            In the rare event an optional complex conversion requires server-side rendering fallback, the file is held strictly in ephemeral RAM only for the duration of the stream conversion. Files are never written to permanent disk storage and are instantly wiped.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-brand-gold" />
            <span>4. No Data Selling or AI Model Training</span>
          </h2>
          <p className="text-zinc-400">
            We never sell, rent, monetize, or feed your documents, invoices, or personal photos to third-party artificial intelligence models, advertisers, or analytics brokers. Your documents remain strictly private to you.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-brand-gold" />
            <span>5. Local Storage Usage</span>
          </h2>
          <p className="text-zinc-400">
            We utilize browser <code className="text-brand-gold">localStorage</code> solely to preserve your interface preferences (such as selected role workspace, dark/light theme, and offline Pro license verification). We never store your actual PDF document bytes permanently in browser storage.
          </p>
        </section>

        <div className="pt-6 border-t border-white/10 text-xs text-zinc-500 flex items-center justify-between">
          <span>Last updated: 2026. Designed for global compliance (GDPR, CCPA, and Indian DPDP Act).</span>
          <span className="text-emerald-400 font-semibold">Verified Stateless</span>
        </div>
      </div>
    </div>
  );
};
