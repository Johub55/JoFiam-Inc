-- ==============================================================================
-- WERKDONALDS POS & WERKPAY BANK - BASIS SUPABASE DATABASE SCHEMA (ZONDER EXTRA TABELLEN)
-- Geschikt voor snelle / minimale installatie in Supabase / PostgreSQL.
-- Bevat uitsluitend de kern-tabellen: bank_accounts, bank_transactions, orders, products, pos_users.
-- Voer dit bestand uit in de Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. KERN TABELLEN AANMAKEN
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

-- 1.5 POS Medewerkers
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

-- 2. VEILIGHEID & RLS POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access bank_accounts" ON public.bank_accounts;
CREATE POLICY "Public access bank_accounts" ON public.bank_accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access bank_transactions" ON public.bank_transactions;
CREATE POLICY "Public access bank_transactions" ON public.bank_transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access orders" ON public.orders;
CREATE POLICY "Public access orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access products" ON public.products;
CREATE POLICY "Public access products" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access pos_users" ON public.pos_users;
CREATE POLICY "Public access pos_users" ON public.pos_users FOR ALL USING (true) WITH CHECK (true);

-- 3. SUPABASE REALTIME REPLICATION
-- ------------------------------------------------------------------------------
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.bank_accounts, 
    public.bank_transactions, 
    public.orders, 
    public.products, 
    public.pos_users;
COMMIT;

-- 4. SEED DATA (STANDAARD ACCOUNTS & PRODUCTEN)
-- ------------------------------------------------------------------------------
INSERT INTO public.bank_accounts (username, password, account_holder, card_uid, pin_code, balance, is_admin)
VALUES 
  ('joas', '1234', 'Joas van der Burg', 'CARD-8812-4401', '1234', 250.00, true),
  ('test', '1234', 'Test Gebruiker', 'CARD-1002-3004', '1234', 50.00, false),
  ('kassa', '1234', 'Werkdonalds Kassa 1', 'CARD-9900-1100', '1234', 1000.00, true)
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.pos_users (name, username, password, perms, is_admin)
VALUES 
  ('Manager Admin', 'admin', 'admin123', '["pos","kitchen","pickup","manager","settings"]'::jsonb, true),
  ('Kassa Medewerker', 'kassa1', '1234', '["pos"]'::jsonb, false),
  ('Keuken Chef', 'keuken1', '1234', '["kitchen"]'::jsonb, false)
ON CONFLICT (username) DO NOTHING;
