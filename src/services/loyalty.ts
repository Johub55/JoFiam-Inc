export interface LoyaltyCustomer {
  id: string;
  name: string;
  phone: string;
  coins: number;
  totalSpent: number;
  ordersCount: number;
  tier: 'Brons' | 'Zilver' | 'Goud' | 'VIP Platinum';
  joinedDate: string;
}

export interface LoyaltyReward {
  id: string;
  title: string;
  emoji: string;
  coinsCost: number;
  description: string;
  discountType: 'fixed_discount' | 'free_item';
  discountVal: number;
  freeItemName?: string;
}

export const LOYALTY_REWARDS: LoyaltyReward[] = [
  {
    id: 'rew_stroopwafel',
    title: 'Gratis Warme Stroopwafel',
    emoji: '🧇',
    coinsCost: 100,
    description: 'Vers gebakken ambachtelijke Koekploeg stroopwafel',
    discountType: 'fixed_discount',
    discountVal: 2.50,
    freeItemName: 'Warme Stroopwafel'
  },
  {
    id: 'rew_coffee_shake',
    title: 'Gratis Verse Koffie / Shake',
    emoji: '☕',
    coinsCost: 150,
    description: 'Keuze uit Cappuccino, Latte of Milkshake',
    discountType: 'fixed_discount',
    discountVal: 3.50,
    freeItemName: 'Cappuccino / Milkshake'
  },
  {
    id: 'rew_friet',
    title: 'Gratis Middel Friet + Saus',
    emoji: '🍟',
    coinsCost: 200,
    description: 'Vers gesneden franse frites met saus naar keuze',
    discountType: 'fixed_discount',
    discountVal: 4.20,
    freeItemName: 'Middel Friet + Saus'
  },
  {
    id: 'rew_burger',
    title: 'Gratis WerkBurger / McFlurry',
    emoji: '🍔',
    coinsCost: 300,
    description: 'Keuze uit Cheeseburger, Kipburger of McFlurry',
    discountType: 'fixed_discount',
    discountVal: 5.50,
    freeItemName: 'WerkBurger Special'
  },
  {
    id: 'rew_5euro',
    title: '€ 5,00 Korting op de Bon',
    emoji: '🎁',
    coinsCost: 500,
    description: 'Directe korting op het totale bestelbedrag',
    discountType: 'fixed_discount',
    discountVal: 5.00
  }
];

const DEFAULT_LOYALTY_CUSTOMERS: LoyaltyCustomer[] = [
  {
    id: 'c_0612345678',
    name: 'Jan Jansen',
    phone: '0612345678',
    coins: 320,
    totalSpent: 145.50,
    ordersCount: 12,
    tier: 'Zilver',
    joinedDate: '2025-01-15'
  },
  {
    id: 'c_0687654321',
    name: 'Sanne de Vries',
    phone: '0687654321',
    coins: 650,
    totalSpent: 280.00,
    ordersCount: 22,
    tier: 'Goud',
    joinedDate: '2024-11-20'
  },
  {
    id: 'c_0699887766',
    name: 'Mo van Dijk',
    phone: '0699887766',
    coins: 1200,
    totalSpent: 520.00,
    ordersCount: 45,
    tier: 'VIP Platinum',
    joinedDate: '2024-08-10'
  }
];

const STORAGE_KEY = 'wd_loyalty_customers_db';

export function getLoyaltyCustomers(): LoyaltyCustomer[] {
  if (typeof window === 'undefined') return DEFAULT_LOYALTY_CUSTOMERS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LOYALTY_CUSTOMERS));
      return DEFAULT_LOYALTY_CUSTOMERS;
    }
    return JSON.parse(saved);
  } catch (e) {
    return DEFAULT_LOYALTY_CUSTOMERS;
  }
}

export function saveLoyaltyCustomers(list: LoyaltyCustomer[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save loyalty customers:', e);
  }
}

export function findLoyaltyCustomerByPhoneOrName(query: string): LoyaltyCustomer | null {
  const clean = query.trim().toLowerCase();
  if (!clean) return null;
  const customers = getLoyaltyCustomers();
  return customers.find(c => c.phone.replace(/\s+/g, '').includes(clean) || c.name.toLowerCase().includes(clean)) || null;
}

export function registerLoyaltyCustomer(name: string, phone: string): LoyaltyCustomer {
  const customers = getLoyaltyCustomers();
  const cleanPhone = phone.trim().replace(/\s+/g, '') || `06${Math.floor(10000000 + Math.random() * 90000000)}`;
  const existing = customers.find(c => c.phone === cleanPhone);
  if (existing) return existing;

  const newCust: LoyaltyCustomer = {
    id: `c_${cleanPhone}`,
    name: name.trim() || 'Vaste Klant',
    phone: cleanPhone,
    coins: 50, // 50 Welcome bonus WerkCoins!
    totalSpent: 0,
    ordersCount: 0,
    tier: 'Brons',
    joinedDate: new Date().toISOString().split('T')[0]
  };

  const updated = [newCust, ...customers];
  saveLoyaltyCustomers(updated);
  return newCust;
}

export function addCoinsToCustomer(phone: string, subtotalAmount: number, paidAmount?: number): LoyaltyCustomer | null {
  const customers = getLoyaltyCustomers();
  const idx = customers.findIndex(c => c.phone === phone);
  if (idx === -1) return null;

  // €1 = 10 WerkCoins based on full pre-discount subtotal (so discounts NEVER reduce earned points!)
  const actualPaid = typeof paidAmount === 'number' ? paidAmount : subtotalAmount;
  const earnedCoins = Math.max(1, Math.floor(Math.max(subtotalAmount, actualPaid) * 10));
  
  const updatedCust = { ...customers[idx] };
  updatedCust.coins += earnedCoins;
  updatedCust.totalSpent += actualPaid;
  updatedCust.ordersCount += 1;

  // Update Tier
  if (updatedCust.totalSpent >= 500) updatedCust.tier = 'VIP Platinum';
  else if (updatedCust.totalSpent >= 250) updatedCust.tier = 'Goud';
  else if (updatedCust.totalSpent >= 100) updatedCust.tier = 'Zilver';
  else updatedCust.tier = 'Brons';

  customers[idx] = updatedCust;
  saveLoyaltyCustomers(customers);
  return updatedCust;
}

export function deductCoinsFromCustomer(phone: string, coinsToDeduct: number): LoyaltyCustomer | null {
  const customers = getLoyaltyCustomers();
  const idx = customers.findIndex(c => c.phone === phone);
  if (idx === -1) return null;

  const updatedCust = { ...customers[idx] };
  updatedCust.coins = Math.max(0, updatedCust.coins - coinsToDeduct);

  customers[idx] = updatedCust;
  saveLoyaltyCustomers(customers);
  return updatedCust;
}
