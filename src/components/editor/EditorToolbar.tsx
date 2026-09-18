import React, { useRef } from 'react';
import {
  MousePointer,
  Hand,
  Type,
  Pencil,
  Highlighter,
  Underline as UnderlineIcon,
  Strikethrough,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Image as ImageIcon,
  FileSignature,
  Eraser,
} from 'lucide-react';
import { EditorTool } from '../../types';
import { useEditorStore } from '../../stores/useEditorStore';

interface EditorToolbarProps {
  onOpenSignature: () => void;
  onImageSelected: (dataUrl: string) => void;
  isMobile?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onOpenSignature,
  onImageSelected,
  isMobile = false,
}) => {
  const { activeTool, setActiveTool } = useEditorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) onImageSelected(dataUrl);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const tools: { id: EditorTool; label: string; icon: React.ElementType; action?: () => void }[] = [
    { id: 'select', label: 'Select', icon: MousePointer },
    { id: 'hand', label: 'Hand', icon: Hand },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'draw', label: 'Draw', icon: Pencil },
    { id: 'highlight', label: 'Highlight', icon: Highlighter },
    { id: 'underline', label: 'Underline', icon: UnderlineIcon },
    { id: 'strike', label: 'Strike', icon: Strikethrough },
    { id: 'rect', label: 'Rectangle', icon: Square },
    { id: 'circle', label: 'Circle', icon: Circle },
    { id: 'arrow', label: 'Arrow', icon: ArrowRight },
    { id: 'line', label: 'Line', icon: Minus },
    {
      id: 'image',
      label: 'Image',
      icon: ImageIcon,
      action: () => fileInputRef.current?.click(),
    },
    {
      id: 'signature',
      label: 'Signature',
      icon: FileSignature,
      action: onOpenSignature,
    },
    { id: 'eraser', label: 'Eraser', icon: Eraser },
  ];

  const handleToolClick = (toolItem: (typeof tools)[0]) => {
    if (toolItem.action) {
      toolItem.action();
    } else {
      setActiveTool(toolItem.id);
    }
  };

  // Mobile Bottom Floating Toolbar
  if (isMobile) {
    return (
      <div className="w-full bg-[#0C0C12]/95 backdrop-blur-md border-t border-white/10 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-2xl z-30">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id && !t.action;

          return (
            <button
              key={t.id}
              onClick={() => handleToolClick(t)}
              className={`flex flex-col items-center justify-center p-2 min-w-[50px] rounded-xl transition shrink-0 ${
                isActive
                  ? 'bg-brand-gold text-black shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title={t.label}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] mt-0.5 leading-none">{t.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Desktop Left Toolbar
  return (
    <aside className="w-14 bg-[#0C0C12] border-r border-white/10 flex flex-col items-center py-4 gap-1.5 z-20 shrink-0 select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = activeTool === t.id && !t.action;

        return (
          <button
            key={t.id}
            onClick={() => handleToolClick(t)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition relative group ${
              isActive
                ? 'bg-brand-gold text-black shadow-gold-glow'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
            title={t.label}
          >
            <Icon className="w-4 h-4" />
            {/* Tooltip */}
            <div className="absolute left-14 hidden group-hover:block bg-[#1A1A22] text-white text-[11px] font-medium px-2.5 py-1 rounded-md border border-white/10 shadow-lg whitespace-nowrap z-50 pointer-events-none">
              {t.label}
            </div>
          </button>
        );
      })}
    </aside>
  );
};
