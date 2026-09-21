import React from 'react';
import { FileText, CheckCircle2, ShieldAlert, Building2, UserCheck, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-zinc-300">
      <div className="text-center mb-12">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <FileText className="w-7 h-7" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
          Terms of <span className="text-brand-gold">Service</span>
        </h1>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          Terms governing fair personal, educational, and commercial utility usage of UIKEY AI.
        </p>
      </div>

      <div className="bg-[#121218] border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-brand-gold" />
            <span>1. Acceptance of Terms</span>
          </h2>
          <p className="text-zinc-400">
            By accessing or using the UIKEY AI web application and PDF tool suite, you agree to comply with and be bound by these Terms of Service. If you do not agree with any part of these terms, please discontinue use immediately.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-brand-gold" />
            <span>2. Commercial &amp; Personal Utility Use</span>
          </h2>
          <p className="text-zinc-400">
            UIKEY AI grants you a non-exclusive, worldwide, royalty-free license to use all tools for both <strong>personal and commercial purposes</strong>. This includes:
          </p>
          <ul className="space-y-1.5 text-zinc-400 pl-4 list-disc">
            <li>Students and educators editing assignments, research papers, and exam booklets.</li>
            <li>Commercial cyber cafe operators and print shops creating ID card layouts and customer forms.</li>
            <li>Law firms, advocates, and notary desks stamping Bates numbers and organizing court bundles.</li>
            <li>Photographers, wedding studios, and creators delivering client photo proofing and quotations.</li>
            <li>Corporations and small businesses processing receipts, ledgers, contracts, and invoices.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-gold" />
            <span>3. Document Ownership &amp; Confidentiality</span>
          </h2>
          <p className="text-zinc-400">
            You retain 100% of all intellectual property, copyright, and ownership rights in and to all documents and images processed through UIKEY AI. Because processing occurs client-side in your local browser, UIKEY AI never acquires any license, access, or custody over your document contents.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-brand-gold" />
            <span>4. Acceptable Fair Use</span>
          </h2>
          <p className="text-zinc-400">
            You agree not to use the utilities to forge official government seals without authority, alter identity documents fraudulently, generate deceptive documents, distribute malware, or infringe on any party's intellectual property.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-brand-gold" />
            <span>5. Pro Upgrades &amp; Licensing</span>
          </h2>
          <p className="text-zinc-400">
            Pro upgrades provide lifetime access to enhanced utility limits and priority processing. All Pro licenses are governed by our <Link to="/refund-policy" className="text-brand-gold underline hover:text-amber-300">14-Day Money-Back Refund Policy</Link>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">6. Limitation of Liability</h2>
          <p className="text-zinc-400">
            The software is provided "as is", without warranty of any kind. In no event shall UIKEY AI or its authors be liable for any direct, indirect, incidental, or consequential damages arising out of the use or inability to use the tools.
          </p>
        </section>

        <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-zinc-500">
          <span>© 2026 UIKEY AI. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="text-zinc-400 hover:text-brand-gold">Privacy Policy</Link>
            <Link to="/refund-policy" className="text-zinc-400 hover:text-brand-gold">Refund Policy</Link>
            <Link to="/contact" className="text-zinc-400 hover:text-brand-gold">Support</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
