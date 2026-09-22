import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ORDER_KIOSK_USER } from '../../services/store';
import { ShieldCheck, User, Lock, X, LogIn, Sparkles, CheckCircle2, AlertCircle, ShoppingBag } from 'lucide-react';

interface PosLoginModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const PosLoginModal: React.FC<PosLoginModalProps> = ({ onClose, onSuccess }) => {
  const { loginPos, setCurrentPosUser } = useApp();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await loginPos(username, password);
      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Inloggen mislukt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseBestelAccount = () => {
    setCurrentPosUser(ORDER_KIOSK_USER);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Werkdonalds Medewerker Toegang</h2>
              <p className="text-xs text-slate-400">
                Log in voor beheer, contant-goedkeuring en voorraad.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          
          {/* Quick Order Account Banner */}
          <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3">
            <div>
              <span className="font-extrabold text-xs text-emerald-300 block flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                Bestel Account (Geen Login)
              </span>
              <span className="text-[11px] text-slate-400">
                Direct eten bestellen op de kassa.
              </span>
            </div>
            <button
              type="button"
              onClick={handleUseBestelAccount}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shrink-0"
            >
              Direct Bestellen
            </button>
          </div>

          {/* RPI Spaarpaal Kiosk Banner */}
          <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3">
            <div>
              <span className="font-extrabold text-xs text-amber-300 flex items-center gap-1.5">
                <span>👑</span>
                Raspberry Pi Spaarpaal Kiosk
              </span>
              <span className="text-[11px] text-slate-400 block">
                Account: <code className="text-amber-300 bg-amber-950/60 px-1 py-0.5 rounded font-mono">rpi</code> | Wachtwoord: <code className="text-amber-300 bg-amber-950/60 px-1 py-0.5 rounded font-mono">extra9</code>
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                setUsername('rpi');
                setPassword('extra9');
                const res = await loginPos('rpi', 'extra9');
                if (res.success) {
                  if (onSuccess) onSuccess();
                  onClose();
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shrink-0 shadow-md shadow-amber-500/20"
            >
              Start RPI Kiosk
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Of inloggen als medewerker
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="text-slate-300 font-bold block mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Gebruikersnaam
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Voer medewerker gebruikersnaam in..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Wachtwoord of Pincode
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/20"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'Bezig met verifiëren...' : 'Inloggen als Medewerker'}</span>
            </button>
          </form>

          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            Medewerker accounts worden veilig beheerd in Supabase. Wachtwoorden worden nooit publiekelijk op het scherm getoond.
          </p>

        </div>

      </div>
    </div>
  );
};
