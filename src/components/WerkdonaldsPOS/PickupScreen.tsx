import React, { useState, useEffect, useRef } from 'react';
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
  Check,
  Users,
  Utensils
} from 'lucide-react';

interface AutoScrollingColumnProps {
  children: React.ReactNode;
  className?: string;
}

const AutoScrollingColumn: React.FC<AutoScrollingColumnProps> = ({ children, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let animationFrameId: number;
    let position = el.scrollTop;
    let active = true;

    const scroll = () => {
      if (!active || !el) return;

      const halfHeight = el.scrollHeight / 2;
      if (halfHeight <= el.clientHeight) {
        el.scrollTop = 0;
        position = 0;
        animationFrameId = requestAnimationFrame(scroll);
        return;
      }

      // Sync with manual scrolls if the user dragged or focused an item
      if (Math.abs(el.scrollTop - position) > 1.5) {
        position = el.scrollTop;
      }

      position += 0.35; // Continuous smooth scrolling speed

      if (position >= halfHeight) {
        position -= halfHeight;
      }

      el.scrollTop = position;
      animationFrameId = requestAnimationFrame(scroll);
    };

    // Delay start of scrolling slightly
    const delayTimer = setTimeout(() => {
      if (active) {
        scroll();
      }
    }, 1500);

    return () => {
      active = false;
      clearTimeout(delayTimer);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className={`${className} overflow-y-auto no-scrollbar`}>
      <div className="flex flex-col space-y-3 pb-3">
        {children}
      </div>
      <div className="flex flex-col space-y-3 pb-3" aria-hidden="true">
        {children}
      </div>
    </div>
  );
};

export const PickupScreen: React.FC = () => {
  const { orders, pickupClosed, orderStopActive, setTrackedOrderNo, activeBrand, brandProducts, products } = useApp();
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [tvView, setTvView] = useState<'pickup' | 'menu'>('pickup');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
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

  // Automatic rotation timer with dynamic timing for TV views
  useEffect(() => {
    if (!isTvMode || !autoRotate) return;

    // Show pickup (afhaallijst) for 15 seconds, and menu for 45 seconds
    const delay = tvView === 'pickup' ? 15000 : 45000;

    const timer = setTimeout(() => {
      setTvView((current) => (current === 'pickup' ? 'menu' : 'pickup'));
    }, delay);

    return () => clearTimeout(timer);
  }, [isTvMode, autoRotate, tvView]);

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
        }, 9000);
        return () => clearTimeout(timer);
      }
    });
    return unsub;
  }, []);

  // Synchroniseer afsluiten van volledig scherm (Esc / F11) met React-state van de TV-modus
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      if (!isCurrentlyFullscreen && isTvMode) {
        setIsTvMode(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTvMode) {
        if (e.key === 'Escape') {
          setIsTvMode(false);
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTvMode]);

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

  const waitingOrders = pickupOrders.filter(o => o.status === 'new' || o.status === 'wachten').slice(0, 15);
  const preparingOrders = pickupOrders.filter(o => o.status !== 'new' && o.status !== 'wachten' && isOrderInProgress(o.status)).slice(0, 15);
  const prepOrders = pickupOrders.filter(o => isOrderInProgress(o.status)).slice(0, 30);
  const readyOrders = pickupOrders.filter(o => isOrderReady(o.status)).slice(0, 30);

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

  // =========================================================================
  // DEDICATED FULLSCREEN FASTFOOD TV MODE BOARD
  // =========================================================================
  if (isTvMode) {
    const isStopOrClosed = orderStopActive || pickupClosed;

    // 1. TV BLOCKED / CLOSED SCREEN
    if (isStopOrClosed) {
      return (
        <div 
          id="werkdonalds-tv-blocked-root"
          className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col items-center justify-center p-8 select-none overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.12),transparent_70%)] pointer-events-none" />
          
          <div className="max-w-3xl text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
            {/* Blinking alarm warning light */}
            <div className="mx-auto w-24 h-24 rounded-full bg-rose-500/10 border-4 border-rose-500 text-rose-500 flex items-center justify-center text-4xl shadow-2xl animate-pulse ring-8 ring-rose-500/20">
              ⚠️
            </div>

            <div className="space-y-4">
              <span className="px-4 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs sm:text-sm font-black tracking-widest uppercase inline-block">
                {orderStopActive ? '⚠️ Tijdelijke Bestelstop Actief' : '🔴 Afhaalbalie Gesloten'}
              </span>
              
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight uppercase bg-gradient-to-r from-white via-slate-300 to-slate-500 bg-clip-text text-transparent">
                {orderStopActive ? "Tijdelijk Geen Bestellingen" : "Momenteel Gesloten"}
              </h1>
              
              <p className="text-base sm:text-xl lg:text-2xl text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
                {orderStopActive 
                  ? "Beste gast, wegens extreme drukte in onze keuken hebben we tijdelijk een bestelstop ingelast. We bereiden momenteel de lopende bestellingen voor. Excuses voor de vertraging!"
                  : "Beste gast, onze afhaalbalie en keuken zijn op dit moment gesloten. We verwelkomen je graag snel weer!"
                }
              </p>
            </div>

            {/* Crew message with brand name JoFiam */}
            <div className="pt-8 border-t border-slate-900 flex flex-col items-center justify-center gap-3">
              <p className="text-xs font-black tracking-widest uppercase text-slate-500">
                Met vriendelijke groet,
              </p>
              <div className="px-6 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-amber-400 text-base sm:text-lg font-black tracking-wider uppercase shadow-lg">
                🍳 De Keukenploeg van JoFiam Restaurants
              </div>
            </div>
          </div>

          {/* Quick exit button for admin/staff */}
          <button
            onClick={() => setIsTvMode(false)}
            className="absolute bottom-8 right-8 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl text-xs font-black transition"
          >
            Sluit TV Modus (Esc)
          </button>
        </div>
      );
    }

    // 2. NORMAL ACTIVE TV SCREEN WITH SLIDESHOW
    return (
      <div 
        id="werkdonalds-tv-mode-root"
        onClick={() => {
          if (!isAudioUnlocked) {
            AudioFX.unlock();
            setIsAudioUnlocked(true);
          }
        }}
        className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-4 sm:p-5 lg:p-6 select-none overflow-hidden"
      >
        {/* TV Header with Brand, Manual Tabs, Auto-rotate toggle and Clock */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 mb-4 border-b-2 border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center text-2xl shadow-xl font-black shrink-0">
              {brandEmoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
                  JoFiam Restaurants
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black tracking-wider uppercase flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live TV
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {tvView === 'pickup' ? "Houd uw bonnummer bij de hand voor afhalen" : "Kies uw favoriete gerecht van onze menukaart"}
              </p>
            </div>
          </div>

          {/* Interactive tabs to manually switch views */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => {
                setTvView('pickup');
                setAutoRotate(false); // pause auto rotation on manual click
              }}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition ${
                tvView === 'pickup'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Afhaallijst</span>
            </button>
            <button
              onClick={() => {
                setTvView('menu');
                setAutoRotate(false);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition ${
                tvView === 'menu'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Menukaart</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-rotate status indicator & toggle button */}
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 transition ${
                autoRotate
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
              }`}
              title="Schakel automatisch wisselen van schermen in of uit"
            >
              <span className={`w-2 h-2 rounded-full ${autoRotate ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <span>{autoRotate ? 'Auto-Wissel (15s/45s)' : 'Vastgezet'}</span>
            </button>

            {/* Giant Digital Time Clock */}
            <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-mono font-black text-xl shadow-inner tracking-wider">
              {timeStr}
            </div>

            {/* Exit TV mode button */}
            <button
              onClick={() => {
                setIsTvMode(false);
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
              }}
              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-xl transition"
              title="Sluit TV Volledig Scherm"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Live Spoken Announcement Overlay Banner on TV */}
        {activeAnnouncement && (
          <div className="mb-4 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-500/30 via-amber-500/30 to-emerald-500/30 border-4 border-emerald-400 shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-6 duration-300 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-400 text-slate-950 flex items-center justify-center font-black animate-bounce shadow-xl shrink-0">
                <Megaphone className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-emerald-300 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  OMROEP LUIDSPREKER · BESTELLING #{activeAnnouncement.orderNo}
                </span>
                <p className="text-xl sm:text-3xl font-black text-white mt-0.5 tracking-tight">
                  "{activeAnnouncement.text}"
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveAnnouncement(null)}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900/60"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* TV SLIDE VIEWS BODY */}
        <div className="flex-1 overflow-hidden relative">

          {/* VIEW A: LIVE AFHAAL LIJST (ORDERS) */}
          <div 
            className={`absolute inset-0 w-full h-full transition-all duration-500 transform ${
              tvView === 'pickup' 
                ? 'opacity-100 scale-100 pointer-events-auto z-10' 
                : 'opacity-0 scale-95 pointer-events-none z-0'
            }`}
          >
            <div className="h-full grid grid-cols-2 gap-6 overflow-hidden">
              {/* COLUMN 1: WACHTEN & WORDT BEREID */}
              <section className="flex flex-col bg-slate-900/80 border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between pb-4 border-b-2 border-slate-800 shrink-0 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
                      <Clock className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black text-amber-400 uppercase tracking-tight flex items-center gap-3">
                        <span>⏳ Bereiden</span>
                        <span className="text-sm px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-black border border-amber-500/40">
                          {prepOrders.length}
                        </span>
                      </h2>
                      <span className="text-xs sm:text-sm text-slate-400">Onze keukenploeg maakt uw gerechten vers</span>
                    </div>
                  </div>
                </div>

                {/* IN DE WACHTRIJ LIST */}
                <div className="mb-4 pb-4 border-b border-slate-800 shrink-0">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
                    📥 IN DE WACHTRIJ ({waitingOrders.length})
                  </h3>
                  {waitingOrders.length === 0 ? (
                    <p className="py-2 px-3 rounded-xl bg-slate-950/30 text-slate-500 text-xs font-bold border border-dashed border-slate-800/85">
                      Geen bestellingen in de wachtrij
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-[75px] overflow-y-auto">
                      {waitingOrders.map(o => (
                        <div 
                          key={o.no} 
                          className="px-3.5 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1 font-mono font-black text-base text-slate-300 shadow-sm"
                        >
                          <span className="text-slate-500 text-xs">#</span>
                          <span>{o.no}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* WORDT BEREID DETAILS */}
                <div className="flex-1 overflow-y-auto pr-1">
                  <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    🍳 BEREIDEN IN DE KEUKEN ({preparingOrders.length})
                  </h3>

                  {preparingOrders.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-slate-600 font-bold text-sm border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                      <span className="text-3xl mb-1">{brandEmoji}</span>
                      <span>Geen bestellingen in actieve bereiding</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                      {preparingOrders.map(o => {
                        const displayName = o.identifier || (o.orderType === 'dine_in' ? 'Tafel' : 'Afhaal');
                        return (
                          <div
                            key={o.no}
                            className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 text-left shadow-lg flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-black text-xl text-amber-300 tracking-tight">
                                  #{o.no}
                                </span>
                                <span className="text-sm">
                                  {o.orderType === 'dine_in' ? '🍽️' : '🛍️'}
                                </span>
                              </div>
                              <div className="mt-1 font-bold text-[11px] text-slate-300 truncate">
                                voor <span className="text-amber-200">{displayName}</span>
                              </div>
                            </div>
                            <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-amber-400/95 font-black">
                              <span>Bereiden...</span>
                              <span className="font-mono text-slate-500">{o.time}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              {/* COLUMN 2: GEREED OM AF TE HALEN */}
              <section className="flex flex-col bg-slate-900 border-4 border-emerald-500 rounded-3xl p-5 shadow-2xl overflow-hidden ring-4 ring-emerald-500/20">
                <div className="flex items-center justify-between pb-4 border-b-2 border-slate-800 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
                      <BellRing className="w-7 h-7 animate-bounce" />
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black text-emerald-400 uppercase tracking-tight flex items-center gap-3">
                        <span>🔔 Ophalen bij balie</span>
                        <span className="text-sm px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-black border border-emerald-500/40">
                          {readyOrders.length}
                        </span>
                      </h2>
                      <span className="text-xs sm:text-sm text-slate-400">Kom direct naar de afhaalbalie</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pt-4">
                  {readyOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 font-bold text-lg">
                      <span className="text-5xl mb-2">✨</span>
                      <span>Geen bestellingen gereed</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {readyOrders.map(o => {
                        const displayName = o.identifier || (o.orderType === 'dine_in' ? 'Tafel' : 'Afhaal');
                        const isCurrentAnnounced = activeAnnouncement?.orderNo === o.no;

                        return (
                          <div
                            key={o.no}
                            className={`p-4 rounded-2xl text-left shadow-2xl flex flex-col justify-between transition-all ${
                              isCurrentAnnounced 
                                ? 'bg-gradient-to-br from-emerald-900 to-amber-950 border-4 border-amber-400 scale-[1.03] ring-4 ring-amber-400/50' 
                                : 'bg-gradient-to-br from-emerald-950 to-slate-950 border-2 border-emerald-400'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-black text-3xl sm:text-4xl lg:text-5xl text-emerald-300 tracking-tight">
                                  #{o.no}
                                </span>
                                <span className="w-4 h-4 rounded-full bg-emerald-400 animate-ping" />
                              </div>

                              <div className="mt-2 font-black text-base text-white truncate">
                                voor <span className="text-emerald-300 font-black">{displayName}</span>
                              </div>

                              <p className="text-xs font-bold text-emerald-400 mt-0.5">
                                ✓ Gereed voor afhaal!
                              </p>
                            </div>

                            <div className="mt-3.5 pt-2 border-t border-emerald-500/30 flex items-center justify-between text-xs font-bold text-emerald-300">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Balie</span>
                              </span>
                              <span className="font-mono text-emerald-400/80">{o.time}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* VIEW B: DIGITAL MENUKAART / MENU BOARD */}
          <div 
            className={`absolute inset-0 w-full h-full transition-all duration-500 transform ${
              tvView === 'menu' 
                ? 'opacity-100 scale-100 pointer-events-auto z-10' 
                : 'opacity-0 scale-95 pointer-events-none z-0'
            }`}
          >
            {(() => {
            const allInStock = products.filter(p => p.inStock);

            const col1Items = allInStock.filter(p => p.id < 200 && (p.cat.includes('Burger') || p.cat.includes('Meal') || p.cat.includes('Voordeel')));
            const col2Items = allInStock.filter(p => p.id < 200 && (p.cat.includes('Snack') || p.cat.includes('Friet') || p.cat.includes('Saus') || p.cat.includes('Dip')));
            const col3Items = allInStock.filter(p => p.id < 200 && (p.cat.includes('Drank') || p.cat.includes('Dessert') || p.cat.includes('IJs') || p.cat.includes('Koffie')));
            const col4Items = allInStock.filter(p => p.id >= 200);

            const columns = [
              {
                brand: "🍔 WERKDONALDS",
                title: "Burgers & Wraps",
                icon: "🍔",
                items: col1Items,
                brandColor: "border-red-500/30 text-red-400 bg-red-950/20"
              },
              {
                brand: "🍟 WERKDONALDS",
                title: "Snacks, Frites & Dips",
                icon: "🍟",
                items: col2Items,
                brandColor: "border-amber-500/30 text-amber-400 bg-amber-950/20"
              },
              {
                brand: "🥤 WERKDONALDS",
                title: "Dranken & Desserts",
                icon: "🍦",
                items: col3Items,
                brandColor: "border-sky-500/30 text-sky-400 bg-sky-950/20"
              },
              {
                brand: "🧇 KOEKPLOEG",
                title: "Koeken & Stroopwafels",
                icon: "🧇",
                items: col4Items,
                brandColor: "border-amber-400/30 text-amber-300 bg-amber-950/30"
              }
            ];

            return (
              <div className="h-full flex flex-col bg-slate-900/95 border border-slate-800 rounded-3xl p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                <style>{`
                  .no-scrollbar::-webkit-scrollbar {
                    display: none;
                  }
                  .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                  }
                `}</style>

                <div className="pb-3 border-b border-slate-800 flex items-center justify-between shrink-0 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                      📖
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-amber-400 uppercase tracking-tight">
                        📖 GEZAMENLIJKE MENUKAART
                      </h2>
                      <p className="text-xs text-slate-400">Geniet van onze WerkDonalds &amp; Koekploeg specialiteiten</p>
                    </div>
                  </div>
                  <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700 font-bold">
                    🔄 Automatisch scrollende menukaart
                  </span>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 overflow-hidden">
                  {columns.map((col, idx) => (
                    <div key={idx} className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/80 flex flex-col overflow-hidden">
                      <div className="pb-2 border-b border-slate-900 shrink-0 space-y-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider inline-block ${col.brandColor}`}>
                          {col.brand}
                        </span>
                        <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                          <span>{col.icon}</span>
                          <span className="truncate">{col.title}</span>
                          <span className="text-slate-500 text-xs font-medium">({col.items.length})</span>
                        </h3>
                      </div>

                      <AutoScrollingColumn className="flex-1 space-y-3 pt-3.5 pr-1.5">
                        {col.items.length === 0 ? (
                          <p className="text-slate-600 text-xs font-bold py-4 text-center">Tijdelijk uitverkocht</p>
                        ) : (
                          col.items.map(p => (
                            <div key={p.id} className="flex items-center justify-between border-b border-slate-900/40 pb-2 gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xl shrink-0">{p.emoji || col.icon}</span>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-white truncate">{p.name}</p>
                                  <p className="text-[10px] text-slate-500 font-medium">Vers bereid</p>
                                </div>
                              </div>
                              <div className="text-right font-mono text-xs font-black text-amber-300 shrink-0">
                                {p.onSale && p.salePrice > 0 ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-slate-500 line-through">€{p.price.toFixed(2)}</span>
                                    <span className="text-emerald-400">€{p.salePrice.toFixed(2)}</span>
                                  </div>
                                ) : (
                                  <span>€{p.price.toFixed(2)}</span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </AutoScrollingColumn>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          </div>

        </div>

        {/* TV Bottom Marquee Bar */}
        <footer className="mt-4 pt-3 border-t-2 border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-400 font-bold shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white font-black">JOFIAM RESTAURANTS FASTFOOD SERVICE</span>
            <span className="hidden md:inline text-slate-500">· Bestel via Kassa of Kiosk · Eet smakelijk!</span>
          </div>
          <div className="text-slate-400 font-mono">
            {timeStr}
          </div>
        </footer>
      </div>
    );
  }

  // =========================================================================
  // STANDARD VIEW (WITH TOOLBAR & SETTINGS)
  // =========================================================================
  return (
    <div 
      id="werkdonalds-pickup-root"
      onClick={() => {
        if (!isAudioUnlocked) {
          AudioFX.unlock();
          setIsAudioUnlocked(true);
        }
      }}
      className="flex-1 flex flex-col overflow-hidden select-none relative h-[calc(100vh-108px)] bg-slate-950 p-3 sm:p-5"
    >
      {/* Control Toolbar */}
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
          {/* Audio Unlock / Status Button */}
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

      {/* Live Visual Spoken Announcement Banner */}
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
            
            {/* COLUMN 1: WORDT BEREID */}
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

                            <div className="mt-1 font-bold text-xs text-slate-200 truncate" title={displayName}>
                              voor {displayName}
                            </div>
                          </div>

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

            {/* COLUMN 2: GEREED OM AF TE HALEN */}
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
