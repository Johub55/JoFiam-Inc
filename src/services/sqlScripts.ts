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
  req_id TEXT UNIQUE,
  order_no INT DEFAULT 0,
  order_type TEXT DEFAULT 'takeaway',
  identifier TEXT DEFAULT '',
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  cashier TEXT DEFAULT 'Kassa',
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by TEXT,
  received NUMERIC(10, 2) DEFAULT 0.00,
  change NUMERIC(10, 2) DEFAULT 0.00,
  rejected_reason TEXT,
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

-- 1.11 TV Display Presets & Custom Layouts
CREATE TABLE IF NOT EXISTS public.tv_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  clock_style TEXT NOT NULL DEFAULT 'pixel',
  view_mode TEXT NOT NULL DEFAULT 'split',
  auto_rotate BOOLEAN NOT NULL DEFAULT FALSE,
  widgets JSONB NOT NULL DEFAULT '{"prep": true, "ready": true, "menu": true, "ticker": true}'::jsonb,
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

-- 1.12 Systeembesturing & Stops (Bestelstop & Afhaalscherm sluiten)
CREATE TABLE IF NOT EXISTS public.pos_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  order_stop_active BOOLEAN NOT NULL DEFAULT FALSE,
  pickup_closed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Zorg dat er altijd een default rij bestaat voor instellingen
