import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { euro } from '../services/store';
import { AudioFX } from '../services/audio';
import { PosScreenType } from '../types';
import { PosLoginModal } from './WerkdonaldsPOS/PosLoginModal';
import { DiyTerminalModal } from './WerkdonaldsPOS/DiyTerminalModal';
import { 
  Utensils, 
  CreditCard, 
  Columns, 
  Database, 
  User, 
  LogOut, 
  Wifi, 
  WifiOff, 
  ChefHat, 
  Tv, 
  Boxes, 
  BarChart3, 
  ShoppingCart,
  Sparkles,
  ShieldCheck,
  Github,
  Volume2,
  VolumeX,
  Cpu,
  RotateCw,
  Eye
} from 'lucide-react';
import { getStatusMeta } from '../services/orderStatus';

interface HeaderProps {
  onOpenGithub?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenGithub }) => {
  const { 
    appMode, 
    setAppMode, 
    posScreen, 
    setPosScreen,
    werkpayScreen,
    setWerkpayScreen,
    currentPosUser, 
    logoutPos,
    currentBankAccount,
    logoutWerkPay,
    isOnline,
    syncStatus,
    isRealtimeActive,
    lastSyncTime,
    forceSyncNow,
    orders,
    cart,
    activeUserOrders,
    setTrackedOrderNo,
    getUserOrders
  } = useApp();

  const [showPosLoginModal, setShowPosLoginModal] = useState(false);
  const [showPayLoginModal, setShowPayLoginModal] = useState(false);
  const [showDiyTerminalModal, setShowDiyTerminalModal] = useState(false);

  const activeKitchenCount = orders.filter(o => o.status === 'new').length;
  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const [soundActive, setSoundActive] = useState<boolean>(AudioFX.isEnabled);

  // Determine permissions
  const isCustomer = !currentPosUser || 
    currentPosUser.username === 'bestel_kassa' || 
    currentPosUser.username === 'klant' || 
    (!currentPosUser.is_admin && !currentPosUser.perms?.some(p => ['kitchen', 'voorraad', 'manager'].includes(p)));

  const canAccessKitchen = Boolean(currentPosUser && (currentPosUser.is_admin || currentPosUser.perms?.includes('kitchen')));
  const canAccessInventory = Boolean(currentPosUser && (currentPosUser.is_admin || currentPosUser.perms?.includes('voorraad')));
  const canAccessManager = Boolean(currentPosUser && (currentPosUser.is_admin || currentPosUser.perms?.includes('manager')));

  const handleSelectPosScreen = (screen: PosScreenType) => {
    if (screen === 'keuken' && !canAccessKitchen) {
      alert('Geen toegang tot de keuken. Als klant heb je alleen toegang tot het bestel- en afhaalscherm.');
      return;
    }
    if (screen === 'voorraad' && !canAccessInventory) {
      alert('Geen toegang tot de voorraad. Als klant heb je alleen toegang tot het bestel- en afhaalscherm.');
      return;
    }
    if (screen === 'manager' && !canAccessManager) {
      alert('Geen toegang tot het manager scherm. Alleen managers en admins kunnen dit scherm openen.');
      return;
    }
    setPosScreen(screen);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
      {/* Top Banner with App Switcher & User Statuses */}
      <div className="px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md">
        
        {/* Brand Identification */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-500/25">
            W
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">Werkdonalds</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                POS
              </span>
              <span className="text-slate-500">×</span>
              <span className="font-extrabold text-lg tracking-tight text-cyan-400">WerkPay</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                BANK
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Geïntegreerd kassasysteem met live bankbetalingen &amp; Supabase Cloud
            </p>
          </div>
        </div>

        {/* Primary App Switcher (Werkdonalds POS vs WerkPay vs Split vs Setup) */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setAppMode('pos')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              appMode === 'pos'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Werkdonalds POS</span>
            {activeKitchenCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                {activeKitchenCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setAppMode('werkpay')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              appMode === 'werkpay'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>WerkPay Bank</span>
          </button>

          <button
            onClick={() => setAppMode('split')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              appMode === 'split'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Kassa links + WerkPay rechts tegelijk"
          >
            <Columns className="w-4 h-4" />
            <span className="hidden md:inline">Split Testmodus</span>
          </button>
        </div>

        {/* Right Status Bars: Supabase Live Dot & User Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sound Toggle Button */}
          <button
            onClick={() => {
              const next = !AudioFX.isEnabled;
              AudioFX.setEnabled(next);
              if (next) AudioFX.bell();
              setSoundActive(next);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
              soundActive 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' 
                : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:bg-slate-700/50'
            }`}
            title={soundActive ? 'Geluid actief (klik om te muten)' : 'Geluid gedempt (klik om in te schakelen)'}
          >
            {soundActive ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            <span className="text-[11px] hidden md:inline">{soundActive ? 'Geluid Aan' : 'Geluid Uit'}</span>
          </button>

          {/* Live Sync Status & Manual Refresh */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAppMode('setup')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                isRealtimeActive
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                  : isOnline
                  ? 'bg-blue-950/60 border-blue-500/40 text-blue-300 hover:bg-blue-900/50'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/50'
              }`}
              title={
                isRealtimeActive
                  ? `⚡ Live Realtime actief (Laatste sync: ${lastSyncTime ? lastSyncTime.toLocaleTimeString('nl-NL') : 'zojuist'})`
                  : isOnline
                  ? `🔄 Live Polling elke 3s (Laatste sync: ${lastSyncTime ? lastSyncTime.toLocaleTimeString('nl-NL') : 'zojuist'})`
                  : '⚠️ Lokale opslag / offline'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isRealtimeActive
                    ? 'bg-emerald-400 animate-ping'
                    : isOnline
                    ? 'bg-blue-400 animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              <span className="text-[11px] font-bold hidden sm:inline">
                {isRealtimeActive ? 'Live Realtime' : isOnline ? 'Live Sync (3s)' : 'Offline / Demo'}
              </span>
            </button>

            <button
              onClick={() => forceSyncNow()}
              className="p-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Nu geforceerd synchroniseren met Supabase"
            >
              <RotateCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* DIY Pinapparaat Button */}
          <button
            type="button"
            onClick={() => setShowDiyTerminalModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:border-cyan-400 hover:bg-cyan-900/40 transition"
            title="Open DIY Pinapparaat terminal (Arduino, NFC, 4x4 matrix toetsenbord & LCD)"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">DIY Pinapparaat</span>
          </button>

          {/* Active Order Live Tracking Shortcut */}
          {activeUserOrders.length > 0 && (
            <button
              type="button"
              onClick={() => setTrackedOrderNo(activeUserOrders[0].no)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/25 transition active:scale-95 animate-pulse"
              title={`Volg jouw actieve bestelling #${activeUserOrders[0].no} live`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bestelling #{activeUserOrders[0].no} Volgen</span>
              <span className="sm:hidden">#{activeUserOrders[0].no}</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-950/20 text-[10px] font-bold hidden md:inline">
                {getStatusMeta(activeUserOrders[0].status).shortLabel}
              </span>
            </button>
          )}

          {/* WerkPay Account Badge */}
          {currentBankAccount ? (
            <div 
              onClick={() => { setAppMode('werkpay'); setWerkpayScreen('wallet'); }}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-medium cursor-pointer hover:border-cyan-400 transition"
              title="WerkPay kaarthouder & saldo"
            >
              <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold">{currentBankAccount.account_holder.split(' ')[0]}</span>
              <span className="font-extrabold text-cyan-200 bg-cyan-500/20 px-1.5 py-0.5 rounded text-[11px]">
                {currentBankAccount.is_admin ? '€ ∞' : euro(currentBankAccount.balance)}
              </span>
            </div>
          ) : (
            <button
              onClick={() => { setAppMode('werkpay'); }}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Inloggen WerkPay
            </button>
          )}

          {/* POS Staff vs Customer / Not Logged In */}
          {currentPosUser ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold">{currentPosUser.name.split(' ')[0]}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                currentPosUser.is_admin 
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                  : isCustomer 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {currentPosUser.is_admin ? 'Manager' : isCustomer ? 'Klant' : 'Medewerker'}
              </span>
              <button 
                onClick={logoutPos} 
                className="hover:text-rose-400 p-0.5 ml-1 transition" 
                title="Uitloggen van Kassa"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPosLoginModal(true)}
              className="text-xs px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 transition shadow-sm border border-blue-500/40"
            >
              <User className="w-3.5 h-3.5" />
              <span>Inloggen Kassa</span>
            </button>
          )}
        </div>
      </div>

      {/* Secondary Bar for POS Screens when in 'pos' mode */}
      {appMode === 'pos' && (
        <div className="px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto bg-slate-900/90 border-b border-slate-800 text-xs">
          <button
            onClick={() => handleSelectPosScreen('kassa')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              posScreen === 'kassa' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{isCustomer ? 'Bestellen' : 'Kassa'}</span>
            {cartItemCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full font-black text-[10px] bg-white text-blue-700">
                {cartItemCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleSelectPosScreen('afhaal')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              posScreen === 'afhaal' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Afhaalscherm TV</span>
          </button>

          {/* Live Volgscherm Button */}
          <button
            type="button"
            onClick={() => {
              if (activeUserOrders.length > 0) {
                setTrackedOrderNo(activeUserOrders[0].no);
              } else {
                const myOrders = getUserOrders();
                if (myOrders.length > 0) {
                  setTrackedOrderNo(myOrders[0].no);
                } else if (orders.length > 0) {
                  setTrackedOrderNo(orders[0].no);
                }
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              activeUserOrders.length > 0 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 animate-pulse' 
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Open het live volgscherm voor jouw bestelling"
          >
            <Eye className="w-4 h-4 text-amber-400" />
            <span>Live Volgscherm</span>
            {activeUserOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full font-black text-[10px] bg-amber-400 text-slate-950">
                #{activeUserOrders[0].no}
              </span>
            )}
          </button>

          {/* Keuken (KDS) - strictly hidden from customers */}
          {!isCustomer && canAccessKitchen && (
            <button
              onClick={() => handleSelectPosScreen('keuken')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                posScreen === 'keuken' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span>Keuken (KDS)</span>
              {activeKitchenCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full font-black text-[10px] bg-rose-600 text-white">
                  {activeKitchenCount}
                </span>
              )}
            </button>
          )}

          {/* Voorraad & Inkoop - strictly hidden from customers */}
          {!isCustomer && canAccessInventory && (
            <button
              onClick={() => handleSelectPosScreen('voorraad')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                posScreen === 'voorraad' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Voorraad &amp; Inkoop</span>
            </button>
          )}

          {/* Manager & Menu - strictly hidden from customers */}
          {!isCustomer && canAccessManager && (
            <button
              onClick={() => handleSelectPosScreen('manager')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                posScreen === 'manager' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Manager &amp; Menu</span>
            </button>
          )}
        </div>
      )}

      {/* Secondary Bar for WerkPay Screens when in 'werkpay' mode */}
      {appMode === 'werkpay' && (
        <div className="px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto bg-slate-900/90 border-b border-slate-800 text-xs">
          <button
            onClick={() => setWerkpayScreen('wallet')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              werkpayScreen === 'wallet' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Mijn Bankpas &amp; Saldo</span>
          </button>

          {/* Mijn Bestellingen (Live Volgen) Button */}
          <button
            type="button"
            onClick={() => {
              if (activeUserOrders.length > 0) {
                setTrackedOrderNo(activeUserOrders[0].no);
              } else {
                const myOrders = getUserOrders();
                if (myOrders.length > 0) {
                  setTrackedOrderNo(myOrders[0].no);
                } else {
                  setWerkpayScreen('wallet');
                }
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              activeUserOrders.length > 0 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 animate-pulse' 
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Volg jouw Werkdonalds bestellingen live"
          >
            <Eye className="w-4 h-4 text-amber-400" />
            <span>Mijn Bestelling Volgen</span>
            {activeUserOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full font-black text-[10px] bg-amber-400 text-slate-950">
                #{activeUserOrders[0].no}
              </span>
            )}
          </button>

          <button
            onClick={() => setWerkpayScreen('overboeken')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              werkpayScreen === 'overboeken' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Geld Overboeken</span>
          </button>

          {(currentBankAccount?.is_admin || currentPosUser?.is_admin) && (
            <button
              onClick={() => setWerkpayScreen('accounts')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                werkpayScreen === 'accounts' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Alle Accounts (Manager)</span>
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      {showPosLoginModal && (
        <PosLoginModal onClose={() => setShowPosLoginModal(false)} />
      )}

      {showDiyTerminalModal && (
        <DiyTerminalModal onClose={() => setShowDiyTerminalModal(false)} />
      )}
    </header>
  );
};
