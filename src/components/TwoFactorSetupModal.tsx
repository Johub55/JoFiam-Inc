import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  generateTotpSecret, 
  getTotpQrCodeUrl, 
  generateBackupCodes, 
  verifyTotpCode 
} from '../services/totp';
import { showToast } from '../services/appToast';
import { 
  ShieldCheck, 
  QrCode, 
  Key, 
  Copy, 
  Check, 
  X, 
  Smartphone, 
  Lock, 
  Download, 
  AlertCircle,
  CheckCircle2,
  Trash2
} from 'lucide-react';

interface TwoFactorSetupModalProps {
  username: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  username,
  onClose,
  onSuccess
}) => {
  const { enable2FAForUser, disable2FAForUser, posUsers, currentPosUser } = useApp();

  const user = posUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
  const isAlreadyEnabled = Boolean(user?.is_2fa_enabled);

  const [step, setStep] = useState<number>(isAlreadyEnabled ? 3 : 1);
  const [secret, setSecret] = useState<string>('');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState<string>('');
  const [copiedSecret, setCopiedSecret] = useState<boolean>(false);
  const [copiedBackup, setCopiedBackup] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isAlreadyEnabled) {
      const sec = generateTotpSecret(16);
      setSecret(sec);
      setQrUrl(getTotpQrCodeUrl(username, sec));
      setBackupCodes(generateBackupCodes());
    }
  }, [username, isAlreadyEnabled]);

  const handleCopySecret = () => {
    navigator.clipboard?.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyBackup = () => {
    navigator.clipboard?.writeText(backupCodes.join('\n'));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const handleConfirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = verifyCode.replace(/[\s-]/g, '').trim();
    if (clean.length < 6) {
      setErrorMsg('Voer de 6-cijferige code uit je Authenticator app in.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await enable2FAForUser(username, secret, clean, backupCodes);
      if (res.success) {
        showToast('🔐 2FA Tweestapsverificatie succesvol geactiveerd!', 'success');
        setStep(3);
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.message || 'Ongeldige 2FA code. Controleer de code in je Authenticator app.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Fout bij inschakelen van 2FA.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm(`Weet je zeker dat je 2FA Tweestapsverificatie wilt uitschakelen voor @${username}?`)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await disable2FAForUser(username);
      if (res.success) {
        showToast(`2FA uitgeschakeld voor @${username}`, 'info');
        onClose();
      } else {
        showToast(res.message, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-purple-500/40 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-950/60 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <span>🔐 2FA Tweestapsverificatie Instellen</span>
                {isAlreadyEnabled && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    ✓ Actief
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Extra beveiliging voor account <strong className="text-purple-300">@{username}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-purple-950/30 border border-purple-500/30 rounded-2xl p-4 space-y-2">
                <h4 className="font-extrabold text-sm text-purple-200 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  Stap 1: Scan de QR code in je Authenticator app
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  Open Google Authenticator, Authy, Microsoft Authenticator of Apple Passwords op je telefoon en scan onderstaande QR code:
                </p>
              </div>

              {/* QR Code & Secret Box */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="2FA QR Code"
                    className="w-40 h-40 rounded-xl border border-white/10 bg-white p-2 shrink-0"
                  />
                ) : (
                  <div className="w-40 h-40 bg-slate-900 rounded-xl flex items-center justify-center text-slate-500 italic">
                    QR Laden...
                  </div>
                )}

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <span className="text-[11px] text-slate-400 block font-bold">
                    Kun je niet scannen? Voer deze geheime sleutel handmatig in:
                  </span>
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-purple-300 font-extrabold text-sm tracking-widest break-all flex items-center justify-between gap-2">
                    <span>{secret}</span>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="p-1 rounded hover:bg-slate-800 text-slate-300 transition"
                      title="Kopieer sleutel"
                    >
                      {copiedSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Type: Time-Based (TOTP) | Periode: 30s | Lengte: 6 cijfers
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-xl font-black text-xs bg-purple-600 hover:bg-purple-500 text-white transition shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
              >
                <span>Volgende: Code Verifiëren &amp; Noodcodes →</span>
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleConfirmEnable} className="space-y-4">
              <div className="bg-purple-950/30 border border-purple-500/30 rounded-2xl p-4 space-y-2">
                <h4 className="font-extrabold text-sm text-purple-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  Stap 2: Voer de 6-cijferige code in om te bevestigen
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  Voer de huidige 6-cijferige code in die je nu in je Authenticator app ziet verschijnen voor <strong className="text-purple-300">@{username}</strong>:
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  6-Cijferige Authenticator Code
                </label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value)}
                  placeholder="123 456"
                  maxLength={8}
                  autoFocus
                  className="w-full bg-slate-950 border border-purple-500/40 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Backup Codes Box */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-amber-300 text-xs flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    Jouw 5 Noodcodes (Bewaar deze goed!):
                  </strong>
                  <button
                    type="button"
                    onClick={handleCopyBackup}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 transition"
                  >
                    {copiedBackup ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Kopieer Noodcodes</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-amber-200 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  {backupCodes.map((c, i) => (
                    <span key={i} className="text-center font-bold">{c}</span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  Als je ooit je telefoon verliest, kun je één van deze Noodcodes gebruiken om in te loggen.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  ← Terug
                </button>
                <button
                  type="submit"
                  disabled={submitting || !verifyCode.trim()}
                  className="flex-1 py-2.5 rounded-xl font-black text-xs bg-purple-600 hover:bg-purple-500 text-white transition shadow-lg disabled:opacity-50"
                >
                  {submitting ? 'Inschakelen...' : '2FA Activeren & Opslaan'}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-base text-white">
                  2FA Tweestapsverificatie is Actief!
                </h4>
                <p className="text-xs text-slate-300">
                  Account <strong className="text-purple-300">@{username}</strong> is nu extra beveiligd met Google Authenticator / Authy / Apple Passwords.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-left text-xs space-y-1.5">
                <span className="font-bold text-emerald-300 block">Wat betekent dit?</span>
                <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11px]">
                  <li>Bij het inloggen als @{username} wordt voortaan eerst je wachtwoord én daarna je 6-cijferige Authenticator code gevraagd.</li>
                  <li>Bij gevoelige manager-acties (zoals Master PIN) zorgt 2FA voor maximale bescherming tegen hacks en sabotage.</li>
                </ul>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDisable2FA}
                  disabled={submitting}
                  className="py-2.5 px-4 rounded-xl font-bold text-xs bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>2FA Uitschakelen</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl font-black text-xs bg-purple-600 hover:bg-purple-500 text-white transition shadow-lg"
                >
                  Klaar &amp; Sluiten
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
