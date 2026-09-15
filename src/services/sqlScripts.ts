/**
 * Complete Supabase SQL scripts for Werkdonalds POS, WerkPay Bank & Digital Phone.
 * Can be executed directly in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql).
 */

// 1. SCHEMA ONLY (Zonder product/account inserts - Behoudt jouw eigen producten & prijzen!)
export const SCHEMA_ONLY_SUPABASE_SQL = `-- ==============================================================================
-- WERKDONALDS POS, WERKPAY BANK & TELEFOON - SCHEMA ONLY (GEEN OVERWRITE / GEEN RESET)
-- Geschikt voor al bestaande Supabase projecten.
-- Dit script maakt alle tabellen, RLS, Realtime en RPC-functies aan ZONDER bestaande producten of accounts te overschrijven.
-- Voer dit uit in de Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. TABELLEN AANMAKEN
-- ------------------------------------------------------------------------------

-- 1.1 WerkPay Bankrekeningen
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  card_uid TEXT UNIQUE NOT NULL,
  pin_code TEXT NOT NULL DEFAULT '1234',
  balance NUMERIC(12, 2) NOT NULL DEFAULT 25.00,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 WerkPay Bank Transacties
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id BIGSERIAL PRIMARY KEY,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  label TEXT NOT NULL,
  note TEXT,
  order_no INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.3 Werkdonalds Bestellingen
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGSERIAL PRIMARY KEY,
  order_no INTEGER NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  order_type TEXT NOT NULL DEFAULT 'dine_in',
  identifier TEXT,
  notes TEXT,
  payment_method TEXT NOT NULL DEFAULT 'workpay',
  payment_meta JSONB DEFAULT '{}'::jsonb,
  cashier TEXT DEFAULT 'Kassa',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.4 Werkdonalds Menukaart & Producten
CREATE TABLE IF NOT EXISTS public.products (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  sale_price NUMERIC(10, 2) DEFAULT 0.00,
  on_sale BOOLEAN DEFAULT FALSE,
  cat TEXT NOT NULL DEFAULT 'Burgers & Wraps',
  emoji TEXT DEFAULT '🍔',
  in_stock BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.5 Voorraad & Magazijn
CREATE TABLE IF NOT EXISTS public.inventory (
  id BIGSERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  stock_qty INTEGER NOT NULL DEFAULT 100,
  min_qty INTEGER NOT NULL DEFAULT 20,
  unit TEXT NOT NULL DEFAULT 'stuks',
  cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.50,
  supplier_name TEXT DEFAULT 'HAVI Logistics',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.6 Kortingscoupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_val NUMERIC(10, 2) NOT NULL,
  min_subtotal NUMERIC(10, 2) DEFAULT 0.00,
  target_product_name TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.7 Cadeaubonnen
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  initial_balance NUMERIC(10, 2) NOT NULL,
  current_balance NUMERIC(10, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.8 POS Medewerkers & Rechten
CREATE TABLE IF NOT EXISTS public.pos_users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  perms JSONB NOT NULL DEFAULT '["pos","kitchen","pickup"]'::jsonb,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  session_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.9 Contante Verzoeken
CREATE TABLE IF NOT EXISTS public.cash_requests (
  id BIGSERIAL PRIMARY KEY,
  amount NUMERIC(10, 2) NOT NULL,
  cashier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.10 POS Audit Logs
CREATE TABLE IF NOT EXISTS public.pos_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  user_name TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.11 Digitale Telefoon SMS Berichten (Voor WerkMobile Telefoon Chat & Tikkies)
CREATE TABLE IF NOT EXISTS public.phone_messages (
  id BIGSERIAL PRIMARY KEY,
  contact_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. INDEXEN & KOLOM MIGRATIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS on_sale BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cat TEXT NOT NULL DEFAULT 'Burgers & Wraps';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '🍔';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT TRUE;

ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS pin_code TEXT NOT NULL DEFAULT '1234';
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS identifier TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_meta JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cashier TEXT DEFAULT 'Kassa';

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_uid ON public.bank_accounts(card_uid);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_username ON public.bank_accounts(username);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_created ON public.bank_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phone_messages_contact ON public.phone_messages(contact_id);

-- 3. STORED PROCEDURES / RPC FUNCTIES
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.werkpay_check_login(p_username TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_acc public.bank_accounts%ROWTYPE;
BEGIN
  SELECT * INTO v_acc FROM public.bank_accounts 
  WHERE LOWER(username) = LOWER(p_username) AND (password = p_password OR pin_code = p_password)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ongeldige inloggegevens');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_acc.id,
    'username', v_acc.username,
    'account_holder', v_acc.account_holder,
    'card_uid', v_acc.card_uid,
    'balance', v_acc.balance,
    'is_admin', v_acc.is_admin
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.werkpay_charge_by_login(
  p_username TEXT,
  p_password TEXT,
  p_amount NUMERIC,
  p_reference TEXT,
  p_cashier TEXT DEFAULT 'Kassa',
  p_order_no INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_acc public.bank_accounts%ROWTYPE;
  v_new_balance NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bedrag moet groter dan 0 zijn');
  END IF;

  SELECT * INTO v_acc FROM public.bank_accounts 
  WHERE LOWER(username) = LOWER(p_username) AND (password = p_password OR pin_code = p_password)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Onjuiste gebruikersnaam of wachtwoord');
  END IF;

  IF NOT v_acc.is_admin AND v_acc.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Onvoldoende WerkPay saldo (Huidig: €' || v_acc.balance || ')');
  END IF;

  IF NOT v_acc.is_admin THEN
    v_new_balance := v_acc.balance - p_amount;
    UPDATE public.bank_accounts SET balance = v_new_balance WHERE id = v_acc.id;
  ELSE
    v_new_balance := v_acc.balance;
  END IF;

  INSERT INTO public.bank_transactions (from_account, to_account, amount, label, note, order_no)
  VALUES (v_acc.username, 'Werkdonalds Kassa', p_amount, 'Werkdonalds Bestelling #' || COALESCE(p_order_no::text, '?'), p_reference, p_order_no);

  RETURN jsonb_build_object(
    'success', true,
    'username', v_acc.username,
    'account_holder', v_acc.account_holder,
    'charged_amount', p_amount,
    'balance_after', v_new_balance,
    'reference', p_reference
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.werkpay_charge_by_card(
  p_card_uid TEXT,
  p_pin TEXT,
  p_amount NUMERIC,
  p_reference TEXT,
  p_cashier TEXT DEFAULT 'Kassa',
  p_order_no INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_acc public.bank_accounts%ROWTYPE;
  v_clean_uid TEXT;
  v_new_balance NUMERIC;
BEGIN
  v_clean_uid := REPLACE(p_card_uid, ' ', '');

  SELECT * INTO v_acc FROM public.bank_accounts 
  WHERE REPLACE(card_uid, ' ', '') = v_clean_uid AND (pin_code = p_pin OR password = p_pin)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ongeldige kaart-UID of pincode');
  END IF;

  IF NOT v_acc.is_admin AND v_acc.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Onvoldoende saldo op deze WerkPay pas');
  END IF;

  IF NOT v_acc.is_admin THEN
    v_new_balance := v_acc.balance - p_amount;
    UPDATE public.bank_accounts SET balance = v_new_balance WHERE id = v_acc.id;
  ELSE
    v_new_balance := v_acc.balance;
  END IF;

  INSERT INTO public.bank_transactions (from_account, to_account, amount, label, note, order_no)
  VALUES (v_acc.username, 'Werkdonalds Kassa', p_amount, 'Pasbetaling Werkdonalds #' || COALESCE(p_order_no::text, '?'), p_reference, p_order_no);

  RETURN jsonb_build_object(
    'success', true,
    'username', v_acc.username,
    'account_holder', v_acc.account_holder,
    'balance_after', v_new_balance
  );
END;
$$;

-- 4. BEVEILIGING (ROW LEVEL SECURITY & RECHTEN)
-- ------------------------------------------------------------------------------
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Public full access bank_accounts" ON public.bank_accounts;
  CREATE POLICY "Public full access bank_accounts" ON public.bank_accounts FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public full access bank_transactions" ON public.bank_transactions;
  CREATE POLICY "Public full access bank_transactions" ON public.bank_transactions FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public full access orders" ON public.orders;
  CREATE POLICY "Public full access orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public full access products" ON public.products;
  CREATE POLICY "Public full access products" ON public.products FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public full access inventory" ON public.inventory;
  CREATE POLICY "Public full access inventory" ON public.inventory FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public full access coupons" ON public.coupons;
  CREATE POLICY "Public full access coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public full access gift_cards" ON public.gift_cards;
  CREATE POLICY "Public full access gift_cards" ON public.gift_cards FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public full access pos_users" ON public.pos_users;
  CREATE POLICY "Public full access pos_users" ON public.pos_users FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public full access cash_requests" ON public.cash_requests;
  CREATE POLICY "Public full access cash_requests" ON public.cash_requests FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public full access pos_audit_logs" ON public.pos_audit_logs;
  CREATE POLICY "Public full access pos_audit_logs" ON public.pos_audit_logs FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public full access phone_messages" ON public.phone_messages;
  CREATE POLICY "Public full access phone_messages" ON public.phone_messages FOR ALL USING (true) WITH CHECK (true);
END $$;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- 5. REALTIME AANZETTEN (INCLUSIEF TELEFOON CHAT & WERKPAY)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_accounts; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.products; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.phone_messages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_requests; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
`;

