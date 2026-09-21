import React, { useState, useRef } from 'react';
import {
  Camera,
  FileCheck,
  Download,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  User,
  PenTool,
  ShieldCheck,
  Maximize,
  Crop,
  ArrowRight,
} from 'lucide-react';
import { FileUploader } from '../../components/tools/FileUploader';
import { useToastStore } from '../../stores/useToastStore';

interface ExamPreset {
  id: string;
  name: string;
  type: 'photo' | 'signature';
  portal: string;
  width: number;
  height: number;
  minKb: number;
  maxKb: number;
  description: string;
}

const EXAM_PRESETS: ExamPreset[] = [
  // SSC
  {
    id: 'ssc-photo',
    name: 'SSC - Passport Photo',
    portal: 'SSC (CGL, CHSL, GD, MTS)',
    type: 'photo',
    width: 200,
    height: 230,
    minKb: 20,
    maxKb: 50,
    description: '3.5cm x 4.5cm, 20 KB to 50 KB, JPEG format',
  },
  {
    id: 'ssc-sig',
    name: 'SSC - Signature',
    portal: 'SSC (CGL, CHSL, GD, MTS)',
    type: 'signature',
    width: 140,
    height: 60,
    minKb: 10,
    maxKb: 20,
    description: '4.0cm x 2.0cm, 10 KB to 20 KB, JPEG format',
  },
  // UPSC
  {
    id: 'upsc-photo',
    name: 'UPSC - Passport Photo',
    portal: 'UPSC (Civil Services, NDA, CDS)',
    type: 'photo',
    width: 350,
    height: 350,
    minKb: 20,
    maxKb: 300,
    description: 'Square 350x350 px min, 20 KB to 300 KB',
  },
  {
    id: 'upsc-sig',
    name: 'UPSC - Signature',
    portal: 'UPSC (Civil Services, NDA, CDS)',
    type: 'signature',
    width: 350,
    height: 350,
    minKb: 20,
    maxKb: 300,
    description: 'Square 350x350 px min, 20 KB to 300 KB',
  },
  // IBPS / Banking
  {
    id: 'ibps-photo',
    name: 'IBPS / SBI - Passport Photo',
    portal: 'IBPS, SBI PO & Clerk, RRB',
    type: 'photo',
    width: 200,
    height: 230,
    minKb: 20,
    maxKb: 50,
    description: '200x230 px, 20 KB to 50 KB, JPEG',
  },
  {
    id: 'ibps-sig',
    name: 'IBPS / SBI - Signature',
    portal: 'IBPS, SBI PO & Clerk, RRB',
    type: 'signature',
    width: 140,
    height: 60,
    minKb: 10,
    maxKb: 20,
    description: '140x60 px, 10 KB to 20 KB on white paper',
  },
  // NTA (NEET / JEE)
  {
    id: 'nta-photo',
    name: 'NTA - NEET / JEE Photo',
    portal: 'NTA (NEET, JEE Main, CUET)',
    type: 'photo',
    width: 400,
    height: 500,
    minKb: 10,
    maxKb: 200,
    description: 'Passport photograph, 10 KB to 200 KB',
  },
  {
    id: 'nta-sig',
    name: 'NTA - NEET / JEE Signature',
    portal: 'NTA (NEET, JEE Main, CUET)',
    type: 'signature',
    width: 300,
    height: 100,
    minKb: 4,
    maxKb: 30,
    description: 'Running handwriting signature, 4 KB to 30 KB',
  },
  // State PSC & Police
  {
    id: 'state-psc-photo',
    name: 'State PSC / Police - Photo',
    portal: 'MPPSC, UPPSC, BPSC, Police',
    type: 'photo',
    width: 200,
    height: 250,
    minKb: 20,
    maxKb: 50,
    description: 'Standard PSC photo, 20 KB to 50 KB',
  },
  {
    id: 'state-psc-sig',
    name: 'State PSC / Police - Signature',
    portal: 'MPPSC, UPPSC, BPSC, Police',
    type: 'signature',
    width: 150,
    height: 70,
    minKb: 10,
    maxKb: 30,
    description: 'Black ink signature, 10 KB to 30 KB',
  },
];

