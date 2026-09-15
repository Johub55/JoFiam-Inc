import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { PosScreen } from './components/WerkdonaldsPOS/PosScreen';
import { KitchenScreen } from './components/WerkdonaldsPOS/KitchenScreen';
import { PickupScreen } from './components/WerkdonaldsPOS/PickupScreen';
import { InventoryScreen } from './components/WerkdonaldsPOS/InventoryScreen';
import { ManagerScreen } from './components/WerkdonaldsPOS/ManagerScreen';
import { OrderTrackingScreen } from './components/WerkdonaldsPOS/OrderTrackingScreen';
import { ReceiptModal } from './components/WerkdonaldsPOS/ReceiptModal';
import { OrderTrackingModal } from './components/WerkdonaldsPOS/OrderTrackingModal';
import { PaymentModal } from './components/WerkdonaldsPOS/PaymentModal';
import { WalletScreen } from './components/WerkPayBank/WalletScreen';
import { ManagerAccountsScreen } from './components/WerkPayBank/ManagerAccountsScreen';
import { StaffCashRequestNotifier } from './components/WerkdonaldsPOS/StaffCashRequestNotifier';
import { SupabaseModal } from './components/SupabaseModal';
import { GitHubExportModal } from './components/GitHubExportModal';

const MainLayout: React.FC = () => {
  const { 
    appMode, 
    setAppMode, 
    posScreen, 
    werkpayScreen 
  } = useApp();

  const [showGithubModal, setShowGithubModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
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
            {posScreen === 'voorraad' && <InventoryScreen />}
            {posScreen === 'manager' && <ManagerScreen />}
            {posScreen === 'volgscherm' && <OrderTrackingScreen />}
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
      <StaffCashRequestNotifier />
      <ReceiptModal />
      <OrderTrackingModal />
      {showPaymentModal && (
        <PaymentModal onClose={() => setShowPaymentModal(false)} />
      )}
      {appMode === 'setup' && (
        <SupabaseModal onClose={() => setAppMode('pos')} />
      )}
      <GitHubExportModal isOpen={showGithubModal} onClose={() => setShowGithubModal(false)} />
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
