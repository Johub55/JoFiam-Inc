import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AudioFX } from '../../services/audio';
import { getStatusMeta, isOrderInProgress, isOrderReady } from '../../services/orderStatus';
import { 
  Tv, 
  Volume2, 
  Maximize2, 
  Minimize2, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Sparkles,
  Utensils,
  ShoppingBag,
  BellRing
} from 'lucide-react';

export const PickupScreen: React.FC = () => {
  const { orders, pickupClosed, setTrackedOrderNo } = useApp();
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const prepOrders = orders.filter(o => isOrderInProgress(o.status)).slice(0, 16);
  const readyOrders = orders.filter(o => isOrderReady(o.status)).slice(0, 16);

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

  const handleTestAudio = () => {
    AudioFX.speakOrder(1001);
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${
      isTvMode ? 'fixed inset-0 z-50 bg-slate-950 p-6 sm:p-8' : 'h-[calc(100vh-108px)] bg-slate-950 p-4 sm:p-6'
    }`}>
      
      {/* Control Toolbar */}
      {!isTvMode && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Tv className="w-6 h-6 text-amber-400" />
              <span>Afhaalscherm (Klantenscherm &amp; TV)</span>
            </h1>
            <p className="text-xs text-slate-400">
              Toont live bestelnummers met naam en tafelnummer zodat gasten direct weten wanneer ze naar de balie kunnen komen.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestAudio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>Test Omroepstem</span>
            </button>

            <button
              onClick={handleToggleTvMode}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg transition"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Start TV Modus (Fullscreen)</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating exit button in TV mode */}
      {isTvMode && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur border border-slate-700 text-amber-400 font-mono font-bold text-sm">
            🕒 {timeStr}
          </div>
          <button
            onClick={handleToggleTvMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-bold border border-white/20 backdrop-blur"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Sluit TV Scherm</span>
          </button>
        </div>
      )}

      {/* Content Area */}
      {pickupClosed ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 text-4xl shadow-2xl">
            🔴
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">AFHAALBALIE MOMENTEEL GESLOTEN</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-md">
            De keuken en afhaalbalie zijn op dit moment gesloten. Tot ziens bij Werkdonalds!
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 pt-3 overflow-hidden">
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 overflow-hidden">
            
            {/* COLUMN 1: WORDT BEREID */}
            <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-2">
                      <span>⏳ Wordt bereid</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-black">
                        {prepOrders.length}
                      </span>
                    </h2>
                    <span className="text-xs text-slate-400">Onze koks bereiden je bestelling vers</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pt-4">
                {prepOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 font-bold text-sm">
                    <span className="text-3xl mb-1">🍔</span>
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
                          title="Klik om live status pop-up te bekijken"
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
                              {displayName}
                            </div>
                          </div>

                          {/* Live Chef Status Tag */}
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
            <div className="flex flex-col bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden ring-1 ring-emerald-500/20">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
                    <BellRing className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-emerald-400 flex items-center gap-2">
                      <span>🔔 Gereed om af te halen</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-black">
                        {readyOrders.length}
                      </span>
                    </h2>
                    <span className="text-xs text-slate-400">Kom naar de afhaalbalie</span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Klaar voor afhaal</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pt-4">
                {readyOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 font-bold text-sm">
                    <span className="text-3xl mb-1">✨</span>
                    <span>Nog geen bestellingen gereed</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {readyOrders.map(o => {
                      const displayName = o.identifier || (o.orderType === 'dine_in' ? 'Tafel' : 'Afhaal');

                      return (
                        <div
                          key={o.no}
                          onClick={() => setTrackedOrderNo(o.no)}
                          className="p-3.5 rounded-2xl bg-emerald-950/60 border-2 border-emerald-400 text-left shadow-lg shadow-emerald-500/10 flex flex-col justify-between hover:scale-[1.02] transition cursor-pointer group animate-in fade-in"
                          title="Klik om live status pop-up te bekijken"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-black text-3xl sm:text-4xl text-emerald-300 group-hover:text-emerald-200">
                                #{o.no}
                              </span>
                              <span className="w-6 h-6 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center text-xs animate-ping">
                                ●
                              </span>
                            </div>

                            {/* Customer Name or Table Number in big contrast */}
                            <div className="mt-1.5 font-black text-sm text-white truncate" title={displayName}>
                              {displayName}
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300 font-bold">
                            <span className="flex items-center gap-1">
                              <span>Meld je bij balie</span>
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono">
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
              <span className="font-bold text-white">Werkdonalds Live Afhaal Service</span>
              <span className="hidden md:inline text-slate-500">| Bestel via Kiosk of Kassa | Eet smakelijk!</span>
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
