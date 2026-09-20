import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  ChevronDown,
  Combine,
  Split,
  LayoutGrid,
  Trash2,
  FileUp,
  RotateCw,
  PenTool,
  FileSignature,
  Type,
  Pencil,
  Highlighter,
  Square,
  Image,
  FileText,
  Code,
  Images,
  FileDown,
  AlignLeft,
  Minimize2,
  Wrench,
  Layers,
  Stamp,
  Eraser,
  Binary,
  PanelTop,
  Crop,
  Maximize,
  Lock,
  Unlock,
  EyeOff,
  FileCode,
  ImageDown,
  Columns2,
  Hash,
  FileSpreadsheet,
  Table,
  ScanText,
  Camera,
  Star,
} from 'lucide-react';
import { ToolItem, ToolCategory } from '../../types';
import { TOOLS, CATEGORY_LABELS } from '../../utils/toolsCatalog';

// Map icon strings to Lucide components
export const ICON_MAP: Record<string, React.ElementType> = {
  Combine,
  Split,
  LayoutGrid,
  Trash2,
  FileUp,
  RotateCw,
  PenTool,
  FileSignature,
  Type,
  Pencil,
  Highlighter,
  Square,
  Image,
  FileText,
  Code,
  Images,
  FileDown,
  AlignLeft,
  Minimize2,
  Wrench,
  Layers,
  Stamp,
  Eraser,
  Binary,
  PanelTop,
  Crop,
  Maximize,
  Lock,
  Unlock,
  EyeOff,
  FileCode,
  ImageDown,
  Columns2,
  Hash,
  FileSpreadsheet,
  Table,
  ScanText,
  Camera,
  Star,
};

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

export const MegaMenu: React.FC<MegaMenuProps> = ({ isOpen, onClose, isMobile = false }) => {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const categories: ToolCategory[] = [
    'organize',
    'edit',
    'convert-to',
    'convert-from',
    'optimize',
    'page-tools',
    'security',
    'other',
  ];

  // Mobile full-screen slide-over drawer
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-[#09090C] flex flex-col animate-fadeIn">
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0C0C10]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white">All PDF Tools</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-brand-gold border border-amber-500/20 font-semibold">
              {TOOLS.length} Tools
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition"
            aria-label="Close tools menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable category list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 divide-y divide-white/5">
          {categories.map((cat) => {
            const catTools = TOOLS.filter((t) => t.category === cat);
            const isCollapsed = collapsedCategories[cat];

            return (
              <div key={cat} className="py-3">
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between py-2 text-left text-sm font-semibold tracking-wider uppercase text-zinc-300 hover:text-brand-gold transition"
                >
                  <span>{CATEGORY_LABELS[cat]}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${
                      isCollapsed ? '' : 'rotate-180'
                    }`}
                  />
                </button>

                {!isCollapsed && (
                  <div className="grid grid-cols-1 gap-2 pt-2 pb-1">
                    {catTools.map((tool) => {
                      const IconComponent = ICON_MAP[tool.icon] || FileText;
                      return (
                        <Link
                          key={tool.id}
                          to={tool.path}
                          onClick={onClose}
                          className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 active:bg-white/10 transition group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-white/5 flex items-center justify-center text-zinc-300 group-hover:text-brand-gold group-hover:border-amber-500/30 transition shrink-0 mt-0.5">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-200 group-hover:text-brand-gold transition">
                                {tool.name}
                              </span>
                              {tool.badge && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-brand-gold font-bold">
                                  {tool.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 leading-tight mt-0.5 line-clamp-1">
                              {tool.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop Mega Dropdown
  return (
    <div
      className="absolute top-full left-0 w-full bg-[#0E0E14] border-b border-white/10 shadow-2xl z-40 animate-fadeIn"
      onMouseLeave={onClose}
    >
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-4 gap-x-8 gap-y-6">
          {categories.map((cat) => {
            const catTools = TOOLS.filter((t) => t.category === cat);
            return (
              <div key={cat} className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-gold flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-gold"></span>
                  {CATEGORY_LABELS[cat]}
                </h3>
                <ul className="space-y-1">
                  {catTools.map((tool) => {
                    const IconComponent = ICON_MAP[tool.icon] || FileText;
                    return (
                      <li key={tool.id}>
                        <Link
                          to={tool.path}
                          onClick={onClose}
                          className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/5 transition group"
                        >
                          <IconComponent className="w-4 h-4 text-zinc-400 group-hover:text-brand-gold shrink-0 mt-0.5 transition" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-zinc-200 group-hover:text-white transition">
                                {tool.name}
                              </span>
                              {tool.badge && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-brand-gold font-bold">
                                  {tool.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-500 leading-snug line-clamp-1 group-hover:text-zinc-400">
                              {tool.description}
                            </p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