// 2. BASIS SCHEMA (Alleen 5 kern tabellen)
export const BASIS_SUPABASE_SQL = `-- ==============================================================================
-- WERKDONALDS POS & WERKPAY BANK - BASIS SUPABASE DATABASE SCHEMA
-- Bevat uitsluitend de 5 kern-tabellen: bank_accounts, bank_transactions, orders, products, pos_users.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  card_uid TEXT UNIQUE NOT NULL,
  pin_code TEXT NOT NULL DEFAULT '1234',
  balance NUMERIC(12, 2) NOT NULL DEFAULT 25.00,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id BIGSERIAL PRIMARY KEY,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  label TEXT NOT NULL,
  note TEXT,
  order_no INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id BIGSERIAL PRIMARY KEY,
  order_no INTEGER NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  order_type TEXT NOT NULL DEFAULT 'dine_in',
  identifier TEXT,
  notes TEXT,
  payment_method TEXT NOT NULL DEFAULT 'workpay',
  payment_meta JSONB DEFAULT '{}'::jsonb,
  cashier TEXT DEFAULT 'Kassa',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  sale_price NUMERIC(10, 2) DEFAULT 0.00,
  on_sale BOOLEAN DEFAULT FALSE,
  cat TEXT NOT NULL DEFAULT 'Burgers & Wraps',
  emoji TEXT DEFAULT '🍔',
  in_stock BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pos_users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  perms JSONB NOT NULL DEFAULT '["pos","kitchen","pickup"]'::jsonb,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  session_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access bank_accounts" ON public.bank_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access bank_transactions" ON public.bank_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access pos_users" ON public.pos_users FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
`;

