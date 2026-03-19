
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==================== PROSPECTS ====================
CREATE TABLE public.prospects (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sex TEXT NOT NULL DEFAULT 'F',
  name TEXT NOT NULL,
  contact TEXT DEFAULT '',
  source TEXT DEFAULT '',
  statut TEXT DEFAULT 'CONTACT',
  date TEXT DEFAULT '',
  type TEXT DEFAULT '',
  presence TEXT DEFAULT '',
  heure TEXT DEFAULT '',
  objectif TEXT DEFAULT '',
  objection TEXT DEFAULT '',
  closing TEXT DEFAULT 'NON',
  offre TEXT DEFAULT '-',
  notes TEXT DEFAULT '',
  profile TEXT DEFAULT '',
  prix_reel NUMERIC DEFAULT 0,
  note_bilan NUMERIC DEFAULT 0,
  note_profil NUMERIC DEFAULT 0,
  bilan_validated BOOLEAN DEFAULT false,
  age INTEGER,
  sap_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prospects" ON public.prospects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON public.prospects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== ACTIV RESET CLIENTS ====================
CREATE TABLE public.activ_reset_clients (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  offre TEXT DEFAULT '',
  start_date TEXT DEFAULT '',
  current_phase INTEGER DEFAULT 0,
  phases JSONB NOT NULL DEFAULT '[]'::jsonb,
  objectif_atteint BOOLEAN,
  cycle INTEGER DEFAULT 1,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activ_reset_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ar clients" ON public.activ_reset_clients FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_ar_clients_updated_at BEFORE UPDATE ON public.activ_reset_clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== FINANCE ENTRIES ====================
CREATE TABLE public.finance_entries (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'micro',
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  offre TEXT,
  client_name TEXT,
  payment_mode TEXT,
  installment_group TEXT,
  installment_index INTEGER,
  installment_total INTEGER,
  sap_hours NUMERIC,
  cash_declaration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own finance entries" ON public.finance_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_finance_entries_updated_at BEFORE UPDATE ON public.finance_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== EXPENSES ====================
CREATE TABLE public.expenses (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own expenses" ON public.expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== OFFRES ====================
CREATE TABLE public.offres (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  price_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration JSONB,
  unit_price NUMERIC,
  min_quantity INTEGER,
  is_ala_carte BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.offres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own offres" ON public.offres FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_offres_updated_at BEFORE UPDATE ON public.offres FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== APP SETTINGS ====================
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  portage_enabled BOOLEAN DEFAULT false,
  versements_perso JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON public.app_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
