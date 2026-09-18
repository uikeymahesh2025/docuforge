import React from 'react';
import {
  Trash2,
  Bold,
  Italic,
  Underline,
  Palette,
  Sliders,
  Type,
  X,
} from 'lucide-react';
import { useEditorStore } from '../../stores/useEditorStore';

interface PropertiesPanelProps {
  onClose?: () => void;
  isMobile?: boolean;
}

const COLOR_PRESETS = [
  '#000000',
  '#FFFFFF',
  '#D4AF37', // UIKEY AI Gold
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#FEE2E2', // Light Pink
  '#FEF3C7', // Light Yellow
];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ onClose, isMobile = false }) => {
  const {
    activeTool,
    selectedAnnotationId,
    annotations,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    fontSize,
    setFontSize,
    textColor,
    setTextColor,
    opacity,
    setOpacity,
    updateAnnotation,
    deleteAnnotation,
  } = useEditorStore();

  const selectedAnnotation = annotations.find((a) => a.id === selectedAnnotationId);

  const handleDelete = () => {
    if (selectedAnnotationId) {
      deleteAnnotation(selectedAnnotationId);
    }
  };

  const content = (
    <div className="space-y-5 text-zinc-300 text-xs">
      {/* Active context */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-brand-gold" />
          <span>{selectedAnnotation ? 'Object Properties' : 'Tool Settings'}</span>
        </span>
        {isMobile && onClose && (
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Text formatting (if text tool or text selected) */}
      {(activeTool === 'text' || selectedAnnotation?.type === 'text') && (
        <div className="space-y-3">
          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Text Style
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="10"
              max="72"
              value={
                selectedAnnotation && 'fontSize' in selectedAnnotation
                  ? (selectedAnnotation as any).fontSize
                  : fontSize
              }
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (selectedAnnotation) {
                  updateAnnotation(selectedAnnotation.id, { fontSize: val } as any);
                } else {
                  setFontSize(val);
                }
              }}
              className="w-16 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-center text-white"
            />
            <span className="text-zinc-500">px</span>
          </div>
        </div>
      )}

      {/* Colors */}
      <div className="space-y-2.5">
        <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
          <span>Color</span>
          <span className="text-[10px] text-zinc-500 font-mono">
            {selectedAnnotation?.color || (activeTool === 'text' ? textColor : strokeColor)}
          </span>
        </label>
        <div className="grid grid-cols-5 gap-2">
          {COLOR_PRESETS.map((col) => (
            <button
              key={col}
              onClick={() => {
                if (selectedAnnotation) {
                  updateAnnotation(selectedAnnotation.id, { color: col });
                } else if (activeTool === 'text') {
                  setTextColor(col);
                } else {
                  setStrokeColor(col);
                }
              }}
              style={{ backgroundColor: col }}
              className={`w-7 h-7 rounded-lg border-2 transition ${
                (selectedAnnotation?.color || (activeTool === 'text' ? textColor : strokeColor)) === col
                  ? 'border-brand-gold scale-110 shadow-md'
                  : 'border-white/10 hover:border-white/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Stroke width (for drawing and shapes) */}
      {(activeTool === 'draw' ||
        activeTool === 'highlight' ||
        activeTool === 'rect' ||
        activeTool === 'circle' ||
        activeTool === 'arrow' ||
        activeTool === 'line') && (
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span>Stroke Size</span>
            <span className="text-zinc-300 font-mono">{strokeWidth}px</span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value, 10))}
            className="w-full accent-amber-400 cursor-pointer"
          />
        </div>
      )}

      {/* Opacity slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          <span>Opacity</span>
          <span className="text-zinc-300 font-mono">
            {Math.round(
              (selectedAnnotation ? selectedAnnotation.opacity : opacity) * 100
            )}
            %
          </span>
        </div>
        <input
          type="range"
          min="10"
          max="100"
          value={Math.round(
            (selectedAnnotation ? selectedAnnotation.opacity : opacity) * 100
          )}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10) / 100;
            if (selectedAnnotation) {
              updateAnnotation(selectedAnnotation.id, { opacity: val });
            } else {
              setOpacity(val);
            }
          }}
          className="w-full accent-amber-400 cursor-pointer"
        />
      </div>

      {/* Delete selected object */}
      {selectedAnnotation && (
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Selected Object
          </button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-x-0 bottom-16 bg-[#121218] border-t border-white/10 p-5 rounded-t-3xl shadow-2xl z-40 animate-fadeIn">
        {content}
      </div>
    );
  }

  return (
    <aside className="w-60 bg-[#0C0C12] border-l border-white/10 p-5 hidden xl:block shrink-0 select-none overflow-y-auto">
      {content}
    </aside>
  );
};
