import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  Search,
  Moon,
  Sun,
  Menu,
  X,
  FileEdit,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { MegaMenu } from './MegaMenu';
import { GlobalSearchModal } from './GlobalSearchModal';
import { useThemeStore } from '../../stores/useThemeStore';

export const Navbar: React.FC = () => {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { theme, setTheme } = useThemeStore();
  const location = useLocation();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#09090C]/90 backdrop-blur-md border-b border-white/10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-[1px] shadow-gold-glow flex items-center justify-center">
                <div className="w-full h-full bg-[#0C0C10] rounded-[11px] flex items-center justify-center">
                  <span className="font-black text-xs tracking-tighter text-amber-400 group-hover:scale-110 transition-transform">
                    UI
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  UIKEY <span className="text-brand-gold">AI</span>
                </span>
                <span className="text-[10px] text-zinc-400 -mt-1 tracking-wider uppercase font-semibold">
                  PDF Suite
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isMegaMenuOpen
                    ? 'text-brand-gold bg-white/5'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>All Tools</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isMegaMenuOpen ? 'rotate-180 text-brand-gold' : ''
                  }`}
                />
              </button>

              <Link
                to="/pdf-editor"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  location.pathname === '/pdf-editor'
                    ? 'text-brand-gold bg-white/5'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                PDF Editor
              </Link>

              <Link
                to="/merge-pdf"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  location.pathname === '/merge-pdf'
                    ? 'text-brand-gold bg-white/5'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Merge
              </Link>

              <Link
                to="/organize-pdf"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  location.pathname === '/organize-pdf'
                    ? 'text-brand-gold bg-white/5'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Organize
              </Link>

              <Link
                to="/compress-pdf"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  location.pathname === '/compress-pdf'
                    ? 'text-brand-gold bg-white/5'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Compress
              </Link>

              <Link
                to="/wedding-studio"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  location.pathname.startsWith('/wedding-studio')
                    ? 'text-amber-400 bg-amber-400/10'
                    : 'text-zinc-300 hover:text-amber-300 hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Wedding Studio</span>
              </Link>
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 100% Client-Side Private Badge */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium tracking-wide group relative cursor-help">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Private</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover:block z-50 w-64 p-2.5 rounded-lg bg-zinc-950/95 border border-white/10 text-[11px] text-zinc-300 shadow-2xl backdrop-blur-md pointer-events-none leading-relaxed text-center">
                <span className="font-semibold text-emerald-400 block mb-0.5">Zero Server Uploads</span>
                Your PDFs and photos are processed 100% locally in your browser's private memory.
              </div>
            </div>
            {/* Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 text-xs transition"
              title="Search tools (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search tools...</span>
              <kbd className="hidden lg:inline text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-white/5">
                ⌘K
              </kbd>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Open Editor CTA Button (No Login, directly opens editor) */}
            <Link
              to="/pdf-editor"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-400 to-amber-500 text-black hover:brightness-110 shadow-gold-glow transition active:scale-95"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Open PDF Editor</span>
            </Link>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              aria-label="Open mobile menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Desktop Mega Menu Dropdown */}
        <MegaMenu
          isOpen={isMegaMenuOpen}
          onClose={() => setIsMegaMenuOpen(false)}
          isMobile={false}
        />
      </header>

      {/* Mobile All Tools Drawer */}
      <MegaMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isMobile={true}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
};
