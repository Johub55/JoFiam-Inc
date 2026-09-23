import { Coupon, GiftCard, LoyaltyVoucher, OrderItem } from '../types';
import { getLoyaltyCustomers, saveLoyaltyCustomers } from './loyalty';

export const DEFAULT_PROMO_CODES: Coupon[] = [
  {
    id: 1,
    code: 'BURGER20',
    discount_type: 'percent',
    discount_val: 20,
    target_category: 'Burgers & Wraps',
    description: '20% Korting op alle Burgers & Wraps!',
    is_active: true
  },
  {
    id: 2,
    code: 'FRIETVRIJDAG',
    discount_type: 'free_item',
    discount_val: 3.20,
    target_product_name: 'Friet met Saus',
    min_subtotal: 10.00,
    description: 'Gratis Franse Friet bij besteding vanaf € 10,-',
    is_active: true
  },
  {
    id: 3,
    code: 'WELKOM5',
    discount_type: 'fixed',
    discount_val: 5.00,
    min_subtotal: 15.00,
    description: '€ 5,00 Welkomstkorting bij besteding vanaf € 15,-',
    is_active: true
  },
  {
    id: 4,
    code: 'SNACK10',
    discount_type: 'percent',
    discount_val: 10,
    target_category: 'Snacks & Frites',
    description: '10% Korting op alle Snacks & Frites',
    is_active: true
  },
  {
    id: 5,
    code: 'VIPCLUB',
    discount_type: 'fixed',
    discount_val: 3.00,
    min_subtotal: 12.00,
    description: '€ 3,00 Exclusieve VIP Club Kassakorting',
    is_active: true
  }
];

const PROMO_STORAGE_KEY = 'wd_promo_coupons_db';

export function getPromoCoupons(): Coupon[] {
  if (typeof window === 'undefined') return DEFAULT_PROMO_CODES;
  try {
    const raw = localStorage.getItem(PROMO_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(DEFAULT_PROMO_CODES));
      return DEFAULT_PROMO_CODES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PROMO_CODES;
  }
}

export function savePromoCoupons(coupons: Coupon[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(coupons));
    window.dispatchEvent(new Event('wd_promo_updated'));
  } catch (e) {
    console.error('Failed to save promo coupons:', e);
  }
}

export interface DiscountCalculationResult {
  valid: boolean;
  code: string;
  discountAmount: number;
  description: string;
  freeItemName?: string;
  isVoucher?: boolean;
  voucherId?: string;
  customerPhone?: string;
  error?: string;
}

/**
 * Validates either a Promotional Code (Coupon) or a Customer Loyalty Voucher.
 */
