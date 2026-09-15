import React, { Component, ErrorInfo, ReactNode } from 'react';

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
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
    } catch {}
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render(): ReactNode {
    const instance = this as any;
    if (instance.state?.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto text-3xl font-bold">
              ⚠️
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Oeps! Er is iets misgegaan</h2>
              <p className="text-xs text-slate-400 mt-1">
                De applicatie heeft een onverwachte fout opgevangen om een wit scherm te voorkomen.
              </p>
            </div>

            {instance.state?.error && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-left font-mono text-[10px] text-red-300 overflow-x-auto max-h-32">
                {instance.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition active:scale-95"
              >
                Pagina Herladen
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition active:scale-95"
              >
                Reset App Data
              </button>
            </div>
          </div>
        </div>
      );
    }

    return instance.props?.children;
  }
}
