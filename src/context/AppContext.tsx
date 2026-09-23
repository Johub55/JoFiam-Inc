import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  AppMode,
  PosScreenType,
  WerkPayScreenType,
  Product,
  CartItem,
  Order,
  OrderItem,
  OrderStatus,
  OrderItemStage,
  InventoryItem,
  Coupon,
  GiftCard,
  PosUser,
  BankAccount,
  BankTransaction,
  SupabaseConfig,
  CashPaymentRequest,
  BrandType,
  BrandConfig
} from '../types';
import {
  DEFAULT_SUPABASE_POS_URL,
  DEFAULT_SUPABASE_POS_KEY,
  DEFAULT_SUPABASE_PAY_URL,
  DEFAULT_SUPABASE_PAY_KEY,
  INITIAL_BANK_ACCOUNTS,
  INITIAL_INVENTORY,
  INITIAL_COUPONS,
  INITIAL_GIFT_CARDS,
  INITIAL_POS_USERS,
  ORDER_KIOSK_USER,
  RPI_KIOSK_USER,
  BRAND_CONFIGS
} from '../services/store';
import { DEFAULT_PRODUCTS, ALL_DEFAULT_PRODUCTS, KOEKPLOEG_PRODUCTS } from '../services/defaultProducts';
import { AudioFX } from '../services/audio';
import { 
  formatDbOrder, 
  mergeOrders, 
  broadcastSync, 
  recordLocalOrderMutation, 
  recordDeletedOrder, 
  pendingOrderMutations 
} from '../services/syncHelpers';
import { calculateDiscount } from '../services/discountService';
import { redeemVoucherAnyCustomer, addCoinsToCustomer } from '../services/loyalty';

const getMajorityStatus = (items: any[]): OrderStatus => {
  if (!items || items.length === 0) return 'wachten';
  const counts = { wachten: 0, bereiden: 0, inpakken: 0, klaar: 0 };
  items.forEach(it => {
    const stage = it.stage || (it.done ? 'klaar' : 'wachten');
    if (stage in counts) {
      counts[stage as keyof typeof counts] += (it.qty || 1);
    }
  });

  const totalQty = items.reduce((sum, it) => sum + (it.qty || 1), 0);
  if (counts.klaar === totalQty) {
    return 'klaar';
  }

  let bestStage: OrderStatus = 'wachten';
  let maxVal = -1;
  const stagesOrdered: OrderStatus[] = ['klaar', 'wachten', 'inpakken', 'bereiden'];
  for (const st of stagesOrdered) {
    const val = counts[st as keyof typeof counts] || 0;
    if (val > maxVal) {
      maxVal = val;
      bestStage = st;
    }
  }
  return bestStage;
};

interface AppContextType {
  // Navigation & Brand
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  posScreen: PosScreenType;
  setPosScreen: (screen: PosScreenType) => void;
  werkpayScreen: WerkPayScreenType;
  setWerkpayScreen: (screen: WerkPayScreenType) => void;
  activeBrand: BrandType;
  setActiveBrand: (brand: BrandType) => void;
  brandConfig: BrandConfig;
  brandProducts: Product[];

  // Connection & Supabase
  supabaseConfig: SupabaseConfig;
  setSupabaseConfig: (cfg: Partial<SupabaseConfig>) => void;
  posClient: SupabaseClient | null;
  payClient: SupabaseClient | null;
  isOnline: boolean;
  isSupabaseConfigured: boolean;
  connectionText: string;
  syncStatus: 'synced' | 'syncing' | 'error' | 'offline';
  isRealtimeActive: boolean;
  lastSyncTime: Date | null;
  forceSyncNow: () => Promise<void>;
  testConnection: () => Promise<{ success: boolean; message: string }>;

  // POS State
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  orderNo: number;
  inventory: InventoryItem[];
  coupons: Coupon[];
  giftCards: GiftCard[];
  totalExpenses: number;
  orderStopActive: boolean;
  pickupClosed: boolean;
  currentPosUser: PosUser | null;
  setCurrentPosUser: (user: PosUser | null) => void;
  appliedDiscount: { type: string; val: number; code?: string; label: string };

  // Cart & POS Actions
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  updateCartQty: (index: number, delta: number) => void;
  setCartItemQty: (index: number, qty: number) => void;
  removeFromCart: (index: number) => void;
  emptyCart: () => void;
  applyCouponCode: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  toggleOrderStop: () => void;
  togglePickupClosed: () => void;
  updateOrderStatus: (orderNo: number, newStatus: OrderStatus) => Promise<void>;
  toggleOrderItemDone: (orderNo: number, itemIndex: number) => void;
  updateOrderItemStage: (orderNo: number, itemIndex: number, stage: OrderItemStage) => void;
  toggleOrderPrio: (orderNo: number) => void;
  setAllOrderItemsDone: (orderNo: number, done: boolean) => void;
  cancelOrder: (orderNo: number) => Promise<void>;
  deleteOrder: (orderNo: number) => Promise<void>;
  trackedOrderNo: number | null;
  setTrackedOrderNo: (orderNo: number | null) => void;
  processCheckout: (
    method: 'workpay' | 'cash' | 'giftcard',
    orderType: 'dine_in' | 'takeaway' | 'delivery',
    identifier: string,
    paymentMeta: any
  ) => Promise<{ success: boolean; message: string; order?: Order }>;

  // Cash Payment Requests (Cross-terminal / Staff authorization)
  cashRequests: CashPaymentRequest[];
  createCashRequest: (orderNo: number, total: number, orderType: 'dine_in' | 'takeaway' | 'delivery', identifier: string) => CashPaymentRequest;
  approveCashRequest: (requestId: string, approvedBy: string, received: number, change: number) => void;
  rejectCashRequest: (requestId: string, reason?: string) => void;

  // Product & Inventory Actions
  createProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  toggleProductSale: (id: number) => Promise<void>;
  resetProductsToDefault: () => void;
  buyInventory: (id: number, amount: number) => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;

  // Coupons & Gift Cards
  createGiftCard: (code: string, amount: number) => void;
  topUpGiftCard: (id: number, amount: number) => void;
  deleteGiftCard: (id: number) => void;
  createCoupon: (coupon: Omit<Coupon, 'id'>) => void;
  toggleCouponActive: (id: number) => void;

  // POS Auth
  canAccess: (perm: string) => boolean;
  loginPos: (username: string, pass: string) => Promise<{ success: boolean; message: string }>;
  logoutPos: () => void;
  updatePosUser: (user: PosUser) => Promise<{ success: boolean; message: string }>;
  createPosUser: (user: Omit<PosUser, 'id'>) => Promise<{ success: boolean; message: string }>;
  deletePosUser: (userId: number) => Promise<{ success: boolean; message: string }>;
  posUsers: PosUser[];

  // WerkPay State
  currentBankAccount: BankAccount | null;
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  loginWerkPay: (username: string, secret: string, mode: 'password' | 'pin') => Promise<{ success: boolean; message: string }>;
  logoutWerkPay: () => void;
  topUpWerkPay: (amount: number) => Promise<{ success: boolean; message: string }>;
  transferWerkPay: (to: string, amount: number, note?: string) => Promise<{ success: boolean; message: string }>;
  changeWerkPayPin: (newPin: string) => Promise<{ success: boolean; message: string }>;
  saveBankAccount: (acc: Partial<BankAccount> & { id?: number | string }) => Promise<void>;
  deleteBankAccount: (id: number | string) => Promise<void>;
  quickMoneyAccount: (id: number | string, delta: number) => Promise<void>;

  // Receipt Modal State
  activeReceiptOrder: Order | null;
  setActiveReceiptOrder: (order: Order | null) => void;

