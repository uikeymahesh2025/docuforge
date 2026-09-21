import React, { useState } from 'react';
import { Mail, MessageCircle, Send, CheckCircle2, Phone, Sparkles, MapPin, Clock } from 'lucide-react';
import { useToastStore } from '../stores/useToastStore';

export const ContactPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      addToast({
        type: 'error',
        title: 'Missing Fields',
        message: 'Please fill in your name, email, and message.',
      });
      return;
    }

    // Client-side simulated dispatch
    setIsSent(true);
    addToast({
      type: 'success',
      title: 'Message Sent!',
      message: 'Thank you! Our support team will get back to you within 24 hours.',
    });
  };

  const whatsappNumber = '919876543210'; // Replaceable placeholder or direct link
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    'Hi UIKEY AI Team, I need assistance with the PDF Suite or Pro License.'
  )}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-16 text-zinc-300">
      {/* Page Header */}
      <div className="text-center mb-12">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <Mail className="w-7 h-7" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
          Contact &amp; <span className="text-brand-gold">Support</span>
        </h1>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          Need help with a tool, licensing, or custom features? We are here to help you get the most out of UIKEY AI.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Contact Cards & WhatsApp Support */}
        <div className="lg:col-span-5 space-y-4">
          {/* WhatsApp Instant Support Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 to-[#121218] border border-emerald-500/30 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">WhatsApp Support</h3>
                <p className="text-xs text-emerald-400 font-medium">Fastest Response (2-4 hrs)</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Connect directly with our engineering and support leads for instant assistance with Pro license activation, UPI payments, or technical inquiries.
            </p>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>

          {/* Email Support Info */}
          <div className="p-6 rounded-3xl bg-[#121218] border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Direct Channels
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-400 block">General &amp; Licensing Support</span>
                  <a href="mailto:support@uikey.ai" className="text-white hover:text-brand-gold transition font-mono">
                    support@uikey.ai
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-400 block">Operating Hours</span>
                  <span className="text-white">Monday – Saturday: 9:00 AM – 8:00 PM IST</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-400 block">Headquarters</span>
                  <span className="text-white">Madhya Pradesh, India</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Email Support Form */}
        <div className="lg:col-span-7">
          <div className="p-8 rounded-3xl bg-[#121218] border border-white/10 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Send Us a Message</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Fill out this form and our technical support team will respond promptly.
            </p>

            {isSent ? (
              <div className="p-8 text-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 animate-fadeIn">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Message Received!</h4>
                <p className="text-xs text-zinc-300 max-w-sm mx-auto">
                  Thank you for reaching out. We have logged your request and our team will get back to you at{' '}
                  <span className="text-brand-gold font-mono">{email}</span> shortly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsSent(false);
                    setMessage('');
                    setSubject('');
                  }}
                  className="mt-4 text-xs text-zinc-400 hover:text-white underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Your Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-gold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Subject / Tool Name
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Inquiry regarding Pro License or PDF Editor"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-gold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Message Details <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe how we can help you..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-gold resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-bold text-xs shadow-gold-glow flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Support Message</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
