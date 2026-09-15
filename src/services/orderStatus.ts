import { OrderStatus } from '../types';

export interface StatusMeta {
  id: OrderStatus;
  label: string;
  shortLabel: string;
  emoji: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  buttonBg: string;
  dotColor: string;
  description: string;
}

export const KITCHEN_STATUS_LIST: StatusMeta[] = [
  {
    id: 'wachten',
    label: 'Wachten op bereiding',
    shortLabel: 'Wachten',
    emoji: '⏳',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-300',
    buttonBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30',
    dotColor: 'bg-amber-400',
    description: 'Nieuwe bestelling, wacht tot de chef begint'
  },
  {
    id: 'oven_grill',
    label: 'In de oven / grill',
    shortLabel: 'Oven / Grill',
    emoji: '🥩',
    badgeBg: 'bg-orange-500/15',
    badgeBorder: 'border-orange-500/30',
    badgeText: 'text-orange-300',
    buttonBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40 hover:bg-orange-500/30',
    dotColor: 'bg-orange-400',
    description: 'Patties op de grill en broodjes in de oven geroosterd'
  },
  {
    id: 'frituren',
    label: 'Aan het frituren',
    shortLabel: 'Frituren',
    emoji: '🍟',
    badgeBg: 'bg-yellow-500/15',
    badgeBorder: 'border-yellow-500/30',
    badgeText: 'text-yellow-300',
    buttonBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 hover:bg-yellow-500/30',
    dotColor: 'bg-yellow-400',
    description: 'Frietjes, nuggets en crispy snacks in de friteuse'
  },
  {
    id: 'inpakken',
    label: 'Inpakken / Trayen',
    shortLabel: 'Inpakken',
    emoji: '📦',
    badgeBg: 'bg-blue-500/15',
    badgeBorder: 'border-blue-500/30',
    badgeText: 'text-blue-300',
    buttonBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30',
    dotColor: 'bg-blue-400',
    description: 'Bestelling wordt ingepakt in zak of op dienblad gezet'
  },
  {
    id: 'klaar',
    label: 'Klaar voor afhaal',
    shortLabel: 'Klaar!',
    emoji: '🔔',
    badgeBg: 'bg-emerald-500/20',
    badgeBorder: 'border-emerald-500/40',
    badgeText: 'text-emerald-300',
    buttonBg: 'bg-emerald-500 text-slate-950 font-black hover:bg-emerald-400 border-emerald-400',
    dotColor: 'bg-emerald-400',
    description: 'Bestelling staat gereed bij de afhaalbalie, omroep klinkt'
  },
  {
    id: 'afgehaald',
    label: 'Afgehaald / Meegegeven',
    shortLabel: 'Afgehaald',
    emoji: '🤝',
    badgeBg: 'bg-slate-800/80',
    badgeBorder: 'border-slate-700',
    badgeText: 'text-slate-400',
    buttonBg: 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700',
    dotColor: 'bg-slate-500',
    description: 'Klant heeft de bestelling meegenomen of ontvangen'
  }
];

export function getStatusMeta(status: OrderStatus): StatusMeta {
  if (status === 'new') return KITCHEN_STATUS_LIST[0]; // wachten
  if (status === 'done') return KITCHEN_STATUS_LIST[4]; // klaar
  if (status === 'archived') return KITCHEN_STATUS_LIST[5]; // afgehaald
  const found = KITCHEN_STATUS_LIST.find(s => s.id === status);
  if (found) return found;
  return {
    id: status,
    label: status,
    shortLabel: status,
    emoji: '📋',
    badgeBg: 'bg-slate-800',
    badgeBorder: 'border-slate-700',
    badgeText: 'text-slate-300',
    buttonBg: 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700',
    dotColor: 'bg-slate-400',
    description: 'Status: ' + status
  };
}

export function isOrderInProgress(status: OrderStatus): boolean {
  return status === 'new' || status === 'wachten' || status === 'oven_grill' || status === 'frituren' || status === 'inpakken';
}

export function isOrderReady(status: OrderStatus): boolean {
  return status === 'done' || status === 'klaar';
}

export function isOrderFinished(status: OrderStatus): boolean {
  return status === 'afgehaald' || status === 'archived' || status === 'cancelled' || status === 'geannuleerd';
}

/**
 * Calculates number of free included sauces based on product size and category.
 * User requirement: "je krijgt drie gratis saus te zien"
 */
export function getIncludedSauceCount(productName: string, category?: string): number {
  if (category && category !== 'Chicken & Snacks') {
    // Menu's get 1 free sauce for fries
    return 1;
  }
  const name = (productName || '').toLowerCase();

  // 40 nuggets / party bucket gets 6 free sauces
  if (name.includes('40') || name.includes('party bucket')) {
    return 6;
  }
  // 20 nuggets / deelbox / sharebox
  if (name.includes('family') || name.includes('sharebox')) {
    return 4;
  }

  // Standard chicken & snacks: always 3 free sauces as requested!
  return 3;
}

export interface FormattedNotePart {
  type: 'sauce' | 'omission' | 'addition' | 'drink' | 'general';
  text: string;
}

/**
 * Splits and categorizes itemNote parts for high-visibility display in the kitchen
 */
export function parseKitchenNotes(note?: string): FormattedNotePart[] {
  if (!note) return [];
  // Split by commas or bullet points
  const rawParts = note.split(/[,•\n]+/).map(p => p.trim()).filter(Boolean);

  return rawParts.map(raw => {
    const lower = raw.toLowerCase();

    // Omissions (Zonder / Geen)
    if (lower.startsWith('zonder') || lower.startsWith('geen') || lower.includes('zonder ') || lower.includes('geen ')) {
      return { type: 'omission', text: raw };
    }

    // Sauces & Dips
    if (
      lower.includes('saus') || 
      lower.includes('dip') || 
      lower.includes('mayo') || 
      lower.includes('ketchup') || 
      lower.includes('curry') || 
      lower.includes('chili') || 
      lower.includes('bbq') || 
      lower.includes('truffel') || 
      lower.includes('saté') || 
      lower.includes('samurai') || 
      lower.includes('knoflook') || 
      lower.includes('joppie')
    ) {
      return { type: 'sauce', text: raw };
    }

    // Additions (Extra / Dubbel / +)
    if (lower.startsWith('extra') || lower.startsWith('dubbel') || lower.includes('+') || lower.includes('toevoegen')) {
      return { type: 'addition', text: raw };
    }

    // Drink details (drank, ijs, rietje)
    if (lower.includes('menu') || lower.includes('drank') || lower.includes('ijs') || lower.includes('rietje') || lower.includes('shake') || lower.includes('siroop')) {
      return { type: 'drink', text: raw };
    }

    return { type: 'general', text: raw };
  });
}
