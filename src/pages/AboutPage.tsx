import React from 'react';
import { Sparkles, Shield, Zap, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-zinc-300">
      <div className="text-center mb-12">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <Sparkles className="w-7 h-7" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
          About <span className="text-brand-gold">UIKEY AI</span>
        </h1>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          "Powerful PDF Tools. Simple. Fast. Private."
        </p>
      </div>

      <div className="bg-[#121218] border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Our Mission</h2>
          <p className="text-zinc-400">
            PDF documents run the modern world—from financial statements and legal agreements to medical reports and educational textbooks. Yet most traditional PDF websites force users into monthly paywalls, require invasive account registrations, or upload private files to mystery servers.
          </p>
          <p className="text-zinc-400">
            <strong>PDF EDITOR BY UIKEY AI</strong> was created with a straightforward philosophy: professional, fast, and private PDF tools that just work right in your browser, without an account, and without subscriptions.
          </p>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
          <div className="p-5 rounded-2xl bg-zinc-900 border border-white/5 space-y-2">
            <Zap className="w-6 h-6 text-brand-gold" />
            <h3 className="font-bold text-white text-base">Instant Performance</h3>
            <p className="text-xs text-zinc-400">No queues or waiting lines. Processing starts immediately on your machine.</p>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900 border border-white/5 space-y-2">
            <Shield className="w-6 h-6 text-brand-gold" />
            <h3 className="font-bold text-white text-base">True Privacy</h3>
            <p className="text-xs text-zinc-400">Zero databases for user accounts. No document retention or tracking.</p>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900 border border-white/5 space-y-2">
            <Globe className="w-6 h-6 text-brand-gold" />
            <h3 className="font-bold text-white text-base">Open Web Standard</h3>
            <p className="text-xs text-zinc-400">Built using modern WebAssembly, Canvas, and HTML5 technologies.</p>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 text-center">
          <Link
            to="/pdf-editor"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-gold text-black font-semibold text-xs hover:brightness-110 shadow-gold-glow transition"
          >
            Start Using PDF Editor
          </Link>
        </div>
      </div>
    </div>
  );
};
