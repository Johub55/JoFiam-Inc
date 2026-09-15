export interface SauceOption {
  id: string;
  name: string;
  extraMenu: number;   // Extra kosten binnen een menu
  extraSingle: number; // Prijs als los cupje / bij losse friet
  emoji: string;
}

export interface DrinkOption {
  id: string;
  name: string;
  cat: 'fris' | 'shakes' | 'koffie' | 'energy_sap';
  category?: 'fris' | 'shakes' | 'koffie' | 'energy_sap';
  extra: number;
  emoji: string;
}

export interface SideOption {
  id: string;
  name: string;
  extra: number;
  emoji: string;
}

export const ALL_SAUCES: SauceOption[] = [
  { id: 'fritessaus', name: 'WerkFritessaus Romig', extraMenu: 0, extraSingle: 0.80, emoji: '🥫' },
  { id: 'zaanse_mayo', name: 'Echte Zaanse Mayonaise', extraMenu: 0, extraSingle: 0.80, emoji: '🥫' },
  { id: 'belgische_mayo', name: 'Belgische Mayonaise', extraMenu: 0, extraSingle: 0.80, emoji: '🥫' },
  { id: 'ketchup', name: 'Classic Heinz Ketchup', extraMenu: 0, extraSingle: 0.80, emoji: '🥫' },
  { id: 'werksaus', name: 'WerkSaus Signature Dip', extraMenu: 0.20, extraSingle: 0.90, emoji: '🥫' },
  { id: 'zoetzuur', name: 'Zoetzure Saus', extraMenu: 0, extraSingle: 0.80, emoji: '🥫' },
  { id: 'bbq', name: 'Smokey Barbecue Saus', extraMenu: 0, extraSingle: 0.80, emoji: '🥫' },
  { id: 'curry', name: 'Curry Gewürz Saus', extraMenu: 0, extraSingle: 0.80, emoji: '🥫' },
  { id: 'chili', name: 'WerkChili Sweet & Hot Saus', extraMenu: 0.15, extraSingle: 0.85, emoji: '🥫' },
  { id: 'honing_mosterd', name: 'Honing-Mosterd Dip', extraMenu: 0.15, extraSingle: 0.85, emoji: '🥫' },
  { id: 'truffel_mayo', name: 'Truffel Mayonaise Dip', extraMenu: 0.30, extraSingle: 0.95, emoji: '🥫' },
  { id: 'samurai', name: 'Samurai Pittige Saus', extraMenu: 0.15, extraSingle: 0.85, emoji: '🥫' },
  { id: 'knoflook', name: 'Knoflook-Kruiden Saus', extraMenu: 0.15, extraSingle: 0.85, emoji: '🥫' },
  { id: 'joppie', name: 'Joppiesaus Echte Smaak', extraMenu: 0.15, extraSingle: 0.85, emoji: '🥫' },
  { id: 'satesaus', name: 'Warme Satésaus', extraMenu: 0.50, extraSingle: 1.10, emoji: '🥜' }
];

