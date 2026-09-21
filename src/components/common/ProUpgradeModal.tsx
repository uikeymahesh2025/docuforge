import React, { useState } from 'react';
import {
  X,
  Crown,
  Sparkles,
  CheckCircle2,
  QrCode,
  CreditCard,
  KeyRound,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useProStore } from '../../stores/useProStore';
import { useToastStore } from '../../stores/useToastStore';

export const ProUpgradeModal: React.FC = () => {
  const { isPro, isUpgradeModalOpen, closeUpgradeModal, validateAndActivateLicense, activateViaUtr } =
    useProStore();
  const addToast = useToastStore((state) => state.addToast);

  const [paymentTab, setPaymentTab] = useState<'upi' | 'card'>('upi');
  const [utrInput, setUtrInput] = useState<string>('');
  const [licenseKeyInput, setLicenseKeyInput] = useState<string>('');
  const [copiedVpa, setCopiedVpa] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  if (!isUpgradeModalOpen) return null;

  const upiId = 'uikeymahesh@upi';
  const upiPayUrl = `upi://pay?pa=${upiId}&pn=UIKEY%20AI%20Pro&am=299&cu=INR&tn=DocuForge%20Pro%20Lifetime`;
  // Generate QR code via quickchart / reliable public image URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    upiPayUrl
  )}&bgcolor=FFFFFF&color=000000&margin=1`;

  const handleCopyVpa = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedVpa(true);
    addToast({
      type: 'success',
      title: 'UPI ID Copied',
      message: `${upiId} copied to clipboard.`,
    });
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const handleUtrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrInput.trim()) {
      addToast({
        type: 'error',
        title: 'UTR Required',
        message: 'Please enter your 12-digit UPI transaction reference number.',
      });
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      const result = activateViaUtr(utrInput);
      setIsVerifying(false);
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Pro Activated! 🎉',
          message: result.message,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Verification Error',
          message: result.message,
        });
      }
    }, 600);
  };

  const handleLicenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) {
      addToast({
        type: 'error',
        title: 'Key Required',
        message: 'Please enter your license key.',
      });
      return;
    }

    const result = validateAndActivateLicense(licenseKeyInput);
    if (result.success) {
      addToast({
        type: 'success',
        title: 'License Activated! 👑',
        message: result.message,
      });
    } else {
      addToast({
        type: 'error',
        title: 'Invalid Key',
        message: result.message,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0F0F14] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Glow bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-300" />

        {/* Modal Header */}
        <div className="p-6 pb-4 flex items-start justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  UIKEY <span className="text-brand-gold">Pro Lifetime</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                  One-Time Pass
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Zero recurring subscriptions. Unlimited high-volume utility access.
              </p>
            </div>
          </div>

          <button
            onClick={closeUpgradeModal}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-zinc-300">
          {/* Pro Benefits Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-4 rounded-2xl bg-black/40 border border-white/5">
            <div className="flex items-center gap-2 text-zinc-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Unlimited High-Volume Batch Merge &amp; OCR</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>High-Resolution Microsoft Word (.DOCX) Export</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Print Shop N-Up Grid Imposition with Cut-Marks</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Perspective Camera Photo Rectifier &amp; Flattener</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Priority Local Browser Acceleration</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>100% Private • No Cloud Server Uploads</span>
            </div>
          </div>

          {/* Payment Selection Tabs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Select Payment Method
              </span>
              <span className="text-xs text-brand-gold font-semibold">
                {paymentTab === 'upi' ? 'Special India Price: ₹299' : 'Global Price: $9.99 USD'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setPaymentTab('upi')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs border transition-all ${
                  paymentTab === 'upi'
                    ? 'bg-amber-500/15 border-brand-gold text-brand-gold shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>India (UPI / GPay / PhonePe)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentTab('card')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs border transition-all ${
                  paymentTab === 'card'
                    ? 'bg-amber-500/15 border-brand-gold text-brand-gold shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>International (Card / USD)</span>
              </button>
            </div>

            {/* India UPI Tab */}
            {paymentTab === 'upi' && (
              <div className="p-4 rounded-2xl bg-[#14141C] border border-white/5 space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* QR Image Box */}
                  <div className="bg-white p-2.5 rounded-2xl shadow-lg shrink-0">
                    <img
                      src={qrCodeUrl}
                      alt="UPI Payment QR Code"
                      className="w-36 h-36 object-contain"
                    />
                  </div>

                  {/* Instructions */}
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-sm font-bold text-white">Scan with Any UPI App</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        ₹299 One-Time
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Scan using Google Pay, PhonePe, Paytm, BHIM, or any banking app to complete your lifetime upgrade.
                    </p>

                    {/* VPA Copy Pill */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-zinc-800 text-zinc-300 font-mono text-xs">
                      <span>UPI ID: <strong className="text-brand-gold">{upiId}</strong></span>
                      <button
                        type="button"
                        onClick={handleCopyVpa}
                        className="hover:text-white transition"
                        title="Copy UPI ID"
                      >
                        {copiedVpa ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* UTR Submission Form */}
                <form onSubmit={handleUtrSubmit} className="pt-3 border-t border-white/5 space-y-2">
                  <label className="text-[11px] font-semibold text-zinc-300 block">
                    Submit 12-Digit Transaction UTR / Ref Number:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value)}
                      placeholder="e.g. 324512984123"
                      className="flex-1 bg-black/60 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-gold font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="px-4 py-2 rounded-xl bg-brand-gold text-black font-bold text-xs hover:brightness-110 shadow-gold-glow transition disabled:opacity-50"
                    >
                      {isVerifying ? 'Verifying...' : 'Submit & Unlock Pro'}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Instant activation. Your UTR is verified locally and permanently stores your Pro status.
                  </p>
                </form>
              </div>
            )}

            {/* International Card Tab */}
            {paymentTab === 'card' && (
              <div className="p-5 rounded-2xl bg-[#14141C] border border-white/5 space-y-4 text-center">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">Global Checkout ($9.99 USD)</h4>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    Pay securely with any credit/debit card, Apple Pay, Google Pay, or PayPal via Lemon Squeezy merchant services.
                  </p>
                </div>

                <div className="py-2 flex items-center justify-center gap-3 text-zinc-400 text-xs">
                  <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-white/5">Visa</span>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-white/5">Mastercard</span>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-white/5">Amex</span>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-white/5">Apple Pay</span>
                </div>

                <a
                  href="https://lemonsqueezy.com/checkout/buy/docuforge-pro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full max-w-sm py-3 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all"
                >
                  <span>Pay $9.99 with Card / Global Checkout</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <p className="text-[10px] text-zinc-500">
                  After checkout, you will receive an instant license key to enter below.
                </p>
              </div>
            )}
          </div>

          {/* Already have a License Key Section */}
          <div className="pt-4 border-t border-white/10 space-y-2.5">
            <div className="flex items-center gap-2 text-zinc-300 font-semibold text-xs">
              <KeyRound className="w-4 h-4 text-brand-gold" />
              <span>Already Have a License Key?</span>
            </div>

            <form onSubmit={handleLicenseSubmit} className="flex gap-2">
              <input
                type="text"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                placeholder="Enter license key (e.g. UIKEY-PRO-2026)"
                className="flex-1 bg-black/60 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-gold font-mono uppercase tracking-wider"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-bold text-xs transition"
              >
                Activate Key
              </button>
            </form>
            <p className="text-[10px] text-zinc-500">
              Demo key: <span className="font-mono text-brand-gold">UIKEY-PRO-2026</span> for instant full activation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
