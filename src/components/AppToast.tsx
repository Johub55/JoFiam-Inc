import React, { useState, useEffect } from 'react';
import { subscribeToasts, dismissToast, ToastMessage } from '../services/appToast';
import { AlertCircle, CheckCircle2, Info, X, ShieldAlert } from 'lucide-react';

export const AppToast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return subscribeToasts((updated) => setToasts(updated));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border flex items-start justify-between gap-3 backdrop-blur-md animate-slideInRight transition-all ${
              isSuccess
                ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-100 ring-2 ring-emerald-500/20'
                : isError
                ? 'bg-rose-950/90 border-rose-500/80 text-rose-100 ring-2 ring-rose-500/20'
                : isWarning
                ? 'bg-amber-950/90 border-amber-500/80 text-amber-100 ring-2 ring-amber-500/20'
                : 'bg-slate-900/95 border-amber-500/60 text-slate-100 ring-2 ring-amber-500/20'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {isSuccess ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : isError ? (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                ) : isWarning ? (
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                ) : (
                  <Info className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div className="text-xs font-bold leading-relaxed whitespace-pre-line">
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