export const ALL_MENU_DRINKS: DrinkOption[] = [
  // 🥤 Frisdranken
  { id: 'cola_zero', name: 'Coca-Cola Zero', cat: 'fris', category: 'fris', extra: 0, emoji: '🥤' },
  { id: 'cola_reg', name: 'Coca-Cola Regular', cat: 'fris', category: 'fris', extra: 0, emoji: '🥤' },
  { id: 'fanta_orange', name: 'Fanta Orange', cat: 'fris', category: 'fris', extra: 0, emoji: '🥤' },
  { id: 'fanta_cassis', name: 'Fanta Cassis', cat: 'fris', category: 'fris', extra: 0, emoji: '🍇' },
  { id: 'sprite_zero', name: 'Sprite Zero', cat: 'fris', category: 'fris', extra: 0, emoji: '🥤' },
  { id: 'fuze_sparkling', name: 'Fuze Tea Sparkling Black', cat: 'fris', category: 'fris', extra: 0, emoji: '🥤' },
  { id: 'fuze_green', name: 'Fuze Tea Green Tea', cat: 'fris', category: 'fris', extra: 0, emoji: '🥤' },
  { id: 'fuze_mango', name: 'Fuze Tea Mango Chamomile', cat: 'fris', category: 'fris', extra: 0, emoji: '🥤' },
  { id: 'fernandes_rood', name: 'Fernandes Rood Cherry', cat: 'fris', category: 'fris', extra: 0, emoji: '🍒' },
  { id: 'fernandes_groen', name: 'Fernandes Groen Punch', cat: 'fris', category: 'fris', extra: 0, emoji: '🍈' },
  { id: 'spa_blauw', name: 'Spa Blauw Plat', cat: 'fris', category: 'fris', extra: 0, emoji: '💧' },
  { id: 'spa_rood', name: 'Spa Rood Bruis', cat: 'fris', category: 'fris', extra: 0, emoji: '💧' },
  { id: 'chaud_rood', name: 'Chaudfontaine Rood', cat: 'fris', category: 'fris', extra: 0, emoji: '💧' },
  { id: 'chaud_blauw', name: 'Chaudfontaine Blauw', cat: 'fris', category: 'fris', extra: 0, emoji: '💧' },

  // 🍊 Sappen, Zuivel & Energy
  { id: 'jus_orange', name: 'Verse Jus d\'Orange', cat: 'energy_sap', category: 'energy_sap', extra: 0.60, emoji: '🍊' },
  { id: 'appelsap', name: 'Biologische Appelsap', cat: 'energy_sap', category: 'energy_sap', extra: 0.40, emoji: '🍏' },
  { id: 'chocomel', name: 'Chocomel Koud Romig', cat: 'energy_sap', category: 'energy_sap', extra: 0.40, emoji: '🍫' },
  { id: 'fristi', name: 'Fristi Rood Fruit', cat: 'energy_sap', category: 'energy_sap', extra: 0.40, emoji: '🍓' },
  { id: 'redbull', name: 'Red Bull Energy (250ml)', cat: 'energy_sap', category: 'energy_sap', extra: 1.50, emoji: '⚡' },
  { id: 'redbull_zero', name: 'Red Bull Sugarfree', cat: 'energy_sap', category: 'energy_sap', extra: 1.50, emoji: '⚡' },
  { id: 'monster', name: 'Monster Energy (500ml)', cat: 'energy_sap', category: 'energy_sap', extra: 1.50, emoji: '⚡' },

  // 🍓 WerkShakes & IJskoffie
  { id: 'shake_aardbei', name: 'WerkShake Aardbei', cat: 'shakes', category: 'shakes', extra: 0.80, emoji: '🍓' },
  { id: 'shake_choco', name: 'WerkShake Chocolade', cat: 'shakes', extra: 0.80, emoji: '🍫' },
  { id: 'shake_vanille', name: 'WerkShake Vanille', cat: 'shakes', extra: 0.80, emoji: '🥛' },
  { id: 'shake_banaan', name: 'WerkShake Banaan', cat: 'shakes', extra: 0.80, emoji: '🍌' },
  { id: 'shake_karamel', name: 'WerkShake Karamel Zeezout', cat: 'shakes', category: 'shakes', extra: 1.00, emoji: '🍮' },
  { id: 'shake_mango', name: 'WerkShake Mango Passie', cat: 'shakes', category: 'shakes', extra: 1.00, emoji: '🥭' },
  { id: 'shake_oreo', name: 'WerkShake Oreo Cookies', cat: 'shakes', category: 'shakes', extra: 1.20, emoji: '🍪' },
  { id: 'shake_bosbes', name: 'WerkShake Witte Choco & Bosbes', cat: 'shakes', category: 'shakes', extra: 1.20, emoji: '🫐' },
  { id: 'ijskoffie_karamel', name: 'IJskoffie Karamel Macchiato', cat: 'shakes', category: 'shakes', extra: 1.00, emoji: '🧋' },
  { id: 'ijskoffie_vanille', name: 'IJskoffie Vanille Frappé', cat: 'shakes', category: 'shakes', extra: 1.00, emoji: '🧋' },

  // ☕ Warme Dranken & Koffie
  { id: 'koffie_vers', name: 'Warme WerkKoffie Vers', cat: 'koffie', category: 'koffie', extra: 0.30, emoji: '☕' },
  { id: 'cappuccino', name: 'Cappuccino Romig', cat: 'koffie', category: 'koffie', extra: 0.50, emoji: '☕' },
  { id: 'latte', name: 'Latte Macchiato Lagen', cat: 'koffie', category: 'koffie', extra: 0.60, emoji: '☕' },
  { id: 'espresso', name: 'Espresso Krachtig', cat: 'koffie', category: 'koffie', extra: 0.20, emoji: '☕' },
  { id: 'chocomel_warm', name: 'Warme Chocomel Slagroom', cat: 'koffie', category: 'koffie', extra: 0.50, emoji: '🍫' },
  { id: 'muntthee', name: 'Verse Muntthee met Honing', cat: 'koffie', category: 'koffie', extra: 0.40, emoji: '🍵' },
  { id: 'thee_earlgrey', name: 'Earl Grey Bloemige Thee', cat: 'koffie', category: 'koffie', extra: 0.30, emoji: '🫖' }
];

export const ALL_MENU_SIDES: SideOption[] = [
  { id: 'friet_frans', name: 'Franse WerkFriet', extra: 0, emoji: '🍟' },
  { id: 'friet_twister', name: 'Twister WerkFriet (Krul)', extra: 0.60, emoji: '🍟' },
  { id: 'friet_zoet', name: 'Zoete Aardappel WerkFriet', extra: 0.90, emoji: '🍟' },
  { id: 'friet_boeren', name: 'Boerenfriet Mayo Bieslook', extra: 0.80, emoji: '🍟' },
  { id: 'friet_cheddar_bacon', name: 'Loaded Cheddar & Bacon Friet', extra: 1.50, emoji: '🍟' },
  { id: 'friet_pulled_chicken', name: 'Loaded Pulled Chicken BBQ Friet', extra: 1.60, emoji: '🍟' },
  { id: 'side_salad', name: 'Frisse Side Salad', extra: 0, emoji: '🥗' },
  { id: 'appelpartjes', name: 'Verse Appelpartjes', extra: 0, emoji: '🍏' }
];

export const KIDS_TOYS = [
  '🧸 Zachte WerkKnuffel',
  '🏎️ Raceauto Miniatuur',
  '🧩 Mini Puzzelspel',
  '📖 Doeboekje met Stiften'
];

export const KIDS_DRINKS = [
  '🍓 Fristi Rood Fruit',
  '🍫 Chocomel Romig',
  '🍏 Biologische Appelsap',
  '💧 Spa Blauw Mineraalwater',
  '🍊 Capri-Sun Orange'
];

export const KIDS_SIDES = [
  '🍟 Kleine Franse Frietjes',
  '🍏 Verse Appelpartjes'
];

export const KIDS_SAUCES = [
  '🥫 WerkFritessaus',
  '🥫 Echte Zaanse Mayonaise',
  '🥫 Heinz Ketchup',
  '🥫 Zoetzure Saus'
];
