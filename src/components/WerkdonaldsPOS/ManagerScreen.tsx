import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { euro } from '../../services/store';
import { Product, Coupon, GiftCard, PosUser } from '../../types';
import { DiyTerminalModal } from './DiyTerminalModal';
import { showToast } from '../../services/appToast';
import { 
  getLoyaltyCustomers, 
  saveLoyaltyCustomers, 
  registerLoyaltyCustomer, 
  subscribeVipClub, 
  issueVoucherForCustomer, 
  LoyaltyCustomer 
} from '../../services/loyalty';
import { 
  BarChart3, 
  FileText, 
  Download, 
  Power, 
  Plus, 
  Edit3, 
  Trash2, 
  Flame, 
  ShieldCheck, 
  Key, 
  Tag, 
  Gift, 
  RotateCcw,
  X,
  Printer,
  Lock,
  Check,
  Radio,
  Sliders,
  AlertCircle,
  Database,
  Cpu,
  Crown,
  UserCheck,
  Coins,
  Link2,
  Sparkles
} from 'lucide-react';

export const ManagerScreen: React.FC = () => {
  const {
    currentPosUser,
    orders,
    products,
    totalExpenses,
    orderStopActive,
    toggleOrderStop,
    pickupClosed,
    togglePickupClosed,
    giftCards,
    createGiftCard,
    topUpGiftCard,
    deleteGiftCard,
    coupons,
    createCoupon,
    toggleCouponActive,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductSale,
    resetProductsToDefault,
    posUsers,
    createPosUser,
    updatePosUser,
    deletePosUser,
    canAccess
  } = useApp();

  // Active Manager Tab: 'dashboard' (General/Finance/Products/Coupons) | 'ops' (Manager Operations & Controls)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ops'>('dashboard');

  // Z-Report Modal
  const [showZReport, setShowZReport] = useState<boolean>(false);

  // DIY Pinapparaat Modal State
  const [showDiyTerminalModal, setShowDiyTerminalModal] = useState<boolean>(false);

  // New Product State
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdPrice, setNewProdPrice] = useState<string>('');
  const [newProdSalePrice, setNewProdSalePrice] = useState<string>('');
  const [newProdCat, setNewProdCat] = useState<string>('Burgers & Wraps');
  const [newProdEmoji, setNewProdEmoji] = useState<string>('🍔');

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // New Gift Card State
  const [newGiftCode, setNewGiftCode] = useState<string>('');
  const [newGiftAmount, setNewGiftAmount] = useState<string>('');
  const [newGiftRecipient, setNewGiftRecipient] = useState<string>('');
  const [newGiftRecipientPhone, setNewGiftRecipientPhone] = useState<string>('');
  const [newGiftIsPrivate, setNewGiftIsPrivate] = useState<boolean>(false);
  const [giftCardSearch, setGiftCardSearch] = useState<string>('');
  const [giftCardFilter, setGiftCardFilter] = useState<'all' | 'private' | 'active'>('all');

  // WerkLoyalty Accounts Manager State
  const [loyaltyCustomers, setLoyaltyCustomers] = useState<LoyaltyCustomer[]>([]);
  const [loyaltySearch, setLoyaltySearch] = useState<string>('');
  const [newLoyaltyName, setNewLoyaltyName] = useState<string>('');
  const [newLoyaltyPhone, setNewLoyaltyPhone] = useState<string>('');

  useEffect(() => {
    const refreshLoyalty = () => {
      setLoyaltyCustomers(getLoyaltyCustomers());
    };
    refreshLoyalty();
    window.addEventListener('wd_loyalty_updated', refreshLoyalty);
    return () => window.removeEventListener('wd_loyalty_updated', refreshLoyalty);
  }, []);

  // New Coupon State
  const [newCouponCode, setNewCouponCode] = useState<string>('');
  const [newCouponType, setNewCouponType] = useState<'percent' | 'fixed'>('percent');
  const [newCouponVal, setNewCouponVal] = useState<string>('');

  // New Employee State
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserUsername, setNewUserUsername] = useState<string>('');
  const [newUserPass, setNewUserPass] = useState<string>('');
  const [newUserIsAdmin, setNewUserIsAdmin] = useState<boolean>(false);
  const [newUserPerms, setNewUserPerms] = useState<string[]>(['pos', 'kitchen', 'pickup', 'cash_pay']);

  // Edit Employee State
  const [editingUser, setEditingUser] = useState<PosUser | null>(null);
  const [editUserPass, setEditUserPass] = useState<string>('');

  // Clock-In Shift Timer State for Staff
  const [clockedInStaff, setClockedInStaff] = useState<{ username: string; clockInTime: number }[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('wd_clocked_in_staff');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [nowTime, setNowTime] = useState<number>(Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const toggleClockIn = (username: string) => {
    let updated;
    const existing = clockedInStaff.find(c => c.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      updated = clockedInStaff.filter(c => c.username.toLowerCase() !== username.toLowerCase());
    } else {
      updated = [...clockedInStaff, { username, clockInTime: Date.now() }];
    }
    setClockedInStaff(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wd_clocked_in_staff', JSON.stringify(updated));
    }
  };

  const PERMISSION_OPTIONS = [
    { id: 'pos', label: 'Kassa & Bestellen', desc: 'Bestelscherm & kassa bedienen' },
    { id: 'kitchen', label: 'Keukenscherm (KDS)', desc: 'Keukendisplay inzien en bestellingen afronden' },
    { id: 'pickup', label: 'Afhaalscherm TV', desc: 'Gereed bestellingen bekijken' },
    { id: 'voorraad', label: 'Voorraad & Inkoop', desc: 'Voorraad inzien en inkoop beheren' },
    { id: 'manager', label: 'Manager Dashboard', desc: 'Omzet, instellingen en kassa beheer' },
    { id: 'medewerkers', label: 'Medewerkers Aanpassen', desc: 'Gebruikers toevoegen, rechten en accounts beheren' },
    { id: 'producten', label: 'Producten Aanpassen', desc: 'Menu items, prijzen en acties aanpassen' },
    { id: 'coupons_giftcards', label: 'Coupons & Cadeaubonnen', desc: 'Kortingscodes en cadeaubonnen toekennen' },
    { id: 'cash_pay', label: 'Contant Geld Autoriseren', desc: 'Contante bestellingen goedkeuren' },
  ];

  // Stats
  const validOrders = orders.filter(o => o.status !== 'cancelled');
  const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
  const totalItems = validOrders.reduce((sum, o) => sum + o.items.reduce((s, it) => s + it.qty, 0), 0);
  const totalDiscounts = validOrders.reduce((sum, o) => sum + o.discount, 0);
  const netProfit = Math.max(0, totalRevenue - totalExpenses);

  const workPayRevenue = validOrders.filter(o => o.paymentMethod === 'workpay').reduce((sum, o) => sum + o.total, 0);
  const cashRevenue = validOrders.filter(o => o.paymentMethod === 'cash').reduce((sum, o) => sum + o.total, 0);
  const pinRevenue = validOrders.filter(o => o.paymentMethod === 'pin' || o.paymentMethod === 'card').reduce((sum, o) => sum + o.total, 0);
  const giftCardRevenue = validOrders.filter(o => o.paymentMethod === 'giftcard').reduce((sum, o) => sum + o.total, 0);
  const idealRevenue = validOrders.filter(o => o.paymentMethod === 'ideal' || o.paymentMethod === 'online').reduce((sum, o) => sum + o.total, 0);

  // Top 5 Selling Products Calculation
  const productSalesMap: Record<string, { name: string; emoji: string; qty: number; totalRev: number }> = {};
  validOrders.forEach(o => {
    o.items.forEach(it => {
      if (!productSalesMap[it.name]) {
        productSalesMap[it.name] = { name: it.name, emoji: '🍔', qty: 0, totalRev: 0 };
      }
      productSalesMap[it.name].qty += it.qty;
      productSalesMap[it.name].totalRev += (it.price || 0) * it.qty;
    });
  });
  const topProducts = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const maxQty = topProducts.length > 0 ? topProducts[0].qty : 1;

  // Export CSV
  const handleExportCSV = () => {
    if (orders.length === 0) {
      showToast('Geen bestellingen om te exporteren.', 'warning');
      return;
    }
    let csv = 'OrderNr;Tijd;Totaal;Korting;Type;Klant_Tafel;Betaalmethode;Kassier;Status\n';
    orders.forEach(o => {
      csv += `${o.no};${o.time};${o.total.toFixed(2)};${o.discount.toFixed(2)};${o.orderType};${o.identifier};${o.paymentMethod};${o.cashier};${o.status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `werkdonalds_orders_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const pr = parseFloat(newProdPrice);
    if (!newProdName.trim() || isNaN(pr) || pr <= 0) {
      showToast('Vul geldige productgegevens in.', 'warning');
      return;
    }
    const sale = parseFloat(newProdSalePrice) || 0;
    createProduct({
      name: newProdName.trim(),
      price: pr,
      salePrice: sale,
      onSale: sale > 0,
      cat: newProdCat,
      emoji: newProdEmoji || '🍔',
      inStock: true
    });
    setNewProdName('');
    setNewProdPrice('');
    setNewProdSalePrice('');
    showToast(`Product ${newProdName} toegevoegd!`, 'success');
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    updateProduct(editingProduct);
    setEditingProduct(null);
  };

  const handleCreateGiftCard = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newGiftAmount);
    if (!newGiftCode.trim() || isNaN(amt) || amt <= 0) {
      showToast('Vul een geldige code en bedrag in.', 'warning');
      return;
    }
    createGiftCard(
      newGiftCode.trim().toUpperCase(),
      amt,
      currentPosUser?.name || 'Manager Ops',
      newGiftRecipient.trim() || undefined,
      newGiftRecipientPhone.trim() || undefined,
      newGiftIsPrivate ? '🔒 Privé Card / Personeelsvrijkaart' : undefined
    );
    setNewGiftCode('');
    setNewGiftAmount('');
    setNewGiftRecipient('');
    setNewGiftRecipientPhone('');
    setNewGiftIsPrivate(false);
    showToast(`Cadeaubon ${newGiftCode.toUpperCase()} (${euro(amt)}) aangemaakt!`, 'success');
  };

  const handleCreateLoyaltyCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoyaltyName.trim() || !newLoyaltyPhone.trim()) {
      showToast('Vul een naam en telefoonnummer in.', 'warning');
      return;
    }
    const created = registerLoyaltyCustomer(newLoyaltyName.trim(), newLoyaltyPhone.trim());
    setNewLoyaltyName('');
    setNewLoyaltyPhone('');
    setLoyaltyCustomers(getLoyaltyCustomers());
    showToast(`WerkLoyalty account '${created.name}' (${created.phone}) aangemaakt!`, 'success');
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newCouponVal);
    if (!newCouponCode.trim() || isNaN(val) || val <= 0) {
      showToast('Vul een code en waarde in.', 'warning');
      return;
    }
    createCoupon({
      code: newCouponCode.trim().toUpperCase(),
      discount_type: newCouponType,
      discount_val: val,
      is_active: true
    });
    setNewCouponCode('');
    setNewCouponVal('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserUsername.trim() || !newUserPass.trim()) {
      showToast('Vul alle velden in.', 'warning');
      return;
    }
    const effectivePerms = newUserIsAdmin 
      ? ['pos', 'kitchen', 'pickup', 'voorraad', 'manager', 'medewerkers', 'producten', 'coupons_giftcards', 'cash_pay']
      : newUserPerms;

    const res = await createPosUser({
      name: newUserName.trim(),
      username: newUserUsername.trim().toLowerCase(),
      password: newUserPass.trim(),
      perms: effectivePerms,
      is_admin: newUserIsAdmin
    });
    setNewUserName('');
    setNewUserUsername('');
    setNewUserPass('');
    setNewUserIsAdmin(false);
    setNewUserPerms(['pos', 'kitchen', 'pickup', 'cash_pay']);
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const handleStartEditUser = (u: PosUser) => {
    // Joas can only be edited by Joas
    if (u.username.toLowerCase() === 'joas' && currentPosUser?.username.toLowerCase() !== 'joas') {
      showToast('Joas kan je alleen aanpassen als je zelf als Joas bent ingelogd.', 'warning');
      return;
    }
    setEditingUser({ ...u, perms: [...(u.perms || [])] });
    setEditUserPass('');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (editingUser.username.toLowerCase() === 'joas' && currentPosUser?.username.toLowerCase() !== 'joas') {
      showToast('Joas kan je alleen aanpassen als je zelf als Joas bent ingelogd.', 'warning');
      return;
    }

    const effectivePerms = editingUser.is_admin
      ? ['pos', 'kitchen', 'pickup', 'voorraad', 'manager', 'medewerkers', 'producten', 'coupons_giftcards', 'cash_pay']
      : (editingUser.perms || []);

    const res = await updatePosUser({
      ...editingUser,
      perms: effectivePerms,
      password: editUserPass.trim() || undefined
    });

    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) {
      setEditingUser(null);
    }
  };

  const handleDeleteUser = async (u: PosUser) => {
    if (u.username.toLowerCase() === 'joas') {
      showToast('De hoofdbeheerder Joas kan niet worden verwijderd!', 'error');
      return;
    }
    if (u.username === 'bestel_kassa') {
      showToast('Het standaard bestelaccount kan niet worden verwijderd.', 'error');
      return;
    }
    if (confirm(`Weet je zeker dat je medewerker "${u.name}" wilt verwijderen?`)) {
      const res = await deletePosUser(u.id);
      showToast(res.message, res.success ? 'success' : 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-108px)] overflow-y-auto bg-slate-950 p-4 sm:p-6 space-y-6">
      
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            <span>Manager Dashboard &amp; Instellingen</span>
          </h1>
          <p className="text-xs text-slate-400">
            Beheer omzet, kassa instellingen, menuprijzen, cadeaubonnen, kortingen en personeel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Subtabs within Manager: Algemeen vs Ops */}
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeTab === 'dashboard'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Algemeen Overzicht</span>
            </button>

            {canAccess('manager') && (
              <button
                onClick={() => setActiveTab('ops')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activeTab === 'ops'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-purple-300" />
                <span>Ops Beheer</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 border border-purple-500/40 text-purple-300 font-mono">
                  Manager
                </span>
              </button>
            )}
          </div>

          <button
            onClick={() => setShowZReport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Z-Rapport / Dagafsluiting</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Exporteer CSV</span>
          </button>
        </div>
      </div>

      {activeTab === 'ops' ? (
        /* Ops Tab - Dedicated Operations & Store Controls for Manager */
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <span>Operations &amp; Store Master Control (Ops)</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                      Exclusief voor Manager
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Live operationele schakelaars, noodknoppen, kassa-veiligheid en restaurant status.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Power className="w-4 h-4 text-rose-400" />
                    <span>Noodstop Kassa (Bestelstop)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Blokkeer direct alle nieuwe bestellingen en afrekeningen bij extreme drukte of incidenten.
                  </p>
                </div>
                <button
                  onClick={toggleOrderStop}
                  className={`px-4 py-2 rounded-xl font-black text-xs transition ${
                    orderStopActive 
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 animate-pulse' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {orderStopActive ? '⛔ BESTELSTOP ACTIEF' : '🟢 Kassa Open'}
                </button>
              </div>
              <div className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Huidige status: {orderStopActive ? 'Klanten kunnen geen bestelling afronden.' : 'Bestellingen worden direct doorgestuurd naar de keuken.'}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Radio className="w-4 h-4 text-blue-400" />
                    <span>Afhaalbalie TV Scherm</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Schakel het publieke afhaalscherm om naar 'Balie Gesloten' of 'Bestellingen Afhalen'.
                  </p>
                </div>
                <button
                  onClick={togglePickupClosed}
                  className={`px-4 py-2 rounded-xl font-black text-xs transition ${
                    pickupClosed 
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  {pickupClosed ? '🔴 BALIE GESLOTEN' : '🟢 Balie Geopend'}
                </button>
              </div>
              <div className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>Huidige status: {pickupClosed ? 'TV toont gesloten mededeling.' : 'TV toont nummers "In Bereiding" en "Gereed".'}</span>
              </div>
            </div>
          </div>

          {/* Hardware & Pinapparaat Terminal Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <span>DIY Pinapparaat &amp; Betaalterminal Hardware</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                      Arduino / NFC / LCD
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Virtueel of fysiek pinapparaat testen, NFC-kaarten scannen en pinterminal instellingen beheren.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDiyTerminalModal(true)}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition shadow-lg shadow-cyan-500/20 flex items-center gap-2"
              >
                <Cpu className="w-4 h-4" />
                <span>Open Pinapparaat Terminal</span>
              </button>
            </div>
          </div>

          {/* Quick Operations Telemetry */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                Actieve Bestellingen
              </span>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {orders.filter(o => o.status === 'prep').length} in de keuken
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {orders.filter(o => o.status === 'ready').length} wachten op afhaal
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                Geannuleerde Bestellingen
              </span>
              <div className="text-2xl font-black text-rose-400 mt-1">
                {orders.filter(o => o.status === 'cancelled').length} orders
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Uitval &amp; retouren</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                Ingelogd Manager Profiel
              </span>
              <div className="text-lg font-black text-purple-300 mt-1 truncate">
                {currentPosUser?.name || 'Onbekend'}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block font-mono">
                @{currentPosUser?.username || 'gast'} (Admin)
              </span>
            </div>
          </div>

          {/* Store Ops Quick Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>Systeemacties, Database &amp; Menureset</span>
            </h3>

            {/* SQL Export & Schema Downloads */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div>
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Supabase PostgreSQL Database Scripts (3 Opties)</span>
                </div>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Kies een van de SQL scripts voor de Supabase SQL Editor. Gebruik de <strong>Schema Only</strong> versie als je jouw aangepaste producten en prijzen wilt BEWAREN.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <a
                  href="./database-schema-only.sql"
                  download="database-schema-only.sql"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 hover:border-emerald-400 hover:bg-slate-850 transition flex items-center justify-between group shadow-sm"
                >
                  <div>
                    <div className="font-bold text-emerald-400 flex items-center gap-1">
                      <span>🛡️ Schema Only</span>
                    </div>
                    <div className="text-[10px] text-slate-300 font-medium">Behoudt jouw eigen producten &amp; prijzen (Geen reset)</div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition" />
                </a>

                <a
                  href="./database-basis.sql"
                  download="database-basis.sql"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 transition flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-cyan-400 flex items-center gap-1">
                      <span>📄 Basis Tabellen</span>
                    </div>
                    <div className="text-[10px] text-slate-400">⚡ Alleen 5 kern-tabellen</div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition" />
                </a>

                <a
                  href="./database.sql"
                  download="database.sql"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 transition flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-indigo-400 flex items-center gap-1">
                      <span>📦 Volledig + Seed</span>
                    </div>
                    <div className="text-[10px] text-slate-400">🔥 Alle tabellen + Standaard data</div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition" />
                </a>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <div className="font-bold text-slate-200">Herstel Standaard Menukaart</div>
                <p className="text-slate-400 text-[11px]">
                  Zet alle 50+ gerechten en actieprijzen terug naar fabrieksinstellingen.
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Weet je zeker dat je alle producten wilt resetten naar de standaardlijst?')) {
                    resetProductsToDefault();
                    showToast('Menu succesvol gereset!', 'success');
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                Menu Resetten
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Algemeen Dashboard Tab */
        <>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow">
          <span className="text-[11px] font-bold uppercase text-slate-400">Totale Omzet</span>
          <div className="text-xl font-black text-emerald-400 mt-1">{euro(totalRevenue)}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow">
          <span className="text-[11px] font-bold uppercase text-slate-400">Inkoopkosten</span>
          <div className="text-xl font-black text-rose-400 mt-1">{euro(totalExpenses)}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow">
          <span className="text-[11px] font-bold uppercase text-slate-400">Nettowinst</span>
          <div className="text-xl font-black text-blue-400 mt-1">{euro(netProfit)}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow">
          <span className="text-[11px] font-bold uppercase text-slate-400">Bestellingen</span>
          <div className="text-xl font-black text-white mt-1">{validOrders.length}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow">
          <span className="text-[11px] font-bold uppercase text-slate-400">Items Verkocht</span>
          <div className="text-xl font-black text-amber-400 mt-1">{totalItems}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow">
          <span className="text-[11px] font-bold uppercase text-slate-400">Gem. Bestelwaarde</span>
          <div className="text-xl font-black text-cyan-400 mt-1">
            {euro(validOrders.length > 0 ? totalRevenue / validOrders.length : 0)}
          </div>
        </div>
      </div>

      {/* Manager 1 & 2: Live Payment Method Monitor & Top 5 Product Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Manager 1: Live Payment Breakdown */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>💳 Manager 1: Omzet &amp; Betaalmethoden Breakdown</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Live verdeling van inkomsten per kanaal vandaag</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
              Totaal: {euro(totalRevenue)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                💳 Pin / Kaart
              </span>
              <div className="text-sm font-black text-blue-400">{euro(pinRevenue)}</div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full" 
                  style={{ width: `${totalRevenue > 0 ? (pinRevenue / totalRevenue) * 100 : 0}%` }} 
                />
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                💵 Contant Geld
              </span>
              <div className="text-sm font-black text-emerald-400">{euro(cashRevenue)}</div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full" 
                  style={{ width: `${totalRevenue > 0 ? (cashRevenue / totalRevenue) * 100 : 0}%` }} 
                />
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                📱 WerkPay App
              </span>
              <div className="text-sm font-black text-purple-400">{euro(workPayRevenue)}</div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-purple-500 h-full rounded-full" 
                  style={{ width: `${totalRevenue > 0 ? (workPayRevenue / totalRevenue) * 100 : 0}%` }} 
                />
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                🎁 Cadeaubonnen
              </span>
              <div className="text-sm font-black text-amber-400">{euro(giftCardRevenue)}</div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-400 h-full rounded-full" 
                  style={{ width: `${totalRevenue > 0 ? (giftCardRevenue / totalRevenue) * 100 : 0}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Manager 2: Populairste Producten Top 5 */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-sm text-white flex items-center gap-2">
              <span>🔥 Manager 2: Top 5 Best-Selling Producten</span>
            </h2>
            <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Aantal verkocht</span>
          </div>

          {topProducts.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Nog geen verkopen geregistreerd vandaag.</p>
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((tp, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                const pct = Math.round((tp.qty / maxQty) * 100);

                return (
                  <div key={tp.name} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <span className="font-mono text-amber-400 text-sm">{medal}</span>
                        <span className="truncate max-w-[180px]">{tp.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-amber-400">{tp.qty}x</span>
                        <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({euro(tp.totalRev)})</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Store Operations & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
        <h2 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
          <span>⚙️ Winkel- &amp; Baliebeheer</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          
          {/* Bestelstop */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-200">⛔ Bestelstop Kassa</div>
              <p className="text-[11px] text-slate-400">
                {orderStopActive ? 'Actief: klanten kunnen niet afrekenen' : 'Niet actief: kassa is open'}
              </p>
            </div>
            <button
              onClick={toggleOrderStop}
              className={`px-3 py-2 rounded-xl font-bold text-xs transition ${
                orderStopActive 
                  ? 'bg-rose-600 text-white shadow-rose-600/20' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {orderStopActive ? 'Bestelstop Opheffen' : 'Bestelstop Activeren'}
            </button>
          </div>

          {/* Afhaalscherm sluiten */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-200">🔴 Afhaalbalie Scherm</div>
              <p className="text-[11px] text-slate-400">
                {pickupClosed ? 'Gesloten bord wordt getoond op TV' : 'Actief: bestelnummers worden getoond'}
              </p>
            </div>
            <button
              onClick={togglePickupClosed}
              className={`px-3 py-2 rounded-xl font-bold text-xs transition ${
                pickupClosed 
                  ? 'bg-rose-600 text-white shadow-rose-600/20' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {pickupClosed ? 'Balie Openen' : 'Balie Sluiten'}
            </button>
          </div>

        </div>
      </div>

      {/* Cadeaubonnen & Privé Cards Beheer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <Gift className="w-4 h-4 text-purple-400" />
              <span>💳 Alle Cadeaukaarten &amp; Privé Cards ({giftCards.length})</span>
            </h2>
            <p className="text-xs text-slate-400">Bekijk alle huidige cadeaukaarten, ook privé/personeelskaarten en vouchers</p>
          </div>

          {/* Filter Toggles */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setGiftCardFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${giftCardFilter === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Alle ({giftCards.length})
            </button>
            <button
              type="button"
              onClick={() => setGiftCardFilter('private')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${giftCardFilter === 'private' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              🔒 Privé
            </button>
            <button
              type="button"
              onClick={() => setGiftCardFilter('active')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${giftCardFilter === 'active' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              🟢 Actief Saldo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* List / Search View */}
          <div className="lg:col-span-7 space-y-2.5">
            <input
              type="text"
              value={giftCardSearch}
              onChange={e => setGiftCardSearch(e.target.value)}
              placeholder="🔍 Zoek code, ontvanger, afzender of opmerking..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 outline-none"
            />

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {giftCards
                .filter(card => {
                  if (giftCardFilter === 'private' && !card.is_private && !card.notes?.includes('Privé') && !card.code.includes('PRV')) return false;
                  if (giftCardFilter === 'active' && card.current_balance <= 0) return false;
                  if (giftCardSearch) {
                    const q = giftCardSearch.toLowerCase();
                    return card.code.toLowerCase().includes(q) ||
                           (card.recipient_name && card.recipient_name.toLowerCase().includes(q)) ||
                           (card.sender_name && card.sender_name.toLowerCase().includes(q)) ||
                           (card.notes && card.notes.toLowerCase().includes(q));
                  }
                  return true;
                })
                .map(card => {
                  const isPrivate = card.is_private || card.notes?.includes('Privé') || card.code.startsWith('PRV');
                  return (
                    <div key={card.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold font-mono text-purple-300 text-sm">{card.code}</span>
                          {isPrivate && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              🔒 Privé Card
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                navigator.clipboard.writeText(card.code);
                                showToast(`Code ${card.code} gekopieerd!`, 'success');
                              } catch {
                                showToast(`Code: ${card.code}`, 'info');
                              }
                            }}
                            className="text-[10px] text-slate-400 hover:text-white underline font-mono"
                            title="Kopieer Code"
                          >
                            [Kopieer]
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Saldo: <strong className="text-emerald-400 font-bold">{euro(card.current_balance)}</strong> / Start: {euro(card.initial_balance)}
                        </div>
                        {(card.recipient_name || card.sender_name) && (
                          <div className="text-[10px] text-slate-500 italic">
                            Voor: {card.recipient_name || 'Anoniem'} {card.sender_name ? `(Van: ${card.sender_name})` : ''}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => topUpGiftCard(card.id, 5)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px]"
                          title="Saldo ophogen met €5"
                        >
                          +€5
                        </button>
                        <button
                          type="button"
                          onClick={() => topUpGiftCard(card.id, 10)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px]"
                          title="Saldo ophogen met €10"
                        >
                          +€10
                        </button>
                        <button
                          type="button"
                          onClick={() => topUpGiftCard(card.id, 25)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px]"
                          title="Saldo ophogen met €25"
                        >
                          +€25
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteGiftCard(card.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                          title="Cadeaukaart Verwijderen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Create Form */}
          <form onSubmit={handleCreateGiftCard} className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200">+ Nieuwe Cadeaukaart / Vrijkaart</h3>
              <button
                type="button"
                onClick={() => {
                  const rand = 'WD' + Math.floor(100000 + Math.random() * 900000);
                  setNewGiftCode(rand);
                }}
                className="text-[10px] text-purple-400 hover:underline font-bold"
              >
                Genereer Code
              </button>
            </div>

            <input
              type="text"
              required
              value={newGiftCode}
              onChange={e => setNewGiftCode(e.target.value.toUpperCase())}
              placeholder="Cadeauboncode (bijv. CADEAU50 of PRV99)"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white uppercase font-mono"
            />

            <input
              type="number"
              required
              step="1"
              value={newGiftAmount}
              onChange={e => setNewGiftAmount(e.target.value)}
              placeholder="Startsaldo in euro (€)"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
            />

            {/* Koppel aan Bestaand WerkLoyalty Account */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                <span>Koppel aan WerkLoyalty Account:</span>
              </label>
              <select
                value={newGiftRecipientPhone}
                onChange={e => {
                  const selectedPhone = e.target.value;
                  setNewGiftRecipientPhone(selectedPhone);
                  const found = loyaltyCustomers.find(c => c.phone === selectedPhone);
                  if (found) {
                    setNewGiftRecipient(found.name);
                  }
                }}
                className="w-full bg-slate-900 border border-amber-500/30 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
              >
                <option value="">-- Geen Koppeling (Losse Card) --</option>
                {loyaltyCustomers.map(cust => (
                  <option key={cust.id} value={cust.phone}>
                    {cust.name} ({cust.phone}) • {cust.tier} {cust.vipSubscriptionActive ? '👑 VIP' : ''}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              value={newGiftRecipient}
              onChange={e => setNewGiftRecipient(e.target.value)}
              placeholder="Ontvanger naam (bijv. Jan de Vries)"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
            />

            <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={newGiftIsPrivate}
                onChange={e => setNewGiftIsPrivate(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-purple-500"
              />
              <span className="font-bold">🔒 Markeer als Privé Card (Exclusief)</span>
            </label>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg font-extrabold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20"
            >
              + Cadeaukaart Opslaan
            </button>
          </form>
        </div>
      </div>

      {/* 👑 WerkLoyalty Klantaccounts & VIP Leden Beheer */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="font-black text-base text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span>👑 WerkLoyalty Klantaccounts &amp; VIP Leden ({loyaltyCustomers.length})</span>
            </h2>
            <p className="text-xs text-slate-400">
              Beheer alle klantedatabase accounts, geef WerkCoins, activeer VIP abonnementen en bekijk gekoppelde cadeaukaarten.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold font-mono">
              ⚡ Live Supabase Sync
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Account List / Search */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={loyaltySearch}
                onChange={e => setLoyaltySearch(e.target.value)}
                placeholder="🔍 Zoek klant op naam, telefoonnummer of tier..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 outline-none"
              />
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {loyaltyCustomers
                .filter(cust => {
                  if (!loyaltySearch) return true;
                  const q = loyaltySearch.toLowerCase();
                  return cust.name.toLowerCase().includes(q) ||
                         cust.phone.toLowerCase().includes(q) ||
                         cust.tier.toLowerCase().includes(q);
                })
                .map(cust => {
                  const isVip = cust.vipSubscriptionActive || cust.tier.includes('VIP');
                  return (
                    <div key={cust.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 hover:border-slate-700 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{isVip ? '💎' : cust.tier === 'Goud' ? '🥇' : cust.tier === 'Zilver' ? '🥈' : '🥉'}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-white text-sm">{cust.name}</span>
                              <span className="font-mono text-xs text-slate-400">({cust.phone})</span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Lid sinds: {cust.joinedDate || '2026'} • Total spent: <strong className="text-emerald-400">{euro(cust.totalSpent)}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Tier & VIP Badge */}
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                            isVip ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40' :
                            cust.tier === 'Goud' ? 'bg-amber-950 text-amber-300 border-amber-500/40' :
                            cust.tier === 'Zilver' ? 'bg-slate-800 text-slate-300 border-slate-600' :
                            'bg-amber-950/40 text-amber-600 border-amber-800/40'
                          }`}>
                            {cust.tier}
                          </span>

                          {isVip && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400 text-slate-950 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> VIP Club
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats & Quick Actions Bar */}
                      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-900 gap-2 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-amber-400 flex items-center gap-1">
                            🪙 {cust.coins} Coins
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            🎟️ {cust.vouchers?.length || 0} Vouchers
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = loyaltyCustomers.map(c => c.id === cust.id ? { ...c, coins: c.coins + 50 } : c);
                              saveLoyaltyCustomers(updated);
                              setLoyaltyCustomers(getLoyaltyCustomers());
                              showToast(`+50 Coins gegeven aan ${cust.name}!`, 'success');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold border border-amber-500/20 text-[11px]"
                          >
                            +50 Coins
                          </button>

                          {!isVip ? (
                            <button
                              type="button"
                              onClick={() => {
                                subscribeVipClub(cust.phone, 'vip_monthly_499');
                                setLoyaltyCustomers(getLoyaltyCustomers());
                                showToast(`${cust.name} geabonneerd op VIP Club!`, 'success');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] shadow"
                            >
                              👑 VIP Activeren
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> VIP Actief
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setNewGiftRecipientPhone(cust.phone);
                              setNewGiftRecipient(cust.name);
                              setNewGiftIsPrivate(true);
                              showToast(`Geselecteerd: Koppel cadeaukaart aan ${cust.name}`, 'info');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] flex items-center gap-1"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>Koppel Card</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Create Account Form */}
          <form onSubmit={handleCreateLoyaltyCustomer} className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
            <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>+ Nieuw WerkLoyalty Account</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Meld een nieuwe vaste klant handmatig aan vanuit het kassasysteem. Ontvangt direct 50 Welkomstmunten!
            </p>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-bold block">Klantnaam:</label>
              <input
                type="text"
                required
                value={newLoyaltyName}
                onChange={e => setNewLoyaltyName(e.target.value)}
                placeholder="Bijv. Mark de Jong"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-bold block">Telefoonnummer:</label>
              <input
                type="tel"
                required
                value={newLoyaltyPhone}
                onChange={e => setNewLoyaltyPhone(e.target.value)}
                placeholder="0612345678"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-black bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-400/20"
            >
              + Klant Account Aanmaken &amp; Syncen
            </button>
          </form>
        </div>
      </div>

      {/* Menu & Product Management (50+ Items) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <span>🍔 Menulijst, Actieprijzen &amp; Items ({products.length} gerechten)</span>
            </h2>
            <p className="text-xs text-slate-400">Prijzen aanpassen of actieprijzen tijdelijk activeren.</p>
          </div>
          <button
            onClick={() => {
              if (confirm('Menulijst herstellen naar standaard 67 Werkdonalds gerechten?')) {
                resetProductsToDefault();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Herstel Standaardlijst</span>
          </button>
        </div>

        {/* Add Product Form */}
        <form onSubmit={handleCreateProduct} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
          <input
            type="text"
            required
            value={newProdName}
            onChange={e => setNewProdName(e.target.value)}
            placeholder="Naam gerecht"
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
          />
          <input
            type="number"
            required
            step="0.05"
            value={newProdPrice}
            onChange={e => setNewProdPrice(e.target.value)}
            placeholder="Prijs (€ 5.95)"
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
          />
          <input
            type="number"
            step="0.05"
            value={newProdSalePrice}
            onChange={e => setNewProdSalePrice(e.target.value)}
            placeholder="Actie (€ 3.95)"
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
          />
          <select
            value={newProdCat}
            onChange={e => setNewProdCat(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
          >
            <option value="Burgers & Wraps">Burgers & Wraps</option>
            <option value="Chicken & Snacks">Chicken & Snacks</option>
            <option value="Friet & Sides">Friet & Sides</option>
            <option value="Dranken & McCafé">Dranken & McCafé</option>
            <option value="Desserts & IJs">Desserts & IJs</option>
            <option value="Happy Meal">Happy Meal</option>
            <option value="Sauzen & Dips">Sauzen & Dips</option>
          </select>
          <button
            type="submit"
            className="py-1.5 rounded-lg font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Toevoegen
          </button>
        </form>

        {/* Product Table */}
        <div className="overflow-x-auto max-h-72 border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] sticky top-0 border-b border-slate-800">
              <tr>
                <th className="p-2.5">Emoji</th>
                <th className="p-2.5">Product</th>
                <th className="p-2.5">Categorie</th>
                <th className="p-2.5">Regulier</th>
                <th className="p-2.5">Actieprijs</th>
                <th className="p-2.5">Actie Status</th>
                <th className="p-2.5 text-right">Beheer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/30">
                  <td className="p-2.5 text-base">{p.emoji}</td>
                  <td className="p-2.5 font-bold text-white">{p.name}</td>
                  <td className="p-2.5 text-slate-400">{p.cat}</td>
                  <td className="p-2.5 font-mono">{euro(p.price)}</td>
                  <td className="p-2.5 font-mono">{p.salePrice > 0 ? euro(p.salePrice) : '—'}</td>
                  <td className="p-2.5">
                    <button
                      onClick={() => toggleProductSale(p.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.onSale ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {p.onSale ? '🔥 Actie Aan' : 'Uit'}
                    </button>
                  </td>
                  <td className="p-2.5 text-right flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditingProduct({ ...p })}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="Bewerken"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Weet je zeker dat je "${p.name}" wilt verwijderen?`)) {
                          await deleteProduct(p.id);
                        }
                      }}
                      className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kortingscoupons Beheer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
        <h2 className="font-bold text-sm text-white flex items-center gap-2">
          <Tag className="w-4 h-4 text-emerald-400" />
          <span>🏷️ Kortingscoupons Beheren</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 overflow-y-auto max-h-48 pr-1">
            {coupons.map(c => (
              <div key={c.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold font-mono text-emerald-300">{c.code}</span>
                  <div className="text-[11px] text-slate-400">
                    Korting: {c.discount_type === 'percent' ? `${c.discount_val}%` : euro(c.discount_val)}
                  </div>
                </div>
                <button
                  onClick={() => toggleCouponActive(c.id)}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${
                    c.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {c.is_active ? '🟢 Actief' : '🔴 Uit'}
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleCreateCoupon} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
            <h3 className="font-bold text-slate-300">+ Nieuwe Coupon Aanmaken</h3>
            <input
              type="text"
              required
              value={newCouponCode}
              onChange={e => setNewCouponCode(e.target.value.toUpperCase())}
              placeholder="Couponcode"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white uppercase font-mono"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newCouponType}
                onChange={e => setNewCouponType(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
              >
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Vast Bedrag (€)</option>
              </select>
              <input
                type="number"
                required
                step="0.05"
                value={newCouponVal}
                onChange={e => setNewCouponVal(e.target.value)}
                placeholder="Kortingswaarde"
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              + Coupon Opslaan
            </button>
          </form>
        </div>
      </div>

      {/* Werknemers & Rechten */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>👥 Werknemers, Rollen &amp; Toegangsrechten ({posUsers.length})</span>
            </h2>
            <p className="text-xs text-slate-400">
              Beheer bestaande gebruikers, pas schermen en rechten aan. Let op: Joas kan alleen door Joas worden aangepast.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* User List */}
          <div className="lg:col-span-7 space-y-2.5">
            {posUsers.map(u => {
              const isJoas = u.username.toLowerCase() === 'joas';
              const canEditThisUser = !isJoas || currentPosUser?.username.toLowerCase() === 'joas';

              return (
                <div key={u.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2.5 text-xs transition hover:border-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-white text-sm flex items-center gap-2">
                        <span>{u.name}</span>
                        {isJoas && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            Eigenaar
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">@{u.username}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        u.is_admin 
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                          : u.username === 'bestel_kassa' || u.username === 'klant'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {u.is_admin ? 'Manager' : u.username === 'bestel_kassa' || u.username === 'klant' ? 'Klant' : 'Medewerker'}
                      </span>

                      {canEditThisUser ? (
                        <button
                          type="button"
                          onClick={() => handleStartEditUser(u)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-1 transition"
                        >
                          <Edit3 className="w-3 h-3 text-blue-400" />
                          <span>Bewerken</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => showToast('Joas kan je alleen aanpassen als je zelf als Joas bent ingelogd.', 'warning')}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 font-medium text-xs border border-slate-800 flex items-center gap-1 cursor-not-allowed"
                          title="Alleen Joas kan het account van Joas bewerken"
                        >
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span>Alleen Joas</span>
                        </button>
                      )}

                      {!isJoas && u.username !== 'bestel_kassa' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                          title="Medewerker verwijderen"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Permissions pills & Manager 3 Dienst-Timer Inkloksysteem */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900">
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] text-slate-500 font-bold self-center mr-1">Toegang:</span>
                      {u.perms && u.perms.length > 0 ? (
                        u.perms.map(p => {
                          const opt = PERMISSION_OPTIONS.find(o => o.id === p);
                          return (
                            <span
                              key={p}
                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-300"
                            >
                              {opt ? opt.label.split(' ')[0] : p}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Geen extra rechten</span>
                      )}
                    </div>

                    {/* Manager 3: Live Inklok & Dienst-Timer Button */}
                    {u.username !== 'bestel_kassa' && u.username !== 'klant' && (() => {
                      const clockRecord = clockedInStaff.find(c => c.username.toLowerCase() === u.username.toLowerCase());
                      const isClockedIn = !!clockRecord;
                      const elapsedSec = clockRecord ? Math.floor((nowTime - clockRecord.clockInTime) / 1000) : 0;
                      const hrs = Math.floor(elapsedSec / 3600);
                      const mins = Math.floor((elapsedSec % 3600) / 60);
                      const secs = elapsedSec % 60;
                      const durationStr = `${hrs > 0 ? `${hrs}u ` : ''}${mins}m ${secs}s`;

                      return (
                        <div className="flex items-center gap-2">
                          {isClockedIn && (
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md animate-pulse">
                              ⏱️ {durationStr}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleClockIn(u.username)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                              isClockedIn 
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30' 
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            }`}
                            title={isClockedIn ? 'Meld medewerker af (Uitklokken)' : 'Meld medewerker aan voor dienst (Inklokken)'}
                          >
                            <span>{isClockedIn ? '🔴 Uitklokken' : '🟢 Inklokken'}</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* New Employee Form with Granular Permissions */}
          <div className="lg:col-span-5">
            <form onSubmit={handleCreateUser} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
              <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Nieuwe Medewerker Aanmaken</span>
              </h3>

              <div>
                <label className="text-slate-400 block mb-1">Volledige Naam</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="Volledige Naam"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Gebruikersnaam</label>
                <input
                  type="text"
                  required
                  value={newUserUsername}
                  onChange={e => setNewUserUsername(e.target.value)}
                  placeholder="Gebruikersnaam"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Wachtwoord of Pincode</label>
                <input
                  type="password"
                  required
                  value={newUserPass}
                  onChange={e => setNewUserPass(e.target.value)}
                  placeholder="Wachtwoord"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newUserIsAdmin}
                  onChange={e => setNewUserIsAdmin(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-blue-500"
                />
                <span className="font-bold text-slate-200">👑 Is Manager / Beheerder (alle rechten)</span>
              </label>

              {/* Granular Permissions Checkboxes */}
              <div className="space-y-1.5 pt-1">
                <span className="font-bold text-slate-300 block">Kies Schermen &amp; Bevoegdheden:</span>
                <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1">
                  {PERMISSION_OPTIONS.map(opt => {
                    const isChecked = newUserIsAdmin || newUserPerms.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                          isChecked 
                            ? 'bg-blue-500/10 border-blue-500/30 text-white' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={newUserIsAdmin}
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setNewUserPerms(prev => [...prev, opt.id]);
                            } else {
                              setNewUserPerms(prev => prev.filter(p => p !== opt.id));
                            }
                          }}
                          className="rounded border-slate-700 bg-slate-950 text-blue-500"
                        />
                        <div className="flex-1">
                          <span className="font-bold block text-slate-200">{opt.label}</span>
                          <span className="text-[10px] text-slate-400 block">{opt.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-black bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition"
              >
                + Medewerker Opslaan
              </button>
            </form>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">Medewerker Aanpassen</h3>
                  <p className="text-xs text-slate-400">Wijzig gegevens, rollen en toegangsrechten voor {editingUser.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingUser(null)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Volledige Naam</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Gebruikersnaam</label>
                <input
                  type="text"
                  required
                  disabled={editingUser.username.toLowerCase() === 'joas'}
                  value={editingUser.username}
                  onChange={e => setEditingUser({ ...editingUser, username: e.target.value.toLowerCase() })}
                  className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500 ${
                    editingUser.username.toLowerCase() === 'joas' ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                />
                {editingUser.username.toLowerCase() === 'joas' && (
                  <p className="text-[11px] text-amber-400 mt-1">Gebruikersnaam 'joas' is beschermd en kan niet worden gewijzigd.</p>
                )}
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Wachtwoord Wijzigen (optioneel)</label>
                <input
                  type="password"
                  value={editUserPass}
                  onChange={e => setEditUserPass(e.target.value)}
                  placeholder="Laat leeg om het huidige wachtwoord te behouden"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editingUser.is_admin)}
                  onChange={e => setEditingUser({ ...editingUser, is_admin: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-blue-500"
                />
                <span className="font-bold text-slate-200">👑 Manager / Beheerder Status (geeft volledige admin rechten)</span>
              </label>

              {/* Granular Permissions Selection */}
              <div className="space-y-2">
                <span className="font-bold text-slate-200 block">Kies Toegangsrechten &amp; Schermen:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PERMISSION_OPTIONS.map(opt => {
                    const isChecked = Boolean(editingUser.is_admin || editingUser.perms?.includes(opt.id));
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                          isChecked
                            ? 'bg-blue-500/10 border-blue-500/30 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={Boolean(editingUser.is_admin)}
                          checked={isChecked}
                          onChange={e => {
                            const current = editingUser.perms || [];
                            if (e.target.checked) {
                              setEditingUser({ ...editingUser, perms: [...current, opt.id] });
                            } else {
                              setEditingUser({ ...editingUser, perms: current.filter(p => p !== opt.id) });
                            }
                          }}
                          className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-500"
                        />
                        <div>
                          <span className="font-bold text-slate-200 block text-xs">{opt.label}</span>
                          <span className="text-[10px] text-slate-400 block leading-tight">{opt.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-300 transition text-sm"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-black text-white transition shadow-lg shadow-blue-600/25 text-sm"
                >
                  Wijzigingen Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">✏️ Product Bewerken</h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEditProduct} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Productnaam</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Regulier (€)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={editingProduct.price}
                    onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Actieprijs (€)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={editingProduct.salePrice || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, salePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingProduct.onSale}
                  onChange={e => setEditingProduct({ ...editingProduct, onSale: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-amber-400"
                />
                <span className="font-bold text-slate-300">🔥 Actieprijs Activeren</span>
              </label>

              {/* Recept & Ingrediënten Aanpassen */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800">
                <label className="text-amber-400 font-extrabold block text-xs flex items-center gap-1">
                  <span>👨‍🍳 Recept &amp; Benodigde Ingrediënten</span>
                </label>
                <textarea
                  rows={2}
                  value={editingProduct.recipeDescription || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, recipeDescription: e.target.value })}
                  placeholder="Bijv. 1x Sesam Bunge, 2x Rundvlees Patty, 1x Cheddar Kaas, Augurk & Speciaalsaus"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:border-amber-400 outline-none"
                />
                <p className="text-[10px] text-slate-500 italic">
                  Hiermee weet de keuken precies welke ingrediënten en hoeveelheden nodig zijn voor dit product.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 font-bold text-slate-300"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-amber-400 font-bold text-slate-950"
                >
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Z-Report Modal */}
      {showZReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="font-black text-sm text-white">📊 Dagafsluiting Z-Rapport</span>
              <button onClick={() => setShowZReport(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 bg-white text-slate-950 font-mono text-xs space-y-2 select-text">
              <div className="text-center pb-2 border-b-2 border-dashed border-slate-300">
                <h3 className="font-black text-base">WERKDONALDS POS</h3>
                <p className="text-[10px] text-slate-500">Z-RAPPORT / FINANCIËLE DAGAFSLUITING</p>
                <p className="text-[10px] text-slate-500">{new Date().toLocaleString('nl-NL')}</p>
              </div>

              <div className="space-y-1 py-2 border-b-2 border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span>Aantal bestellingen:</span>
                  <strong>{validOrders.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Verkochte items:</span>
                  <strong>{totalItems}</strong>
                </div>
              </div>

              <div className="space-y-1 py-2 border-b-2 border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span>Omzet WerkPay:</span>
                  <strong>{euro(workPayRevenue)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Omzet Contant:</span>
                  <strong>{euro(cashRevenue)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Omzet Cadeaubon:</span>
                  <strong>{euro(giftCardRevenue)}</strong>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Gegeven kortingen:</span>
                  <strong>- {euro(totalDiscounts)}</strong>
                </div>
              </div>

              <div className="pt-2 font-bold text-sm space-y-1">
                <div className="flex justify-between text-slate-950">
                  <span>BRUTO OMZET:</span>
                  <span>{euro(totalRevenue)}</span>
                </div>
                <div className="flex justify-between text-rose-600 text-xs">
                  <span>Inkoopkosten:</span>
                  <span>- {euro(totalExpenses)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-black pt-1 border-t border-slate-300">
                  <span>NETTOWINST:</span>
                  <span>{euro(netProfit)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Z-Rapport</span>
              </button>
              <button
                onClick={() => setShowZReport(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}

      {showDiyTerminalModal && (
        <DiyTerminalModal onClose={() => setShowDiyTerminalModal(false)} />
      )}

    </div>
  );
};
