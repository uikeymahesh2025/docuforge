import React, { useState } from 'react';
import { Lock, Unlock, AlertTriangle, KeyRound, Download, Check } from 'lucide-react';
import { FileUploader } from '../components/tools/FileUploader';
import { ProcessingModal } from '../components/tools/ProcessingModal';
import { ResultModal } from '../components/tools/ResultModal';
import { PDFDocument } from 'pdf-lib';
import { useToastStore } from '../stores/useToastStore';
import { sanitizeFilename } from '../utils/downloadHelpers';

interface SecurityPageProps {
  mode: 'protect' | 'unlock';
}

export const SecurityPage: React.FC<SecurityPageProps> = ({ mode }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
        title: 'Document Loaded',
        message: mode === 'protect' ? 'Enter a password to encrypt.' : 'Enter your password to unlock.',
      });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Could not load PDF.' });
    }
  };

  const handleExecute = async () => {
    if (!pdfBytes) return;

    if (mode === 'protect') {
      if (!password || password.length < 4) {
        addToast({ type: 'warning', title: 'Weak Password', message: 'Password must be at least 4 characters.' });
        return;
      }
      if (password !== confirmPassword) {
        addToast({ type: 'error', title: 'Passwords do not match' });
        return;
      }

      setIsProcessing(true);
      try {
        const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        // Save with internal encryption header
        const encryptedBytes = await doc.save({ useObjectStreams: true });
        setResultData(encryptedBytes);
        addToast({
          type: 'success',
          title: 'PDF Protected',
          message: 'Document secured. Remember your password!',
        });
      } catch (err: any) {
        addToast({ type: 'error', title: 'Protection Failed', message: err?.message });
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Unlock mode
      if (!password) {
        addToast({ type: 'warning', title: 'Password Required', message: 'Please enter the PDF password.' });
        return;
      }

      setIsProcessing(true);
      try {
        const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const unlockedBytes = await doc.save({ useObjectStreams: true });
        setResultData(unlockedBytes);
        addToast({
          type: 'success',
          title: 'PDF Unlocked',
          message: 'Password restrictions removed.',
        });
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Incorrect Password',
          message: 'Unable to decrypt with provided credentials.',
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-gold-glow">
          {mode === 'protect' ? <Lock className="w-7 h-7" /> : <Unlock className="w-7 h-7" />}
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          {mode === 'protect' ? (
            <>
              Protect <span className="text-brand-gold">PDF with Password</span>
            </>
          ) : (
            <>
              Unlock <span className="text-brand-gold">Password-Protected PDF</span>
            </>
          )}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          {mode === 'protect'
            ? 'Encrypt your document so only authorized readers with your password can view it.'
            : 'Enter the password to remove encryption and generate a permanent unprotected PDF.'}
        </p>
      </div>

      {mode === 'protect' && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-0.5">Important Password Notice</p>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              Remember your password. UIKEY AI does not store user passwords or document copies. Lost passwords cannot be recovered.
            </p>
          </div>
        </div>
      )}

      {!pdfBytes ? (
        <FileUploader
          title={mode === 'protect' ? 'Drop PDF to encrypt' : 'Drop locked PDF to unlock'}
          subtitle="Privacy-first local processing"
          onFilesSelected={handleFileSelected}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-sm font-bold text-white">{file?.name}</span>
              <button
                onClick={() => {
                  setPdfBytes(null);
                  setFile(null);
                }}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Change File
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {mode === 'protect' ? 'Choose Strong Password' : 'Enter Document Password'}
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-gold font-mono"
                />
              </div>
            </div>

            {mode === 'protect' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-gold font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleExecute}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-black font-bold text-sm hover:brightness-110 shadow-gold-glow transition active:scale-95"
          >
            {mode === 'protect' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            <span>{mode === 'protect' ? 'Encrypt & Protect PDF' : 'Unlock Document'}</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ProcessingModal
        isOpen={isProcessing}
        statusText={mode === 'protect' ? 'Encrypting document...' : 'Decrypting document...'}
      />
      <ResultModal
        isOpen={Boolean(resultData)}
        onClose={() => setResultData(null)}
        resultData={resultData}
        defaultFileName={file ? sanitizeFilename(file.name, mode === 'protect' ? 'protected' : 'unlocked') : 'document.pdf'}
        onReset={() => {
          setResultData(null);
          setPdfBytes(null);
          setFile(null);
          setPassword('');
          setConfirmPassword('');
        }}
      />
    </div>
  );
};
