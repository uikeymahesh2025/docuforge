import React, { useState, useEffect, useRef } from 'react';
import {
  Headphones,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Gauge,
  FileText,
  Languages,
  CheckCircle2,
  Sparkles,
  Copy,
  RotateCcw,
} from 'lucide-react';
import { FileUploader } from '../../components/tools/FileUploader';
import { loadPdfDocument, extractAllText } from '../../pdf/pdfManager';
import { useToastStore } from '../../stores/useToastStore';

export const AudioReaderPage: React.FC = () => {
  const addToast = useToastStore((state) => state.addToast);

  const [file, setFile] = useState<File | null>(null);
  const [pagesText, setPagesText] = useState<{ pageNumber: number; text: string }[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLoadingDoc, setIsLoadingDoc] = useState<boolean>(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load browser voices
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);

        // Prefer Hindi or Indian English or English default
        const defaultVoice =
          voices.find((v) => v.lang.startsWith('hi') || v.lang.includes('Deva')) ||
          voices.find((v) => v.lang.includes('en-IN')) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0];

        if (defaultVoice && !selectedVoiceUri) {
          setSelectedVoiceUri(defaultVoice.voiceURI);
        }
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [selectedVoiceUri]);

  // Handle PDF file upload
  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setIsLoadingDoc(true);

    try {
      const buffer = await selected.arrayBuffer();
      const pdfDoc = await loadPdfDocument(new Uint8Array(buffer));
      const extracted = await extractAllText(pdfDoc);

      setPagesText(extracted.pages);
      setCurrentPage(1);
      setCurrentSentenceIndex(0);

      addToast({
        type: 'success',
        title: 'PDF Loaded',
        message: `Extracted ${extracted.pages.length} pages ready for audio playback.`,
      });
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Extraction Error',
        message: 'Could not extract text from this document.',
      });
    } finally {
      setIsLoadingDoc(false);
    }
  };

  const currentText = pagesText[currentPage - 1]?.text || '';
  const sentences = currentText
    ? currentText.split(/(?<=[.?!।\n])\s+/).filter((s) => s.trim().length > 0)
    : [];

  const startSpeakingFrom = (sentenceIdx: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      addToast({
        type: 'error',
        title: 'Speech Unavailable',
        message: 'Your browser does not support SpeechSynthesis.',
      });
      return;
    }

    window.speechSynthesis.cancel();

    if (sentences.length === 0 || sentenceIdx >= sentences.length) {
      // Auto move to next page
      if (currentPage < pagesText.length) {
        setCurrentPage((p) => p + 1);
        setCurrentSentenceIndex(0);
        return;
      } else {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentSentenceIndex(0);
        return;
      }
    }

    const textToSpeak = sentences[sentenceIdx];
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance;

    if (selectedVoiceUri) {
      const v = availableVoices.find((voice) => voice.voiceURI === selectedVoiceUri);
      if (v) utterance.voice = v;
    }

    utterance.rate = playbackSpeed;
    utterance.volume = isMuted ? 0 : volume;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentSentenceIndex(sentenceIdx);
    };

    utterance.onend = () => {
      if (sentenceIdx + 1 < sentences.length) {
        startSpeakingFrom(sentenceIdx + 1);
      } else if (currentPage < pagesText.length) {
        // Move to next page seamlessly
        setCurrentPage((p) => p + 1);
        setCurrentSentenceIndex(0);
      } else {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentSentenceIndex(0);
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('Speech error:', e);
      }
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePlayPause = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPlaying) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    } else {
      startSpeakingFrom(currentSentenceIndex);
    }
  };

  const handleStop = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentenceIndex(0);
  };

  const handleNextPage = () => {
    if (currentPage < pagesText.length) {
      handleStop();
      setCurrentPage((p) => p + 1);
      setCurrentSentenceIndex(0);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handleStop();
      setCurrentPage((p) => p - 1);
      setCurrentSentenceIndex(0);
    }
  };

  const copyPageText = () => {
    if (!currentText) return;
    navigator.clipboard.writeText(currentText);
    addToast({
      type: 'success',
      title: 'Copied to Clipboard',
      message: `Page ${currentPage} text has been copied.`,
    });
  };

  return (
    <div className="min-h-screen bg-[#09090C] text-zinc-100 flex flex-col">
      {/* Hero Header */}
      <section className="relative pt-12 pb-10 sm:pt-16 sm:pb-14 border-b border-white/5 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[280px] bg-purple-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold mb-4 shadow-gold-glow">
            <Headphones className="w-3.5 h-3.5" />
            <span>AI Audio PDF Player & Reader</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight">
            Listen to Your <span className="gold-gradient-text">PDF Documents</span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Hands-free audio reader for students, office reports, and eBooks. Features bilingual accents (Hindi & English), speed adjustment, and real-time sentence tracking.
          </p>
        </div>
      </section>

      {/* Main Workspace */}
      <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {!file ? (
          <div className="max-w-xl mx-auto">
            <FileUploader
              onFilesSelected={handleFilesSelected}
              accept=".pdf,application/pdf"
              multiple={false}
              fileType="pdf"
              title="Drop your PDF here to start listening"
              subtitle="Supports Hindi & English documents, exam notes, textbooks, and office memos"
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Audio Player Dock */}
            <div className="bg-[#121218] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                      {file.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Page {currentPage} of {pagesText.length} &bull;{' '}
                      {sentences.length} sentences
                    </p>
                  </div>
                </div>

                {/* Animated Equalizer when playing */}
                <div className="flex items-center gap-1.5 h-6 px-3 py-1 rounded-full bg-black/40 border border-white/5">
                  <span className="text-[11px] text-zinc-400 mr-1.5">
                    {isPlaying ? (isPaused ? 'Paused' : 'Playing') : 'Ready'}
                  </span>
                  {[0.4, 0.8, 0.6, 1.0, 0.5, 0.9, 0.3].map((heightRatio, i) => (
                    <span
                      key={i}
                      style={{
                        height: isPlaying && !isPaused ? `${Math.max(4, heightRatio * 18)}px` : '4px',
                        transition: 'height 0.2s ease',
                      }}
                      className="w-1 bg-brand-gold rounded-full"
                    />
                  ))}
                </div>
              </div>

              {/* Main Playback Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Voice Selector */}
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-zinc-400 shrink-0" />
                  <select
                    value={selectedVoiceUri}
                    onChange={(e) => {
                      setSelectedVoiceUri(e.target.value);
                      if (isPlaying) {
                        handleStop();
                      }
                    }}
                    className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-gold truncate"
                  >
                    {availableVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Center Buttons: Prev, Play/Pause, Stop, Next */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition"
                    title="Previous Page"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handlePlayPause}
                    className="p-3.5 rounded-2xl bg-brand-gold text-black hover:brightness-110 shadow-gold-glow font-bold transition flex items-center justify-center"
                    title={isPlaying && !isPaused ? 'Pause' : 'Play'}
                  >
                    {isPlaying && !isPaused ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleStop}
                    disabled={!isPlaying}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition"
                    title="Stop"
                  >
                    <Square className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleNextPage}
                    disabled={currentPage >= pagesText.length}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition"
                    title="Next Page"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Speed Slider */}
                <div className="flex items-center justify-end gap-3">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-xs font-mono font-bold text-brand-gold w-10">
                      {playbackSpeed.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.75}
                    max={2.0}
                    step={0.1}
                    value={playbackSpeed}
                    onChange={(e) => {
                      const spd = parseFloat(e.target.value);
                      setPlaybackSpeed(spd);
                      if (isPlaying) {
                        handleStop();
                      }
                    }}
                    className="w-24 sm:w-28 accent-brand-gold cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Reading View & Interactive Sentence Highlighter */}
            <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                  <FileText className="w-4 h-4 text-brand-gold" />
                  <span>Page {currentPage} Transcript</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-400">
                    Click any sentence to listen directly
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyPageText}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 text-xs transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleStop();
                      setFile(null);
                      setPagesText([]);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 text-xs transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Open Another PDF</span>
                  </button>
                </div>
              </div>

              {/* Text Container with sentence clicks */}
              <div
                style={{ fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif" }}
                className="p-5 rounded-xl bg-black/40 border border-white/5 max-h-[500px] overflow-y-auto leading-relaxed text-sm text-zinc-300 select-text"
              >
                {sentences.length === 0 ? (
                  <p className="text-zinc-500 italic text-center py-10">
                    No readable text found on this page. (Scanned image PDFs can be processed via OCR tool first).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sentences.map((sent, idx) => {
                      const isCurrent = isPlaying && currentSentenceIndex === idx;
                      return (
                        <span
                          key={idx}
                          onClick={() => startSpeakingFrom(idx)}
                          className={`cursor-pointer rounded px-1.5 py-0.5 transition-all inline mr-1.5 ${
                            isCurrent
                              ? 'bg-amber-400/30 text-amber-200 font-medium ring-1 ring-amber-400/50 shadow-xs'
                              : 'hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {sent}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
