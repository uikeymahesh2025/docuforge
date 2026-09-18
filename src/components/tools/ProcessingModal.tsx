import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  statusText?: string;
  progress?: number; // 0 to 100
}

export const ProcessingModal: React.FC<Props> = ({
  isOpen,
  statusText = 'Processing document...',
  progress,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-[#121218] border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-5 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-brand-gold/20 animate-ping"></div>
          <Loader2 className="w-10 h-10 text-brand-gold animate-spin" />
        </div>

        <h3 className="text-base font-bold text-white mb-2">{statusText}</h3>
        <p className="text-xs text-zinc-400 mb-5">Please keep this browser tab open</p>

        {progress !== undefined ? (
          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-brand-gold h-full transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            ></div>
          </div>
        ) : (
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden relative">
            <div className="bg-brand-gold h-full w-1/3 rounded-full absolute animate-[translateX_1.5s_infinite_linear]"></div>
          </div>
        )}
      </div>
    </div>
  );
};
