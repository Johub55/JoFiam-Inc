import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SCHEMA_ONLY_SUPABASE_SQL, BASIS_SUPABASE_SQL, UNIFIED_SUPABASE_SQL } from '../services/sqlScripts';
import { DEFAULT_PRODUCTS } from '../services/defaultProducts';
import { 
  Database, 
  Copy, 
  Check, 
  X, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Zap, 
  AlertCircle,
  Download,
  CloudUpload,
  RefreshCw,
  Shield
} from 'lucide-react';

interface SupabaseModalProps {
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ onClose }) => {
  const { supabaseConfig, setSupabaseConfig, isSupabaseConfigured, resetProductsToDefault } = useApp();
  const [copied, setCopied] = useState<boolean>(false);
  const [downloaded, setDownloaded] = useState<boolean>(false);
  const [syncingCloud, setSyncingCloud] = useState<boolean>(false);
  const [syncMsg, setSyncMsg] = useState<{ success: boolean; text: string } | null>(null);

  // SQL Script variant: 'schema_only' (recommended: no product reset), 'basis', or 'full'
  const [sqlVariant, setSqlVariant] = useState<'schema_only' | 'basis' | 'full'>('schema_only');

  const [url, setUrl] = useState<string>(supabaseConfig.supabaseUrl || '');
  const [anonKey, setAnonKey] = useState<string>(supabaseConfig.supabaseAnonKey || '');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const activeSqlCode = 
    sqlVariant === 'schema_only' ? SCHEMA_ONLY_SUPABASE_SQL :
    sqlVariant === 'basis' ? BASIS_SUPABASE_SQL :
    UNIFIED_SUPABASE_SQL;

  const handleCopySql = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(activeSqlCode);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = activeSqlCode;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (e) {
      console.warn("Fallback copy method used due to clipboard error:", e);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadSql = () => {
    const filename = 
      sqlVariant === 'schema_only' ? 'database-schema-only.sql' :
      sqlVariant === 'basis' ? 'database-basis.sql' :
      'database.sql';

    const blob = new Blob([activeSqlCode], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  const handleCloudSyncProducts = async () => {
    setSyncingCloud(true);
    setSyncMsg(null);
    try {
      resetProductsToDefault();
      setSyncMsg({
        success: true,
        text: `Alle ${DEFAULT_PRODUCTS.length} Werkdonalds artikelen zijn lokaal klaargezet en direct verzonden naar je Supabase database!`
      });
    } catch (err: any) {
      setSyncMsg({
        success: false,
        text: `Fout bij synchroniseren: ${err?.message || 'Controleer je verbinding'}`
      });
    } finally {
      setTimeout(() => setSyncingCloud(false), 800);
    }
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setSupabaseConfig({
      supabaseUrl: url.trim(),
      supabaseAnonKey: anonKey.trim()
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950/60 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-lg text-white flex items-center gap-2">
                <span>Supabase Integratie &amp; SQL Handleiding</span>
                {isSupabaseConfigured ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                    ⚡ Verbonden
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                    💾 Lokale Simulatie Actief
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Wat moet je doen in Supabase? Volg deze stappen om Werkdonalds en WerkPay te koppelen.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          
          {/* Why & How explanation card */}
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
            <h3 className="font-extrabold text-sm text-emerald-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Waarom en hoe werken de twee apps samen in Supabase?
            </h3>
            <p className="leading-relaxed text-slate-300">
              Voorheen waren Werkdonalds (kassa) en WerkPay (bank) twee losse systemen. Nu delen ze één centrale, veilige database:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>
                <strong>Atomische RPC betalingen:</strong> De opgeslagen functies (<code className="text-emerald-300 font-mono">werkpay_charge_by_login</code> en <code className="text-emerald-300 font-mono">werkpay_charge_by_card</code>) controleren het banksaldo en boeken het geld in 1 ondeelbare database-transactie af. Hierdoor ontstaat er nooit een discrepantie tussen kassa en bank.
              </li>
              <li>
                <strong>Live Synchronisatie:</strong> Bestelt een klant aan de kassa of kiosk, dan ziet de keuken het direct op het Keukenscherm (KDS), en het Afhaalscherm (TV) roept het bestelnummer om zodra de keuken op gereed klikt.
              </li>
              <li>
                <strong>Centraal Klant- &amp; Saldooverzicht:</strong> In WerkPay ziet de klant direct zijn betaling aan Werkdonalds in zijn rekeningoverzicht.
              </li>
            </ul>
          </div>

          {/* 4 Step Action Guide */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
              Wat moet jij doen in Supabase? (4 simpele stappen)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center mb-1">
                  1
                </span>
                <strong className="text-white block">Open de SQL Editor</strong>
                <p className="text-slate-400">
                  Ga in je Supabase project dashboard naar het linkermenu en klik op het <strong>SQL Editor</strong> icoon.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center mb-1">
                  2
                </span>
                <strong className="text-white block">Maak een Nieuwe Query</strong>
                <p className="text-slate-400">
                  Klik bovenaan op <strong>+ New query</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center mb-1">
                  3
                </span>
                <strong className="text-white block">Plak het Gecombineerde SQL Script</strong>
                <p className="text-slate-400">
                  Klik hieronder op <em>"Kopieer SQL Script"</em> en plak alle SQL-code in het query-invoerveld.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center mb-1">
                  4
                </span>
                <strong className="text-white block">Klik op RUN (Uitvoeren)</strong>
                <p className="text-slate-400">
                  Klik op de groene knop <strong>RUN</strong> rechtsonder. Alle tabellen, RPC-functies en demo-accounts worden in enkele seconden aangemaakt!
                </p>
              </div>
            </div>
          </div>

          {/* SQL Copy & Download Box */}
          <div className="space-y-3">
            
            {/* Variant Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setSqlVariant('schema_only')}
                className={`flex-1 min-w-[140px] px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  sqlVariant === 'schema_only'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>🛡️ Schema Only (Geen Reset)</span>
              </button>

              <button
                type="button"
                onClick={() => setSqlVariant('basis')}
                className={`flex-1 min-w-[120px] px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  sqlVariant === 'basis'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>📄 Basis Tabellen</span>
              </button>

              <button
                type="button"
                onClick={() => setSqlVariant('full')}
                className={`flex-1 min-w-[120px] px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  sqlVariant === 'full'
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20 font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>📦 Volledig + Seed</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-200 block text-xs">
                  {sqlVariant === 'schema_only' && '🛡️ Schema Only (Aanbevolen voor bestaande projecten)'}
                  {sqlVariant === 'basis' && '📄 Basis Schema (Alleen 5 kern-tabellen)'}
                  {sqlVariant === 'full' && '📦 Volledige Unificatie + Standaard Menu Data'}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">
                  {sqlVariant === 'schema_only' && '✓ Inclusief Telefoon Chat, Cash, Audit logs, RLS & Realtime — ZONDER jouw producten te overschrijven'}
                  {sqlVariant === 'basis' && '✓ Uitsluitend de basis-tabellen voor snelle opstart'}
                  {sqlVariant === 'full' && '✓ Alle tabellen + 138 standaard producten (ON CONFLICT DO NOTHING)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSql}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                >
                  {downloaded ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{downloaded ? 'Gedownload!' : 'Download .sql'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow ${
                    copied 
                      ? 'bg-emerald-500 text-slate-950' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Gekopieerd!' : 'Kopieer SQL'}</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-[11px] text-slate-300 overflow-x-auto max-h-56 leading-relaxed select-all">
                {activeSqlCode}
              </pre>
            </div>

            {/* Direct Cloud Push Button */}
            <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <strong className="text-blue-300 text-xs flex items-center gap-1.5">
                  <CloudUpload className="w-4 h-4" />
                  Direct alle 138 producten naar de cloud sturen?
                </strong>
                <p className="text-[11px] text-slate-400">
                  Als je al verbonden bent met Supabase, hoef je de SQL niet eens handmatig te plakken.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloudSyncProducts}
                disabled={syncingCloud}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition shadow shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingCloud ? 'animate-spin' : ''}`} />
                <span>{syncingCloud ? 'Synchroniseren...' : 'Push 138 Producten'}</span>
              </button>
            </div>

            {/* Quick Status / RLS Fix Snippets for Supabase */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Phone Only SQL Snippet */}
              <div className="p-3.5 bg-cyan-950/30 border border-cyan-500/30 rounded-2xl space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    📱 Alleen Telefoon SMS &amp; Realtime Toevoegen
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const phoneSql = `CREATE TABLE IF NOT EXISTS public.phone_messages (
  id BIGSERIAL PRIMARY KEY,
  contact_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.phone_messages ADD COLUMN IF NOT EXISTS contact_id TEXT;
ALTER TABLE public.phone_messages ADD COLUMN IF NOT EXISTS sender TEXT;
ALTER TABLE public.phone_messages ADD COLUMN IF NOT EXISTS text TEXT;
ALTER TABLE public.phone_messages ADD COLUMN IF NOT EXISTS timestamp TEXT;

CREATE INDEX IF NOT EXISTS idx_phone_messages_contact ON public.phone_messages(contact_id);

ALTER TABLE public.phone_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access phone_messages" ON public.phone_messages;
CREATE POLICY "Public access phone_messages" ON public.phone_messages FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.phone_messages TO postgres, anon, authenticated, service_role;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.phone_messages; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;`;
                      try {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(phoneSql);
                        } else {
                          const textArea = document.createElement("textarea");
                          textArea.value = phoneSql;
                          textArea.style.position = "fixed";
                          textArea.style.left = "-999999px";
                          textArea.style.top = "-999999px";
                          document.body.appendChild(textArea);
                          textArea.focus();
                          textArea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textArea);
                        }
                      } catch (e) {
                        console.warn("Fallback copy method used due to clipboard error:", e);
                      }
                      alert('Telefoon SQL gekopieerd! Plak dit in de Supabase SQL Editor om alleen de telefoon toe te voegen.');
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition shrink-0"
                  >
                    Kopieer Telefoon SQL
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Voegt uitsluitend de <code className="text-cyan-300">phone_messages</code> tabel en realtime toe aan een bestaande Supabase database zonder iets anders aan te raken.
                </p>
              </div>

              {/* RLS Order Status Fix Snippet */}
              <div className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-2xl space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    🛡️ Snelle RLS Fix (Bestelstatussen)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const rlsSql = `ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;\nGRANT ALL ON TABLE public.orders TO anon, authenticated, service_role;\nGRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;`;
                      try {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(rlsSql);
                        } else {
                          const textArea = document.createElement("textarea");
                          textArea.value = rlsSql;
                          textArea.style.position = "fixed";
                          textArea.style.left = "-999999px";
                          textArea.style.top = "-999999px";
                          document.body.appendChild(textArea);
                          textArea.focus();
                          textArea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textArea);
                        }
                      } catch (e) {
                        console.warn("Fallback copy method used due to clipboard error:", e);
                      }
                      alert('RLS SQL gekopieerd! Plak dit in de Supabase SQL Editor om updates toe te staan.');
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-lg transition shrink-0"
                  >
                    Kopieer RLS Fix
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Als Supabase Row Level Security aan heeft staan zonder update-rechten, weigert de cloud database statuswijzigingen. Voer dit 2-regelig scriptje uit.
                </p>
              </div>

            </div>

            {syncMsg && (
              <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                syncMsg.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                {syncMsg.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{syncMsg.text}</span>
              </div>
            )}
          </div>

          {/* Optional Supabase Credentials Connection */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white">Verbind met jouw Supabase Project (Optioneel)</h4>
                <p className="text-[11px] text-slate-400">
                  Vul hieronder je Supabase Project URL &amp; Anon Key in om rechtstreeks met de cloud te communiceren. (Als je dit leeg laat, werkt alles soepel via de snelle lokale database simulatie!)
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCredentials} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1">
                  Project URL (https://xxxx.supabase.co)
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://xyzproject.supabase.co"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1">
                  Anon / Public API Key
                </label>
                <input
                  type="text"
                  value={anonKey}
                  onChange={e => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              {saveSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Supabase instellingen opgeslagen!</span>
                </div>
              )}

              <button
                type="submit"
                className="py-2 px-4 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
              >
                Instellingen Opslaan &amp; Verbinden
              </button>
            </form>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
};