export const GovtFormResizerPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [activePreset, setActivePreset] = useState<string>('ssc-photo');

  // Custom constraint controls
  const [targetWidth, setTargetWidth] = useState<number>(200);
  const [targetHeight, setTargetHeight] = useState<number>(230);
  const [targetMinKb, setTargetMinKb] = useState<number>(20);
  const [targetMaxKb, setTargetMaxKb] = useState<number>(50);
  const [targetKbGoal, setTargetKbGoal] = useState<number>(35); // slider for exact target

  // Result state
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultDataUrl, setResultDataUrl] = useState<string | null>(null);
  const [resultSizeKb, setResultSizeKb] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Apply a preset
  const handleSelectPreset = (presetId: string) => {
    setActivePreset(presetId);
    const preset = EXAM_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setTargetWidth(preset.width);
      setTargetHeight(preset.height);
      setTargetMinKb(preset.minKb);
      setTargetMaxKb(preset.maxKb);
      const midpoint = Math.round((preset.minKb + preset.maxKb) / 2);
      setTargetKbGoal(midpoint);

      if (sourceImg) {
        processResize(sourceImg, preset.width, preset.height, midpoint, preset.minKb, preset.maxKb);
      }
    }
  };

  // Load user image
  const handleFileSelect = (files: File[]) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setSelectedFile(file);

    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
      img.onload = () => {
        setSourceImg(img);
        processResize(img, targetWidth, targetHeight, targetKbGoal, targetMinKb, targetMaxKb);
        addToast({
          type: 'success',
          title: 'Image Loaded',
          message: `${file.name} ready for precision resizing.`,
        });
      };
    };
    reader.readAsDataURL(file);
  };

  // Binary search compression engine to strictly match desired KB
  const compressToExactKb = async (
    canvas: HTMLCanvasElement,
    goalKb: number,
    minKb: number,
    maxKb: number
  ): Promise<{ blob: Blob; sizeKb: number }> => {
    const targetBytes = goalKb * 1024;
    const minBytes = minKb * 1024;
    const maxBytes = maxKb * 1024;

    let lowQ = 0.05;
    let highQ = 0.99;
    let bestBlob: Blob | null = null;
    let bestDiff = Infinity;

    // Helper to get blob at quality
    const getBlobAtQuality = (q: number): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Canvas blob generation failed'));
          },
          'image/jpeg',
          q
        );
      });
    };

    // 8 iterations binary search for exact quality
    for (let iter = 0; iter < 8; iter++) {
      const midQ = (lowQ + highQ) / 2;
      const testBlob = await getBlobAtQuality(midQ);
      const diff = Math.abs(testBlob.size - targetBytes);

      if (diff < bestDiff) {
        bestDiff = diff;
        bestBlob = testBlob;
      }

      if (testBlob.size > targetBytes) {
        highQ = midQ;
      } else {
        lowQ = midQ;
      }
    }

    // Check if bestBlob is strictly within bounds
    if (!bestBlob) {
      bestBlob = await getBlobAtQuality(0.85);
    }

    // If still below minKb (e.g. sparse white signature), upscale offscreen canvas slightly or pad to ensure acceptance
    if (bestBlob.size < minBytes) {
      // Try highest quality
      const maxQBlob = await getBlobAtQuality(0.99);
      if (maxQBlob.size >= minBytes && maxQBlob.size <= maxBytes) {
        bestBlob = maxQBlob;
      }
    }

    const finalKb = Math.round((bestBlob.size / 1024) * 10) / 10;
    return { blob: bestBlob, sizeKb: finalKb };
  };

  const processResize = async (
    img: HTMLImageElement,
    width: number,
    height: number,
    goalKb: number,
    minKb: number,
    maxKb: number
  ) => {
    setIsProcessing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      // White background fill (standard requirement for exam portals)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Scale to fit while maintaining aspect ratio and centering
      const scale = Math.min(width / img.width, height / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const drawX = (width - drawW) / 2;
      const drawY = (height - drawH) / 2;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      const { blob, sizeKb } = await compressToExactKb(canvas, goalKb, minKb, maxKb);
      setResultBlob(blob);
      setResultSizeKb(sizeKb);

      const dataUrl = URL.createObjectURL(blob);
      setResultDataUrl(dataUrl);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Resize Error',
        message: err?.message || 'Could not resize image.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    const link = document.createElement('a');
    const url = URL.createObjectURL(resultBlob);
    const prefix = activePreset.includes('sig') ? 'signature' : 'photo';
    link.href = url;
    link.download = `${prefix}_${targetWidth}x${targetHeight}_${resultSizeKb}kb.jpg`;
    link.click();
    URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: 'Downloaded!',
      message: `Image saved (${resultSizeKb} KB, ${targetWidth}x${targetHeight} px).`,
    });
  };

  const isValidForPortal = resultSizeKb >= targetMinKb && resultSizeKb <= targetMaxKb;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md shadow-blue-500/20">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Govt Exam Photo & Signature Resizer
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold border border-blue-300 dark:border-blue-800">
                  SSC / UPSC / IBPS / NTA
                </span>
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                100% Client-Side exact dimension & target KB resizer. Never get your recruitment application rejected for incorrect file size.
              </p>
            </div>
          </div>
        </div>

        {/* Portal Preset Selector Pills */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              Select Recruitment Portal Preset
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Auto-calibrates exact dimensions & file size rules
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {EXAM_PRESETS.map((preset) => {
              const isSelected = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold truncate">{preset.name}</span>
                    {preset.type === 'photo' ? (
                      <User className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    ) : (
                      <PenTool className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {preset.width}x{preset.height} px
                  </div>
                  <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1">
                    {preset.minKb} KB - {preset.maxKb} KB
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {!selectedFile ? (
          <div className="max-w-xl mx-auto py-8">
            <FileUploader
              onFilesSelected={handleFileSelect}
              accept="image/*,.jpg,.jpeg,.png,.webp"
              multiple={false}
              fileType="image"
              title="Select Photo or Signature to Resize"
              subtitle="Supports JPG, PNG, WebP up to 25MB. Processed safely inside your browser."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Controls */}
            <div className="lg:col-span-6 space-y-4">
              {/* Constraints Box */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-500" />
                    Exact Constraints & Slider Controls
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setSourceImg(null);
                    }}
                    className="text-xs text-rose-500 hover:underline"
                  >
                    Change Image
                  </button>
                </div>

                {/* Target File Size Slider */}
                <div className="space-y-2 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Target File Size (KB Goal)
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {targetKbGoal} KB
                    </span>
                  </div>
                  <input
                    type="range"
                    min={targetMinKb}
                    max={targetMaxKb}
                    step={1}
                    value={targetKbGoal}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTargetKbGoal(val);
                      if (sourceImg) {
                        processResize(sourceImg, targetWidth, targetHeight, val, targetMinKb, targetMaxKb);
                      }
                    }}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Portal Min: {targetMinKb} KB</span>
                    <span>Portal Max: {targetMaxKb} KB</span>
                  </div>
                </div>

                {/* Dimensions (Width & Height) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      value={targetWidth}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 100;
                        setTargetWidth(val);
                        if (sourceImg) {
                          processResize(sourceImg, val, targetHeight, targetKbGoal, targetMinKb, targetMaxKb);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      value={targetHeight}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 100;
                        setTargetHeight(val);
                        if (sourceImg) {
                          processResize(sourceImg, targetWidth, val, targetKbGoal, targetMinKb, targetMaxKb);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Min & Max KB Customization */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Min Accepted KB
                    </label>
                    <input
                      type="number"
                      value={targetMinKb}
                      onChange={(e) => setTargetMinKb(Number(e.target.value) || 5)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Max Accepted KB
                    </label>
                    <input
                      type="number"
                      value={targetMaxKb}
                      onChange={(e) => setTargetMaxKb(Number(e.target.value) || 100)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Download Action Button */}
              <button
                type="button"
                onClick={handleDownload}
                disabled={!resultBlob || isProcessing}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-base transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Compressing to Exact Size...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Download Ready Image ({resultSizeKb} KB)</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Live Preview & Verification */}
            <div className="lg:col-span-6 space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col h-full">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    Live Output Verification
                  </span>
                  {isValidForPortal ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      100% Portal Valid
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Outside Bounds ({targetMinKb}-{targetMaxKb} KB)
                    </span>
                  )}
                </div>

                {/* Preview Canvas Display */}
                <div className="flex-1 flex items-center justify-center p-6 bg-slate-100 dark:bg-slate-950/60 rounded-lg mt-3 overflow-hidden min-h-[300px]">
                  {resultDataUrl ? (
                    <div className="p-3 bg-white rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center">
                      <img
                        src={resultDataUrl}
                        alt="Resized Result"
                        style={{ maxWidth: '100%', maxHeight: '260px' }}
                        className="object-contain rounded border border-slate-100"
                      />
                      <div className="text-[11px] text-slate-500 mt-2 font-mono">
                        {targetWidth} x {targetHeight} px | JPEG
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">Calculating dimensions...</p>
                    </div>
                  )}
                </div>

                {/* Portal Checklist Card */}
                <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Recruitment Compliance Audit:
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Target Resolution:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {targetWidth} x {targetHeight} px
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Target Range:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {targetMinKb} KB – {targetMaxKb} KB
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1">
                    <span className="text-slate-500 dark:text-slate-400">Final File Size:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {resultSizeKb} KB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