export function calculateDiscount(
  code: string,
  items: OrderItem[],
  subtotal: number,
  customerPhone?: string
): DiscountCalculationResult {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, code: '', discountAmount: 0, description: '', error: 'Geen code ingevoerd' };
  }

  // 1. Check Customer Loyalty Vouchers first
  const customers = getLoyaltyCustomers();
  let foundVoucher: LoyaltyVoucher | null = null;
  let voucherOwnerPhone = '';

  for (const c of customers) {
    if (c.vouchers && c.vouchers.length > 0) {
      const match = c.vouchers.find(v => v.code.toUpperCase() === cleanCode);
      if (match) {
        foundVoucher = match;
        voucherOwnerPhone = c.phone;
        break;
      }
    }
  }

  if (foundVoucher) {
    if (foundVoucher.status !== 'active') {
      return {
        valid: false,
        code: cleanCode,
        discountAmount: 0,
        description: '',
        error: `Deze voucher is al ${foundVoucher.status === 'used' ? 'gebruikt' : 'verlopen'}.`
      };
    }

    if (foundVoucher.minOrderAmount && subtotal < foundVoucher.minOrderAmount) {
      return {
        valid: false,
        code: cleanCode,
        discountAmount: 0,
        description: '',
        error: `Minimale besteding van € ${foundVoucher.minOrderAmount.toFixed(2)} vereist voor deze voucher.`
      };
    }

    let discount = 0;
    if (foundVoucher.discountType === 'fixed_discount') {
      discount = Math.min(subtotal, foundVoucher.discountVal);
    } else if (foundVoucher.discountType === 'percent_discount') {
      discount = (subtotal * foundVoucher.discountVal) / 100;
    } else if (foundVoucher.discountType === 'free_item') {
      // Find matching item in cart or grant value
      const matchingItem = items.find(it => 
        it.name.toLowerCase().includes(foundVoucher!.freeItemName?.toLowerCase() || '') ||
        (foundVoucher!.freeItemName && it.name.toLowerCase().includes('wafel') && foundVoucher!.freeItemName.toLowerCase().includes('wafel'))
      );
      if (matchingItem) {
        discount = matchingItem.price;
      } else {
        discount = foundVoucher.discountVal || 3.00;
      }
    }

    return {
      valid: true,
      code: cleanCode,
      discountAmount: Number(discount.toFixed(2)),
      description: `🎟️ ${foundVoucher.title} (${foundVoucher.code})`,
      freeItemName: foundVoucher.freeItemName,
      isVoucher: true,
      voucherId: foundVoucher.id,
      customerPhone: voucherOwnerPhone
    };
  }

  // 2. Check Promo Codes / Coupons
  const promoCoupons = getPromoCoupons();
  const coupon = promoCoupons.find(c => c.code.toUpperCase() === cleanCode && c.is_active);

  if (!coupon) {
    return {
      valid: false,
      code: cleanCode,
      discountAmount: 0,
      description: '',
      error: 'Ongeldige of niet-bestaande kortingscode/voucher.'
    };
  }

  if (coupon.min_subtotal && subtotal < coupon.min_subtotal) {
    return {
      valid: false,
      code: cleanCode,
      discountAmount: 0,
      description: '',
      error: `Minimale bestelling voor ${coupon.code} is € ${coupon.min_subtotal.toFixed(2)}.`
    };
  }

  let discount = 0;

  if (coupon.discount_type === 'percent') {
    if (coupon.target_category) {
      // Category specific percentage discount (e.g. Burgers)
      const catSubtotal = items
        .filter(it => it.cat === coupon.target_category || (coupon.target_category === 'Burgers & Wraps' && (it.name.toLowerCase().includes('burger') || it.name.toLowerCase().includes('wrap'))))
        .reduce((sum, it) => sum + (it.price * it.qty), 0);
      
      if (catSubtotal <= 0) {
        return {
          valid: false,
          code: cleanCode,
          discountAmount: 0,
          description: '',
          error: `Geen artikelen uit categorie "${coupon.target_category}" in je bestelling.`
        };
      }
      discount = (catSubtotal * coupon.discount_val) / 100;
    } else {
      // General percentage
      discount = (subtotal * coupon.discount_val) / 100;
    }
  } else if (coupon.discount_type === 'fixed') {
    discount = Math.min(subtotal, coupon.discount_val);
  } else if (coupon.discount_type === 'free_item' || coupon.discount_type === 'product') {
    const targetName = (coupon.target_product_name || '').toLowerCase();
    const item = items.find(it => it.name.toLowerCase().includes(targetName));
    if (item) {
      discount = item.price;
    } else {
      discount = coupon.discount_val;
    }
  }

  return {
    valid: true,
    code: coupon.code,
    discountAmount: Number(discount.toFixed(2)),
    description: coupon.description || `🏷️ Korting: ${coupon.code}`,
    freeItemName: coupon.target_product_name
  };
}

/**
 * Gift Card Ordering & Generation
 */
export function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand1 = '';
  let rand2 = '';
  for (let i = 0; i < 4; i++) {
    rand1 += chars.charAt(Math.floor(Math.random() * chars.length));
    rand2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GC-${rand1}-${rand2}`;
}
