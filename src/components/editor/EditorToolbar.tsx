import React, { useRef } from 'react';
import {
  MousePointer,
  Hand,
  FileEdit,
  ImagePlus,
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

  const tools: { id: EditorTool; label: string; icon: React.ElementType; action?: () => void; badge?: string }[] = [
    { id: 'select', label: 'Select', icon: MousePointer },
    { id: 'hand', label: 'Hand', icon: Hand },
    { id: 'direct-text', label: 'Direct Text Edit', icon: FileEdit, badge: 'Direct' },
    { id: 'replace-image', label: 'Replace Image', icon: ImagePlus, badge: 'New' },
    { id: 'text', label: 'Add Text', icon: Type },
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
      label: 'Add Image',
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
              className={`flex flex-col items-center justify-center p-2 min-w-[50px] rounded-xl transition shrink-0 relative ${
                isActive
                  ? 'bg-brand-gold text-black shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title={t.label}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] mt-0.5 leading-none">{t.label}</span>
              {t.badge && !isActive && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand-gold"></span>
              )}
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
            {t.badge && !isActive && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-gold animate-pulse"></span>
            )}
            {/* Tooltip */}
            <div className="absolute left-14 hidden group-hover:block bg-[#1A1A22] text-white text-[11px] font-medium px-2.5 py-1 rounded-md border border-white/10 shadow-lg whitespace-nowrap z-50 pointer-events-none">
              <div className="flex items-center gap-1.5">
                <span>{t.label}</span>
                {t.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 bg-brand-gold text-black font-bold rounded-sm uppercase tracking-wider">
                    {t.badge}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </aside>
  );
};