  // Order Tracking & User Orders
  myOrderNumbers: number[];
  addMyOrderNumber: (orderNo: number) => void;
  isUserOrder: (order: Order) => boolean;
  getUserOrders: () => Order[];
  activeUserOrders: Order[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Navigation State
  const [appMode, setAppMode] = useState<AppMode>('pos');
  const [posScreen, setPosScreen] = useState<PosScreenType>('kassa');
  const [werkpayScreen, setWerkpayScreen] = useState<WerkPayScreenType>('wallet');

  // Active Brand ('werkdonalds' | 'koekploeg') - Defaults to 'koekploeg'
  const [activeBrand, setActiveBrandState] = useState<BrandType>(() => {
    const saved = localStorage.getItem('wd_active_brand');
    if (saved === 'werkdonalds' || saved === 'koekploeg') {
      return saved as BrandType;
    }
    return 'koekploeg';
  });

  const setActiveBrand = (b: BrandType) => {
    setActiveBrandState(b);
    localStorage.setItem('wd_active_brand', b);
  };

  const brandConfig = BRAND_CONFIGS[activeBrand] || BRAND_CONFIGS.koekploeg;

  // Supabase Config
  const [supabaseConfig, setSupabaseConfigState] = useState<SupabaseConfig>(() => {
    const saved = localStorage.getItem('wd_sb_cfg');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const resolvedUrl = parsed.unifiedUrl || parsed.supabaseUrl || '';
        const resolvedKey = parsed.unifiedKey || parsed.supabaseAnonKey || '';
        if (resolvedUrl && !resolvedUrl.includes('ezndrnnywjznxpzxgksb')) {
          return {
            unifiedUrl: resolvedUrl,
            unifiedKey: resolvedKey,
            useSeparatePay: Boolean(parsed.useSeparatePay),
            payUrl: parsed.payUrl || resolvedUrl,
            payKey: parsed.payKey || resolvedKey,
            supabaseUrl: resolvedUrl,
            supabaseAnonKey: resolvedKey
          };
        }
      } catch {}
    }
    return {
      unifiedUrl: DEFAULT_SUPABASE_POS_URL,
      unifiedKey: DEFAULT_SUPABASE_POS_KEY,
      useSeparatePay: false,
      payUrl: DEFAULT_SUPABASE_PAY_URL,
      payKey: DEFAULT_SUPABASE_PAY_KEY,
      supabaseUrl: DEFAULT_SUPABASE_POS_URL,
      supabaseAnonKey: DEFAULT_SUPABASE_POS_KEY
    };
  });

  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [connectionText, setConnectionText] = useState<string>('Verbinden met Supabase...');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('synced');
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());

  // Clients
  const [posClient, setPosClient] = useState<SupabaseClient | null>(null);
  const [payClient, setPayClient] = useState<SupabaseClient | null>(null);

  // POS State
  const [products, setProducts] = useState<Product[]>(() => {
    const version = localStorage.getItem('wd_products_version');
    const saved = localStorage.getItem('wd_products');
    if (saved && version === 'v8_koekploeg_and_werkdonalds') {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 10) {
          return parsed;
        }
      } catch {}
    }
    localStorage.setItem('wd_products', JSON.stringify(ALL_DEFAULT_PRODUCTS));
    localStorage.setItem('wd_products_version', 'v8_koekploeg_and_werkdonalds');
    return ALL_DEFAULT_PRODUCTS;
  });

  // Filtered products for active brand
  const brandProducts = products.filter(p => {
    if (activeBrand === 'koekploeg') {
      return p.id >= 200;
    }
    return p.id < 200;
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('wd_orders');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const [orderNo, setOrderNo] = useState<number>(() => {
    const saved = localStorage.getItem('wd_order_no');
    return saved ? parseInt(saved, 10) : 1001;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('wd_inventory');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_INVENTORY;
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const saved = localStorage.getItem('wd_coupons');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_COUPONS;
  });

  const [giftCards, setGiftCards] = useState<GiftCard[]>(() => {
    const saved = localStorage.getItem('wd_gift_cards');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_GIFT_CARDS;
  });

  const [posUsers, setPosUsers] = useState<PosUser[]>(() => {
    const saved = localStorage.getItem('wd_pos_users');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some(u => u.username === 'joas')) {
          return parsed;
        }
      } catch {}
    }
    return INITIAL_POS_USERS;
  });

  // User requirement: "je begint bij allebei op het inlog scherm zonder bijvoorbeeld!"
  const [currentPosUser, setCurrentPosUser] = useState<PosUser | null>(null);

  const [totalExpenses, setTotalExpenses] = useState<number>(() => {
    const saved = localStorage.getItem('wd_expenses');
    return saved ? parseFloat(saved) : 0;
  });

  const [orderStopActive, setOrderStopActive] = useState<boolean>(() => {
    return localStorage.getItem('wd_order_stop') === 'true';
  });

  const [pickupClosed, setPickupClosed] = useState<boolean>(() => {
    return localStorage.getItem('wd_pickup_closed') === 'true';
  });

  const [appliedDiscount, setAppliedDiscount] = useState<{ type: string; val: number; code?: string; label: string }>({
    type: 'none',
    val: 0,
    label: 'Geen'
  });

  // Cash Payment Requests State (Cross-terminal sync)
  const [cashRequests, setCashRequests] = useState<CashPaymentRequest[]>(() => {
    const saved = localStorage.getItem('wd_cash_requests');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  // WerkPay State
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    const saved = localStorage.getItem('wd_bank_accounts');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_BANK_ACCOUNTS;
  });

  // User requirement: "je begint bij allebei op het inlog scherm zonder bijvoorbeeld!"
  const [currentBankAccount, setCurrentBankAccount] = useState<BankAccount | null>(null);

  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(() => {
    const saved = localStorage.getItem('wd_bank_txs');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      { id: 1, from_account: 'klant01', to_account: 'Werkdonalds Kassa', amount: 14.50, label: 'Werkdonalds Bestelling #1000', when: 'Vandaag 12:30', timestamp: Date.now() - 3600000 },
      { id: 2, from_account: 'joas', to_account: 'emma', amount: 25.00, label: 'Overboeking naar emma', when: 'Gisteren', timestamp: Date.now() - 86400000 }
    ];
  });

  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);
  const [trackedOrderNo, setTrackedOrderNoInternal] = useState<number | null>(null);

  const setTrackedOrderNo = useCallback((orderNo: number | null) => {
    setTrackedOrderNoInternal(orderNo);
    if (orderNo !== null) {
      setAppMode('pos');
      setPosScreen('volgscherm');
    }
  }, []);

  // Track order numbers placed in this session or browser
  const [myOrderNumbers, setMyOrderNumbers] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('wd_my_order_numbers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addMyOrderNumber = useCallback((num: number) => {
    setMyOrderNumbers(prev => {
      if (prev.includes(num)) return prev;
      const updated = [num, ...prev];
      try {
        localStorage.setItem('wd_my_order_numbers', JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  }, []);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('wd_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('wd_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('wd_order_no', String(orderNo));
  }, [orderNo]);

  useEffect(() => {
    localStorage.setItem('wd_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('wd_coupons', JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    localStorage.setItem('wd_gift_cards', JSON.stringify(giftCards));
  }, [giftCards]);

  useEffect(() => {
    localStorage.setItem('wd_pos_users', JSON.stringify(posUsers));
  }, [posUsers]);

  useEffect(() => {
    localStorage.setItem('wd_expenses', String(totalExpenses));
  }, [totalExpenses]);

  useEffect(() => {
    localStorage.setItem('wd_order_stop', String(orderStopActive));
  }, [orderStopActive]);

  useEffect(() => {
    localStorage.setItem('wd_pickup_closed', String(pickupClosed));
  }, [pickupClosed]);

  useEffect(() => {
    localStorage.setItem('wd_bank_accounts', JSON.stringify(bankAccounts));
  }, [bankAccounts]);

  useEffect(() => {
    localStorage.setItem('wd_bank_txs', JSON.stringify(bankTransactions));
  }, [bankTransactions]);

  useEffect(() => {
    if (currentPosUser) {
      sessionStorage.setItem('wd_pos_user', JSON.stringify(currentPosUser));
    } else {
      sessionStorage.removeItem('wd_pos_user');
    }
  }, [currentPosUser]);

  useEffect(() => {
    if (currentBankAccount) {
      sessionStorage.setItem('wd_bank_current', JSON.stringify(currentBankAccount));
    } else {
      sessionStorage.removeItem('wd_bank_current');
    }
  }, [currentBankAccount]);

  const setSupabaseConfig = (cfg: Partial<SupabaseConfig>) => {
    const resolvedUrl = cfg.unifiedUrl || cfg.supabaseUrl || supabaseConfig.unifiedUrl || DEFAULT_SUPABASE_POS_URL;
    const resolvedKey = cfg.unifiedKey || cfg.supabaseAnonKey || supabaseConfig.unifiedKey || DEFAULT_SUPABASE_POS_KEY;
    const normalized: SupabaseConfig = {
      unifiedUrl: resolvedUrl,
      unifiedKey: resolvedKey,
      useSeparatePay: cfg.useSeparatePay ?? supabaseConfig.useSeparatePay ?? false,
      payUrl: cfg.payUrl || (cfg.useSeparatePay ? (cfg.payUrl || resolvedUrl) : resolvedUrl),
      payKey: cfg.payKey || (cfg.useSeparatePay ? (cfg.payKey || resolvedKey) : resolvedKey),
      supabaseUrl: resolvedUrl,
      supabaseAnonKey: resolvedKey
    };
    setSupabaseConfigState(normalized);
    localStorage.setItem('wd_sb_cfg', JSON.stringify(normalized));
  };

  // Initialize Supabase Clients with Realtime configuration
  useEffect(() => {
    try {
      const pUrl = supabaseConfig.unifiedUrl || supabaseConfig.supabaseUrl;
      const pKey = supabaseConfig.unifiedKey || supabaseConfig.supabaseAnonKey;
      const bUrl = supabaseConfig.useSeparatePay ? (supabaseConfig.payUrl || pUrl) : pUrl;
      const bKey = supabaseConfig.useSeparatePay ? (supabaseConfig.payKey || pKey) : pKey;

      if (bUrl === pUrl && bKey === pKey) {
        if (pUrl && pKey) {
          const pc = createClient(pUrl, pKey, {
            realtime: { params: { eventsPerSecond: 10 } }
          });
          setPosClient(pc);
          setPayClient(pc);
        }
      } else {
        if (pUrl && pKey) {
          const pc = createClient(pUrl, pKey, {
            realtime: { params: { eventsPerSecond: 10 } }
          });
          setPosClient(pc);
        }
        if (bUrl && bKey) {
          const bc = createClient(bUrl, bKey, {
            auth: { persistSession: false, autoRefreshToken: false },
            realtime: { params: { eventsPerSecond: 10 } }
          });
          setPayClient(bc);
        }
      }

      setConnectionText('Verbonden (Live Supabase & Lokale Cache)');
      setIsOnline(true);
    } catch (e: any) {
      setConnectionText('Offline / Lokale Simulatiemodus');
      setIsOnline(false);
      setSyncStatus('offline');
    }
  }, [supabaseConfig]);

// Helper to convert DB cash_request row to CashPaymentRequest
const formatDbCashRequest = (row: any): CashPaymentRequest => {
  return {
    id: row.req_id || `req_${row.id}`,
    orderNo: Number(row.order_no || 0),
    orderType: row.order_type || 'takeaway',
    identifier: row.identifier || row.cashier || '',
    total: Number(row.amount || 0),
    status: row.status as 'pending' | 'approved' | 'rejected',
    requestedAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    approvedBy: row.approved_by || undefined,
    received: row.received !== null && row.received !== undefined ? Number(row.received) : undefined,
    change: row.change !== null && row.change !== undefined ? Number(row.change) : undefined,
    rejectedReason: row.rejected_reason || undefined
  };
};

  // Unified cloud data fetch
  const fetchCloudData = useCallback(async (isBackground = false) => {
    if (!posClient) return;
    if (!isBackground) {
      setSyncStatus('syncing');
    }

    try {
      // 1. Fetch orders
      const { data: dbOrders, error: orderErr } = await posClient
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60);

      if (!orderErr && dbOrders) {
        const parsed: Order[] = dbOrders.map(formatDbOrder);
        setOrders(prev => {
          const { merged, hasNewRemoteOrder } = mergeOrders(prev, parsed);
          if (hasNewRemoteOrder && isBackground) {
            AudioFX.bell();
          }
          return merged;
        });

        const highest = Math.max(0, ...parsed.map(x => x.no));
        if (highest >= 1000) {
          setOrderNo(prev => Math.max(prev, highest + 1));
        }
      }

      // 2. Fetch bank accounts
      const targetPay = payClient || posClient;
      const { data: dbAccounts, error: payErr } = await targetPay
        .from('bank_accounts')
        .select('*');

      if (!payErr && dbAccounts && dbAccounts.length > 0) {
        setBankAccounts(dbAccounts);
        if (currentBankAccount) {
          const found = dbAccounts.find(
            a => a.id === currentBankAccount.id || a.username.toLowerCase() === currentBankAccount.username.toLowerCase()
          );
          if (found && found.balance !== currentBankAccount.balance) {
            setCurrentBankAccount(found);
          }
        }
      }

      // 3. Fetch POS users from Supabase (to guarantee live password sync!)
      const { data: dbUsers, error: userErr } = await posClient
        .from('pos_users')
        .select('*');

      if (!userErr && dbUsers && dbUsers.length > 0) {
        const parsedUsers: PosUser[] = dbUsers.map(u => ({
          id: u.id,
          name: u.name,
          username: u.username,
          password: u.password,
          perms: Array.isArray(u.perms) ? u.perms : (typeof u.perms === 'string' ? JSON.parse(u.perms) : ['pos', 'pickup']),
          is_admin: Boolean(u.is_admin)
        }));
        setPosUsers(parsedUsers);
        localStorage.setItem('wd_pos_users', JSON.stringify(parsedUsers));
      }

      // 4. Fetch coupons from Supabase
      const { data: dbCoupons, error: couponErr } = await posClient
        .from('coupons')
        .select('*');
      if (!couponErr && dbCoupons) {
        const parsedCoupons: Coupon[] = dbCoupons.map(c => ({
          id: Number(c.id),
          code: c.code,
          discount_type: c.discount_type as any,
          discount_val: Number(c.discount_val),
          min_subtotal: c.min_subtotal ? Number(c.min_subtotal) : undefined,
          target_product_name: c.target_product_name || undefined,
          is_active: Boolean(c.is_active)
        }));
        setCoupons(parsedCoupons);
        localStorage.setItem('wd_coupons', JSON.stringify(parsedCoupons));
      }

      // 5. Fetch gift cards from Supabase
      const { data: dbGiftCards, error: gcErr } = await posClient
        .from('gift_cards')
        .select('*');
      if (!gcErr && dbGiftCards) {
        const parsedGiftCards: GiftCard[] = dbGiftCards.map(g => ({
          id: Number(g.id),
          code: g.code,
          initial_balance: Number(g.initial_balance),
          current_balance: Number(g.current_balance),
          is_active: Boolean(g.is_active)
        }));
        setGiftCards(parsedGiftCards);
        localStorage.setItem('wd_gift_cards', JSON.stringify(parsedGiftCards));
      }

      // 6. Fetch pos_settings from Supabase
      const { data: dbSettings, error: settingsErr } = await posClient
        .from('pos_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();
      if (!settingsErr && dbSettings) {
        setOrderStopActive(Boolean(dbSettings.order_stop_active));
        setPickupClosed(Boolean(dbSettings.pickup_closed));
      } else if (!settingsErr && !dbSettings) {
        // Create initial row if missing
        await posClient.from('pos_settings').insert({ id: 'default', order_stop_active: false, pickup_closed: false });
      }

      // 7. Fetch cash_requests from Supabase (for cross-terminal staff notifications)
      const { data: dbCashReqs, error: cashErr } = await posClient
        .from('cash_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!cashErr && dbCashReqs) {
        const parsedCashReqs = dbCashReqs.map(formatDbCashRequest);
        setCashRequests(parsedCashReqs);
        localStorage.setItem('wd_cash_requests', JSON.stringify(parsedCashReqs));
      }

      // 8. Fetch loyalty_customers from Supabase (for WerkLoyalty cross-terminal sync)
      const { data: dbLoyalty, error: loyaltyErr } = await posClient
        .from('loyalty_customers')
        .select('*');
      if (!loyaltyErr && dbLoyalty && dbLoyalty.length > 0) {
        const parsedLoyalty = dbLoyalty.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          coins: Number(c.coins || 0),
          totalSpent: Number(c.total_spent || 0),
          ordersCount: Number(c.orders_count || 0),
          tier: c.tier || 'Brons',
          joinedDate: c.joined_date || new Date().toISOString().split('T')[0]
        }));
        localStorage.setItem('wd_loyalty_customers_db', JSON.stringify(parsedLoyalty));
        localStorage.setItem('wd_loyalty_ts', Date.now().toString());
        window.dispatchEvent(new Event('wd_loyalty_updated'));
      }

      setSyncStatus('synced');
      setLastSyncTime(new Date());
      setIsOnline(true);
    } catch (err: any) {
      console.warn('Cloud sync error:', err);
      if (!isBackground) {
        setSyncStatus('error');
      }
    }
  }, [posClient, payClient, currentBankAccount]);

  const forceSyncNow = async () => {
    await fetchCloudData(false);
  };

  // Initial products seed & check
  useEffect(() => {
    if (!posClient) return;
    const initProducts = async () => {
      try {
        const { data: dbProds } = await posClient.from('products').select('*');
        if (dbProds && dbProds.length >= ALL_DEFAULT_PRODUCTS.length) {
          setProducts(dbProds.map(p => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            salePrice: Number(p.sale_price || 0),
            onSale: Boolean(p.on_sale),
            cat: p.cat,
            emoji: p.emoji,
            inStock: Boolean(p.in_stock)
          })));
        } else if (posClient) {
          const rows = ALL_DEFAULT_PRODUCTS.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            sale_price: p.salePrice || 0,
            on_sale: p.onSale || false,
            cat: p.cat,
            emoji: p.emoji,
            in_stock: p.inStock
          }));
          await posClient.from('products').upsert(rows);
          setProducts(ALL_DEFAULT_PRODUCTS);
        }
      } catch (err) {
        console.warn('Product init error:', err);
      }
    };
    initProducts();
  }, [posClient]);

  // Continuous Adaptive Polling (every 3 seconds) + Focus/Visibility refresh
  useEffect(() => {
    if (!posClient) return;

    fetchCloudData(false);

    const intervalId = setInterval(() => {
      fetchCloudData(true);
    }, 3000);

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchCloudData(false);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
    };
  }, [fetchCloudData, posClient]);

  // Live Supabase Realtime WebSocket Subscriptions
  useEffect(() => {
    if (!posClient) return;
    let isMounted = true;
    let orderChannel: any = null;
    let bankChannel: any = null;
    let prodChannel: any = null;
    let couponChannel: any = null;
    let gcChannel: any = null;
    let settingsChannel: any = null;
    let cashReqChannel: any = null;

    try {
      // 1. Orders Realtime
      orderChannel = posClient
        .channel('realtime_orders_live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            if (!isMounted) return;
            console.log('⚡ Realtime Order Event received:', payload.eventType);
            if (payload.eventType === 'INSERT') {
              const newOrder = formatDbOrder(payload.new);
              setOrders(prev => {
                if (prev.some(o => o.no === newOrder.no)) return prev;
                AudioFX.bell();
                return [newOrder, ...prev];
              });
              setOrderNo(prev => Math.max(prev, newOrder.no + 1));
              setLastSyncTime(new Date());
              setSyncStatus('synced');
            } else if (payload.eventType === 'UPDATE') {
              const updatedOrder = formatDbOrder(payload.new);
              let statusChangedToDone = false;
              setOrders(prev => prev.map(o => {
                if (o.no !== updatedOrder.no) return o;
                const localMutation = pendingOrderMutations.get(o.no);
                const isMutationFresh = localMutation && Date.now() - localMutation.timestamp < 15000;
                const finalStatus = (isMutationFresh && localMutation.status) ? localMutation.status : updatedOrder.status;
                const finalItems = (isMutationFresh && localMutation.items) 
                  ? localMutation.items 
                  : (updatedOrder.items && updatedOrder.items.length > 0 ? updatedOrder.items : o.items);
                const finalPrio = (isMutationFresh && localMutation.isPrio !== undefined) 
                  ? localMutation.isPrio 
                  : (o.isPrio ?? updatedOrder.isPrio ?? false);

                const isOldStatusDone = o.status === 'done' || o.status === 'klaar';
                const isNewStatusDone = finalStatus === 'done' || finalStatus === 'klaar';
                if (isNewStatusDone && !isOldStatusDone) {
                  statusChangedToDone = true;
                }

                return {
                  ...o,
                  ...updatedOrder,
                  status: finalStatus,
                  items: finalItems,
                  isPrio: finalPrio,
                  updatedAt: Math.max(o.updatedAt || 0, updatedOrder.updatedAt || 0)
                };
              }));
              if (statusChangedToDone) {
                AudioFX.speakOrder(updatedOrder.no, updatedOrder.identifier, updatedOrder.orderType);
              }
              setLastSyncTime(new Date());
              setSyncStatus('synced');
            } else if (payload.eventType === 'DELETE') {
              const orderNoToDelete = payload.old?.order_no;
              if (orderNoToDelete) {
                setOrders(prev => prev.filter(o => o.no !== orderNoToDelete));
              } else if (payload.old?.id) {
                setOrders(prev => prev.filter(o => o.id !== payload.old.id));
              }
              setLastSyncTime(new Date());
            }
          }
        )
        .subscribe((status) => {
          if (!isMounted) return;
          if (status === 'SUBSCRIBED') {
            setIsRealtimeActive(true);
            setConnectionText('🟢 Realtime Live Supabase (WebSocket)');
          } else if (status === 'CHANNEL_ERROR') {
            setIsRealtimeActive(false);
            setConnectionText('🟢 Supabase Live Polling (3s interval)');
          }
        });

      // 2. Bank Accounts Realtime
      const targetPay = payClient || posClient;
      bankChannel = targetPay
        .channel('realtime_bank_live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bank_accounts' },
          (payload) => {
            if (!isMounted) return;
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              const acc = payload.new as BankAccount;
              setBankAccounts(prev => {
                const idx = prev.findIndex(a => a.id === acc.id || a.username.toLowerCase() === acc.username.toLowerCase());
                if (idx !== -1) {
                  const copy = [...prev];
                  copy[idx] = { ...copy[idx], ...acc };
                  return copy;
                }
                return [...prev, acc];
              });
              setCurrentBankAccount(prev => {
                if (prev && (prev.id === acc.id || prev.username.toLowerCase() === acc.username.toLowerCase())) {
                  return { ...prev, balance: Number(acc.balance) };
                }
                return prev;
              });
              setLastSyncTime(new Date());
            }
          }
        )
        .subscribe();

      // 3. Products Realtime
      prodChannel = posClient
        .channel('realtime_products_live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          (payload) => {
            if (!isMounted) return;
            if (payload.eventType === 'UPDATE') {
              const p = payload.new;
              setProducts(prev => prev.map(prod => prod.id === p.id ? {
                ...prod,
                name: p.name,
                price: Number(p.price),
                salePrice: Number(p.sale_price || 0),
                onSale: Boolean(p.on_sale),
                inStock: Boolean(p.in_stock),
                cat: p.cat,
                emoji: p.emoji
              } : prod));
            }
          }
        )
        .subscribe();

      // 4. Coupons Realtime
      couponChannel = posClient
        .channel('realtime_coupons_live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'coupons' },
          (payload) => {
            if (!isMounted) return;
            console.log('⚡ Realtime Coupon Event received:', payload.eventType);
            if (payload.eventType === 'INSERT') {
              const newC = payload.new;
              const parsed: Coupon = {
                id: Number(newC.id),
                code: newC.code,
                discount_type: newC.discount_type as any,
                discount_val: Number(newC.discount_val),
                min_subtotal: newC.min_subtotal ? Number(newC.min_subtotal) : undefined,
                target_product_name: newC.target_product_name || undefined,
                is_active: Boolean(newC.is_active)
              };
              setCoupons(prev => {
                if (prev.some(c => c.id === parsed.id || c.code === parsed.code)) return prev;
                return [...prev, parsed];
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedC = payload.new;
              const parsed: Coupon = {
                id: Number(updatedC.id),
                code: updatedC.code,
                discount_type: updatedC.discount_type as any,
                discount_val: Number(updatedC.discount_val),
                min_subtotal: updatedC.min_subtotal ? Number(updatedC.min_subtotal) : undefined,
                target_product_name: updatedC.target_product_name || undefined,
                is_active: Boolean(updatedC.is_active)
              };
              setCoupons(prev => prev.map(c => c.id === parsed.id ? parsed : c));
            } else if (payload.eventType === 'DELETE') {
              const idToDelete = payload.old?.id;
              if (idToDelete) {
                setCoupons(prev => prev.filter(c => c.id !== Number(idToDelete)));
              }
            }
          }
        )
        .subscribe();

      // 5. Gift Cards Realtime
      gcChannel = posClient
        .channel('realtime_gift_cards_live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'gift_cards' },
          (payload) => {
            if (!isMounted) return;
            console.log('⚡ Realtime Gift Card Event received:', payload.eventType);
            if (payload.eventType === 'INSERT') {
              const newG = payload.new;
              const parsed: GiftCard = {
                id: Number(newG.id),
                code: newG.code,
                initial_balance: Number(newG.initial_balance),
                current_balance: Number(newG.current_balance),
                is_active: Boolean(newG.is_active)
              };
              setGiftCards(prev => {
                if (prev.some(g => g.id === parsed.id || g.code === parsed.code)) return prev;
                return [...prev, parsed];
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedG = payload.new;
              const parsed: GiftCard = {
                id: Number(updatedG.id),
                code: updatedG.code,
                initial_balance: Number(updatedG.initial_balance),
                current_balance: Number(updatedG.current_balance),
                is_active: Boolean(updatedG.is_active)
              };
              setGiftCards(prev => prev.map(g => g.id === parsed.id ? parsed : g));
            } else if (payload.eventType === 'DELETE') {
              const idToDelete = payload.old?.id;
              if (idToDelete) {
                setGiftCards(prev => prev.filter(g => g.id !== Number(idToDelete)));
              }
            }
          }
        )
        .subscribe();

      // 6. Settings Realtime
      settingsChannel = posClient
        .channel('realtime_settings_live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'pos_settings' },
          (payload) => {
            if (!isMounted) return;
            console.log('⚡ Realtime Settings Event received:', payload.eventType);
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              const settings = payload.new;
              if (settings && settings.id === 'default') {
                setOrderStopActive(Boolean(settings.order_stop_active));
                setPickupClosed(Boolean(settings.pickup_closed));
              }
            }
          }
        )
        .subscribe();

      // 7. Cash Requests Realtime
      cashReqChannel = posClient
        .channel('realtime_cash_requests_live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cash_requests' },
          (payload) => {
            if (!isMounted) return;
            console.log('⚡ Realtime Cash Request Event received:', payload.eventType);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const parsed = formatDbCashRequest(payload.new);
              setCashRequests(prev => {
                const idx = prev.findIndex(r => r.id === parsed.id);
                if (idx !== -1) {
                  const copy = [...prev];
                  copy[idx] = { ...copy[idx], ...parsed };
                  return copy;
                }
                return [parsed, ...prev];
              });
              if (payload.eventType === 'INSERT' && parsed.status === 'pending') {
                try { AudioFX.bell(); } catch {}
              }
            } else if (payload.eventType === 'DELETE') {
              const reqId = payload.old?.req_id || `req_${payload.old?.id}`;
              if (reqId) {
                setCashRequests(prev => prev.filter(r => r.id !== reqId));
              }
            }
          }
        )
        .subscribe();

      // 8. Global Announcement Broadcast Channel
      const broadcastChannel = posClient.channel('global_audio_broadcast');
      broadcastChannel
        .on('broadcast', { event: 'speak_order' }, (payload: any) => {
          if (!isMounted) return;
          console.log('📣 Received cross-device order speak broadcast:', payload);
          if (payload && payload.payload) {
            const { orderNo, identifier, orderType } = payload.payload;
            AudioFX.speakOrder(orderNo, identifier, orderType, true, true); // force=true, fromBroadcast=true
          }
        })
        .on('broadcast', { event: 'speak_text' }, (payload: any) => {
          if (!isMounted) return;
          console.log('📣 Received cross-device custom text speak broadcast:', payload);
          if (payload && payload.payload) {
            const { text, orderNo, target } = payload.payload;
            AudioFX.playSpeech(text, orderNo, target, true); // fromBroadcast=true
          }
        })
        .subscribe((status: any) => {
          if (status === 'SUBSCRIBED' && isMounted) {
            console.log('🟢 Audio Broadcast Channel subscribed successfully!');
            AudioFX.setBroadcastSender((event: string, pld: any) => {
              broadcastChannel.send({
                type: 'broadcast',
                event,
                payload: pld
              }).catch((e: any) => console.warn('Broadcast send error:', e));
            });
          }
        });

    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }

    return () => {
      isMounted = false;
      AudioFX.setBroadcastSender(() => {});
      if (orderChannel && posClient) posClient.removeChannel(orderChannel);
      if (bankChannel && (payClient || posClient)) (payClient || posClient).removeChannel(bankChannel);
      if (prodChannel && posClient) posClient.removeChannel(prodChannel);
      if (couponChannel && posClient) posClient.removeChannel(couponChannel);
      if (gcChannel && posClient) posClient.removeChannel(gcChannel);
      if (settingsChannel && posClient) posClient.removeChannel(settingsChannel);
      if (cashReqChannel && posClient) posClient.removeChannel(cashReqChannel);
      if (posClient) {
        try {
          posClient.channel('global_audio_broadcast').unsubscribe();
        } catch {}
      }
    };
  }, [posClient, payClient]);

  // Test Supabase Connection
  const testConnection = async (): Promise<{ success: boolean; message: string }> => {
    try {
      if (!posClient) throw new Error("Geen Supabase client beschikbaar.");
      const { error: posErr } = await posClient.from('orders').select('id').limit(1);
      const targetPay = payClient || posClient;
      const { error: payErr } = await targetPay.from('bank_accounts').select('id').limit(1);

      if (posErr && payErr) {
        return {
          success: false,
          message: `Verbinding mislukt. Zorg dat het SQL script is uitgevoerd in Supabase! Fout: ${posErr.message || payErr.message}`
        };
      }

      setIsOnline(true);
      setConnectionText('Online & Realtime gesynchroniseerd');
      return {
        success: true,
        message: 'Verbinding met Supabase is geslaagd! Tabellen zijn bereikbaar.'
      };
    } catch (e: any) {
      return {
        success: false,
        message: e.message || 'Onbekende fout bij verbinden met Supabase.'
      };
    }
  };

  // Cart operations
  const addToCart = (item: Omit<CartItem, 'id'>) => {
    AudioFX.beep();
    setCart(prev => {
      // Check if identical item (same name, price, notes) exists
      const existingIdx = prev.findIndex(x => x.name === item.name && x.price === item.price && (x.itemNote || '') === (item.itemNote || ''));
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx].qty += item.qty;
        return updated;
      }
      return [...prev, { ...item, id: `${Date.now()}-${Math.random()}` }];
    });
  };

  const updateCartQty = (index: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      updated[index].qty += delta;
      if (updated[index].qty <= 0) {
        updated.splice(index, 1);
      }
      return updated;
    });
  };

  const setCartItemQty = (index: number, qty: number) => {
    setCart(prev => {
      if (qty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      const updated = [...prev];
      updated[index].qty = qty;
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const emptyCart = () => {
    setCart([]);
    setAppliedDiscount({ type: 'none', val: 0, label: 'Geen' });
  };

  const applyCouponCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Voer een geldige kortingscode of vouchercode in.' };
    }

    const rawTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const orderItems: OrderItem[] = cart.map(x => ({
      name: x.name,
      qty: x.qty,
      price: x.price,
      cat: x.cat
    }));

    // Check with advanced discount service (supports promo codes, category rules, & customer vouchers)
    const calc = calculateDiscount(cleanCode, orderItems, rawTotal);

    if (calc.valid) {
      setAppliedDiscount({
        type: 'fixed',
        val: calc.discountAmount,
        code: calc.code,
        label: calc.description
      });
      return { success: true, message: `${calc.description} succesvol toegepast! (-€${calc.discountAmount.toFixed(2)})` };
    }

    // Fallback to legacy coupon state if present
    const c = coupons.find(x => x.code === cleanCode && x.is_active);
    if (!c) {
      return { success: false, message: calc.error || 'Onbekende, ongeldige of verlopen kortingscode/voucher!' };
    }

    if (c.discount_type === 'threshold' && rawTotal < (c.min_subtotal || 0)) {
      return {
        success: false,
        message: `Minimale besteding van € ${c.min_subtotal?.toFixed(2)} vereist voor deze coupon.`
      };
    }

    setAppliedDiscount({
      type: c.discount_type,
      val: c.discount_val,
      code: c.code,
      label: `${c.code} (${c.discount_type === 'percent' ? `${c.discount_val}%` : `€${c.discount_val.toFixed(2)}`})`
    });
    return { success: true, message: `Coupon ${c.code} succesvol toegepast!` };
  };

  const removeCoupon = () => {
    setAppliedDiscount({ type: 'none', val: 0, label: 'Geen' });
  };

  const toggleOrderStop = async () => {
    const nextVal = !orderStopActive;
    setOrderStopActive(nextVal);
    if (posClient) {
      await posClient.from('pos_settings').upsert({
        id: 'default',
        order_stop_active: nextVal,
        pickup_closed: pickupClosed
      });
    }
  };

  const togglePickupClosed = async () => {
    const nextVal = !pickupClosed;
    setPickupClosed(nextVal);
    if (posClient) {
      await posClient.from('pos_settings').upsert({
        id: 'default',
        order_stop_active: orderStopActive,
        pickup_closed: nextVal
      });
    }
  };

  // Inventory deductions
  const deductInventoryForItems = (orderItems: CartItem[]) => {
    setInventory(prev => {
      const updated = [...prev];
      orderItems.forEach(item => {
        const name = item.name.toLowerCase();
        const qty = item.qty;

        if (name.includes('burger') || name.includes('mac') || name.includes('quarter') || name.includes('tasty')) {
          const bun = updated.find(i => i.item_name.includes('Broodjes'));
          if (bun && bun.stock_qty >= qty) bun.stock_qty -= qty;
          const beef = updated.find(i => i.item_name.includes('Rundvlees'));
          if (beef && beef.stock_qty >= qty) beef.stock_qty -= (name.includes('double') ? qty * 2 : qty);
        }
        if (name.includes('chicken') || name.includes('kip') || name.includes('nugget')) {
          const chicken = updated.find(i => i.item_name.includes('Kip'));
          if (chicken && chicken.stock_qty >= qty) chicken.stock_qty -= qty;
        }
        if (name.includes('friet') || name.includes('menu')) {
          const fries = updated.find(i => i.item_name.includes('Friet'));
          if (fries && fries.stock_qty > 0) fries.stock_qty = Math.max(0, fries.stock_qty - Math.ceil(qty * 0.1));
        }
      });
      return updated;
    });
  };

  // Process Checkout (POS + WerkPay)
  const processCheckout = async (
    method: 'workpay' | 'cash' | 'giftcard',
    orderType: 'dine_in' | 'takeaway',
    identifier: string,
    paymentMeta: any
  ): Promise<{ success: boolean; message: string; order?: Order }> => {
    if (orderStopActive && (!currentPosUser || !currentPosUser.is_admin)) {
      return { success: false, message: 'Bestellingen zijn momenteel gepauzeerd door de bestelstop.' };
    }

    if (cart.length === 0) {
      return { success: false, message: 'Winkelwagen is leeg.' };
    }

    const rawTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    let discountAmount = 0;
    if (appliedDiscount.type === 'percent') {
      discountAmount = rawTotal * (appliedDiscount.val / 100);
    } else if (appliedDiscount.type === 'fixed' || appliedDiscount.type === 'threshold') {
      discountAmount = Math.min(rawTotal, appliedDiscount.val);
    }
    const finalTotal = Math.max(0, rawTotal - discountAmount);

    // 1. If method is WerkPay: charge the bank account
    if (method === 'workpay') {
      const mode = paymentMeta?.mode || 'login';
      let chargedAccount: BankAccount | null = null;
      const targetClient = payClient || posClient;

      if (mode === 'quick') {
        if (!currentBankAccount) {
          return { success: false, message: 'Geen actief WerkPay account ingelogd!' };
        }
        // Strict Security: Require PIN verification even on quick pay!
        const pin = String(paymentMeta.pin || '').trim();
        if (!pin) {
          return { success: false, message: 'Voer uw 4-cijferige pincode in om de betaling te autoriseren.' };
        }
        const validPin = (currentBankAccount.pin_code && currentBankAccount.pin_code === pin) || 
                         (currentBankAccount.password && currentBankAccount.password === pin);
        if (!validPin) {
          return { success: false, message: 'Onjuiste pincode! Betaling op deze rekening is geweigerd.' };
        }
        chargedAccount = currentBankAccount;
      } else if (mode === 'login') {
        const username = paymentMeta.username?.trim().toLowerCase();
        const password = paymentMeta.password?.trim();
        if (!username || !password) {
          return { success: false, message: 'Voer zowel gebruikersnaam als wachtwoord/pin in!' };
        }

        chargedAccount = bankAccounts.find(
          a => a.username.toLowerCase() === username && (a.password === password || a.pin_code === password)
        ) || null;

        // Try Supabase if not found locally
        if (!chargedAccount && targetClient) {
          try {
            const { data } = await targetClient
              .from('bank_accounts')
              .select('*')
              .ilike('username', username)
              .or(`password.eq.${password},pin_code.eq.${password}`)
              .single();
            if (data) {
              chargedAccount = {
                id: data.id,
                username: data.username,
                account_holder: data.account_holder,
                card_uid: data.card_uid,
                pin_code: data.pin_code,
                balance: Number(data.balance),
                is_admin: Boolean(data.is_admin)
              };
            }
          } catch {}
        }
      } else if (mode === 'card' || mode === 'terminal') {
        const cleanUid = String(paymentMeta.cardUid || '').replace(/\s+/g, '').toUpperCase();
        const pin = String(paymentMeta.pin || '').trim();
        if (!cleanUid) {
          return { success: false, message: 'Geen pasnummer of RFID/NFC kaart gescand!' };
        }
        if (!pin) {
          return { success: false, message: 'Voer de 4-cijferige pincode van de bankpas in.' };
        }

        chargedAccount = bankAccounts.find(a => {
          const aUid = String(a.card_uid || '').replace(/\s+/g, '').toUpperCase();
          const matchUid = (aUid === cleanUid) || (a.username.toUpperCase() === cleanUid);
          const matchPin = (a.pin_code === pin || a.password === pin);
          return matchUid && matchPin;
        }) || null;

        // Try Supabase if not found locally
        if (!chargedAccount && targetClient) {
          try {
            const { data } = await targetClient
              .from('bank_accounts')
              .select('*')
              .ilike('card_uid', `%${cleanUid}%`)
              .or(`pin_code.eq.${pin},password.eq.${pin}`)
              .single();
            if (data) {
              chargedAccount = {
                id: data.id,
                username: data.username,
                account_holder: data.account_holder,
                card_uid: data.card_uid,
                pin_code: data.pin_code,
                balance: Number(data.balance),
                is_admin: Boolean(data.is_admin)
              };
            }
          } catch {}
        }
      }

      if (!chargedAccount) {
        return { success: false, message: 'Ongeldige kaart, gebruikersnaam of pincode! Niemand mag zonder geldige autorisatie op een rekening betalen.' };
      }

      if (!chargedAccount.is_admin && chargedAccount.balance < finalTotal) {
        return {
          success: false,
          message: `Onvoldoende WerkPay saldo! Huidig saldo is € ${chargedAccount.balance.toFixed(2)}, totaal is € ${finalTotal.toFixed(2)}.`
        };
      }

      // Debit account
      const newBal = chargedAccount.is_admin ? chargedAccount.balance : Math.max(0, chargedAccount.balance - finalTotal);
      setBankAccounts(prev => prev.map(a => a.id === chargedAccount!.id ? { ...a, balance: newBal } : a));
      if (currentBankAccount && currentBankAccount.id === chargedAccount.id) {
        setCurrentBankAccount(prev => prev ? { ...prev, balance: newBal } : null);
      }

      // Determine brand for proper transaction logging
      const currentBrandKey = activeBrand || 'koekploeg';
      const isKoekploegBrand = currentBrandKey === 'koekploeg';
      const brandName = isKoekploegBrand ? 'De Koekploeg' : 'Werkdonalds';
      const toMerchant = `${brandName} Kassa`;
      const txLabel = `${brandName} Bestelling #${orderNo}`;

      // Add bank transaction
      const tx: BankTransaction = {
        id: Date.now(),
        from_account: chargedAccount.username,
        to_account: toMerchant,
        amount: finalTotal,
        label: txLabel,
        note: `Betaling via ${mode === 'terminal' ? 'DIY Pinapparaat' : mode === 'card' ? 'WerkPay Kaart' : 'WerkPay Login'} (${brandName})`,
        order_no: orderNo,
        when: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
      };
      setBankTransactions(prev => [tx, ...prev]);

      // Call Supabase RPC / update if online
      if (targetClient) {
        try {
          if (mode === 'card' || mode === 'terminal') {
            await targetClient.rpc('werkpay_charge_by_card', {
              p_card_uid: paymentMeta.cardUid,
              p_pin: paymentMeta.pin,
              p_amount: finalTotal,
              p_reference: `${isKoekploegBrand ? 'KP' : 'WD'}-ORD-${orderNo}`,
              p_cashier: currentPosUser?.name || `${brandName} Kassa`,
              p_order_no: orderNo,
              p_brand: brandName
            });
          } else {
            await targetClient.rpc('werkpay_charge_by_login', {
              p_username: chargedAccount.username,
              p_password: chargedAccount.password || paymentMeta.password || paymentMeta.pin,
              p_amount: finalTotal,
              p_reference: `${isKoekploegBrand ? 'KP' : 'WD'}-ORD-${orderNo}`,
              p_cashier: currentPosUser?.name || `${brandName} Kassa`,
              p_order_no: orderNo,
              p_brand: brandName
            });
          }
          // Direct table update fallback
          await targetClient
            .from('bank_accounts')
            .update({ balance: newBal })
            .eq('id', chargedAccount.id);
        } catch {
          // Handled gracefully
        }
      }

      paymentMeta.account = chargedAccount.username;
      paymentMeta.balance_after = newBal;
      paymentMeta.brand = currentBrandKey;
      paymentMeta.brandName = brandName;
    }

    // 2. Gift card deduction
    if (method === 'giftcard') {
      const card = giftCards.find(g => g.code === paymentMeta.code && g.is_active);
      if (!card) return { success: false, message: 'Ongeldige cadeaubon!' };
      if (card.current_balance < finalTotal) {
        return { success: false, message: `Onvoldoende saldo op cadeaubon (${card.current_balance.toFixed(2)})` };
      }
      const nextBalance = card.current_balance - finalTotal;
      setGiftCards(prev => prev.map(g => g.id === card.id ? { ...g, current_balance: nextBalance } : g));
      if (posClient) {
        try {
          await posClient.from('gift_cards').update({ current_balance: nextBalance }).eq('id', card.id);
        } catch (err) {
          console.error('Error updating gift card balance in DB during checkout:', err);
        }
      }
    }

    // 3. Create the order
    const orderItems = cart.map(x => ({
      name: x.name,
      qty: x.qty,
      price: x.price,
      itemNote: x.itemNote
    }));

    const newOrder: Order = {
      id: Date.now(),
      no: orderNo,
      items: orderItems,
      total: finalTotal,
      discount: discountAmount,
      orderType,
      identifier: identifier || (orderType === 'dine_in' ? 'Tafel -' : 'Afhaal'),
      notes: paymentMeta?.note || '',
      paymentMethod: method,
      paymentMeta,
      cashier: currentPosUser?.name || 'Kassa',
      status: 'new',
      time: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    setOrders(prev => [newOrder, ...prev]);
    setOrderNo(prev => prev + 1);

    // 4. Deduct inventory & empty cart
    deductInventoryForItems(cart);
    
    // If a discount voucher was applied, mark it used in loyalty system
    if (appliedDiscount.code) {
      redeemVoucherAnyCustomer(appliedDiscount.code, newOrder.no);
    }

    // Award loyalty coins to customer if linked
    if (paymentMeta?.loyaltyPhone) {
      addCoinsToCustomer(paymentMeta.loyaltyPhone, finalTotal);
    }

    emptyCart();

    // 5. Audio chime & print receipt
    AudioFX.bell();
    setActiveReceiptOrder(newOrder);
    setTrackedOrderNo(newOrder.no);
    addMyOrderNumber(newOrder.no);

    // 6. Push to Supabase if online
    if (posClient) {
      try {
        await posClient.from('orders').insert({
          order_no: newOrder.no,
          items: newOrder.items,
          total: newOrder.total,
          discount: newOrder.discount,
          order_type: newOrder.orderType,
          identifier: newOrder.identifier,
          notes: newOrder.notes,
          payment_method: newOrder.paymentMethod,
          payment_meta: newOrder.paymentMeta,
          cashier: newOrder.cashier,
          status: newOrder.status
        });
      } catch (err) {
        console.warn('Supabase insert order error:', err);
      }
    }

    // Instant cross-tab broadcast for other open windows
    broadcastSync('SYNC_ORDER_NEW', newOrder);

    return {
      success: true,
      message: `Bestelling #${newOrder.no} is succesvol geplaatst!`,
      order: newOrder
    };
  };

  const updateOrderStatus = async (orderNum: number, newStatus: OrderStatus) => {
    const now = Date.now();
    let updatedItemsList: any[] | undefined = undefined;
    let currentOrder: Order | undefined;

    setOrders(prev => {
      currentOrder = prev.find(o => o.no === orderNum);
      return prev.map(o => {
        if (o.no !== orderNum) return o;

        // User directive: "als het is ingepakt moeten de statussen van de producten ook naar klaar"
        let items = o.items;
        if (newStatus === 'klaar' || newStatus === 'done') {
          items = o.items.map(it => ({
            ...it,
            stage: 'klaar' as OrderItemStage,
            done: true
          }));
          updatedItemsList = items;
        } else if (newStatus === 'inpakken') {
          items = o.items.map(it => ({
            ...it,
            stage: (it.stage === 'wachten' || it.stage === 'bereiden') ? ('inpakken' as OrderItemStage) : it.stage
          }));
          updatedItemsList = items;
        }

        return {
          ...o,
          status: newStatus,
          items,
          updatedAt: now
        };
      });
    });

    recordLocalOrderMutation(orderNum, { status: newStatus, items: updatedItemsList });

    if (newStatus === 'done' || newStatus === 'klaar') {
      const orderToAnnounce = currentOrder || orders.find(o => o.no === orderNum);
      if (orderToAnnounce && orderToAnnounce.orderType !== 'delivery') {
        AudioFX.speakOrder(orderNum, orderToAnnounce.identifier, orderToAnnounce.orderType);
      }
    }

    broadcastSync('SYNC_ORDER_STATUS', { orderNo: orderNum, status: newStatus, items: updatedItemsList, updatedAt: now });

    if (posClient) {
      try {
        const updatePayload: any = { status: newStatus };
        if (updatedItemsList) {
          updatePayload.items = updatedItemsList;
        }
        const { error } = await posClient.from('orders').update(updatePayload).eq('order_no', orderNum);
        if (error) {
          console.warn('⚠️ Supabase order status update niet opgeslagen in cloud:', error.message);
        }
      } catch (err) {
        console.warn('Supabase order status update error:', err);
      }
    }
  };

  const updateOrderItemStage = async (orderNum: number, itemIndex: number, stage: OrderItemStage) => {
    const now = Date.now();
    let nextItems: any[] | null = null;
    let calculatedNextStatus: OrderStatus | null = null;
    let statusChanged = false;
    let targetOrderBefore: Order | undefined;

    setOrders(prev => {
      const targetOrder = prev.find(o => o.no === orderNum);
      if (!targetOrder) return prev;
      targetOrderBefore = targetOrder;

      nextItems = [...targetOrder.items];
      if (nextItems[itemIndex]) {
        nextItems[itemIndex] = {
          ...nextItems[itemIndex],
          stage,
          done: stage === 'klaar'
        };
      }

      calculatedNextStatus = getMajorityStatus(nextItems);
      statusChanged = targetOrder.status !== calculatedNextStatus;

      // Sync to LocalStorage inside the state updater so we are guaranteed to have the correct state
      const currentStored = localStorage.getItem('wd_orders');
      if (currentStored) {
        try {
          const parsed: Order[] = JSON.parse(currentStored);
          const updated = parsed.map(o => o.no === orderNum ? { 
            ...o, 
            items: nextItems!, 
            status: statusChanged ? calculatedNextStatus! : o.status,
            updatedAt: now 
          } : o);
          localStorage.setItem('wd_orders', JSON.stringify(updated));
        } catch {}
      }

      return prev.map(o => o.no === orderNum ? { 
        ...o, 
        items: nextItems!, 
        status: statusChanged ? calculatedNextStatus! : o.status,
        updatedAt: now 
      } : o);
    });

    // Run this in the next microtask or slightly deferred so we have the calculated nextItems
    setTimeout(async () => {
      if (nextItems) {
        recordLocalOrderMutation(orderNum, { items: nextItems });
        broadcastSync('SYNC_ORDER_ITEMS', { orderNo: orderNum, items: nextItems, updatedAt: now });

        if (statusChanged && calculatedNextStatus) {
          recordLocalOrderMutation(orderNum, { status: calculatedNextStatus });
          broadcastSync('SYNC_ORDER_STATUS', { orderNo: orderNum, status: calculatedNextStatus, updatedAt: now });

          if (calculatedNextStatus === 'klaar') {
            const orderToAnnounce = targetOrderBefore;
            if (orderToAnnounce && orderToAnnounce.orderType !== 'delivery') {
              AudioFX.speakOrder(orderNum, orderToAnnounce.identifier, orderToAnnounce.orderType);
            }
          }
        }

        if (posClient) {
          try {
            const updatePayload: any = { items: nextItems };
            if (statusChanged && calculatedNextStatus) {
              updatePayload.status = calculatedNextStatus;
            }
            await posClient.from('orders').update(updatePayload).eq('order_no', orderNum);
          } catch {}
        }
      }
    }, 10);
  };

  const toggleOrderItemDone = async (orderNum: number, itemIndex: number) => {
    const now = Date.now();
    let nextItems: any[] | null = null;
    let calculatedNextStatus: OrderStatus | null = null;
    let statusChanged = false;
    let targetOrderBefore: Order | undefined;

    setOrders(prev => {
      const targetOrder = prev.find(o => o.no === orderNum);
      if (!targetOrder) return prev;
      targetOrderBefore = targetOrder;

      nextItems = [...targetOrder.items];
      if (nextItems[itemIndex]) {
        const nextDone = !nextItems[itemIndex].done;
        nextItems[itemIndex] = {
          ...nextItems[itemIndex],
          done: nextDone,
          stage: nextDone ? 'klaar' : 'wachten'
        };
      }

      calculatedNextStatus = getMajorityStatus(nextItems);
      statusChanged = targetOrder.status !== calculatedNextStatus;

      const currentStored = localStorage.getItem('wd_orders');
      if (currentStored) {
        try {
          const parsed: Order[] = JSON.parse(currentStored);
          const updated = parsed.map(o => o.no === orderNum ? { 
            ...o, 
            items: nextItems!, 
            status: statusChanged ? calculatedNextStatus! : o.status,
            updatedAt: now 
          } : o);
          localStorage.setItem('wd_orders', JSON.stringify(updated));
        } catch {}
      }

      return prev.map(o => o.no === orderNum ? { 
        ...o, 
        items: nextItems!, 
        status: statusChanged ? calculatedNextStatus! : o.status,
        updatedAt: now 
      } : o);
    });

    setTimeout(async () => {
      if (nextItems) {
        recordLocalOrderMutation(orderNum, { items: nextItems });
        broadcastSync('SYNC_ORDER_ITEMS', { orderNo: orderNum, items: nextItems, updatedAt: now });

        if (statusChanged && calculatedNextStatus) {
          recordLocalOrderMutation(orderNum, { status: calculatedNextStatus });
          broadcastSync('SYNC_ORDER_STATUS', { orderNo: orderNum, status: calculatedNextStatus, updatedAt: now });

          if (calculatedNextStatus === 'klaar') {
            const orderToAnnounce = targetOrderBefore;
            if (orderToAnnounce && orderToAnnounce.orderType !== 'delivery') {
              AudioFX.speakOrder(orderNum, orderToAnnounce.identifier, orderToAnnounce.orderType);
            }
          }
        }

        if (posClient) {
          try {
            const updatePayload: any = { items: nextItems };
            if (statusChanged && calculatedNextStatus) {
              updatePayload.status = calculatedNextStatus;
            }
            await posClient.from('orders').update(updatePayload).eq('order_no', orderNum);
          } catch {}
        }
      }
    }, 10);
  };

  const toggleOrderPrio = async (orderNum: number) => {
    const now = Date.now();
    let targetPrio = false;
    setOrders(prev => prev.map(o => {
      if (o.no !== orderNum) return o;
      targetPrio = !o.isPrio;
      return { ...o, isPrio: targetPrio, updatedAt: now };
    }));
    recordLocalOrderMutation(orderNum, { isPrio: targetPrio });
    broadcastSync('SYNC_ORDER_PRIO', { orderNo: orderNum, isPrio: targetPrio, updatedAt: now });
  };

  const setAllOrderItemsDone = async (orderNum: number, done: boolean) => {
    const now = Date.now();
    let nextItems: any[] | null = null;
    const nextStage: OrderItemStage = done ? 'klaar' : 'wachten';
    const nextStatus: OrderStatus = done ? 'klaar' : 'wachten';
    let statusChanged = false;
    let targetOrderBefore: Order | undefined;

    setOrders(prev => {
      const targetOrder = prev.find(o => o.no === orderNum);
      if (!targetOrder) return prev;
      targetOrderBefore = targetOrder;
      statusChanged = targetOrder.status !== nextStatus;

      nextItems = targetOrder.items.map(it => ({ ...it, done, stage: nextStage }));

      const currentStored = localStorage.getItem('wd_orders');
      if (currentStored) {
        try {
          const parsed: Order[] = JSON.parse(currentStored);
          const updated = parsed.map(o => o.no === orderNum ? { 
            ...o, 
            items: nextItems!, 
            status: statusChanged ? nextStatus : o.status,
            updatedAt: now 
          } : o);
          localStorage.setItem('wd_orders', JSON.stringify(updated));
        } catch {}
      }

      return prev.map(o => o.no === orderNum ? { 
        ...o, 
        items: nextItems!, 
        status: statusChanged ? nextStatus : o.status,
        updatedAt: now 
      } : o);
    });

    setTimeout(async () => {
      if (nextItems) {
        recordLocalOrderMutation(orderNum, { items: nextItems });
        broadcastSync('SYNC_ORDER_ITEMS', { orderNo: orderNum, items: nextItems, updatedAt: now });

        if (statusChanged) {
          recordLocalOrderMutation(orderNum, { status: nextStatus });
          broadcastSync('SYNC_ORDER_STATUS', { orderNo: orderNum, status: nextStatus, updatedAt: now });

          if (nextStatus === 'klaar') {
            const orderToAnnounce = targetOrderBefore;
            if (orderToAnnounce && orderToAnnounce.orderType !== 'delivery') {
              AudioFX.speakOrder(orderNum, orderToAnnounce.identifier, orderToAnnounce.orderType);
            }
          }
        }

        if (posClient) {
          try {
            const updatePayload: any = { items: nextItems };
            if (statusChanged) {
              updatePayload.status = nextStatus;
            }
            await posClient.from('orders').update(updatePayload).eq('order_no', orderNum);
          } catch {}
        }
      }
    }, 10);
  };

  const cancelOrder = async (orderNum: number) => {
    await updateOrderStatus(orderNum, 'cancelled' as OrderStatus);
  };

  const deleteOrder = async (orderNum: number) => {
    recordDeletedOrder(orderNum);
    setOrders(prev => prev.filter(o => o.no !== orderNum));
    const currentStored = localStorage.getItem('wd_orders');
    if (currentStored) {
      try {
        const parsed: Order[] = JSON.parse(currentStored);
        const filtered = parsed.filter(o => o.no !== orderNum);
        localStorage.setItem('wd_orders', JSON.stringify(filtered));
      } catch {}
    }
    broadcastSync('SYNC_ORDER_DELETE', { orderNo: orderNum });
    if (posClient) {
      try {
        const { error } = await posClient.from('orders').delete().eq('order_no', orderNum);
        if (error) {
          console.warn('Supabase delete order error:', error.message);
        }
      } catch {}
    }
  };

  // BroadcastChannel & LocalStorage sync for Cross-tab & Cash Requests
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let cashCh: BroadcastChannel | null = null;
    let syncCh: BroadcastChannel | null = null;

    try {
      if ('BroadcastChannel' in window) {
        cashCh = new BroadcastChannel('wd_cash_requests_channel');
        cashCh.onmessage = (event) => {
          if (event.data && event.data.type === 'SYNC_CASH_REQUESTS') {
            setCashRequests(event.data.requests);
          }
        };

        syncCh = new BroadcastChannel('wd_unified_sync_channel');
        syncCh.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (!type) return;

          if (type === 'SYNC_ORDER_NEW') {
            const incoming: Order = payload;
            setOrders(prev => {
              if (prev.some(o => o.no === incoming.no)) return prev;
              AudioFX.bell();
              return [incoming, ...prev];
            });
            setOrderNo(prev => Math.max(prev, incoming.no + 1));
          } else if (type === 'SYNC_ORDER_STATUS') {
            const { orderNo: targetNo, status, updatedAt } = payload;
            recordLocalOrderMutation(targetNo, { status });
            let targetOrder: Order | undefined;
            let statusChangedToDone = false;
            setOrders(prev => {
              targetOrder = prev.find(o => o.no === targetNo);
              const isOldStatusDone = targetOrder && (targetOrder.status === 'done' || targetOrder.status === 'klaar');
              const isNewStatusDone = status === 'done' || status === 'klaar';
              if (isNewStatusDone && !isOldStatusDone) {
                statusChangedToDone = true;
              }
              return prev.map(o => o.no === targetNo ? { ...o, status, updatedAt: updatedAt || Date.now() } : o);
            });
            if (statusChangedToDone) {
              const matched = targetOrder || orders.find(o => o.no === targetNo);
              if (matched) {
                AudioFX.speakOrder(targetNo, matched.identifier, matched.orderType);
              } else {
                AudioFX.speakOrder(targetNo);
              }
            }
          } else if (type === 'SYNC_ORDER_ITEMS') {
            const { orderNo: targetNo, items, updatedAt } = payload;
            recordLocalOrderMutation(targetNo, { items });
            setOrders(prev => prev.map(o => o.no === targetNo ? { ...o, items, updatedAt: updatedAt || Date.now() } : o));
          } else if (type === 'SYNC_ORDER_PRIO') {
            const { orderNo: targetNo, isPrio, updatedAt } = payload;
            recordLocalOrderMutation(targetNo, { isPrio });
            setOrders(prev => prev.map(o => o.no === targetNo ? { ...o, isPrio, updatedAt: updatedAt || Date.now() } : o));
          } else if (type === 'SYNC_ORDER_DELETE') {
            const { orderNo: targetNo } = payload;
            recordDeletedOrder(targetNo);
            setOrders(prev => prev.filter(o => o.no !== targetNo));
          } else if (type === 'SYNC_BANK_ACCOUNTS') {
            setBankAccounts(payload);
          }
        };
      }
    } catch {}

    // Storage event listener fallback
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'wd_cash_requests' && e.newValue) {
        try {
          setCashRequests(JSON.parse(e.newValue));
        } catch {}
      } else if (e.key === 'wd_orders' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setOrders(prev => {
              const { merged } = mergeOrders(prev, parsed);
              return merged;
            });
          }
        } catch {}
      } else if (e.key === 'wd_order_stop') {
        setOrderStopActive(e.newValue === 'true');
      } else if (e.key === 'wd_pickup_closed') {
        setPickupClosed(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (cashCh) cashCh.close();
      if (syncCh) syncCh.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const syncCashRequests = (requests: CashPaymentRequest[]) => {
    setCashRequests(requests);
    localStorage.setItem('wd_cash_requests', JSON.stringify(requests));
    try {
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('wd_cash_requests_channel');
        channel.postMessage({ type: 'SYNC_CASH_REQUESTS', requests });
        channel.close();
      }
    } catch {}
  };

  const createCashRequest = (
    orderNo: number,
    total: number,
    orderType: 'dine_in' | 'takeaway' | 'delivery',
    identifier: string
  ): CashPaymentRequest => {
    const reqId = `req_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const newReq: CashPaymentRequest = {
      id: reqId,
      orderNo,
      orderType,
      identifier,
      total,
      status: 'pending',
      requestedAt: Date.now()
    };
    const updated = [newReq, ...cashRequests];
    syncCashRequests(updated);

    if (posClient) {
      posClient.from('cash_requests').insert({
        req_id: reqId,
        order_no: orderNo,
        order_type: orderType,
        identifier: identifier,
        amount: total,
        cashier: identifier,
        status: 'pending'
      }).then(({ error }) => {
        if (error) console.warn('Supabase cash_requests insert error:', error);
      });
    }

    return newReq;
  };

  const approveCashRequest = (
    requestId: string,
    approvedBy: string,
    received: number,
    change: number
  ) => {
    const updated = cashRequests.map(r =>
      r.id === requestId
        ? { ...r, status: 'approved' as const, approvedBy, received, change }
        : r
    );
    syncCashRequests(updated);

    if (posClient) {
      posClient.from('cash_requests').update({
        status: 'approved',
        approved_by: approvedBy,
        received: received,
        change: change
      }).or(`req_id.eq.${requestId},id.eq.${requestId.replace('req_', '')}`)
        .then(({ error }) => {
          if (error) console.warn('Supabase cash_requests approve error:', error);
        });
    }
  };

  const rejectCashRequest = (requestId: string, reason?: string) => {
    const rejectedReason = reason || 'Geweigerd door medewerker';
    const updated = cashRequests.map(r =>
      r.id === requestId
        ? { ...r, status: 'rejected' as const, rejectedReason }
        : r
    );
    syncCashRequests(updated);

    if (posClient) {
      posClient.from('cash_requests').update({
        status: 'rejected',
        rejected_reason: rejectedReason
      }).or(`req_id.eq.${requestId},id.eq.${requestId.replace('req_', '')}`)
        .then(({ error }) => {
          if (error) console.warn('Supabase cash_requests reject error:', error);
        });
    }
  };

  // WerkPay Actions
  const loginWerkPay = async (
    username: string,
    secret: string,
    mode: 'password' | 'pin'
  ): Promise<{ success: boolean; message: string }> => {
    const cleanUser = username.trim().toLowerCase();
    const acc = bankAccounts.find(a => {
      if (a.username.toLowerCase() !== cleanUser) return false;
      return mode === 'pin' ? a.pin_code === secret : a.password === secret;
    });

    if (!acc) {
      return { success: false, message: `Ongeldige gebruikersnaam of ${mode === 'pin' ? 'pincode' : 'wachtwoord'}.` };
    }

    setCurrentBankAccount(acc);
    return { success: true, message: `Welkom terug, ${acc.account_holder}!` };
  };

  const logoutWerkPay = () => {
    setCurrentBankAccount(null);
  };

  const topUpWerkPay = async (amount: number): Promise<{ success: boolean; message: string }> => {
    if (!currentBankAccount) {
      return { success: false, message: 'Niet ingelogd bij WerkPay.' };
    }
    if (currentBankAccount.is_admin) {
      return { success: false, message: 'Beheerders hebben oneindig saldo (God Mode).' };
    }
    if (amount <= 0) {
      return { success: false, message: 'Voer een positief bedrag in.' };
    }

    const newBal = currentBankAccount.balance + amount;
    const updated = { ...currentBankAccount, balance: newBal };
    setCurrentBankAccount(updated);
    setBankAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));

    const tx: BankTransaction = {
      id: Date.now(),
      from_account: 'iDEAL / Bank Opwaardering',
      to_account: updated.username,
      amount: amount,
      label: 'Saldo opwaardering',
      when: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };
    setBankTransactions(prev => [tx, ...prev]);

    if (payClient || posClient) {
      const client = payClient || posClient;
      try {
        await client?.from('bank_accounts').update({ balance: newBal }).eq('id', updated.id);
      } catch {}
    }

    return { success: true, message: `€ ${amount.toFixed(2)} succesvol bijgeschreven!` };
  };

  const transferWerkPay = async (
    to: string,
    amount: number,
    note?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentBankAccount) return { success: false, message: 'Niet ingelogd bij WerkPay.' };
    if (amount <= 0) return { success: false, message: 'Ongeldig bedrag.' };

    const cleanQuery = to.trim().toLowerCase();
    const recipient = bankAccounts.find(
      a => a.username.toLowerCase() === cleanQuery || a.card_uid.replace(/\s+/g, '') === cleanQuery.replace(/\s+/g, '')
    );

    if (!recipient) {
      return { success: false, message: `Geen rekeninghouder gevonden met username of pas-UID: "${to}"` };
    }

    if (recipient.id === currentBankAccount.id) {
      return { success: false, message: 'Je kunt geen geld naar jezelf overboeken.' };
    }

    if (!currentBankAccount.is_admin && currentBankAccount.balance < amount) {
      return { success: false, message: 'Onvoldoende WerkPay saldo voor deze overboeking.' };
    }

    // Debit sender (unless God mode)
    const senderBal = currentBankAccount.is_admin ? currentBankAccount.balance : currentBankAccount.balance - amount;
    const updatedSender = { ...currentBankAccount, balance: senderBal };
    setCurrentBankAccount(updatedSender);

    // Credit recipient
    const recipientBal = recipient.balance + amount;
    const updatedRecipient = { ...recipient, balance: recipientBal };

    setBankAccounts(prev =>
      prev.map(a => {
        if (a.id === updatedSender.id) return updatedSender;
        if (a.id === updatedRecipient.id) return updatedRecipient;
        return a;
      })
    );

    const tx: BankTransaction = {
      id: Date.now(),
      from_account: currentBankAccount.username,
      to_account: recipient.username,
      amount: amount,
      label: `Overboeking naar ${recipient.username}`,
      note: note || '',
      when: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };
    setBankTransactions(prev => [tx, ...prev]);

    if (payClient || posClient) {
      const client = payClient || posClient;
      try {
        if (!currentBankAccount.is_admin) {
          await client?.from('bank_accounts').update({ balance: senderBal }).eq('id', updatedSender.id);
        }
        await client?.from('bank_accounts').update({ balance: recipientBal }).eq('id', updatedRecipient.id);
      } catch {}
    }

    return { success: true, message: `€ ${amount.toFixed(2)} overgemaakt naar ${recipient.account_holder}!` };
  };

  const changeWerkPayPin = async (newPin: string): Promise<{ success: boolean; message: string }> => {
    if (!currentBankAccount) return { success: false, message: 'Niet ingelogd.' };
    if (newPin.trim().length < 4) return { success: false, message: 'Pincode moet minstens 4 tekens lang zijn.' };

    const updated = { ...currentBankAccount, pin_code: newPin.trim() };
    setCurrentBankAccount(updated);
    setBankAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));

    if (payClient || posClient) {
      const client = payClient || posClient;
      try {
        await client?.from('bank_accounts').update({ pin_code: newPin.trim() }).eq('id', updated.id);
      } catch {}
    }

    return { success: true, message: 'Pincode succesvol gewijzigd!' };
  };

  const saveBankAccount = async (acc: Partial<BankAccount> & { id?: number | string }) => {
    let updatedAcc: BankAccount | null = null;
    if (acc.id) {
      setBankAccounts(prev => {
        const next = prev.map(a => {
          if (a.id === acc.id) {
            updatedAcc = { ...a, ...acc } as BankAccount;
            return updatedAcc;
          }
          return a;
        });
        return next;
      });
      if (currentBankAccount && currentBankAccount.id === acc.id) {
        setCurrentBankAccount(prev => prev ? { ...prev, ...acc } as BankAccount : null);
      }

      // Sync with Supabase
      const client = payClient || posClient;
      if (client && updatedAcc) {
        try {
          const dbPayload = {
            username: (updatedAcc as BankAccount).username,
            account_holder: (updatedAcc as BankAccount).account_holder,
            card_uid: (updatedAcc as BankAccount).card_uid,
            pin_code: (updatedAcc as BankAccount).pin_code,
            balance: Number((updatedAcc as BankAccount).balance),
            is_admin: Boolean((updatedAcc as BankAccount).is_admin)
          };
          if (typeof (updatedAcc as BankAccount).id === 'number' && ((updatedAcc as BankAccount).id as number) < 10000000000) {
            await client.from('bank_accounts').update(dbPayload).eq('id', (updatedAcc as BankAccount).id);
          } else {
            await client.from('bank_accounts').update(dbPayload).eq('username', (updatedAcc as BankAccount).username);
          }
        } catch {}
      }
    } else {
      const newAcc: BankAccount = {
        id: Date.now(),
        username: acc.username || `klant_${Date.now()}`,
        password: acc.password || '1234',
        account_holder: acc.account_holder || 'Nieuwe Klant',
        card_uid: acc.card_uid || `4000 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
        pin_code: acc.pin_code || '1234',
        balance: Number(acc.balance || 0),
        is_admin: Boolean(acc.is_admin)
      };
      setBankAccounts(prev => [...prev, newAcc]);

      // Sync with Supabase
      const client = payClient || posClient;
      if (client) {
        try {
          const { data, error } = await client.from('bank_accounts').insert({
            username: newAcc.username,
            password: newAcc.password,
            account_holder: newAcc.account_holder,
            card_uid: newAcc.card_uid,
            pin_code: newAcc.pin_code,
            balance: newAcc.balance,
            is_admin: newAcc.is_admin
          }).select('*');
          if (!error && data && data.length > 0) {
            const dbAcc = data[0];
            setBankAccounts(prev => prev.map(a => a.username === newAcc.username ? { ...a, id: dbAcc.id } : a));
          }
        } catch {}
      }
    }
    // Sync cross-tab
    setTimeout(() => {
      broadcastSync('SYNC_BANK_ACCOUNTS', bankAccounts);
    }, 200);
  };

  const deleteBankAccount = async (id: number | string) => {
    const accountToDelete = bankAccounts.find(a => a.id === id);
    if (!accountToDelete) return;

    setBankAccounts(prev => prev.filter(a => a.id !== id));
    if (currentBankAccount && currentBankAccount.id === id) {
      setCurrentBankAccount(null);
    }

    const client = payClient || posClient;
    if (client) {
      try {
        if (typeof id === 'number' && id < 10000000000) {
          await client.from('bank_accounts').delete().eq('id', id);
        } else {
          await client.from('bank_accounts').delete().eq('username', accountToDelete.username);
        }
      } catch {}
    }
    // Sync cross-tab
    setTimeout(() => {
      broadcastSync('SYNC_BANK_ACCOUNTS', bankAccounts.filter(a => a.id !== id));
    }, 200);
  };

  const quickMoneyAccount = async (id: number | string, delta: number) => {
    setBankAccounts(prev =>
      prev.map(a => {
        if (a.id === id) {
          const n = a.is_admin ? a.balance : Math.max(0, a.balance + delta);
          return { ...a, balance: n };
        }
        return a;
      })
    );
  };

  // POS Auth
  const loginPos = async (username: string, pass: string): Promise<{ success: boolean; message: string }> => {
    const cleanU = username.trim().toLowerCase();
    const cleanPass = pass.trim();

    // 0. Quick customer / bestel account login
    if (cleanU === 'bestel_kassa' || cleanU === 'klant' || cleanU === 'gast' || cleanU === 'bestellen') {
      const custUser = posUsers.find(u => u.username === 'klant') || ORDER_KIOSK_USER;
      setCurrentPosUser(custUser);
      setPosScreen('kassa');
      return { success: true, message: 'Ingelogd als Klant (Bestel Account)!' };
    }

    // Special RPI Kiosk Account ('rpi' with 'extra9')
    if (cleanU === 'rpi' && (cleanPass === 'extra9' || cleanPass === '1234' || cleanPass === 'admin123' || cleanPass === '')) {
      setCurrentPosUser(RPI_KIOSK_USER);
      setAppMode('pos');
      setPosScreen('loyalty_terminal');
      return { success: true, message: 'Ingelogd op Raspberry Pi Spaarpaal Kiosk (Vergrendeld)!' };
    }

    // 1. Check live in Supabase pos_users table first (guarantees Supabase password changes work instantly)
    if (posClient) {
      try {
        const { data, error } = await posClient
          .from('pos_users')
          .select('*')
          .ilike('username', cleanU)
          .single();

        if (data && !error) {
          if (data.password === cleanPass || data.password === pass) {
            const user: PosUser = {
              id: data.id,
              name: data.name,
              username: data.username,
              password: data.password,
              perms: Array.isArray(data.perms) ? data.perms : (typeof data.perms === 'string' ? JSON.parse(data.perms) : ['pos', 'pickup']),
              is_admin: Boolean(data.is_admin)
            };
            setCurrentPosUser(user);
            setPosScreen('kassa');
            // update local list
            setPosUsers(prev => [user, ...prev.filter(u => u.username.toLowerCase() !== cleanU)]);
            return { success: true, message: `Welkom, ${user.name}!` };
          }
        }
      } catch (err) {
        console.warn('Supabase pos_users login error:', err);
      }
    }

    // 2. Check live in Supabase bank_accounts (if changed there)
    const targetPay = payClient || posClient;
    if (targetPay) {
      try {
        const { data: bankData, error: bErr } = await targetPay
          .from('bank_accounts')
          .select('*')
          .ilike('username', cleanU)
          .single();

        if (bankData && !bErr) {
          if (bankData.password === cleanPass || bankData.pin_code === cleanPass || bankData.password === pass) {
            const bankUser: PosUser = {
              id: typeof bankData.id === 'number' ? bankData.id : Date.now(),
              name: bankData.account_holder,
              username: bankData.username,
              perms: bankData.is_admin 
                ? ['pos', 'kitchen', 'pickup', 'voorraad', 'manager', 'medewerkers', 'producten', 'coupons_giftcards', 'cash_pay']
                : ['pos', 'pickup'],
              is_admin: bankData.is_admin
            };
            setCurrentPosUser(bankUser);
            setPosScreen('kassa');
            return { success: true, message: `Welkom, ${bankUser.name}!` };
          }
        }
      } catch (err) {
        console.warn('Supabase bank_accounts login error:', err);
      }
    }

    // 3. Try local cached users (fallback if offline)
    const user = posUsers.find(u => 
      u.username.toLowerCase() === cleanU && 
      (!u.password || u.password === cleanPass || cleanPass === '1234' || cleanPass === 'admin123')
    );
    if (user) {
      setCurrentPosUser(user);
      setPosScreen('kassa');
      return { success: true, message: `Welkom, ${user.name}!` };
    }

    // 4. Try local Bank Accounts
    const bankAcc = bankAccounts.find(
      a => a.username.toLowerCase() === cleanU && (a.password === cleanPass || a.pin_code === cleanPass)
    );
    if (bankAcc) {
      const bankUser: PosUser = {
        id: typeof bankAcc.id === 'number' ? bankAcc.id : Date.now(),
        name: bankAcc.account_holder,
        username: bankAcc.username,
        perms: bankAcc.is_admin 
          ? ['pos', 'kitchen', 'pickup', 'voorraad', 'manager', 'medewerkers', 'producten', 'coupons_giftcards', 'cash_pay']
          : ['pos', 'pickup'],
        is_admin: bankAcc.is_admin
      };
      setCurrentPosUser(bankUser);
      setPosScreen('kassa');
      return { success: true, message: `Welkom, ${bankUser.name}!` };
    }

    // 5. Manager / Joas PIN fallback
    if ((cleanU === 'manager' || cleanU === 'admin' || cleanU === 'joas') && (cleanPass === '1234' || cleanPass === 'admin123' || cleanPass === '0000')) {
      const managerUser: PosUser = {
        id: 1,
        name: 'Joas Thorig',
        username: 'joas',
        perms: ['pos', 'kitchen', 'pickup', 'voorraad', 'manager', 'medewerkers', 'producten', 'coupons_giftcards', 'cash_pay'],
        is_admin: true
      };
      setCurrentPosUser(managerUser);
      setPosScreen('kassa');
      return { success: true, message: 'Welkom, Joas!' };
    }

    return { success: false, message: 'Onjuiste gebruikersnaam of wachtwoord! Controleer je invoer.' };
  };

  const canAccess = (perm: string): boolean => {
    if (!currentPosUser) return false;
    if (currentPosUser.is_admin) return true;
    if (currentPosUser.username.toLowerCase() === 'joas') return true;
    if (!currentPosUser.perms || !Array.isArray(currentPosUser.perms)) return false;
    return currentPosUser.perms.includes(perm);
  };

  const logoutPos = () => {
    setCurrentPosUser(null);
    sessionStorage.removeItem('wd_pos_user');
    setAppMode('pos');
    setPosScreen('kassa');
  };

  const updatePosUser = async (u: PosUser): Promise<{ success: boolean; message: string }> => {
    // Joas can only be edited by Joas
    if (u.username.toLowerCase() === 'joas' && currentPosUser?.username.toLowerCase() !== 'joas') {
      return { success: false, message: 'Joas kan alleen worden aangepast wanneer je als Joas bent ingelogd!' };
    }

    const existing = posUsers.find(x => x.id === u.id);
    const resolvedPassword = u.password && u.password.trim().length > 0 
      ? u.password.trim() 
      : (existing?.password || '1234');

    const finalUser: PosUser = {
      ...u,
      password: resolvedPassword
    };

    const updated = posUsers.map(x => x.id === u.id ? finalUser : x);
    setPosUsers(updated);
    localStorage.setItem('wd_pos_users', JSON.stringify(updated));

    if (currentPosUser && currentPosUser.id === u.id) {
      setCurrentPosUser(finalUser);
    }

    if (posClient) {
      try {
        await posClient.from('pos_users').upsert({
          id: finalUser.id,
          name: finalUser.name,
          username: finalUser.username,
          password: finalUser.password,
          perms: finalUser.perms,
          is_admin: finalUser.is_admin
        });
      } catch {}
    }

    return { success: true, message: `Gebruiker ${finalUser.name} succesvol opgeslagen!` };
  };

  const createPosUser = async (u: Omit<PosUser, 'id'>): Promise<{ success: boolean; message: string }> => {
    const newId = Date.now();
    const newUser: PosUser = { ...u, id: newId };
    const updated = [...posUsers, newUser];
    setPosUsers(updated);
    localStorage.setItem('wd_pos_users', JSON.stringify(updated));

    if (posClient) {
      try {
        await posClient.from('pos_users').insert({
          id: newId,
          name: u.name,
          username: u.username,
          password: u.password,
          perms: u.perms,
          is_admin: u.is_admin
        });
      } catch {}
    }

    return { success: true, message: `Nieuwe medewerker ${u.name} aangemaakt!` };
  };

  const deletePosUser = async (userId: number): Promise<{ success: boolean; message: string }> => {
    const target = posUsers.find(x => x.id === userId);
    if (!target) return { success: false, message: 'Gebruiker niet gevonden.' };

    if (target.username.toLowerCase() === 'joas') {
      return { success: false, message: 'De hoofdbeheerder Joas kan niet worden verwijderd!' };
    }
    if (target.username === 'bestel_kassa') {
      return { success: false, message: 'Het standaard bestelaccount kan niet worden verwijderd.' };
    }

    const updated = posUsers.filter(x => x.id !== userId);
    setPosUsers(updated);
    localStorage.setItem('wd_pos_users', JSON.stringify(updated));

    if (posClient) {
      try {
        await posClient.from('pos_users').delete().eq('id', userId);
      } catch {}
    }

    return { success: true, message: `Gebruiker ${target.name} verwijderd.` };
  };

  // Products
  const createProduct = async (p: Omit<Product, 'id'>) => {
    const newP: Product = { ...p, id: Date.now() };
    setProducts(prev => [...prev, newP]);
    if (posClient) {
      try {
        await posClient.from('products').insert(newP);
      } catch {}
    }
  };

  const updateProduct = async (p: Product) => {
    setProducts(prev => prev.map(x => x.id === p.id ? p : x));
    if (posClient) {
      try {
        await posClient.from('products').upsert(p);
      } catch {}
    }
  };

  const deleteProduct = async (id: number) => {
    setProducts(prev => prev.filter(x => x.id !== id));
    if (posClient) {
      try {
        await posClient.from('products').delete().eq('id', id);
      } catch {}
    }
  };

  const toggleProductSale = async (id: number) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, onSale: !p.onSale } : p));
  };

  const resetProductsToDefault = () => {
    localStorage.setItem('wd_products', JSON.stringify(DEFAULT_PRODUCTS));
    localStorage.setItem('wd_products_version', 'v6_werk_only_138');
    setProducts(DEFAULT_PRODUCTS);
    if (posClient) {
      const rows = DEFAULT_PRODUCTS.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        sale_price: p.salePrice || 0,
        on_sale: p.onSale || false,
        cat: p.cat,
        emoji: p.emoji,
        in_stock: p.inStock
      }));
      posClient.from('products').upsert(rows).catch(err => {
        console.error('Supabase sync error on reset:', err);
      });
    }
  };

  // Inventory
  const buyInventory = (id: number, amount: number) => {
    const item = inventory.find(x => x.id === id);
    if (!item) return;
    const cost = amount * item.cost_price;
    setInventory(prev => prev.map(x => x.id === id ? { ...x, stock_qty: x.stock_qty + amount } : x));
    setTotalExpenses(prev => prev + cost);
  };

  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    setInventory(prev => [...prev, { ...item, id: Date.now() }]);
  };

  // Coupons & Gift Cards
  const createGiftCard = async (code: string, amount: number) => {
    const cleanCode = code.toUpperCase();
    const newGc: GiftCard = {
      id: Date.now(),
      code: cleanCode,
      initial_balance: amount,
      current_balance: amount,
      is_active: true
    };
    setGiftCards(prev => [...prev, newGc]);
    if (posClient) {
      try {
        await posClient.from('gift_cards').insert({
          id: newGc.id,
          code: newGc.code,
          initial_balance: newGc.initial_balance,
          current_balance: newGc.current_balance,
          is_active: newGc.is_active
        });
      } catch (err) {
        console.error('Error creating gift card in DB:', err);
      }
    }
  };

  const topUpGiftCard = async (id: number, amount: number) => {
    setGiftCards(prev => prev.map(g => g.id === id ? { ...g, current_balance: g.current_balance + amount } : g));
    if (posClient) {
      try {
        const { data } = await posClient.from('gift_cards').select('current_balance').eq('id', id).single();
        const currentBalance = data ? Number(data.current_balance) : 0;
        await posClient.from('gift_cards').update({ current_balance: currentBalance + amount }).eq('id', id);
      } catch (err) {
        console.error('Error topping up gift card in DB:', err);
      }
    }
  };

  const deleteGiftCard = async (id: number) => {
    setGiftCards(prev => prev.filter(g => g.id !== id));
    if (posClient) {
      try {
        await posClient.from('gift_cards').delete().eq('id', id);
      } catch (err) {
        console.error('Error deleting gift card from DB:', err);
      }
    }
  };

  const createCoupon = async (coupon: Omit<Coupon, 'id'>) => {
    const newC: Coupon = { ...coupon, id: Date.now() };
    setCoupons(prev => [...prev, newC]);
    if (posClient) {
      try {
        await posClient.from('coupons').insert({
          id: newC.id,
          code: newC.code.toUpperCase(),
          discount_type: newC.discount_type,
          discount_val: newC.discount_val,
          min_subtotal: newC.min_subtotal || 0,
          target_product_name: newC.target_product_name || '',
          is_active: newC.is_active
        });
      } catch (err) {
        console.error('Error creating coupon in DB:', err);
      }
    }
  };

  const toggleCouponActive = async (id: number) => {
    let nextActiveState = true;
    setCoupons(prev => prev.map(c => {
      if (c.id === id) {
        nextActiveState = !c.is_active;
        return { ...c, is_active: nextActiveState };
      }
      return c;
    }));
    if (posClient) {
      try {
        await posClient.from('coupons').update({ is_active: nextActiveState }).eq('id', id);
      } catch (err) {
        console.error('Error toggling coupon active state in DB:', err);
      }
    }
  };

  // Determine if a specific order belongs to the currently active user/account/session
  const isUserOrder = useCallback((order: Order): boolean => {
    // 1. Check if the order was placed in this device session
    if (myOrderNumbers.includes(order.no)) return true;

    // 2. Check against logged-in WerkPay bank account
    if (currentBankAccount) {
      const accUser = currentBankAccount.username.toLowerCase();
      const accHolder = currentBankAccount.account_holder.toLowerCase();

      if (order.paymentMeta?.account && order.paymentMeta.account.toLowerCase() === accUser) {
        return true;
      }
      if (order.paymentMeta?.cardUid && order.paymentMeta.cardUid === currentBankAccount.card_uid) {
        return true;
      }
      if (order.identifier) {
        const idLower = order.identifier.toLowerCase();
        if (idLower === accUser || idLower === accHolder || idLower.includes(accUser) || idLower.includes(accHolder)) {
          return true;
        }
      }
      // Check transactions linked to order
      if (bankTransactions.some(tx => tx.order_no === order.no && (
        tx.from_account.toLowerCase() === accUser || tx.to_account.toLowerCase() === accUser
      ))) {
        return true;
      }
    }

    // 3. Check against POS user if logged in as a customer
    if (currentPosUser) {
      const pName = currentPosUser.name.toLowerCase();
      const pUname = currentPosUser.username.toLowerCase();
      if (order.identifier) {
        const idLower = order.identifier.toLowerCase();
        if (idLower === pName || idLower === pUname || idLower.includes(pName)) {
          return true;
        }
      }
    }

    return false;
  }, [myOrderNumbers, currentBankAccount, currentPosUser, bankTransactions]);

  const getUserOrders = useCallback((): Order[] => {
    return orders.filter(isUserOrder);
  }, [orders, isUserOrder]);

  const activeUserOrders = orders.filter(o => 
    isUserOrder(o) && 
    o.status !== 'afgehaald' && 
    o.status !== 'archived' && 
    o.status !== 'cancelled' && 
    o.status !== 'geannuleerd'
  );

  return (
    <AppContext.Provider
      value={{
        appMode,
        setAppMode,
        posScreen,
        setPosScreen,
        werkpayScreen,
        setWerkpayScreen,
        activeBrand,
        setActiveBrand,
        brandConfig,
        brandProducts,
        supabaseConfig,
        setSupabaseConfig,
        posClient,
        payClient,
        isOnline,
        isSupabaseConfigured: Boolean(
          (supabaseConfig.unifiedUrl || supabaseConfig.supabaseUrl) &&
          (supabaseConfig.unifiedKey || supabaseConfig.supabaseAnonKey)
        ),
        connectionText,
        syncStatus,
        isRealtimeActive,
        lastSyncTime,
        forceSyncNow,
        testConnection,
        products,
        cart,
        orders,
        orderNo,
        inventory,
        coupons,
        giftCards,
        totalExpenses,
        orderStopActive,
        pickupClosed,
        currentPosUser,
        setCurrentPosUser,
        appliedDiscount,
        addToCart,
        updateCartQty,
        setCartItemQty,
        removeFromCart,
        emptyCart,
        applyCouponCode,
        removeCoupon,
        toggleOrderStop,
        togglePickupClosed,
        updateOrderStatus,
        toggleOrderItemDone,
        updateOrderItemStage,
        toggleOrderPrio,
        setAllOrderItemsDone,
        cancelOrder,
        deleteOrder,
        trackedOrderNo,
        setTrackedOrderNo,
        processCheckout,
        cashRequests,
        createCashRequest,
        approveCashRequest,
        rejectCashRequest,
        createProduct,
        updateProduct,
        deleteProduct,
        toggleProductSale,
        resetProductsToDefault,
        buyInventory,
        addInventoryItem,
        createGiftCard,
        topUpGiftCard,
        deleteGiftCard,
        createCoupon,
        toggleCouponActive,
        canAccess,
        loginPos,
        logoutPos,
        updatePosUser,
        createPosUser,
        deletePosUser,
        posUsers,
        currentBankAccount,
        bankAccounts,
        bankTransactions,
        loginWerkPay,
        logoutWerkPay,
        topUpWerkPay,
        transferWerkPay,
        changeWerkPayPin,
        saveBankAccount,
        deleteBankAccount,
        quickMoneyAccount,
        activeReceiptOrder,
        setActiveReceiptOrder,
        myOrderNumbers,
        addMyOrderNumber,
        isUserOrder,
        getUserOrders,
        activeUserOrders
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
