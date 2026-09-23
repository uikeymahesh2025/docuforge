import React from 'react';
import { Loader2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  statusText?: string;
  progress?: number; // 0 to 100
  onCancel?: () => void;
}

export const ProcessingModal: React.FC<Props> = ({
  isOpen,
  statusText = 'Processing document...',
  progress,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
    >
      <div className="w-full max-w-sm bg-[#121218] border border-white/10 rounded-3xl p-8 text-center shadow-2xl relative">
        <div className="w-16 h-16 mx-auto mb-5 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-brand-gold/20 animate-ping"></div>
          <Loader2 className="w-10 h-10 text-brand-gold animate-spin" />
        </div>

        <h3 className="text-base font-bold text-white mb-2">{statusText}</h3>
        <p className="text-xs text-zinc-400 mb-5">Processed privately in your browser</p>

        {progress !== undefined ? (
          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden mb-4">
            <div
              className="bg-brand-gold h-full transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            ></div>
          </div>
        ) : (
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden relative mb-4">
            <div className="bg-brand-gold h-full w-1/3 rounded-full absolute animate-[translateX_1.5s_infinite_linear]"></div>
          </div>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs border border-white/10 transition mt-2"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        )}
      </div>
    </div>
  );
};
