import React from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';

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
          Terms governing the use of PDF EDITOR BY UIKEY AI utilities.
        </p>
      </div>

      <div className="bg-[#121218] border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-6 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">1. Acceptance of Terms</h2>
          <p className="text-zinc-400">
            By accessing or using the PDF EDITOR BY UIKEY AI web application, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our utilities.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">2. Document Ownership &amp; Privacy</h2>
          <p className="text-zinc-400">
            You retain 100% of all rights, ownership, and copyright in and to all documents uploaded or processed through the application. UIKEY AI does not claim any intellectual property rights over your documents.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">3. Acceptable Use</h2>
          <p className="text-zinc-400">
            You agree not to use the service for any illegal activities, including but not limited to the distribution of malicious software, unauthorized document forgery, copyright infringement, or violation of third-party privacy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">4. Disclaimer of Warranty</h2>
          <p className="text-zinc-400">
            The service is provided on an "as is" and "as available" basis without warranties of any kind. While we design our PDF engine to be highly robust and reliable, UIKEY AI is not liable for data loss or formatting discrepancies resulting from corrupted or malformed source files.
          </p>
        </section>

        <div className="pt-4 border-t border-white/10 text-xs text-zinc-500">
          © 2026 UIKEY AI. All rights reserved.
        </div>
      </div>
    </div>
  );
};
