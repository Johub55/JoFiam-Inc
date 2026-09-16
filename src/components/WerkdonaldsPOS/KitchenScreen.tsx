import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AudioFX } from '../../services/audio';
import { Order, OrderStatus, OrderItemStage } from '../../types';
import { 
  getStatusMeta, 
  isOrderInProgress, 
  isOrderReady, 
  KITCHEN_STATUS_LIST, 
  parseKitchenNotes 
} from '../../services/orderStatus';
import { 
  ChefHat, 
  Clock, 
  Check, 
  Flame, 
  Package, 
  Maximize, 
  Volume2, 
  VolumeX, 
  Trash2, 
  BellRing,
  Sparkles,
  Eye,
  Zap,
  Filter,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const STAGE_CONFIG: Record<OrderItemStage, {
  label: string;
  shortLabel: string;
  emoji: string;
  activeBtn: string;
  idleBtn: string;
  barColor: string;
  progressPercent: number;
}> = {
  wachten: {
    label: 'In Wachtrij',
    shortLabel: 'Wachten',
    emoji: '⏳',
    activeBtn: 'bg-slate-700 text-slate-100 border-slate-500 font-black shadow-sm ring-1 ring-slate-400/30',
    idleBtn: 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-850',
    barColor: 'bg-slate-600',
    progressPercent: 25
  },
  bereiden: {
    label: 'In Bereiding',
    shortLabel: 'Bereiden',
    emoji: '🔥',
    activeBtn: 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm ring-1 ring-amber-400/40',
    idleBtn: 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-amber-300 hover:bg-slate-850',
    barColor: 'bg-amber-400',
    progressPercent: 50
  },
  inpakken: {
    label: 'Inpakken',
    shortLabel: 'Inpakken',
    emoji: '📦',
    activeBtn: 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-sm ring-1 ring-cyan-400/40',
    idleBtn: 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-cyan-300 hover:bg-slate-850',
    barColor: 'bg-cyan-400',
    progressPercent: 75
  },
  klaar: {
    label: 'Gereed',
    shortLabel: 'Klaar',
    emoji: '✅',
    activeBtn: 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-sm ring-1 ring-emerald-400/40',
    idleBtn: 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-emerald-300 hover:bg-slate-850',
    barColor: 'bg-emerald-400',
    progressPercent: 100
  }
};

type StationType = 'all' | 'grill' | 'fryer' | 'drinks' | 'dessert';

const STATIONS: { id: StationType; label: string; emoji: string }[] = [
  { id: 'all', label: 'Alle Stations', emoji: '🧑‍🍳' },
  { id: 'grill', label: 'Grill & Burgers', emoji: '🍔' },
  { id: 'fryer', label: 'Frituur & Snacks', emoji: '🍟' },
  { id: 'drinks', label: 'Dranken & Shakes', emoji: '🥤' },
  { id: 'dessert', label: 'IJs & Desserts', emoji: '🍦' }
];

function isItemMatchingStation(itemName: string, station: StationType): boolean {
  if (station === 'all') return true;
  const n = itemName.toLowerCase();
  if (station === 'grill') {
    return n.includes('burger') || n.includes('mac') || n.includes('whopper') || n.includes('broodje') || n.includes('wrap');
  }
  if (station === 'fryer') {
    return n.includes('friet') || n.includes('nugget') || n.includes('kip') || n.includes('crispy') || n.includes('tender') || n.includes('snack') || n.includes('bitterbal');
  }
  if (station === 'drinks') {
    return n.includes('cola') || n.includes('fanta') || n.includes('sprite') || n.includes('drank') || n.includes('shake') || n.includes('koffie') || n.includes('thee') || n.includes('water');
  }
  if (station === 'dessert') {
    return n.includes('ijs') || n.includes('sundae') || n.includes('flurry') || n.includes('donut') || n.includes('koek') || n.includes('dessert');
  }
  return true;
}

export const KitchenScreen: React.FC = () => {
  const { 
    orders, 
    updateOrderStatus, 
    updateOrderItemStage,
    toggleOrderPrio,
    setAllOrderItemsDone, 
    deleteOrder, 
    setTrackedOrderNo 
  } = useApp();

  const [now, setNow] = useState<number>(Date.now());
  const [filterTab, setFilterTab] = useState<'all' | 'prep' | 'done'>('all');
  const [stationFilter, setStationFilter] = useState<StationType>('all');
  const [soundOn, setSoundOn] = useState<boolean>(AudioFX.isEnabled);

  // Update timers every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Orders that are currently on the kitchen screen: in progress or ready
  const activeOrders = orders.filter(o => isOrderInProgress(o.status) || isOrderReady(o.status));
  const prepOrders = orders.filter(o => isOrderInProgress(o.status));
  const readyOrders = orders.filter(o => isOrderReady(o.status));

  const prepCount = prepOrders.length;
  const readyCount = readyOrders.length;

  // Filter based on active tab
  let tabFilteredOrders = filterTab === 'prep' 
    ? prepOrders 
    : filterTab === 'done' 
    ? readyOrders 
    : activeOrders;

  // Station filtering: keep tickets that contain items matching the station
  if (stationFilter !== 'all') {
    tabFilteredOrders = tabFilteredOrders.filter(o => 
      o.items.some(it => isItemMatchingStation(it.name, stationFilter))
    );
  }

  // Sort orders: Priority / Spoed orders float to the top, then FIFO by timestamp
  const displayedOrders = [...tabFilteredOrders].sort((a, b) => {
    if (a.isPrio && !b.isPrio) return -1;
    if (!a.isPrio && b.isPrio) return 1;
    return (a.timestamp || 0) - (b.timestamp || 0);
  });

  let busyLevel = '🟢 Rustig (~3 min)';
  let busyColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (prepCount >= 7) {
    busyLevel = '🔴 Piekdrukte (~12 min)';
    busyColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse';
  } else if (prepCount >= 3) {
    busyLevel = '🟡 Gemiddeld (~6 min)';
    busyColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  }

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleToggleSound = () => {
    const nextState = !soundOn;
    setSoundOn(nextState);
    AudioFX.setEnabled(nextState);
    if (nextState) {
      AudioFX.bell();
    }
  };

  const handleTestSound = () => {
    AudioFX.speakOrder(1001);
  };

  const handleClearAllDone = () => {
    if (readyCount === 0) return;
    readyOrders.forEach(o => {
      deleteOrder(o.no);
    });
  };

  const handleSetItemStage = (orderNo: number, itemIndex: number, stage: OrderItemStage) => {
    updateOrderItemStage(orderNo, itemIndex, stage);
    if (stage === 'klaar' && soundOn) {
      AudioFX.bell();
    }
  };

  const handleSetAllTicketStage = (order: Order, stage: OrderItemStage) => {
    order.items.forEach((_, idx) => {
      updateOrderItemStage(order.no, idx, stage);
    });
    if (stage === 'klaar') {
      setAllOrderItemsDone(order.no, true);
      if (soundOn) {
        AudioFX.bell();
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-108px)] overflow-hidden bg-slate-950 p-3 sm:p-5 space-y-3">
      
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <span>Keukenscherm (Live KDS)</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {prepCount} in bereiding
              </span>
              {readyCount > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {readyCount} gereed op scherm
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">
              Chefs bepalen per product hoever de bereiding is: wachten, bereiden, inpakken of klaar.
            </p>
          </div>
        </div>

        {/* Right side controls: Sound, Clean up, Fullscreen */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={`text-xs px-3 py-1.5 rounded-xl font-bold border ${busyColor}`}>
            {busyLevel}
          </div>

          <button
            type="button"
            onClick={handleToggleSound}
            title={soundOn ? 'Geluid uitschakelen' : 'Geluid inschakelen'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              soundOn 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundOn ? 'Geluid: Aan' : 'Geluid: Uit'}</span>
          </button>

          <button
            type="button"
            onClick={handleTestSound}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95"
            title="Test bel en omroepstem"
          >
            <BellRing className="w-4 h-4 text-amber-400" />
            <span>Test Omroep</span>
          </button>

          {readyCount > 0 && (
            <button
              type="button"
              onClick={handleClearAllDone}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition active:scale-95"
              title="Alle gereedgemelde bestellingen van scherm halen"
            >
              <Trash2 className="w-4 h-4" />
              <span>Verwijder gereed ({readyCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Maximize className="w-4 h-4" />
            <span>Fullscreen</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar + Station Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
              filterTab === 'all'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800'
            }`}
          >
            <span>Alle bestellingen</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
              filterTab === 'all' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
            }`}>
              {activeOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('prep')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
              filterTab === 'prep'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800'
            }`}
          >
            <span>🍳 In Bereiding</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
              filterTab === 'prep' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-amber-400'
            }`}>
              {prepCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('done')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
              filterTab === 'done'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800'
            }`}
          >
            <span>🔔 Gereed op Scherm</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
              filterTab === 'done' ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-emerald-400'
            }`}>
              {readyCount}
            </span>
          </button>
        </div>

        {/* Station Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-slate-500 px-1.5 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">Station:</span>
          </div>
          {STATIONS.map(st => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStationFilter(st.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                stationFilter === st.id
                  ? 'bg-amber-400 text-slate-950 shadow font-black'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{st.emoji}</span>
              <span className="hidden md:inline">{st.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {displayedOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl mb-3">
              🍳
            </div>
            <h3 className="font-bold text-base text-slate-300">
              {filterTab === 'prep' 
                ? 'Geen bestellingen in de keuken' 
                : filterTab === 'done' 
                ? 'Geen gereedstaande bestellingen op het scherm' 
                : 'Geen actieve bestellingen in de keuken'}
            </h3>
            <p className="text-xs mt-1 text-slate-500 max-w-sm">
              Nieuwe bestellingen van de kassa of kiosk verschijnen direct realtime met interactieve productfasen en timers.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-4">
            {displayedOrders.map(order => {
              const elapsedMins = Math.floor((now - (order.timestamp || now)) / 60000);
              const isReady = isOrderReady(order.status);
              const currentMeta = getStatusMeta(order.status);

              const totalItems = order.items.reduce((s, it) => s + it.qty, 0);
              const doneItems = order.items.filter(it => it.done || it.stage === 'klaar').reduce((s, it) => s + it.qty, 0);
              const inPrepItems = order.items.filter(it => it.stage === 'bereiden').reduce((s, it) => s + it.qty, 0);
              const inPackItems = order.items.filter(it => it.stage === 'inpakken').reduce((s, it) => s + it.qty, 0);
              const waitingItems = order.items.filter(it => !it.stage || it.stage === 'wachten').reduce((s, it) => s + it.qty, 0);
              const allDone = totalItems > 0 && doneItems === totalItems;

              let timerBadge = 'bg-slate-800 text-slate-300 border-slate-700';
              if (!isReady) {
                if (elapsedMins >= 10) timerBadge = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse font-bold';
                else if (elapsedMins >= 5) timerBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
              } else {
                timerBadge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
              }

              return (
                <div
                  key={order.no}
                  className={`flex flex-col justify-between rounded-2xl p-3.5 border transition-all shadow-xl relative ${
                    order.isPrio
                      ? 'bg-slate-900 border-rose-500 ring-2 ring-rose-500/50 shadow-rose-950/40'
                      : isReady 
                      ? 'bg-slate-900/95 border-emerald-500/60 ring-1 ring-emerald-500/30' 
                      : allDone
                      ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-400/40'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div>
                    {/* Priority Banner if marked SPOED */}
                    {order.isPrio && (
                      <div className="mb-2 px-3 py-1 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black flex items-center justify-between animate-pulse">
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                          <span>⚡ SPOED BESTELLING (VOORRANG)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleOrderPrio(order.no)}
                          className="text-[10px] underline text-rose-400 hover:text-white"
                        >
                          Herstel
                        </button>
                      </div>
                    )}

                    {/* Ready Banner if finished */}
                    {isReady && (
                      <div className={`mb-2.5 px-3 py-1.5 rounded-xl border text-xs font-black flex items-center justify-between ${
                        order.orderType === 'delivery'
                          ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                          : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      }`}>
                        <span className="flex items-center gap-1.5">
                          <span>{order.orderType === 'delivery' ? '🛵' : '🔔'}</span>
                          <span>{order.orderType === 'delivery' ? 'GEREED VOOR BEZORGER' : 'GEREED VOOR AFHAAL'}</span>
                        </span>
                        <span className={`text-[10px] font-normal ${order.orderType === 'delivery' ? 'text-blue-400' : 'text-emerald-400'}`}>
                          {order.orderType === 'delivery' ? 'Niet omroepen' : 'Klant omgeroepen'}
                        </span>
                      </div>
                    )}

                    {/* Header with Order No, Table/Identifier & Elapsed time */}
                    <div className="flex items-start justify-between gap-2 mb-2.5 pb-2 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-2xl font-mono ${
                            order.isPrio ? 'text-rose-400' : isReady ? (order.orderType === 'delivery' ? 'text-blue-400' : 'text-emerald-400') : 'text-amber-400'
                          }`}>
                            #{order.no}
                          </span>
                          <span className="text-xs font-bold text-slate-400">· {order.time}</span>
                          
                          {/* SPOED / PRIO Button */}
                          {!isReady && (
                            <button
                              type="button"
                              onClick={() => toggleOrderPrio(order.no)}
                              title={order.isPrio ? 'Spoed uitschakelen' : 'Markeer als spoed (bovenaan scherm)'}
                              className={`p-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition ${
                                order.isPrio
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-slate-700'
                              }`}
                            >
                              <Zap className="w-3 h-3" />
                              <span>{order.isPrio ? 'SPOED' : '+ Prio'}</span>
                            </button>
                          )}
                        </div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                          <span>{order.orderType === 'dine_in' ? '🍽️' : order.orderType === 'delivery' ? '🛵' : '🛍️'}</span>
                          <span className="truncate max-w-[180px]">
                            {order.identifier || (order.orderType === 'dine_in' ? 'Tafel' : order.orderType === 'delivery' ? 'Bezorgen' : 'Afhaal')}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${timerBadge}`}>
                          <Clock className="w-3 h-3" />
                          <span>{isReady ? `Klaar (${elapsedMins}m)` : `${elapsedMins}m`}</span>
                        </span>

                        {/* Customer popup tracker view */}
                        <button
                          type="button"
                          onClick={() => setTrackedOrderNo(order.no)}
                          className="text-[10px] text-slate-400 hover:text-amber-300 flex items-center gap-0.5"
                          title="Open live status pop-up zoals klant hem ziet"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Klantweergave</span>
                        </button>
                      </div>
                    </div>

                    {/* Status Selector Bar (Chefs can pick ANY overall status) */}
                    <div className="mb-3 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] uppercase font-black tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                        <span>Bestelling Status:</span>
                        <span className="text-amber-400 font-bold lowercase">{currentMeta.label}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {KITCHEN_STATUS_LIST.slice(0, 6).map(st => {
                          const isActive = order.status === st.id || 
                            (st.id === 'wachten' && order.status === 'new') || 
                            (st.id === 'klaar' && order.status === 'done');

                          return (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => updateOrderStatus(order.no, st.id)}
                              className={`px-1.5 py-1 rounded-lg text-[10px] font-bold truncate flex items-center justify-center gap-1 border transition ${
                                isActive
                                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm font-black'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800 hover:text-white'
                              }`}
                              title={st.description}
                            >
                              <span>{st.emoji}</span>
                              <span className="truncate">{st.shortLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Progress Summary & Batch Controls */}
                    <div className="mb-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-300 flex items-center gap-1">
                          <span>Producten:</span>
                          <strong className={allDone ? 'text-emerald-400 font-black' : 'text-amber-400'}>
                            {doneItems}/{totalItems} gereed
                          </strong>
                        </span>

                        {/* Summary breakdown mini pills */}
                        <div className="flex items-center gap-1 text-[10px]">
                          {waitingItems > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono" title="In wachtrij">
                              ⏳ {waitingItems}
                            </span>
                          )}
                          {inPrepItems > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold" title="In bereiding">
                              🔥 {inPrepItems}
                            </span>
                          )}
                          {inPackItems > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold" title="Inpakken">
                              📦 {inPackItems}
                            </span>
                          )}
                          {doneItems > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold" title="Klaar">
                              ✅ {doneItems}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Batch action buttons for all items at once */}
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/60">
                        <span className="text-[9px] uppercase font-bold text-slate-500">Alles zetten op:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSetAllTicketStage(order, 'bereiden')}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-amber-500/20 text-amber-300 hover:border-amber-500/40 border border-slate-700 transition"
                            title="Zet alle producten in bereiding"
                          >
                            🔥 Bereiden
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetAllTicketStage(order, 'inpakken')}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 hover:border-cyan-500/40 border border-slate-700 transition"
                            title="Zet alle producten op inpakken"
                          >
                            📦 Inpakken
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetAllTicketStage(order, 'klaar')}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-emerald-500/20 text-emerald-300 hover:border-emerald-500/40 border border-slate-700 font-bold transition"
                            title="Zet alle producten op klaar"
                          >
                            ✅ Alles klaar
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Items Checklist With 4-Stage Selectors */}
                    <div className="space-y-2 py-1">
                      {order.items.map((it, i) => {
                        const currentStage: OrderItemStage = it.stage || (it.done ? 'klaar' : 'wachten');
                        const stageInfo = STAGE_CONFIG[currentStage];
                        const noteParts = parseKitchenNotes(it.itemNote);
                        const isMatchStation = isItemMatchingStation(it.name, stationFilter);

                        return (
                          <div 
                            key={i} 
                            className={`p-2.5 rounded-xl border transition-all ${
                              currentStage === 'klaar' 
                                ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-300' 
                                : currentStage === 'inpakken'
                                ? 'bg-cyan-950/20 border-cyan-500/30 text-slate-100'
                                : currentStage === 'bereiden'
                                ? 'bg-amber-950/20 border-amber-500/35 text-slate-100'
                                : 'bg-slate-950 border-slate-800 text-slate-100'
                            } ${!isMatchStation && stationFilter !== 'all' ? 'opacity-40' : ''}`}
                          >
                            {/* Product Title and Quantity */}
                            <div className="flex items-start justify-between gap-1.5 mb-1.5">
                              <div className="flex items-start gap-2">
                                <span className="text-amber-400 font-black text-sm leading-tight">
                                  {it.qty}×
                                </span>
                                <div>
                                  <div className={`text-xs font-bold leading-snug ${
                                    currentStage === 'klaar' ? 'line-through text-slate-400' : 'text-white'
                                  }`}>
                                    {it.name}
                                  </div>
                                </div>
                              </div>

                              {/* Active Stage Indicator Badge */}
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border shrink-0 flex items-center gap-1 ${
                                currentStage === 'klaar'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : currentStage === 'inpakken'
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                  : currentStage === 'bereiden'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                <span>{stageInfo.emoji}</span>
                                <span>{stageInfo.shortLabel.toUpperCase()}</span>
                              </span>
                            </div>

                            {/* Ultra-Clear Badges for Sauces, Omissions & Additions */}
                            {noteParts.length > 0 && (
                              <div className="mb-2 pl-5 flex flex-wrap gap-1">
                                {noteParts.map((part, pIdx) => {
                                  let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
                                  let icon = '📝';

                                  if (part.type === 'sauce') {
                                    badgeStyle = 'bg-amber-400/25 text-amber-200 border-amber-400/50 font-black ring-1 ring-amber-400/20';
                                    icon = '🥫';
                                  } else if (part.type === 'omission') {
                                    badgeStyle = 'bg-rose-500/25 text-rose-200 border-rose-500/50 font-black ring-1 ring-rose-500/20';
                                    icon = '🚫';
                                  } else if (part.type === 'addition') {
                                    badgeStyle = 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50 font-black';
                                    icon = '➕';
                                  } else if (part.type === 'drink') {
                                    badgeStyle = 'bg-blue-500/25 text-blue-200 border-blue-500/50 font-bold';
                                    icon = '🥤';
                                  }

                                  return (
                                    <span
                                      key={pIdx}
                                      className={`text-[10px] px-1.5 py-0.5 rounded-md border flex items-center gap-1 leading-tight ${badgeStyle}`}
                                    >
                                      <span>{icon}</span>
                                      <span>{part.text}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {/* 4-Stage Quick Switch Buttons per product */}
                            <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-800/80">
                              {(['wachten', 'bereiden', 'inpakken', 'klaar'] as OrderItemStage[]).map(stageKey => {
                                const isCurrent = currentStage === stageKey;
                                const conf = STAGE_CONFIG[stageKey];

                                return (
                                  <button
                                    key={stageKey}
                                    type="button"
                                    onClick={() => handleSetItemStage(order.no, i, stageKey)}
                                    className={`py-1 px-1 rounded-lg text-[10px] font-bold text-center border transition active:scale-95 flex items-center justify-center gap-0.5 ${
                                      isCurrent ? conf.activeBtn : conf.idleBtn
                                    }`}
                                  >
                                    <span>{conf.emoji}</span>
                                    <span className="truncate">{conf.shortLabel}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Mini Progress Bar under each product */}
                            <div className="w-full h-1 bg-slate-900 rounded-full mt-1.5 overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 rounded-full ${stageInfo.barColor}`}
                                style={{ width: `${stageInfo.progressPercent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="pt-2.5 mt-2.5 border-t border-slate-800">
                    {!isReady ? (
                      <div className="space-y-2">
                        {allDone && (
                          <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 p-1.5 rounded-lg text-center font-bold flex items-center justify-center gap-1 animate-pulse">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Alle producten gereed! Klik op Klaar voor omroep.</span>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              updateOrderStatus(order.no, 'klaar');
                            }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition active:scale-95 ${
                              order.orderType === 'delivery'
                                ? 'bg-blue-500 hover:bg-blue-400 text-white'
                                : allDone 
                                ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 animate-pulse ring-2 ring-emerald-400/50' 
                                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                            <span>
                              {order.orderType === 'delivery' ? 'Klaar voor Bezorger' : 'Klaar! (Bel & Omroep)'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              deleteOrder(order.no);
                            }}
                            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-400 text-xs font-bold transition border border-slate-700 hover:border-rose-500 flex items-center gap-1.5 active:scale-95"
                            title="Bestelling direct van keukenscherm verwijderen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          {/* Repeat Announcement button */}
                          {order.orderType === 'delivery' ? (
                            <div className="flex-1 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30 flex items-center justify-center gap-1.5">
                              <span>🛵 Bezorging (Geen omroep)</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                AudioFX.speakOrder(order.no, order.identifier, order.orderType);
                              }}
                              className="flex-1 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center justify-center gap-1.5 transition active:scale-95"
                              title="Speel omroep opnieuw af"
                            >
                              <BellRing className="w-3.5 h-3.5" />
                              <span>📢 Herhaal Omroep</span>
                            </button>
                          )}

                          {/* Explicit Remove from Screen button */}
                          <button
                            type="button"
                            onClick={() => {
                              deleteOrder(order.no);
                            }}
                            className="flex-1 py-2 rounded-xl text-xs font-black bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-300 border border-slate-700 hover:border-rose-500 flex items-center justify-center gap-1.5 transition active:scale-95"
                            title="Verwijder deze bestelling definitief van het keukenscherm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Verwijder</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
