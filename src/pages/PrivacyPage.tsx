import React from 'react';
import { ShieldCheck, Lock, Trash2, Cpu, Eye, FileCheck } from 'lucide-react';

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

      {/* Main Content Card */}
      <div className="bg-[#121218] border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-gold" />
            <span>1. Zero Login &amp; Zero Account System</span>
          </h2>
          <p className="text-zinc-400">
            UIKEY AI does not require user registration, email addresses, phone numbers, or passwords. There is no account database, no user profile tracking, and no cookie fingerprinting. You can open any tool and process files anonymously.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-gold" />
            <span>2. Browser-First Client Processing</span>
          </h2>
          <p className="text-zinc-400">
            The vast majority of document operations—including PDF editing, signing, annotations, page rearranging, merging, splitting, watermarking, and compression—execute entirely inside your local web browser using client-side WebAssembly and modern JavaScript engines. Your document contents never touch external servers for client-handled operations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-brand-gold" />
            <span>3. Stateless Temporary Server Processing</span>
          </h2>
          <p className="text-zinc-400">
            When an optional fallback operation requires specialized backend processing on our Render service, the file is handled statelessly in ephemeral memory. Uploaded files are immediately deleted upon stream delivery or cleared after a strict temporary timeout. We never store, index, or retain document contents.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-brand-gold" />
            <span>4. No Data Selling or AI Model Training</span>
          </h2>
          <p className="text-zinc-400">
            We never sell, rent, monetize, or feed your documents to third-party artificial intelligence models or advertisers. Your documents remain strictly private to you.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-brand-gold" />
            <span>5. Local Storage Usage</span>
          </h2>
          <p className="text-zinc-400">
            We utilize browser <code className="text-brand-gold">localStorage</code> solely to save your interface preferences, such as Dark Mode / Light Mode and tool presets. We never store your actual PDF document bytes permanently in browser storage.
          </p>
        </section>

        <div className="pt-6 border-t border-white/10 text-xs text-zinc-500">
          Last updated: 2026. For questions regarding our privacy architecture, contact UIKEY AI team.
        </div>
      </div>
    </div>
  );
};
