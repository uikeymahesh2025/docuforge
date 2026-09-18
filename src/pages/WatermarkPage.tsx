import React, { useState } from 'react';
import { Stamp, Download, Image as ImageIcon, Type, Sparkles, Grid } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { applyWatermark } from '../pdf/pdfModifier';
import { WatermarkSettings } from '../types';
import { useToastStore } from '../stores/useToastStore';
import { sanitizeFilename } from '../utils/downloadHelpers';

export const WatermarkPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);

  // Settings with required pre-filled default text: "UIKEY AI 8770912734"
  const [settings, setSettings] = useState<WatermarkSettings>({
    type: 'text',
    text: 'UIKEY AI 8770912734', // Brand default watermark requirement
    fontSize: 40,
    fontColor: '#D4AF37', // Gold default
    opacity: 0.25,
    rotation: -45,
    tiled: false,
    position: 'center',
    imageScale: 0.5,
    pageSelection: 'all',
    customPages: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    try {
      const buffer = await f.arrayBuffer();
      setPdfBytes(new Uint8Array(buffer));
      setFile(f);
      addToast({
        type: 'success',
        title: 'Document Ready',
        message: `${f.name} loaded. Customize watermark settings below.`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Unable to open PDF',
        message: 'Could not read document.',
      });
    }
  };

  const handleApply = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const watermarked = await applyWatermark(pdfBytes, settings);
      setResultData(watermarked);
      addToast({
        type: 'success',
        title: 'Watermark Applied',
        message: 'Your watermarked document is ready for download.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Watermark Failed',
        message: err?.message || 'Could not apply watermark.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const imgFile = e.target.files?.[0];
    if (!imgFile) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setSettings((prev) => ({ ...prev, type: 'image', imageDataUrl: dataUrl }));
        addToast({ type: 'success', title: 'Watermark Image Loaded', message: imgFile.name });
      }
    };
    reader.readAsDataURL(imgFile);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          <Stamp className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Watermark <span className="text-brand-gold">PDF</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Stamp custom text or logos across your pages with adjustable angle, opacity, and grid tiling.
        </p>
      </div>

      {!pdfBytes ? (
        <FileUploader
          title="Drop your PDF here to watermark"
          subtitle="Add security stamps or branding to your document"
          onFilesSelected={handleFileSelected}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <p className="text-sm font-bold text-white">{file?.name}</p>
                <p className="text-xs text-zinc-500">Document loaded</p>
              </div>
              <button
                onClick={() => {
                  setPdfBytes(null);
                  setFile(null);
                }}
                className="text-xs text-zinc-400 hover:text-white transition"
              >
                Change File
              </button>
            </div>

            {/* Type selector */}
            <div className="flex bg-zinc-900 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setSettings((s) => ({ ...s, type: 'text' }))}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition ${
                  settings.type === 'text' ? 'bg-brand-gold text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Type className="w-4 h-4" /> Text Watermark
              </button>
              <button
                onClick={() => setSettings((s) => ({ ...s, type: 'image' }))}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition ${
                  settings.type === 'image' ? 'bg-brand-gold text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-4 h-4" /> Image Watermark
              </button>
            </div>

            {/* Text Options */}
            {settings.type === 'text' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={settings.text}
                    onChange={(e) => setSettings((s) => ({ ...s, text: e.target.value }))}
                    placeholder="Enter watermark text..."
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-gold"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Pre-filled with UIKEY AI default branding. You can edit or replace it.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Font Size ({settings.fontSize}pt)
                    </label>
                    <input
                      type="range"
                      min="14"
                      max="100"
                      value={settings.fontSize}
                      onChange={(e) => setSettings((s) => ({ ...s, fontSize: parseInt(e.target.value, 10) }))}
                      className="w-full accent-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.fontColor}
                        onChange={(e) => setSettings((s) => ({ ...s, fontColor: e.target.value }))}
                        className="w-10 h-8 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-xs text-zinc-400 font-mono">{settings.fontColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-zinc-300">Watermark Image</label>
                <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center bg-zinc-900/40">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="wm-img"
                  />
                  <label htmlFor="wm-img" className="cursor-pointer flex flex-col items-center gap-2">
                    <ImageIcon className="w-8 h-8 text-brand-gold" />
                    <span className="text-xs font-semibold text-white">Upload PNG or JPG</span>
                    <span className="text-[11px] text-zinc-500">Transparent PNG logos recommended</span>
                  </label>
                </div>
              </div>
            )}

            {/* Layout & Style Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Opacity ({Math.round(settings.opacity * 100)}%)
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={Math.round(settings.opacity * 100)}
                  onChange={(e) => setSettings((s) => ({ ...s, opacity: parseInt(e.target.value, 10) / 100 }))}
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Rotation Angle ({settings.rotation}°)
                </label>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  value={settings.rotation}
                  onChange={(e) => setSettings((s) => ({ ...s, rotation: parseInt(e.target.value, 10) }))}
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Layout Mode</label>
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, tiled: !s.tiled }))}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                    settings.tiled
                      ? 'border-brand-gold bg-amber-500/10 text-white'
                      : 'border-white/10 bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>{settings.tiled ? '3x3 Tiled Grid' : 'Single Center'}</span>
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleApply}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            <Stamp className="w-4 h-4" />
            <span>Apply Watermark &amp; Export</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal isOpen={isProcessing} statusText="Applying watermark to document..." />
      <ResultModal
        isOpen={Boolean(resultData)}
        onClose={() => setResultData(null)}
        resultData={resultData}
        defaultFileName={file ? sanitizeFilename(file.name, 'watermarked') : 'document_watermarked.pdf'}
        onReset={() => {
          setResultData(null);
          setPdfBytes(null);
          setFile(null);
        }}
      />
    </div>
  );
};
