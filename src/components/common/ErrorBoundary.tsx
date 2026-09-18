import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#09090C] text-zinc-100 p-6">
          <div className="max-w-md w-full bg-[#121217] border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-3">PDF Editor Encountered an Issue</h2>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              We encountered an unexpected problem while processing this request. Your document remains safe on your device.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-brand-gold text-black font-semibold rounded-xl hover:bg-amber-400 transition"
              >
                <RefreshCw className="w-4 h-4" /> Reload Editor
              </button>
              <a
                href="/"
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-zinc-800 text-zinc-200 font-medium rounded-xl hover:bg-zinc-700 transition"
              >
                <Home className="w-4 h-4" /> Return Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
