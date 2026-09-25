import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ShieldAlert, Lock } from 'lucide-react';
import { Header } from './components/Header';
import { PosScreen } from './components/WerkdonaldsPOS/PosScreen';
import { KitchenScreen } from './components/WerkdonaldsPOS/KitchenScreen';
import { PickupScreen } from './components/WerkdonaldsPOS/PickupScreen';
import { InventoryScreen } from './components/WerkdonaldsPOS/InventoryScreen';
import { ManagerScreen } from './components/WerkdonaldsPOS/ManagerScreen';
import { OrderTrackingScreen } from './components/WerkdonaldsPOS/OrderTrackingScreen';
import { ReceiptModal } from './components/WerkdonaldsPOS/ReceiptModal';
import { PaymentModal } from './components/WerkdonaldsPOS/PaymentModal';
import { WalletScreen } from './components/WerkPayBank/WalletScreen';
import { ManagerAccountsScreen } from './components/WerkPayBank/ManagerAccountsScreen';
import { StaffCashRequestNotifier } from './components/WerkdonaldsPOS/StaffCashRequestNotifier';
import { StaffPaalPairingNotifier } from './components/WerkdonaldsPOS/StaffPaalPairingNotifier';
import { SupabaseModal } from './components/SupabaseModal';
import { GitHubExportModal } from './components/GitHubExportModal';
import { DigitalPhone } from './components/DigitalPhone/DigitalPhone';
import { AutoUpdateBanner } from './components/AutoUpdateBanner';
import { PickupControlScreen } from './components/WerkdonaldsPOS/PickupControlScreen';
import { LoyaltyTerminalScreen } from './components/WerkdonaldsPOS/LoyaltyTerminalScreen';
import { AppToast } from './components/AppToast';

const MainLayout: React.FC = () => {
  const { 
    appMode, 
    setAppMode, 
    posScreen, 
    werkpayScreen,
    isBlocked,
    blockedReason,
    clientIp,
    deviceId
  } = useApp();

  const [showGithubModal, setShowGithubModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);

  if (isBlocked) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6 text-center z-[999999]">
        <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-8 space-y-6 shadow-2xl shadow-rose-950/50 animate-fadeIn">
          <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <ShieldAlert className="w-10 h-10 text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-rose-500 uppercase tracking-tight mb-2">
              🚫 Toegang Geblokkeerd
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Dit apparaat of IP-adres is door de beheerder op de zwarte lijst geplaatst en kan momenteel geen acties of bestellingen uitvoeren.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left font-mono text-[11px] space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">IP-adres:</span>
              <span className="text-amber-300 font-bold">{clientIp || 'Detecteren...'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Apparaat ID:</span>
              <span className="text-cyan-300 font-bold">{deviceId}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 text-rose-400">
              <span className="text-slate-500 block mb-0.5">Reden van blokkade:</span>
              <span>{blockedReason}</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-500">
            Neem contact op met de beheerder of kassaverantwoordelijke als je denkt dat dit een vergissing is.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* GitHub Deployment Auto-Update Listener & Banner */}
      <AutoUpdateBanner />

      {/* Universal Top Header */}
      <Header onOpenGithub={() => setShowGithubModal(true)} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Werkdonalds POS screens */}
        {appMode === 'pos' && (
          <>
            {posScreen === 'kassa' && (
              <PosScreen onOpenPaymentModal={() => setShowPaymentModal(true)} />
            )}
            {posScreen === 'keuken' && <KitchenScreen />}
            {posScreen === 'afhaal' && <PickupScreen />}
            {posScreen === 'pickup_control' && <PickupControlScreen />}
            {posScreen === 'voorraad' && <InventoryScreen />}
            {posScreen === 'manager' && <ManagerScreen />}
            {posScreen === 'volgscherm' && <OrderTrackingScreen />}
            {posScreen === 'loyalty_terminal' && <LoyaltyTerminalScreen />}
          </>
        )}

        {/* WerkPay Bank screens */}
        {appMode === 'werkpay' && (
          <>
            {(werkpayScreen === 'wallet' || werkpayScreen === 'overboeken') && <WalletScreen />}
            {werkpayScreen === 'accounts' && <ManagerAccountsScreen />}
          </>
        )}

        {/* Split screen testing mode: POS left, WerkPay Bank right */}
        {appMode === 'split' && (
          <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-108px)] overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
            {/* Left side: POS Kassa */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-between">
                <span>🍔 Werkdonalds Kassa (Bestellen &amp; Afrekenen)</span>
                <span className="text-[10px] text-slate-400">Live Test Mode</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <PosScreen onOpenPaymentModal={() => setShowPaymentModal(true)} />
              </div>
            </div>

            {/* Right side: WerkPay Bank */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-1.5 bg-cyan-500/10 border-b border-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center justify-between">
                <span>💳 WerkPay Digitale Bank (Saldo &amp; Transacties)</span>
                <span className="text-[10px] text-slate-400">Realtime Saldo Updates</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <WalletScreen />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Modals & Notifications */}
      <AppToast />
      <StaffCashRequestNotifier />
      <StaffPaalPairingNotifier />
      <ReceiptModal />
      {showPaymentModal && (
        <PaymentModal onClose={() => setShowPaymentModal(false)} />
      )}
      {appMode === 'setup' && (
        <SupabaseModal onClose={() => setAppMode('pos')} />
      )}
      <GitHubExportModal isOpen={showGithubModal} onClose={() => setShowGithubModal(false)} />
      <DigitalPhone />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