// 3. VOLLEDIGE SUPABASE SQL (Schema + Initial Seed Data met ON CONFLICT DO NOTHING)
export const UNIFIED_SUPABASE_SQL = `${SCHEMA_ONLY_SUPABASE_SQL}

-- 6. DEMO DATA & INITIAL ACCOUNTS
-- ------------------------------------------------------------------------------
INSERT INTO public.bank_accounts (username, password, account_holder, card_uid, pin_code, balance, is_admin)
VALUES 
  ('joas', 'admin123', 'Joas Thorig', '4129 8831 5504 9012', '0000', 999999.00, TRUE),
  ('test', '1234', 'Test Gebruiker', '1002 3004 5006 7008', '1234', 150.00, FALSE),
  ('kassa', '1234', 'Werkdonalds Kassa 1', '9900 1100 2200 3300', '1234', 10000.00, TRUE)
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.pos_users (name, username, password, perms, is_admin)
VALUES 
  ('Manager Admin', 'admin', 'admin123', '["pos","kitchen","pickup","voorraad","manager","medewerkers","producten","coupons_giftcards","cash_pay"]'::jsonb, TRUE),
  ('Kassa Medewerker 1', 'kassa1', '1234', '["pos","cash_pay"]'::jsonb, FALSE),
  ('Keuken Chef', 'keuken1', '1234', '["kitchen"]'::jsonb, FALSE)
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.products (id, name, price, sale_price, on_sale, cat, emoji, in_stock) VALUES
  (1, 'WerkPounder Cheese', 4.95, 0.00, FALSE, 'Burgers & Wraps', '🍔', TRUE),
  (2, 'Double WerkPounder Cheese', 6.95, 0.00, FALSE, 'Burgers & Wraps', '🍔', TRUE),
  (3, 'Triple WerkPounder Cheese', 8.45, 0.00, FALSE, 'Burgers & Wraps', '🍔', TRUE),
  (4, 'Big Werk Mac', 5.85, 3.95, FALSE, 'Burgers & Wraps', '🍔', TRUE),
  (5, 'Double Big Werk Mac', 7.50, 0.00, FALSE, 'Burgers & Wraps', '🍔', TRUE),
  (6, 'Mega Werk Mac XL', 8.95, 0.00, FALSE, 'Burgers & Wraps', '🍔', TRUE),
  (7, 'WerkPounder Royal', 6.25, 0.00, FALSE, 'Burgers & Wraps', '🍔', TRUE),
  (8, 'Double WerkPounder Royal', 7.95, 0.00, FALSE, 'Burgers & Wraps', '🍔', TRUE),
  (9, 'BBQ WerkRib Burger', 6.75, 0.00, FALSE, 'Burgers & Wraps', '🥩', TRUE),
  (10, 'WerkChicken', 5.95, 3.50, FALSE, 'Burgers & Wraps', '🍗', TRUE)
ON CONFLICT (id) DO NOTHING;
`;
