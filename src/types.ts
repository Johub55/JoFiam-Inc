export type AppMode = 'pos' | 'werkpay' | 'split' | 'setup';

export type BrandType = 'werkdonalds' | 'koekploeg';

export interface BrandConfig {
  id: BrandType;
  name: string;
  tagline: string;
  logoEmoji: string;
  themeColor: string;
  badgeText: string;
  kitchenTitle: string;
  primaryButtonClass: string;
  accentBadgeClass: string;
  headerGradient: string;
}

export type PosScreenType = 'kassa' | 'keuken' | 'afhaal' | 'pickup_control' | 'volgscherm' | 'voorraad' | 'manager' | 'loyalty_terminal';

export type WerkPayScreenType = 'wallet' | 'overboeken' | 'accounts';

export interface Product {
  id: number;
  name: string;
  price: number;
  salePrice: number;
  onSale: boolean;
  cat: string;
  emoji: string;
  inStock: boolean;
}

export interface CartItem {
  id: number | string;
  productId: number;
  name: string;
  price: number;
  qty: number;
  itemNote?: string;
}

export type OrderStatus =
  | 'wachten'
  | 'bereiden'
  | 'oven_grill'
  | 'frituren'
  | 'inpakken'
  | 'klaar'
  | 'afgehaald'
  | 'geannuleerd'
  | 'new'
  | 'done'
  | 'archived'
  | 'cancelled';

export type OrderItemStage = 'wachten' | 'bereiden' | 'inpakken' | 'klaar';

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
  itemNote?: string;
  done?: boolean;
  stage?: OrderItemStage;
}

export interface Order {
  id?: number | string;
  no: number;
  items: OrderItem[];
  total: number;
  discount: number;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  identifier: string; // Tafelnummer, Klantnaam of Bezorgadres
  notes?: string;
  paymentMethod: 'workpay' | 'cash' | 'giftcard';
  paymentMeta?: {
    mode?: 'login' | 'card' | 'quick' | 'terminal';
    reference?: string;
    account?: string;
    cardUid?: string;
    balance_after?: number;
    received?: number;
    change?: number;
    accepted_by?: string;
    brand?: string;
    brandName?: string;
  };
  cashier: string;
  status: OrderStatus;
  isPrio?: boolean;
  time: string;
  timestamp: number;
  updatedAt?: number;
}

export interface BankAccount {
  id: number | string;
  username: string;
  password?: string;
  account_holder: string;
  card_uid: string;
  pin_code?: string;
  balance: number;
  is_admin: boolean;
  created_at?: string;
}

export interface BankTransaction {
  id: number | string;
  from_account: string;
  to_account: string;
  amount: number;
  label: string;
  note?: string;
  order_no?: number;
  when: string;
  timestamp: number;
}

export interface InventoryItem {
  id: number;
  item_name: string;
  stock_qty: number;
  min_qty: number;
  unit: string;
  cost_price: number;
  supplier_name: string;
}

export interface Coupon {
  id: number;
  code: string;
  discount_type: 'percent' | 'fixed' | 'product' | 'threshold';
  discount_val: number;
  min_subtotal?: number;
  target_product_name?: string;
  is_active: boolean;
}

export interface GiftCard {
  id: number;
  code: string;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
}

export interface PosUser {
  id: number;
  name: string;
  username: string;
  password?: string;
  perms: string[];
  is_admin?: boolean;
  is_terminal_locked?: boolean;
  assigned_screen?: PosScreenType;
  session_token?: string;
}

export interface SupabaseConfig {
  unifiedUrl: string;
  unifiedKey: string;
  useSeparatePay: boolean;
  payUrl?: string;
  payKey?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export interface CashPaymentRequest {
  id: string;
  orderNo: number;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  identifier: string;
  total: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: number;
  approvedBy?: string;
  received?: number;
  change?: number;
  rejectedReason?: string;
}

