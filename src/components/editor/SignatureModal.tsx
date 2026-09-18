import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Trash2, Type, PenTool, Image as ImageIcon } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSignature: (dataUrl: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onSaveSignature,
}) => {
  const [tab, setTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState<'Caveat' | 'cursive' | 'Brush Script MT'>('Caveat');
  const [inkColor, setInkColor] = useState('#000000');

  // Drawing canvas state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (isOpen && tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [isOpen, tab, inkColor]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      onSaveSignature(dataUrl);
    } else if (tab === 'type') {
      if (!typedName.trim()) return;
      // Render text into high-res canvas
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = inkColor;
      ctx.font = `64px "${selectedFont}", cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, 300, 100);

      onSaveSignature(canvas.toDataURL('image/png'));
    }
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onSaveSignature(dataUrl);
        onClose();
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#121218] border border-white/10 rounded-3xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <PenTool className="w-4 h-4 text-brand-gold" />
            <span>Create Signature</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/5 mb-5">
          <button
            onClick={() => setTab('draw')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition ${
              tab === 'draw' ? 'bg-brand-gold text-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" /> Draw
          </button>
          <button
            onClick={() => setTab('type')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition ${
              tab === 'type' ? 'bg-brand-gold text-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" /> Type
          </button>
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition ${
              tab === 'upload' ? 'bg-brand-gold text-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Upload
          </button>
        </div>

        {/* Ink Color Selector */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-xs text-zinc-400">Ink Color</span>
          <div className="flex gap-2">
            {['#000000', '#1E3A8A', '#D4AF37', '#991B1B'].map((color) => (
              <button
                key={color}
                onClick={() => setInkColor(color)}
                style={{ backgroundColor: color }}
                className={`w-6 h-6 rounded-full border-2 transition ${
                  inkColor === color ? 'border-white scale-110' : 'border-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Tab 1: Draw Signature */}
        {tab === 'draw' && (
          <div>
            <div className="relative border border-dashed border-white/20 rounded-2xl bg-white overflow-hidden touch-none">
              <canvas
                ref={canvasRef}
                width={480}
                height={200}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-48 cursor-crosshair"
              />
              <div className="absolute bottom-4 left-6 right-6 border-b border-dashed border-zinc-400 pointer-events-none opacity-40"></div>
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-400 text-xs">
                  Sign here with mouse or finger
                </div>
              )}
            </div>
            <div className="flex justify-between items-center mt-3">
              <button
                onClick={clearCanvas}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-rose-400 transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
              <span className="text-[11px] text-zinc-500">Draw above the dotted baseline</span>
            </div>
          </div>
        )}

        {/* Tab 2: Type Signature */}
        {tab === 'type' && (
          <div className="space-y-4">
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Type your name or initials..."
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-brand-gold"
            />

            <div className="border border-white/10 rounded-2xl p-6 bg-white flex items-center justify-center min-h-[140px] text-center">
              <span
                style={{
                  fontFamily: selectedFont,
                  color: inkColor,
                  fontSize: '40px',
                }}
              >
                {typedName || 'Your Signature'}
              </span>
            </div>

            <div className="flex gap-2">
              {(['Caveat', 'Brush Script MT', 'cursive'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFont(f)}
                  className={`flex-1 py-2 rounded-lg text-xs border transition ${
                    selectedFont === f
                      ? 'border-brand-gold text-brand-gold bg-amber-500/10'
                      : 'border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  Style {f === 'Caveat' ? '1' : f === 'Brush Script MT' ? '2' : '3'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Upload Signature */}
        {tab === 'upload' && (
          <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center bg-zinc-900/50">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageUpload}
              className="hidden"
              id="sig-file"
            />
            <label
              htmlFor="sig-file"
              className="cursor-pointer flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-brand-gold">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-white">Click to upload signature image</p>
              <p className="text-[11px] text-zinc-500">PNG with transparent background recommended</p>
            </label>
          </div>
        )}

        {/* Disclaimer per requirement */}
        <p className="text-[10px] text-zinc-500 mt-5 leading-tight text-center">
          Note: Signatures created here are standard visual overlays for documents and do not claim cryptographic legal certification.
        </p>

        {/* Bottom Actions */}
        {tab !== 'upload' && (
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-gold text-black text-xs font-semibold hover:brightness-110 shadow-gold-glow transition active:scale-95"
            >
              <Check className="w-4 h-4" /> Place Signature
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
