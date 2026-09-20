import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, Lock, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#070709] border-t border-white/10 text-zinc-400 text-xs">
      {/* Value Badges Banner */}
      <div className="border-b border-white/5 bg-[#0A0A0E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-brand-gold shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-zinc-200">100% Private & Stateless</p>
              <p className="text-zinc-500 text-[11px]">Your documents never leave your browser for local tools.</p>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-brand-gold shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-zinc-200">Instant Processing</p>
              <p className="text-zinc-500 text-[11px]">No queues, no registration, no subscription walls.</p>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-brand-gold shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-zinc-200">Zero Account System</p>
              <p className="text-zinc-500 text-[11px]">No emails, no passwords, no personal data stored.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8">
        {/* Brand Column */}
        <div className="col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-gold flex items-center justify-center text-black font-black text-xs">
              UI
            </div>
            <span className="text-base font-bold text-white tracking-tight">
              UIKEY <span className="text-brand-gold">AI</span>
            </span>
          </div>
          <p className="text-zinc-400 text-xs leading-relaxed max-w-sm">
            Powerful PDF tools. Simple workflow. Edit, convert, organize, compress, and sign PDF files directly inside your browser without creating an account.
          </p>
          <div className="pt-2 flex items-center gap-2 text-zinc-500 text-[11px]">
            <span>Crafted for speed & privacy</span>
          </div>
        </div>

        {/* Popular Tools */}
        <div className="space-y-2">
          <p className="font-semibold text-zinc-200 text-xs uppercase tracking-wider">Top Tools</p>
          <ul className="space-y-1.5 text-zinc-400">
            <li><Link to="/pdf-editor" className="hover:text-brand-gold transition">PDF Editor</Link></li>
            <li><Link to="/photo-proofing" className="hover:text-brand-gold transition">Photo Proofing</Link></li>
            <li><Link to="/merge-pdf" className="hover:text-brand-gold transition">Merge PDF</Link></li>
            <li><Link to="/split-pdf" className="hover:text-brand-gold transition">Split PDF</Link></li>
            <li><Link to="/compress-pdf" className="hover:text-brand-gold transition">Compress PDF</Link></li>
            <li><Link to="/add-watermark" className="hover:text-brand-gold transition">Watermark PDF</Link></li>
          </ul>
        </div>

        {/* Conversions */}
        <div className="space-y-2">
          <p className="font-semibold text-zinc-200 text-xs uppercase tracking-wider">Convert</p>
          <ul className="space-y-1.5 text-zinc-400">
            <li><Link to="/scan-to-pdf" className="hover:text-brand-gold transition">Camera Scanner</Link></li>
            <li><Link to="/pdf-to-images" className="hover:text-brand-gold transition">PDF to Images</Link></li>
            <li><Link to="/image-to-pdf" className="hover:text-brand-gold transition">Image to PDF</Link></li>
            <li><Link to="/pdf-to-word" className="hover:text-brand-gold transition">PDF to Word</Link></li>
            <li><Link to="/word-to-pdf" className="hover:text-brand-gold transition">Word to PDF</Link></li>
            <li><Link to="/pdf-to-text" className="hover:text-brand-gold transition">PDF to Text</Link></li>
          </ul>
        </div>

        {/* Company & Legal */}
        <div className="space-y-2">
          <p className="font-semibold text-zinc-200 text-xs uppercase tracking-wider">Product</p>
          <ul className="space-y-1.5 text-zinc-400">
            <li><Link to="/about" className="hover:text-brand-gold transition">About UIKEY AI</Link></li>
            <li><Link to="/privacy" className="hover:text-brand-gold transition">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-brand-gold transition">Terms of Service</Link></li>
            <li><Link to="/metadata" className="hover:text-brand-gold transition">PDF Metadata</Link></li>
            <li><Link to="/organize-pdf" className="hover:text-brand-gold transition">Organize PDF</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Copyright */}
      <div className="border-t border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-[11px] text-zinc-500">
          <p>© 2026 UIKEY AI. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with modern web standards • Zero trackers • Zero databases
          </p>
        </div>
      </div>
    </footer>
  );
};
