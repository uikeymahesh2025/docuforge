import React, { useEffect, useRef } from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcutGroups = [
    {
      group: 'Document & History',
      items: [
        { label: 'Undo change', keys: ['Ctrl', 'Z'] },
        { label: 'Redo change', keys: ['Ctrl', 'Shift', 'Z'] },
        { label: 'Save & Download', keys: ['Ctrl', 'S'] },
        { label: 'Search in PDF', keys: ['Ctrl', 'F'] },
        { label: 'Close panel or modal', keys: ['Esc'] },
      ],
    },
    {
      group: 'Zoom & Viewport',
      items: [
        { label: 'Zoom In', keys: ['+'] },
        { label: 'Zoom Out', keys: ['-'] },
        { label: 'Reset Zoom (100%)', keys: ['Ctrl', '0'] },
        { label: 'Delete selected object', keys: ['Del', 'Backspace'] },
      ],
    },
    {
      group: 'Tool Shortcuts',
      items: [
        { label: 'Select / Pointer Tool', keys: ['V'] },
        { label: 'Add Text', keys: ['T'] },
        { label: 'Draw with Pen', keys: ['D'] },
        { label: 'Highlighter', keys: ['H'] },
        { label: 'Signature', keys: ['S'] },
      ],
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#121218] border border-brand-gold/30 rounded-3xl p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="shortcuts-title" className="text-base font-bold text-white">
                Keyboard Shortcuts &amp; Help
              </h2>
              <p className="text-[11px] text-zinc-400">
                Speed up your PDF editing workflow
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
            aria-label="Close shortcuts dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {shortcutGroups.map((grp) => (
            <div key={grp.group}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-gold mb-2.5">
                {grp.group}
              </h3>
              <div className="space-y-2">
                {grp.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-zinc-900/60 border border-white/5 text-xs"
                  >
                    <span className="text-zinc-300">{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-0.5 rounded-md bg-zinc-800 border border-white/10 text-white font-mono text-[10px] font-semibold shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
