import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, 
  Coins, 
  Sparkles, 
  Phone, 
  UserPlus, 
  CheckCircle2, 
  ArrowRight, 
  RotateCcw, 
  Gift, 
  Star, 
  QrCode, 
  Maximize, 
  LogOut,
  ChevronRight,
  ShieldCheck,
  Zap,
  ShoppingBag
} from 'lucide-react';
import { 
  getLoyaltyCustomers, 
  findLoyaltyCustomerByPhoneOrName, 
  registerLoyaltyCustomer, 
  deductCoinsFromCustomer, 
  LOYALTY_REWARDS, 
  LoyaltyCustomer, 
  LoyaltyReward 
} from '../../services/loyalty';
import { AudioFX } from '../../services/audio';
import { euro } from '../../services/store';

export const LoyaltyTerminalScreen: React.FC = () => {
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>(getLoyaltyCustomers());
  const [activeCustomer, setActiveCustomer] = useState<LoyaltyCustomer | null>(null);
  
  // Numpad input
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [searchError, setSearchError] = useState<string>('');
  
  // Registration flow for new customers
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  
  // Redeemed voucher success modal
  const [redeemedReward, setRedeemedReward] = useState<{ reward: LoyaltyReward; voucherCode: string } | null>(null);

  // Auto-reset idle timer for public touchscreen security (25s)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (activeCustomer || phoneInput || showRegisterModal || redeemedReward) {
      idleTimerRef.current = setTimeout(() => {
        handleLogout();
      }, 30000); // 30 seconds idle timeout
    }
  };

  useEffect(() => {
    const handleUpdate = () => {
      const fresh = getLoyaltyCustomers();
      setCustomers(fresh);
      if (activeCustomer) {
        const updated = fresh.find(c => c.id === activeCustomer.id);
        if (updated) setActiveCustomer(updated);
      }
    };
    window.addEventListener('wd_loyalty_updated', handleUpdate);
    return () => window.removeEventListener('wd_loyalty_updated', handleUpdate);
  }, [activeCustomer]);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [phoneInput, activeCustomer, showRegisterModal, redeemedReward]);

  const handleNumpadPress = (digit: string) => {
    AudioFX.click();
    resetIdleTimer();
    if (phoneInput.length < 10) {
      const next = phoneInput + digit;
      setPhoneInput(next);
      setSearchError('');
      
      // Auto-lookup if 10 digits reached
      if (next.length === 10) {
        const found = findLoyaltyCustomerByPhoneOrName(next);
        if (found) {
          setActiveCustomer(found);
          AudioFX.success();
        } else {
          setSearchError('Geen account gevonden voor dit nummer. Registreer gratis in 1 tik!');
        }
      }
    }
  };

  const handleNumpadBackspace = () => {
    AudioFX.click();
    resetIdleTimer();
    setPhoneInput(prev => prev.slice(0, -1));
    setSearchError('');
  };

  const handleNumpadClear = () => {
    AudioFX.click();
    resetIdleTimer();
    setPhoneInput('');
    setSearchError('');
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phoneInput.trim()) return;
    resetIdleTimer();
    const found = findLoyaltyCustomerByPhoneOrName(phoneInput);
    if (found) {
      setActiveCustomer(found);
      AudioFX.success();
      setSearchError('');
    } else {
      setSearchError('Nummer niet bekend. Maak direct gratis een WerkLoyalty account aan!');
    }
  };

  const handleRegisterNew = () => {
    if (!phoneInput) {
      alert('Voer eerst je mobiele telefoonnummer in op de numpad.');
      return;
    }
    const nameToUse = newCustName.trim() || 'Vaste Klant';
    const newCust = registerLoyaltyCustomer(nameToUse, phoneInput);
    setActiveCustomer(newCust);
    setShowRegisterModal(false);
    setNewCustName('');
    AudioFX.success();
    AudioFX.chime();
  };

  const handleRedeemReward = (reward: LoyaltyReward) => {
    if (!activeCustomer) return;
    resetIdleTimer();

    if (activeCustomer.coins < reward.coinsCost) {
      alert(`Je hebt ${reward.coinsCost - activeCustomer.coins} WerkCoins te weinig voor deze beloning! Spaar door te bestellen aan de kassa.`);
      return;
    }

    const updated = deductCoinsFromCustomer(activeCustomer.phone, reward.coinsCost);
    if (updated) {
      setActiveCustomer(updated);
      const voucher = `WL-${Math.floor(1000 + Math.random() * 9000)}`;
      setRedeemedReward({ reward, voucherCode: voucher });
      AudioFX.chime();
    }
  };

  const handleLogout = () => {
    setActiveCustomer(null);
    setPhoneInput('');
    setSearchError('');
    setShowRegisterModal(false);
    setRedeemedReward(null);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none relative overflow-hidden">
      
      {/* Background Ambient Glow FX */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header for Touchscreen Terminal */}
      <header className="px-6 py-4 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 font-black flex items-center justify-center text-2xl shadow-lg shadow-amber-500/25">
            👑
          </div>
          <div>
            <h1 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
              WerkLoyalty Touch-Terminal
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                RPI 3B Kiosk
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Spaar &amp; Wissel WerkCoins In Bij De Kassa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeCustomer && (
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Klaar / Afmelden</span>
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition"
            title="Volledig scherm (Kiosk Mode)"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Terminal View */}
      <div className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full flex flex-col justify-center z-10 overflow-y-auto">

        {/* STATE 1: ACTIVE CUSTOMER DASHBOARD */}
        {activeCustomer ? (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Customer Profile Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-4 z-10">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-3xl font-black text-amber-300 shadow-inner">
                  {activeCustomer.tier === 'VIP Platinum' ? '👑' : activeCustomer.tier === 'Goud' ? '🥇' : activeCustomer.tier === 'Zilver' ? '🥈' : '🥉'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                      {activeCustomer.name}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                      activeCustomer.tier === 'VIP Platinum'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : activeCustomer.tier === 'Goud'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : activeCustomer.tier === 'Zilver'
                        ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                        : 'bg-amber-700/20 text-amber-500 border border-amber-700/40'
                    }`}>
                      {activeCustomer.tier} Klant
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>{activeCustomer.phone}</span>
                    <span className="text-slate-600">•</span>
                    <span>{activeCustomer.ordersCount} Bestellingen</span>
                  </p>
                </div>
              </div>

              {/* WerkCoins Counter */}
              <div className="px-6 py-4 rounded-2xl bg-slate-950 border border-amber-500/50 flex items-center gap-4 shadow-xl z-10">
                <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-2xl animate-bounce">
                  🪙
                </div>
                <div>
                  <div className="text-3xl font-black text-amber-400 font-mono leading-none">
                    {activeCustomer.coins}
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                    Beschikbare WerkCoins
                  </div>
                </div>
              </div>
            </div>

            {/* Rewards Catalog Heading */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-400" />
                  Kies &amp; Wissel Je Beloning In
                </h3>
                <p className="text-xs text-slate-400">
                  Tik op een beloning om hem direct in te wisselen voor een tegoedbon voor de kassa!
                </p>
              </div>

              <div className="text-xs text-amber-300/80 font-bold bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                €1,- besteld = +10 WerkCoins sparen!
              </div>
            </div>

            {/* Grid of Loyalty Rewards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {LOYALTY_REWARDS.map(rew => {
                const canAfford = activeCustomer.coins >= rew.coinsCost;
                return (
                  <div 
                    key={rew.id}
                    onClick={() => canAfford && handleRedeemReward(rew)}
                    className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between gap-4 relative overflow-hidden ${
                      canAfford 
                        ? 'bg-slate-900/90 border-emerald-500/60 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer active:scale-[0.98]' 
                        : 'bg-slate-950/60 border-slate-800 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-4xl">{rew.emoji}</span>
                        <div className={`px-3 py-1 rounded-xl text-xs font-black font-mono border ${
                          canAfford 
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20' 
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {rew.coinsCost} Coins
                        </div>
                      </div>

                      <h4 className="font-black text-white text-base">
                        {rew.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {rew.description}
                      </p>
                    </div>

                    <button
                      disabled={!canAfford}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canAfford) handleRedeemReward(rew);
                      }}
                      className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                        canAfford
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Direct Inwisselen!</span>
                        </>
                      ) : (
                        <span>Nog {rew.coinsCost - activeCustomer.coins} Coins Nodig</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          
          /* STATE 2: NO ACTIVE CUSTOMER -> TOUCHSCREEN NUMPAD & LOOKUP */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Visual Welcome Card */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950 border-2 border-amber-500/40 shadow-2xl text-center space-y-4 relative overflow-hidden">
                <div className="w-20 h-20 bg-amber-400/20 text-amber-300 rounded-3xl flex items-center justify-center text-4xl mx-auto border border-amber-400/40 shadow-inner">
                  👑
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                    WerkLoyalty Spaarpaal
                  </h2>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Voer je mobiele nummer in op het touchscreen om je gespaarde WerkCoins te bekijken of direct in te wisselen!
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <Zap className="w-4 h-4" />
                    <span>Hoe werkt het sparen?</span>
                  </div>
                  <ul className="text-slate-400 space-y-1 pl-5 list-disc text-[11px]">
                    <li><strong>€ 1,00 besteed</strong> = 10 WerkCoins sparen</li>
                    <li>Nieuwe klanten ontvangen <strong>50 Welkomst-Coins</strong>!</li>
                    <li>Wissel in voor gratis friet, drankjes, burgers of korting</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Column: Touchscreen Numpad */}
            <div className="lg:col-span-7 bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              
              {/* Phone Display Box */}
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">
                  📱 Mobiel Telefoonnummer
                </label>
                <div className="w-full bg-slate-950 border-2 border-amber-500/60 rounded-2xl px-6 py-4 flex items-center justify-between gap-3 text-center shadow-inner">
                  <span className="font-mono text-2xl sm:text-3xl font-black text-amber-400 tracking-widest min-h-[36px] flex items-center">
                    {phoneInput || <span className="text-slate-600 text-lg">06 ........</span>}
                  </span>
                  {phoneInput && (
                    <button
                      onClick={handleNumpadClear}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                    >
                      Wissen
                    </button>
                  )}
                </div>
                {searchError && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-between gap-2">
                    <span>{searchError}</span>
                    <button
                      onClick={() => setShowRegisterModal(true)}
                      className="px-3 py-1 rounded-lg bg-rose-600 text-white font-black text-xs uppercase"
                    >
                      Registreer
                    </button>
                  </div>
                )}
              </div>

              {/* Grid of Numpad Buttons for Touchscreen */}
              <div className="grid grid-cols-3 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button
                    key={num}
                    onClick={() => handleNumpadPress(num)}
                    className="py-4 bg-slate-950 hover:bg-slate-800 border-2 border-slate-800 hover:border-amber-400/60 active:bg-amber-500/20 text-white font-mono font-black text-2xl rounded-2xl shadow-md active:scale-95 transition"
                  >
                    {num}
                  </button>
                ))}
                
                <button
                  onClick={handleNumpadClear}
                  className="py-4 bg-slate-950 hover:bg-slate-800 border-2 border-slate-800 text-slate-400 font-bold text-xs rounded-2xl active:scale-95 transition uppercase"
                >
                  Wissen
                </button>

                <button
                  onClick={() => handleNumpadPress('0')}
                  className="py-4 bg-slate-950 hover:bg-slate-800 border-2 border-slate-800 hover:border-amber-400/60 active:bg-amber-500/20 text-white font-mono font-black text-2xl rounded-2xl shadow-md active:scale-95 transition"
                >
                  0
                </button>

                <button
                  onClick={handleNumpadBackspace}
                  className="py-4 bg-slate-950 hover:bg-slate-800 border-2 border-slate-800 text-rose-400 font-black text-sm rounded-2xl active:scale-95 transition"
                >
                  ⌫
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="flex-1 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition border border-slate-700"
                >
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  <span>Nieuw Account</span>
                </button>

                <button
                  onClick={() => handleSearchSubmit()}
                  disabled={!phoneInput}
                  className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-xl ${
                    phoneInput
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20 active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>Inloggen / Bekijk Saldo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: REGISTER NEW CUSTOMER */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl">
                ✨
              </div>
              <div>
                <h3 className="font-black text-lg text-white uppercase tracking-tight">
                  Nieuw WerkLoyalty Account
                </h3>
                <p className="text-xs text-amber-300/80 font-bold">
                  🎁 Ontvang direct +50 Gratis Welkomst-Coins!
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">
                  Mobiel Nummer
                </label>
                <input
                  type="text"
                  readOnly
                  value={phoneInput || '06........'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono font-bold text-amber-400 text-center"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">
                  Je Naam / Roepnaam
                </label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  placeholder="Bijv. Alex, Joas, Sanne..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 font-bold"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowRegisterModal(false)}
                className="flex-1 py-3 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Annuleren
              </button>
              <button
                onClick={handleRegisterNew}
                className="flex-1 py-3 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg"
              >
                Account Aanmaken
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VOUCHER CLAIMED SUCCESS */}
      {redeemedReward && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl w-full max-w-md p-6 text-center space-y-6 shadow-2xl animate-scaleUp">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center text-4xl mx-auto border border-emerald-500/40">
              🎉
            </div>

            <div>
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                Beloning Succesvol Ingewisseld!
              </span>
              <h3 className="text-xl font-black text-white mt-1">
                {redeemedReward.reward.title}
              </h3>
              <p className="text-xs text-slate-400 mt-2">
                Laat onderstaande voucher-code zien aan de kassa-medewerker om je beloning te innen!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border-2 border-dashed border-emerald-500/60 font-mono">
              <div className="text-2xl font-black text-amber-400 tracking-widest">
                {redeemedReward.voucherCode}
              </div>
              <div className="text-[10px] text-slate-500 uppercase mt-1">
                WerkLoyalty Voucher • Eenmalig Geldig
              </div>
            </div>

            <button
              onClick={() => setRedeemedReward(null)}
              className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg"
            >
              Sluiten &amp; Verder
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
