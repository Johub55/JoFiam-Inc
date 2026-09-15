-- ==============================================================================
-- WERKDONALDS POS & WERKPAY BANK - SUPABASE SCHEMA ONLY (ZONDER RESET / GEEN OVERWRITE)
-- Geschikt voor al bestaande Supabase projecten waarin jouw eigen menukaart & accounts BEWAARD moeten blijven.
-- Dit script maakt uitsluitend de benodigde tabellen en functies aan, SONDER bestaande producten of rekeningen te overschrijven.
-- Voer dit bestand uit in de Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. TABELLEN AANMAKEN (IF NOT EXISTS - BEWAART EERDER INGEVOERDE GEGEVENS)
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

-- 1.11 Digitale Telefoon SMS Berichten
CREATE TABLE IF NOT EXISTS public.phone_messages (
  id BIGSERIAL PRIMARY KEY,
  contact_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. VEILIGHEID & RLS POLICIES
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

DROP POLICY IF EXISTS "Public access bank_accounts" ON public.bank_accounts;
CREATE POLICY "Public access bank_accounts" ON public.bank_accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access bank_transactions" ON public.bank_transactions;
CREATE POLICY "Public access bank_transactions" ON public.bank_transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access orders" ON public.orders;
CREATE POLICY "Public access orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access products" ON public.products;
CREATE POLICY "Public access products" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access inventory" ON public.inventory;
CREATE POLICY "Public access inventory" ON public.inventory FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access coupons" ON public.coupons;
CREATE POLICY "Public access coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access gift_cards" ON public.gift_cards;
CREATE POLICY "Public access gift_cards" ON public.gift_cards FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access pos_users" ON public.pos_users;
CREATE POLICY "Public access pos_users" ON public.pos_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access cash_requests" ON public.cash_requests;
CREATE POLICY "Public access cash_requests" ON public.cash_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access pos_audit_logs" ON public.pos_audit_logs;
CREATE POLICY "Public access pos_audit_logs" ON public.pos_audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access phone_messages" ON public.phone_messages;
CREATE POLICY "Public access phone_messages" ON public.phone_messages FOR ALL USING (true) WITH CHECK (true);

-- 3. REALTIME REPLICATION
-- ------------------------------------------------------------------------------
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.bank_accounts, 
    public.bank_transactions, 
    public.orders, 
    public.products, 
    public.inventory,
    public.coupons,
    public.gift_cards,
    public.pos_users,
    public.cash_requests,
    public.pos_audit_logs,
    public.phone_messages;
COMMIT;

-- 4. STORED PROCEDURES (GEEN PRODUCT INSERTS EN GEEN ACCOUNT RESETS)
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
