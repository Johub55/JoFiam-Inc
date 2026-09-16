import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AudioFX, SpeechVoiceOption, TtsEngineMode, AudioDiagnosticStatus } from '../../services/audio';
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
  Sliders,
  Play,
  Globe,
  Laptop,
  Megaphone,
  Radio,
  Cpu,
  Link,
  Code2,
  RefreshCw,
  Activity,
  AlertTriangle,
  Check
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
  const [ttsMode, setTtsMode] = useState<TtsEngineMode>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('wd_tts_mode') || 'auto' : 'auto') as TtsEngineMode;
  });
  const [customTtsUrl, setCustomTtsUrl] = useState<string>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('wd_custom_tts_url') || '' : '';
  });
  const [customTemplate, setCustomTemplate] = useState<string>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('wd_tts_custom_template') || 'Bestelling {orderNo} voor {target} is gereed om af te halen!' : 'Bestelling {orderNo} voor {target} is gereed om af te halen!';
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(AudioFX.isEnabled);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(() => AudioFX.getIsUnlocked());
  const [activeAnnouncement, setActiveAnnouncement] = useState<{ orderNo: number | string; text: string; id: number } | null>(null);
  const [diagnostics, setDiagnostics] = useState<AudioDiagnosticStatus>(() => AudioFX.getDiagnostics());

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

  // Subscribe to live audio diagnostics
  useEffect(() => {
    const unsub = AudioFX.subscribeDiagnostics((diag) => {
      setDiagnostics(diag);
      if (diag.isUnlocked) {
        setIsAudioUnlocked(true);
      }
    });
    return unsub;
  }, []);

  // Listen for live spoken announcements to show on-screen visual banner
  useEffect(() => {
    const unsub = AudioFX.subscribeAnnouncement((announcement) => {
      setActiveAnnouncement(announcement);
      setIsAudioUnlocked(true);
      if (announcement) {
        const timer = setTimeout(() => {
          setActiveAnnouncement(prev => prev?.id === announcement.id ? null : prev);
        }, 8000);
        return () => clearTimeout(timer);
      }
    });
    return unsub;
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
    AudioFX.unlock();
    setIsAudioUnlocked(true);
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

  const handleSelectTtsMode = (mode: TtsEngineMode) => {
    setTtsMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wd_tts_mode', mode);
    }
  };

  const handleSaveCustomUrl = (url: string) => {
    setCustomTtsUrl(url);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wd_custom_tts_url', url);
    }
  };

  const handleSaveCustomTemplate = (template: string) => {
    setCustomTemplate(template);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wd_tts_custom_template', template);
    }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    AudioFX.setEnabled(next);
    if (next) {
      AudioFX.unlock();
      setIsAudioUnlocked(true);
    }
  };

  const handleUnlockAndTest = (orderNum: number = 1002, targetName: string = 'Tafel 4') => {
    AudioFX.unlock();
    setIsAudioUnlocked(true);
    AudioFX.speakOrder(orderNum, targetName, 'dine_in');
  };

  return (
    <div 
      onClick={() => {
        if (!isAudioUnlocked) {
          AudioFX.unlock();
          setIsAudioUnlocked(true);
        }
      }}
      className={`flex-1 flex flex-col overflow-hidden select-none relative ${
        isTvMode 
          ? 'fixed inset-0 z-50 bg-slate-950 p-4 sm:p-6 lg:p-8' 
          : 'h-[calc(100vh-108px)] bg-slate-950 p-3 sm:p-5'
      }`}
    >
      
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
            {/* Audio Unlock / Test Button (Crucial for Linux & Opera autoplay bypass) */}
            <button
              onClick={() => handleUnlockAndTest(1002, 'Tafel 4')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm ${
                isAudioUnlocked 
                  ? 'bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border-emerald-800/80'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 animate-pulse font-black'
              }`}
              title="Klik om audio en spraaksynthese direct te ontgrendelen en te testen"
            >
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>{isAudioUnlocked ? '🔊 Geluid Actief' : '⚡ Klik: Activeer Geluid'}</span>
            </button>

            {/* Test Voice Button */}
            <button
              onClick={() => handleUnlockAndTest(1001, 'Jan')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Test TTS omroep direct"
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
              <Settings2 className="w-4 h-4 text-amber-400" />
              <span>Custom TTS &amp; Audio</span>
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
            <button
              onClick={() => handleUnlockAndTest(1002, 'Tafel 4')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 hover:bg-slate-800"
            >
              <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Test Stem</span>
            </button>

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

      {/* Live Visual Spoken Announcement Banner (Displays on TV & Screen with wave animation) */}
      {activeAnnouncement && (
        <div className="my-2 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-blue-500/20 border-2 border-emerald-400/80 text-white shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black animate-bounce shadow-lg">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Omroep Luidspreker
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                  Bestelling #{activeAnnouncement.orderNo}
                </span>
              </div>
              <p className="text-sm sm:text-base font-black text-white mt-0.5">
                "{activeAnnouncement.text}"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleUnlockAndTest(Number(activeAnnouncement.orderNo))}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Herhaal</span>
            </button>
            <button
              onClick={() => setActiveAnnouncement(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Voice, Custom TTS & Linux/Opera Diagnostics Settings Panel */}
      {showVoiceSettings && !isTvMode && (
        <div className="my-3 p-4 sm:p-5 bg-slate-900 border border-slate-700 rounded-3xl space-y-4 shadow-2xl animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Custom TTS &amp; Spraaksynthese Instellingen
                </h3>
                <p className="text-xs text-slate-400">
                  Speciaal ontworpen voor 100% betrouwbaarheid op Linux, Opera, Windows, macOS &amp; Android.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowVoiceSettings(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Real-time Diagnostics Bar */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 font-mono">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-slate-400">AudioContext:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${
                  diagnostics.ctxState === 'running' 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {diagnostics.ctxState}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Laatste status:</span>
                <span className="text-slate-200 font-medium">{diagnostics.lastMessage}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  AudioFX.unlock();
                  AudioFX.bell();
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] border border-slate-700 flex items-center gap-1"
              >
                <Play className="w-3 h-3 text-amber-400" />
                <span>Test Bel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  AudioFX.unlock();
                  AudioFX.playSpeech('Dit is een test van de geselecteerde spraakengine.');
                }}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 shadow"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Test Spraak</span>
              </button>
            </div>
          </div>

          {/* Engine Selection Cards */}
          <div>
            <label className="text-xs text-slate-300 font-bold block mb-2">
              Kies Spraakengine / TTS Bron:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              
              {/* Option 1: StreamElements Ruben */}
              <button
                type="button"
                onClick={() => handleSelectTtsMode('streamelements_ruben')}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  ttsMode === 'streamelements_ruben'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs flex items-center gap-1.5 text-blue-400">
                    <Globe className="w-4 h-4" />
                    <span>StreamElements (Ruben - Man)</span>
                  </span>
                  {ttsMode === 'streamelements_ruben' && <Check className="w-4 h-4 text-blue-400" />}
                </div>
                <p className="text-[11px] text-slate-400">
                  Natuurlijke Nederlandse mannenstem (AWS Polly). Werkt direct op Linux, Opera &amp; Windows via directe audio stream.
                </p>
              </button>

              {/* Option 2: StreamElements Lotte */}
              <button
                type="button"
                onClick={() => handleSelectTtsMode('streamelements_lotte')}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  ttsMode === 'streamelements_lotte'
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs flex items-center gap-1.5 text-purple-400">
                    <Globe className="w-4 h-4" />
                    <span>StreamElements (Lotte - Vrouw)</span>
                  </span>
                  {ttsMode === 'streamelements_lotte' && <Check className="w-4 h-4 text-purple-400" />}
                </div>
                <p className="text-[11px] text-slate-400">
                  Vriendelijke Nederlandse vrouwenstem (AWS Polly). Snelle laadtijd en zuivere uitspraak.
                </p>
              </button>

              {/* Option 3: Web Audio Synth (100% Offline / Linux / Opera proof) */}
              <button
                type="button"
                onClick={() => handleSelectTtsMode('webaudio_synth')}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  ttsMode === 'webaudio_synth'
                    ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs flex items-center gap-1.5 text-emerald-400">
                    <Cpu className="w-4 h-4" />
                    <span>Pure Web Audio Synth (100% Offline)</span>
                  </span>
                  {ttsMode === 'webaudio_synth' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400">
                  Genereert synthetische klanken lokaal via AudioContext. Heeft GEEN internet, GEEN externe codecs en GEEN OS-stemmen nodig.
                </p>
              </button>

              {/* Option 4: Custom URL API */}
              <button
                type="button"
                onClick={() => handleSelectTtsMode('custom_url')}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  ttsMode === 'custom_url'
                    ? 'bg-amber-600/20 border-amber-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs flex items-center gap-1.5 text-amber-400">
                    <Link className="w-4 h-4" />
                    <span>Custom TTS API URL</span>
                  </span>
                  {ttsMode === 'custom_url' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400">
                  Koppel een eigen TTS endpoint of externe API (zoals VoiceRSS, ElevenLabs of eigen Node server).
                </p>
              </button>

              {/* Option 5: Native Speech */}
              <button
                type="button"
                onClick={() => handleSelectTtsMode('native')}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  ttsMode === 'native'
                    ? 'bg-cyan-600/20 border-cyan-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs flex items-center gap-1.5 text-cyan-400">
                    <Laptop className="w-4 h-4" />
                    <span>Browser Systeemstem ({availableVoices.length} stemmen)</span>
                  </span>
                  {ttsMode === 'native' && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <p className="text-[11px] text-slate-400">
                  Lokale stemmen van het besturingssysteem (SAPI5, speech-dispatcher of browser-engine).
                </p>
              </button>

              {/* Option 6: Auto Smart Mode */}
              <button
                type="button"
                onClick={() => handleSelectTtsMode('auto')}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  ttsMode === 'auto'
                    ? 'bg-rose-600/20 border-rose-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs flex items-center gap-1.5 text-rose-400">
                    <Sparkles className="w-4 h-4" />
                    <span>Auto Smart Cascade</span>
                  </span>
                  {ttsMode === 'auto' && <Check className="w-4 h-4 text-rose-400" />}
                </div>
                <p className="text-[11px] text-slate-400">
                  Probeert StreamElements Ruben &rarr; Systeemstem &rarr; Web Audio Synthesizer met automatische foutopvang.
                </p>
              </button>

            </div>
          </div>

          {/* Custom TTS URL Input & Template Configuration */}
          {ttsMode === 'custom_url' && (
            <div className="p-4 bg-slate-950 border border-amber-500/40 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Link className="w-4 h-4" />
                  <span>Aangepaste TTS URL Template:</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  Tokens: {'{text}'}, {'{orderNo}'}, {'{target}'}
                </span>
              </div>
              <input
                type="text"
                value={customTtsUrl}
                onChange={(e) => handleSaveCustomUrl(e.target.value)}
                placeholder="https://api.streamelements.com/kappa/v2/speech?voice=Ruben&text={text}"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
              
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                <span className="text-slate-400 font-bold">Voorbeeld presets:</span>
                <button
                  type="button"
                  onClick={() => handleSaveCustomUrl('https://api.streamelements.com/kappa/v2/speech?voice=Ruben&text={text}')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-blue-300 border border-slate-700"
                >
                  StreamElements Ruben
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCustomUrl('https://api.streamelements.com/kappa/v2/speech?voice=Lotte&text={text}')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-purple-300 border border-slate-700"
                >
                  StreamElements Lotte
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCustomUrl('https://api.voicerss.org/?key=DEMO_KEY&hl=nl-nl&src={text}')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700"
                >
                  VoiceRSS (NL)
                </button>
              </div>
            </div>
          )}

          {/* Custom Omroep Tekst Template */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <label className="text-slate-300 font-bold block mb-1">
                Aangepaste Omroepzin Template:
              </label>
              <input
                type="text"
                value={customTemplate}
                onChange={(e) => handleSaveCustomTemplate(e.target.value)}
                placeholder="Bestelling {orderNo} voor {target} is gereed om af te halen!"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400 text-xs"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Gebruik <code>{'{orderNo}'}</code> voor het nummer en <code>{'{target}'}</code> voor tafel of klantnaam.
              </p>
            </div>

            {ttsMode === 'native' && (
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Kies Lokale Systeemstem:
                </label>
                <select
                  value={selectedVoiceURI}
                  onChange={e => handleSelectVoice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400 text-xs"
                >
                  <option value="">-- Automatische Nederlandse Stem --</option>
                  {availableVoices.map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang}) {v.isDutch ? '🇳🇱/🇧🇪' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