INSERT INTO public.pos_settings (id, order_stop_active, pickup_closed)
VALUES ('default', FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- 1.13 WerkLoyalty Klanten & WerkCoins Punten
CREATE TABLE IF NOT EXISTS public.loyalty_customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  coins NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
  total_spent NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  orders_count INT NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'Brons',
  joined_date TEXT DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

ALTER TABLE public.phone_messages ADD COLUMN IF NOT EXISTS contact_id TEXT;
ALTER TABLE public.phone_messages ADD COLUMN IF NOT EXISTS sender TEXT;
ALTER TABLE public.phone_messages ADD COLUMN IF NOT EXISTS text TEXT;
ALTER TABLE public.phone_messages ADD COLUMN IF NOT EXISTS timestamp TEXT;

ALTER TABLE public.cash_requests ADD COLUMN IF NOT EXISTS req_id TEXT;
ALTER TABLE public.cash_requests ADD COLUMN IF NOT EXISTS order_no INT DEFAULT 0;
ALTER TABLE public.cash_requests ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'takeaway';
ALTER TABLE public.cash_requests ADD COLUMN IF NOT EXISTS identifier TEXT DEFAULT '';
ALTER TABLE public.cash_requests ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.cash_requests ADD COLUMN IF NOT EXISTS cashier TEXT DEFAULT 'Kassa';
ALTER TABLE public.cash_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.cash_requests ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.cash_requests ADD COLUMN IF NOT EXISTS received NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.cash_requests ADD COLUMN IF NOT EXISTS change NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.cash_requests ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

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
  p_order_no INTEGER DEFAULT NULL,
  p_brand TEXT DEFAULT 'Werkdonalds'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_acc public.bank_accounts%ROWTYPE;
  v_new_balance NUMERIC;
  v_brand_name TEXT := 'Werkdonalds';
  v_to_merchant TEXT;
  v_tx_label TEXT;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bedrag moet groter dan 0 zijn');
  END IF;

  -- Bepaal merk (De Koekploeg vs Werkdonalds)
  IF p_brand ILIKE '%koek%' OR p_reference ILIKE '%koek%' OR p_cashier ILIKE '%koek%' THEN
    v_brand_name := 'De Koekploeg';
  ELSE
    v_brand_name := 'Werkdonalds';
  END IF;

  v_to_merchant := v_brand_name || ' Kassa';
  v_tx_label := v_brand_name || ' Bestelling #' || COALESCE(p_order_no::text, '?');

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

  -- Schrijf transactie weg naar gekoppelde WerkPay Bank rekening
  INSERT INTO public.bank_transactions (from_account, to_account, amount, label, note, order_no)
  VALUES (v_acc.username, v_to_merchant, p_amount, v_tx_label, p_reference, p_order_no);

  RETURN jsonb_build_object(
    'success', true,
    'username', v_acc.username,
    'account_holder', v_acc.account_holder,
    'charged_amount', p_amount,
    'balance_after', v_new_balance,
    'brand', v_brand_name,
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
  p_order_no INTEGER DEFAULT NULL,
  p_brand TEXT DEFAULT 'Werkdonalds'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_acc public.bank_accounts%ROWTYPE;
  v_clean_uid TEXT;
  v_new_balance NUMERIC;
  v_brand_name TEXT := 'Werkdonalds';
  v_to_merchant TEXT;
  v_tx_label TEXT;
BEGIN
  v_clean_uid := REPLACE(p_card_uid, ' ', '');

  IF p_brand ILIKE '%koek%' OR p_reference ILIKE '%koek%' OR p_cashier ILIKE '%koek%' THEN
    v_brand_name := 'De Koekploeg';
  ELSE
    v_brand_name := 'Werkdonalds';
  END IF;

  v_to_merchant := v_brand_name || ' Kassa';
  v_tx_label := 'Pasbetaling ' || v_brand_name || ' #' || COALESCE(p_order_no::text, '?');

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

  -- Schrijf transactie weg naar gekoppelde WerkPay Bank rekening
  INSERT INTO public.bank_transactions (from_account, to_account, amount, label, note, order_no)
  VALUES (v_acc.username, v_to_merchant, p_amount, v_tx_label, p_reference, p_order_no);

  RETURN jsonb_build_object(
    'success', true,
    'username', v_acc.username,
    'account_holder', v_acc.account_holder,
    'brand', v_brand_name,
    'balance_after', v_new_balance
  );
END;
$$;

-- 3.3 AUTOMATISCHE SQL TRIGGER VOOR REALTIME BESTELLINGEN NAAR WERKPAY BANK
-- Schrijft bij elke geplaatste Werkdonalds & De Koekploeg bestelling automatisch
-- de bijbehorende transactie naar de WerkPay bankrekening weg als deze nog niet bestaat.
CREATE OR REPLACE FUNCTION public.trg_fn_process_order_bank_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_brand_name TEXT := 'Werkdonalds';
  v_from_user TEXT;
  v_meta JSONB;
BEGIN
  IF NEW.payment_method = 'workpay' AND NEW.total > 0 THEN
    v_meta := COALESCE(NEW.payment_meta, '{}'::jsonb);
    v_from_user := COALESCE(v_meta->>'account', v_meta->>'username', NEW.cashier, 'Klant Kassa');

    -- Bepaal merk: De Koekploeg of Werkdonalds
    IF (
      NEW.identifier ILIKE '%koekploeg%' 
      OR NEW.notes ILIKE '%koekploeg%' 
      OR v_meta->>'brand' = 'koekploeg' 
      OR NEW.cashier ILIKE '%koek%'
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(NEW.items) item 
        WHERE (item->>'name') ILIKE '%stroopwafel%' 
           OR (item->>'name') ILIKE '%koek%' 
           OR (item->>'name') ILIKE '%bokkenpoot%'
      )
    ) THEN
      v_brand_name := 'De Koekploeg';
    ELSE
      v_brand_name := 'Werkdonalds';
    END IF;

    -- Voorkom dubbele transacties voor hetzelfde ordernummer
    IF NOT EXISTS (SELECT 1 FROM public.bank_transactions WHERE order_no = NEW.order_no) THEN
      INSERT INTO public.bank_transactions (
        from_account,
        to_account,
        amount,
        label,
        note,
        order_no
      ) VALUES (
        v_from_user,
        v_brand_name || ' Kassa',
        NEW.total,
        v_brand_name || ' Bestelling #' || NEW.order_no,
        'Realtime betaling via ' || COALESCE(v_meta->>'mode', 'WerkPay'),
        NEW.order_no
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_bank_payment ON public.orders;
CREATE TRIGGER trg_orders_bank_payment
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_process_order_bank_payment();

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
ALTER TABLE public.pos_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_customers ENABLE ROW LEVEL SECURITY;

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

  DROP POLICY IF EXISTS "Public full access pos_settings" ON public.pos_settings;
  CREATE POLICY "Public full access pos_settings" ON public.pos_settings FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public full access loyalty_customers" ON public.loyalty_customers;
  CREATE POLICY "Public full access loyalty_customers" ON public.loyalty_customers FOR ALL USING (true) WITH CHECK (true);
END $$;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- 5. REALTIME AANZETTEN (INCLUSIEF POS USERS, TELEFOON CHAT, PRODUCTEN & WERKPAY)
-- ------------------------------------------------------------------------------
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.bank_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.bank_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.pos_users REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.inventory REPLICA IDENTITY FULL;
ALTER TABLE public.cash_requests REPLICA IDENTITY FULL;
ALTER TABLE public.phone_messages REPLICA IDENTITY FULL;
ALTER TABLE public.coupons REPLICA IDENTITY FULL;
ALTER TABLE public.gift_cards REPLICA IDENTITY FULL;
ALTER TABLE public.pos_settings REPLICA IDENTITY FULL;
ALTER TABLE public.loyalty_customers REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_accounts; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_users; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.products; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.phone_messages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_requests; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_cards; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_settings; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_customers; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
`;

// 2. BASIS SCHEMA (Alleen kern tabellen)
export const BASIS_SUPABASE_SQL = `-- ==============================================================================
-- WERKDONALDS POS, DE KOEKPLOEG & WERKPAY BANK - BASIS DATABASE SCHEMA
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

CREATE TABLE IF NOT EXISTS public.pos_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  order_stop_active BOOLEAN NOT NULL DEFAULT FALSE,
  pickup_closed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.pos_settings (id, order_stop_active, pickup_closed)
VALUES ('default', FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.bank_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.pos_users REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.pos_settings REPLICA IDENTITY FULL;

CREATE POLICY "Public access bank_accounts" ON public.bank_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access bank_transactions" ON public.bank_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access pos_users" ON public.pos_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access pos_settings" ON public.pos_settings FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_accounts; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_users; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.products; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_settings; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
`;

// 3. VOLLEDIGE SUPABASE SQL (Schema + Initial Seed Data met ON CONFLICT DO NOTHING)
export const UNIFIED_SUPABASE_SQL = `${SCHEMA_ONLY_SUPABASE_SQL}

-- 6. DEMO DATA & INITIAL ACCOUNTS
-- ------------------------------------------------------------------------------
INSERT INTO public.bank_accounts (username, password, account_holder, card_uid, pin_code, balance, is_admin)
VALUES 
  ('joas', 'admin123', 'Joas Thorig', '4129 8831 5504 9012', '0000', 999999.00, TRUE),
  ('kassa', '1234', 'Werkdonalds Kassa 1', '9900 1100 2200 3300', '1234', 10000.00, TRUE)
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.pos_users (name, username, password, perms, is_admin)
VALUES 
  ('Joas Thorig', 'joas', 'admin123', '["pos","kitchen","pickup","voorraad","manager","medewerkers","producten","coupons_giftcards","cash_pay"]'::jsonb, TRUE),
  ('Manager Admin', 'admin', 'admin123', '["pos","kitchen","pickup","voorraad","manager","medewerkers","producten","coupons_giftcards","cash_pay"]'::jsonb, TRUE),
  ('Kassa Medewerker 1', 'kassa1', '1234', '["pos","cash_pay"]'::jsonb, FALSE),
  ('Keuken Chef', 'keuken1', '1234', '["kitchen"]'::jsonb, FALSE)
ON CONFLICT (username) DO NOTHING;

-- Werkdonalds & De Koekploeg Producten
INSERT INTO public.products (id, name, price, sale_price, on_sale, cat, emoji, in_stock) VALUES
  -- Werkdonalds
  (1, 'WerkDonalds Classic Burger', 6.25, 3.95, FALSE, 'Burgers & Wraps', '🍔', TRUE),
  (2, 'Double WerkBurger', 8.25, 0.00, FALSE, 'Burgers & Wraps', '🍔', TRUE),
  (3, 'Triple WerkBurger Extra Beef', 9.45, 0.00, FALSE, 'Burgers & Wraps', '🍔', TRUE),
  (4, 'Big Werk Mac', 5.85, 3.95, FALSE, 'Burgers & Wraps', '🍔', TRUE),
  (5, 'WerkChicken', 5.95, 3.50, FALSE, 'Burgers & Wraps', '🍗', TRUE),
  (6, '9 WerkNuggets', 6.95, 0.00, FALSE, 'Chicken & Snacks', '🍗', TRUE),
  (7, 'Medium Franse WerkFriet', 3.65, 0.00, FALSE, 'Friet & Sides', '🍟', TRUE),
  (8, 'Coca-Cola Zero', 3.35, 0.00, FALSE, 'Koude Dranken & WerkShakes', '🥤', TRUE),
  -- De Koekploeg (Stroopwafels & Verse Bakkerij)
  (201, 'Verse Warme Goudse Stroopwafel (Original)', 2.50, 0.00, FALSE, 'Stroopwafels & Specials', '🧇', TRUE),
  (202, 'Mega Stroopwafel XL Karamel-Zeezout', 3.75, 2.95, TRUE, 'Stroopwafels & Specials', '🧇', TRUE),
  (203, 'Stroopwafel met Belgische Melkchocolade', 3.45, 0.00, FALSE, 'Stroopwafels & Specials', '🍫', TRUE),
  (206, 'Verse Stroopwafel Kruimelzak (Warm & Krokant)', 2.00, 0.00, FALSE, 'Stroopwafels & Specials', '🧇', TRUE),
  (210, 'Ambachtelijke Gevulde Koek (100% Amandelspijs)', 2.25, 0.00, FALSE, 'Luxe Hollandse Koeken', '🥮', TRUE),
  (212, 'Klassieke Roze Glazuurkoek', 1.95, 0.00, FALSE, 'Luxe Hollandse Koeken', '🌸', TRUE),
  (213, 'Goudbruine Bakkers Kano met Spijs', 2.10, 0.00, FALSE, 'Luxe Hollandse Koeken', '🛶', TRUE),
  (215, 'Oma''s Warme Appeltaart Punt met Kaneel', 3.95, 0.00, FALSE, 'Luxe Hollandse Koeken', '🥧', TRUE),
  (220, 'Chocolade Bokkenpootjes (Portie 4st)', 2.95, 0.00, FALSE, 'Koek Bites & Chocolade', '🐐', TRUE),
  (221, 'Warme Chocolate Chip Cookie', 2.50, 0.00, FALSE, 'Koek Bites & Chocolade', '🍪', TRUE),
  (226, 'Koekploeg Koffie Compleet (+ Mini Stroopwafel)', 3.25, 0.00, FALSE, 'Warme Dranken & Koffie', '☕', TRUE),
  (232, 'Stroopwafel Softijs Sundae met Karamel', 3.50, 0.00, FALSE, 'IJs & Specials', '🍦', TRUE),
  (238, 'Koekploeg Bewaarblik (10 Verse Koeken Assorti)', 14.95, 12.50, TRUE, 'Voordeel & Cadeaus', '🎁', TRUE)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  cat = EXCLUDED.cat,
  emoji = EXCLUDED.emoji;
`;
