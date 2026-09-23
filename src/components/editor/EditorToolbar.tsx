import React, { useRef, useState } from 'react';
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
  HelpCircle,
  CheckSquare,
  Layers,
} from 'lucide-react';
import { EditorTool } from '../../types';
import { useEditorStore } from '../../stores/useEditorStore';

interface EditorToolbarProps {
  onOpenSignature: () => void;
  onImageSelected: (dataUrl: string) => void;
  onOpenShortcuts?: () => void;
  isMobile?: boolean;
}

interface ToolDef {
  id: EditorTool;
  label: string;
  icon: React.ElementType;
  action?: () => void;
  badge?: string;
  shortcut?: string;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onOpenSignature,
  onImageSelected,
  onOpenShortcuts,
  isMobile = false,
}) => {
  const { activeTool, setActiveTool } = useEditorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mobileGroup, setMobileGroup] = useState<'select' | 'annotate' | 'insert' | 'sign'>('select');

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

  // Group 1: Select & Edit
  const selectTools: ToolDef[] = [
    { id: 'select', label: 'Select Object', icon: MousePointer, shortcut: 'V' },
    { id: 'hand', label: 'Hand / Pan', icon: Hand },
    { id: 'direct-text', label: 'Direct Text Edit', icon: FileEdit, badge: 'Direct' },
    { id: 'replace-image', label: 'Replace Image', icon: ImagePlus, badge: 'New' },
  ];

  // Group 2: Annotate
  const annotateTools: ToolDef[] = [
    { id: 'draw', label: 'Draw with Pen', icon: Pencil, shortcut: 'D' },
    { id: 'highlight', label: 'Highlighter', icon: Highlighter, shortcut: 'H' },
    { id: 'underline', label: 'Underline', icon: UnderlineIcon },
    { id: 'strike', label: 'Strike-through', icon: Strikethrough },
    { id: 'eraser', label: 'Eraser', icon: Eraser },
  ];

  // Group 3: Insert
  const insertTools: ToolDef[] = [
    { id: 'text', label: 'Add Text', icon: Type, shortcut: 'T' },
    {
      id: 'image',
      label: 'Add Image',
      icon: ImageIcon,
      action: () => fileInputRef.current?.click(),
    },
    { id: 'rect', label: 'Rectangle', icon: Square },
    { id: 'circle', label: 'Circle', icon: Circle },
    { id: 'arrow', label: 'Arrow', icon: ArrowRight },
    { id: 'line', label: 'Line', icon: Minus },
  ];

  // Group 4: Sign & Form
  const signTools: ToolDef[] = [
    {
      id: 'signature',
      label: 'Digital Signature',
      icon: FileSignature,
      action: onOpenSignature,
      shortcut: 'S',
      badge: 'Sign',
    },
  ];

  const handleToolClick = (toolItem: ToolDef) => {
    if (toolItem.action) {
      toolItem.action();
    } else {
      setActiveTool(toolItem.id);
    }
  };

  // Mobile Bottom Toolbar with Tabbed Groups for touch ergonomics
  if (isMobile) {
    const currentTools =
      mobileGroup === 'select'
        ? selectTools
        : mobileGroup === 'annotate'
        ? annotateTools
        : mobileGroup === 'insert'
        ? insertTools
        : signTools;

    return (
      <div className="w-full bg-[#0C0C12]/95 backdrop-blur-md border-t border-white/10 z-30 shadow-2xl">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload image to place on PDF"
        />

        {/* Group Selector Tabs */}
        <div className="flex items-center justify-around border-b border-white/5 py-1 px-2 text-[11px] font-semibold text-zinc-400">
          {[
            { id: 'select', label: 'Select' },
            { id: 'annotate', label: 'Annotate' },
            { id: 'insert', label: 'Insert' },
            { id: 'sign', label: 'Sign' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileGroup(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg transition min-h-[36px] flex items-center justify-center ${
                mobileGroup === tab.id
                  ? 'text-brand-gold bg-amber-500/10 font-bold'
                  : 'hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Buttons for selected group */}
        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2 no-scrollbar">
          {currentTools.map((t) => {
            const Icon = t.icon;
            const isActive = activeTool === t.id && !t.action;

            return (
              <button
                key={t.id}
                onClick={() => handleToolClick(t)}
                className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] p-1.5 rounded-xl transition shrink-0 relative ${
                  isActive
                    ? 'bg-brand-gold text-black shadow-sm font-semibold'
                    : 'text-zinc-300 hover:text-white bg-zinc-900/60 active:bg-white/10 border border-white/5'
                }`}
                aria-label={t.label}
                aria-pressed={isActive}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[9px] mt-1 text-center line-clamp-1 leading-none">{t.label}</span>
                {t.badge && !isActive && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand-gold" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop Left Toolbar
  return (
    <aside
      aria-label="Editor Tools"
      className="w-16 bg-[#0C0C12] border-r border-white/10 flex flex-col items-center py-3 gap-1 z-20 shrink-0 select-none overflow-y-auto no-scrollbar"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload image to place on PDF"
      />

      {/* Accessible active tool announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        Current tool: {activeTool}
      </div>

      {/* Group 1: Select & Edit */}
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">Select</span>
        {selectTools.map((t) => renderToolButton(t, activeTool, handleToolClick))}
      </div>

      <div className="w-8 h-px bg-white/10 my-1" />

      {/* Group 2: Annotate */}
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">Markup</span>
        {annotateTools.map((t) => renderToolButton(t, activeTool, handleToolClick))}
      </div>

      <div className="w-8 h-px bg-white/10 my-1" />

      {/* Group 3: Insert */}
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">Insert</span>
        {insertTools.map((t) => renderToolButton(t, activeTool, handleToolClick))}
      </div>

      <div className="w-8 h-px bg-white/10 my-1" />

      {/* Group 4: Sign */}
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">Sign</span>
        {signTools.map((t) => renderToolButton(t, activeTool, handleToolClick))}
      </div>

      {/* Shortcuts button at bottom */}
      {onOpenShortcuts && (
        <div className="mt-auto pt-2 border-t border-white/10 w-full flex justify-center">
          <button
            onClick={onOpenShortcuts}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-brand-gold hover:bg-white/5 transition relative group"
            title="Keyboard Shortcuts & Help (?)"
            aria-label="View Keyboard Shortcuts & Help"
          >
            <HelpCircle className="w-4 h-4" />
            <div className="absolute left-14 hidden group-hover:block bg-[#1A1A22] text-white text-[11px] font-medium px-2.5 py-1 rounded-md border border-white/10 shadow-lg whitespace-nowrap z-50 pointer-events-none">
              Keyboard Shortcuts (?)
            </div>
          </button>
        </div>
      )}
    </aside>
  );
};

function renderToolButton(
  t: ToolDef,
  activeTool: EditorTool,
  onClick: (t: ToolDef) => void
) {
  const Icon = t.icon;
  const isActive = activeTool === t.id && !t.action;

  return (
    <button
      key={t.id}
      onClick={() => onClick(t)}
      aria-label={`${t.label}${t.shortcut ? ` (${t.shortcut})` : ''}`}
      aria-pressed={isActive}
      className={`w-11 h-11 rounded-xl flex items-center justify-center transition relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
        isActive
          ? 'bg-brand-gold text-black shadow-gold-glow font-bold'
          : 'text-zinc-400 hover:text-white hover:bg-white/5'
      }`}
      title={`${t.label}${t.shortcut ? ` (${t.shortcut})` : ''}`}
    >
      <Icon className="w-4 h-4" />
      {t.badge && !isActive && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-gold" />
      )}
      {/* Desktop Flyout Tooltip */}
      <div className="absolute left-14 hidden group-hover:block bg-[#1A1A22] text-white text-[11px] font-medium px-2.5 py-1 rounded-md border border-white/10 shadow-lg whitespace-nowrap z-50 pointer-events-none animate-fadeIn">
        <div className="flex items-center gap-1.5">
          <span>{t.label}</span>
          {t.shortcut && (
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[9px]">
              {t.shortcut}
            </kbd>
          )}
          {t.badge && (
            <span className="text-[9px] px-1.5 py-0.2 bg-brand-gold text-black font-bold rounded-sm uppercase tracking-wider">
              {t.badge}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
