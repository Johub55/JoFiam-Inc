import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AudioFX, SpeechVoiceOption } from '../../services/audio';
import { getStatusMeta, isOrderInProgress, isOrderReady } from '../../services/orderStatus';
import { 
  Tv, 
  Volume2, 
  Maximize2, 
  Minimize2, 
  Clock, 
  Sparkles, 
  BellRing,
  Settings2,
  CheckCircle2,
  X,
  VolumeX,
  Radio,
  Sliders,
  Play
} from 'lucide-react';

export const PickupScreen: React.FC = () => {
  const { orders, pickupClosed, setTrackedOrderNo, activeBrand } = useApp();
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [timeStr, setTimeStr] = useState<string>('');
  const [showVoiceSettings, setShowVoiceSettings] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechVoiceOption[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('wd_tts_voice') || '' : ''
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(AudioFX.isEnabled);

  const isKoekploeg = activeBrand === 'koekploeg';
  const brandTitle = isKoekploeg ? 'De Koekploeg' : 'Werkdonalds';
  const brandEmoji = isKoekploeg ? '🧇' : '🍔';

  // Real-time clock for fastfood TV screen
  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load available speech synthesis voices (with Linux reload detection)
  useEffect(() => {
    const refreshVoices = () => {
      const v = AudioFX.getAvailableVoices();
      setAvailableVoices(v);
    };

    refreshVoices();
    const t = setTimeout(refreshVoices, 500);
    const t2 = setTimeout(refreshVoices, 1500);

    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [showVoiceSettings]);

  // CRITICAL REQUIREMENT:
  // "en als het een bezorgen is kan je het niet omroepen en hoeft het niet op het scherm snap je ik wil een verbetering voor het afhaalscherm"
  // Filter out all delivery orders!
  const pickupOrders = orders.filter(o => 
    o.orderType !== 'delivery' && 
    !o.identifier?.toLowerCase().includes('bezorg')
  );

  const prepOrders = pickupOrders.filter(o => isOrderInProgress(o.status)).slice(0, 24);
  const readyOrders = pickupOrders.filter(o => isOrderReady(o.status)).slice(0, 24);

  const handleToggleTvMode = () => {
    const next = !isTvMode;
    setIsTvMode(next);
    if (next) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleSelectVoice = (uri: string) => {
    setSelectedVoiceURI(uri);
    if (typeof window !== 'undefined') {
      if (uri) {
        localStorage.setItem('wd_tts_voice', uri);
      } else {
        localStorage.removeItem('wd_tts_voice');
      }
    }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    AudioFX.setEnabled(next);
  };

  const handleTestTtsAnnouncement = (orderNum: number = 1002, targetName: string = 'Tafel 4') => {
    AudioFX.speakOrder(orderNum, targetName, 'dine_in');
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden select-none ${
      isTvMode 
        ? 'fixed inset-0 z-50 bg-slate-950 p-4 sm:p-6 lg:p-8' 
        : 'h-[calc(100vh-108px)] bg-slate-950 p-3 sm:p-5'
    }`}>
      
      {/* Control Toolbar (Only visible when not in fullscreen TV mode) */}
      {!isTvMode && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Tv className={`w-6 h-6 ${isKoekploeg ? 'text-amber-400' : 'text-blue-400'}`} />
              <span>{brandTitle} Afhaalscherm (Klantenscherm &amp; TV)</span>
            </h1>
            <p className="text-xs text-slate-400">
              Live omroep en afhaalscherm · Bezorgingen worden automatisch gefilterd en niet omgeroepen.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Mute Toggle */}
            <button
              onClick={handleToggleSound}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                soundEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border-rose-800'
              }`}
              title={soundEnabled ? 'Geluid & TTS Omroep staat aan' : 'Geluid & TTS Omroep staat uit'}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Audio: Aan</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-rose-400" />
                  <span>Audio: Gedempt</span>
                </>
              )}
            </button>

            {/* Test Voice Button */}
            <button
              onClick={() => handleTestTtsAnnouncement(1002, 'Tafel 4')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Test TTS omroep (Linux &amp; Chrome ondersteund)"
            >
              <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Test Omroep</span>
            </button>

            {/* Voice & Linux TTS settings button */}
            <button
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                showVoiceSettings 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">TTS Stemmen</span>
            </button>

            {/* Fullscreen TV Mode */}
            <button
              onClick={handleToggleTvMode}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black shadow-lg transition active:scale-95 ${
                isKoekploeg
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
              }`}
            >
              <Maximize2 className="w-4 h-4" />
              <span>Start TV Modus</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Toolbar when in Fullscreen TV mode */}
      {isTvMode && (
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{brandEmoji}</span>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {brandTitle} Afhaalscherm
              </h1>
              <p className="text-xs text-slate-400">
                Let op je bestelnummer en tafelnummer/naam
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-amber-300 font-mono font-bold text-base shadow-inner">
              🕒 {timeStr}
            </div>

            <button
              onClick={handleToggleTvMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 backdrop-blur"
              title="Sluit TV scherm"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Verlaat TV</span>
            </button>
          </div>
        </div>
      )}

      {/* Voice & Linux Settings Dropdown/Drawer */}
      {showVoiceSettings && !isTvMode && (
        <div className="my-3 p-4 bg-slate-900 border border-slate-700 rounded-2xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                TTS Omroepstem &amp; Linux Instellingen
              </h3>
            </div>
            <button
              onClick={() => setShowVoiceSettings(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-300 font-bold block mb-1">
                Kies Spraakstem (Linux / Chromium / Systeem):
              </label>
              <select
                value={selectedVoiceURI}
                onChange={e => handleSelectVoice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400 text-xs"
              >
                <option value="">-- Automatische Nederlandse Stem (Aanbevolen) --</option>
                {availableVoices.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang}) {v.isDutch ? '🇳🇱/🇧🇪' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Op Linux systemen zonder Nederlands taalpakket kiest het systeem automatisch de beste beschikbare spraakengine met Nederlandse fonetische uitspraak.
              </p>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">
                Omroep Sample Testen:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleTestTtsAnnouncement(1001, 'Tafel 2')}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>"Bestelling 1001 voor Tafel 2..."</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTestTtsAnnouncement(1005, 'Jan Bakker')}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 text-blue-400" />
                  <span>"Bestelling 1005 voor Jan Bakker..."</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content: 2-Column Fastfood Board */}
      {pickupClosed ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 text-4xl shadow-2xl">
            🔴
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">AFHAALBALIE MOMENTEEL GESLOTEN</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-md">
            De keuken en afhaalbalie zijn op dit moment gesloten. Tot ziens bij {brandTitle}!
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 pt-3 overflow-hidden">
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 overflow-hidden">
            
            {/* ========================================================= */}
            {/* COLUMN 1: WORDT BEREID                                    */}
            {/* ========================================================= */}
            <div className="flex flex-col bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-2">
                      <span>⏳ Wordt bereid</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-black border border-amber-500/30">
                        {prepOrders.length}
                      </span>
                    </h2>
                    <span className="text-xs text-slate-400">Onze keuken bereidt je bestelling vers</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pt-4">
                {prepOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 font-bold text-sm">
                    <span className="text-3xl mb-1">{brandEmoji}</span>
                    <span>Geen bestellingen in bereiding</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {prepOrders.map(o => {
                      const meta = getStatusMeta(o.status);
                      const displayName = o.identifier || (o.orderType === 'dine_in' ? 'Tafel' : 'Afhaal');

                      return (
                        <div
                          key={o.no}
                          onClick={() => setTrackedOrderNo(o.no)}
                          className="p-3.5 rounded-2xl bg-slate-950 border-2 border-dashed border-amber-500/40 text-left shadow-inner flex flex-col justify-between hover:border-amber-400 transition cursor-pointer group"
                          title="Klik om status te bekijken"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-black text-2xl sm:text-3xl text-amber-300 group-hover:scale-105 transition-transform">
                                #{o.no}
                              </span>
                              <span className="text-sm">
                                {o.orderType === 'dine_in' ? '🍽️' : '🛍️'}
                              </span>
                            </div>

                            {/* Customer Name or Table Number */}
                            <div className="mt-1 font-bold text-xs text-slate-200 truncate" title={displayName}>
                              voor {displayName}
                            </div>
                          </div>

                          {/* Live Status Tag */}
                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-amber-400/90 flex items-center gap-1 truncate">
                              <span>{meta.emoji}</span>
                              <span className="truncate">{meta.shortLabel}</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {o.time}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================= */}
            {/* COLUMN 2: GEREED OM AF TE HALEN                           */}
            {/* ========================================================= */}
            <div className="flex flex-col bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden ring-1 ring-emerald-500/30">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
                    <BellRing className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-emerald-400 flex items-center gap-2">
                      <span>🔔 Gereed om af te halen</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-black border border-emerald-500/30">
                        {readyOrders.length}
                      </span>
                    </h2>
                    <span className="text-xs text-slate-400">Kom nu naar de balie met je nummer</span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Afhalen bij balie</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pt-4">
                {readyOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 font-bold text-sm">
                    <span className="text-3xl mb-1">✨</span>
                    <span>Nog geen bestellingen gereed</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {readyOrders.map(o => {
                      const displayName = o.identifier || (o.orderType === 'dine_in' ? 'Tafel' : 'Afhaal');

                      return (
                        <div
                          key={o.no}
                          onClick={() => setTrackedOrderNo(o.no)}
                          className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 to-slate-950 border-2 border-emerald-400 text-left shadow-lg shadow-emerald-500/15 flex flex-col justify-between hover:scale-[1.02] transition cursor-pointer group animate-in fade-in"
                          title="Klik om live status pop-up te bekijken"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-black text-3xl sm:text-4xl text-emerald-300 group-hover:text-emerald-200 tracking-tight">
                                #{o.no}
                              </span>
                              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                            </div>

                            {/* Wording according to user requirement */}
                            <div className="mt-2 font-black text-sm text-white truncate" title={displayName}>
                              voor <span className="text-emerald-300">{displayName}</span>
                            </div>
                            
                            <p className="text-[11px] text-emerald-400/90 font-bold mt-0.5">
                              ✓ Is gereed om af te halen
                            </p>
                          </div>

                          <div className="mt-3 pt-2 border-t border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300 font-bold">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Meld je bij de balie</span>
                            </span>
                            <span className="text-[10px] text-emerald-400/80 font-mono">
                              {o.time}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Bottom Fastfood Ticker Banner */}
          <div className="bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white">{brandTitle} Live Afhaal Service</span>
              <span className="hidden md:inline text-slate-500">| Bestel via Kassa of Kiosk | Eet smakelijk!</span>
            </div>

            <div className="font-mono font-bold text-slate-300">
              {timeStr}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
