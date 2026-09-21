import React from 'react';
import { RefreshCcw, ShieldCheck, CheckCircle2, Clock, Mail, MessageSquare, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RefundPolicyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-zinc-300">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <RefreshCcw className="w-7 h-7" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
          Refund <span className="text-brand-gold">Policy</span>
        </h1>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          Clear, transparent, and user-first refund policy for UIKEY Pro lifetime licenses.
        </p>
      </div>

      {/* Main Content Card */}
      <div className="bg-[#121218] border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8 text-sm leading-relaxed">
        {/* Highlight Guarantee Box */}
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-bold text-white mb-1">
              14-Day Money-Back Guarantee
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              We stand 100% behind the quality and reliability of our PDF suite. If UIKEY Pro does not meet your expectations or does not perform as advertised, you are entitled to a full refund within 14 days of your license purchase.
            </p>
          </div>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-gold" />
            <span>1. Eligibility Window</span>
          </h2>
          <p className="text-zinc-400">
            Refund requests must be submitted within 14 calendar days from the date and timestamp of your license purchase or UPI transaction. Any request initiated within this window will be honored promptly without bureaucratic delays.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-brand-gold" />
            <span>2. Valid Reasons for Refund</span>
          </h2>
          <ul className="space-y-2 text-zinc-400 pl-2">
            <li className="flex items-start gap-2">
              <span className="text-brand-gold">•</span>
              <span>Technical incompatibility with your browser or operating system that our engineering team cannot resolve.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold">•</span>
              <span>Accidental duplicate payment or multiple charges for the same Pro lifetime license.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold">•</span>
              <span>General dissatisfaction with tool performance or feature capabilities within the 14-day evaluation period.</span>
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-brand-gold" />
            <span>3. How to Request a Refund</span>
          </h2>
          <p className="text-zinc-400">
            To initiate a refund, simply reach out to our dedicated support team with your payment details:
          </p>
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2 font-mono text-xs">
            <p className="text-zinc-300">
              <strong>Email:</strong> support@uikey.ai
            </p>
            <p className="text-zinc-300">
              <strong>Subject:</strong> Refund Request - [Your UPI UTR or Lemon Squeezy Order ID]
            </p>
            <p className="text-zinc-300">
              <strong>Information:</strong> Date of purchase and preferred refund channel (UPI or original payment method).
            </p>
          </div>
          <p className="text-zinc-400">
            Alternatively, you can message us directly via our <Link to="/contact" className="text-brand-gold underline hover:text-amber-300">WhatsApp Support Desk</Link> for instant confirmation within 2-4 business hours.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-brand-gold" />
            <span>4. Processing Timeline</span>
          </h2>
          <p className="text-zinc-400">
            UPI refunds in India are processed immediately and typically reflect in your bank account within 24 hours. International card and PayPal refunds processed via Lemon Squeezy usually take 3 to 7 business days depending on your issuing bank.
          </p>
        </section>

        <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-zinc-500">
          <span>© 2026 UIKEY AI. All rights reserved.</span>
          <Link to="/contact" className="text-brand-gold hover:underline">
            Contact Support &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
