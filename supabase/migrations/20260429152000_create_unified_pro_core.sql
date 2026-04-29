-- Unified PRO core (phase 1)
-- Source-of-truth tables shared across CRM / Business / Finances PRO.

-- Keep using existing trigger helper if already present.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==================== CLIENTS PRO ====================
CREATE TABLE IF NOT EXISTS public.clients_pro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_ref TEXT, -- stable external key (optional during transition)
  name TEXT NOT NULL,
  contact TEXT DEFAULT '',
  sex TEXT,
  age INTEGER,
  source TEXT DEFAULT '',
  statut TEXT DEFAULT 'CLIENT',
  objectif TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  profile TEXT DEFAULT '',
  sap_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS clients_pro_user_external_ref_uniq
  ON public.clients_pro(user_id, external_ref)
  WHERE external_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_pro_user_name_contact_uniq
  ON public.clients_pro(user_id, lower(name), COALESCE(contact, ''));

CREATE INDEX IF NOT EXISTS clients_pro_user_idx ON public.clients_pro(user_id);
CREATE INDEX IF NOT EXISTS clients_pro_name_idx ON public.clients_pro(lower(name));

DROP TRIGGER IF EXISTS update_clients_pro_updated_at ON public.clients_pro;
CREATE TRIGGER update_clients_pro_updated_at
BEFORE UPDATE ON public.clients_pro
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== OFFRES PRO ====================
CREATE TABLE IF NOT EXISTS public.offres_pro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_ref TEXT, -- optional migration key
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  offer_type TEXT, -- session|programme|product (free text for compatibility)
  duration JSONB,
  unit_price NUMERIC,
  min_quantity INTEGER,
  max_installments INTEGER,
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  theme TEXT,
  tva_enabled BOOLEAN DEFAULT false,
  portage_eligible BOOLEAN DEFAULT false,
  is_draft BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS offres_pro_user_external_ref_uniq
  ON public.offres_pro(user_id, external_ref)
  WHERE external_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS offres_pro_user_name_uniq
  ON public.offres_pro(user_id, lower(name));

CREATE INDEX IF NOT EXISTS offres_pro_user_idx ON public.offres_pro(user_id);
CREATE INDEX IF NOT EXISTS offres_pro_active_idx ON public.offres_pro(user_id, active);

DROP TRIGGER IF EXISTS update_offres_pro_updated_at ON public.offres_pro;
CREATE TRIGGER update_offres_pro_updated_at
BEFORE UPDATE ON public.offres_pro
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== OPERATIONS PRO ====================
CREATE TABLE IF NOT EXISTS public.operations_pro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_ref TEXT, -- id from producer app if any
  operation_date DATE,
  month_key TEXT,
  family TEXT NOT NULL CHECK (family IN ('charge_fixe', 'charge_variable', 'revenu')),
  label TEXT NOT NULL,
  category TEXT DEFAULT '',
  subcategory TEXT,
  forecast NUMERIC NOT NULL DEFAULT 0,
  actual NUMERIC NOT NULL DEFAULT 0,
  source_type TEXT CHECK (source_type IN ('bank', 'cash') OR source_type IS NULL),
  client_pro_id UUID REFERENCES public.clients_pro(id) ON DELETE SET NULL,
  offer_pro_id UUID REFERENCES public.offres_pro(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS operations_pro_user_external_ref_uniq
  ON public.operations_pro(user_id, external_ref)
  WHERE external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS operations_pro_user_month_idx
  ON public.operations_pro(user_id, month_key);
CREATE INDEX IF NOT EXISTS operations_pro_user_family_idx
  ON public.operations_pro(user_id, family);
CREATE INDEX IF NOT EXISTS operations_pro_client_idx
  ON public.operations_pro(client_pro_id);

DROP TRIGGER IF EXISTS update_operations_pro_updated_at ON public.operations_pro;
CREATE TRIGGER update_operations_pro_updated_at
BEFORE UPDATE ON public.operations_pro
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== SYNC LOGS ====================
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL CHECK (domain IN ('clients', 'offres', 'operations')),
  source_app TEXT NOT NULL CHECK (source_app IN ('crm', 'business', 'finances')),
  action TEXT NOT NULL CHECK (action IN ('upsert', 'delete', 'read', 'healthcheck')),
  status TEXT NOT NULL CHECK (status IN ('ok', 'warning', 'error')),
  record_ref TEXT,
  message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sync_logs_user_created_idx ON public.sync_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sync_logs_status_idx ON public.sync_logs(status, created_at DESC);

-- Cross-app by design: keep RLS disabled for now (same pattern as prospects/offres).
ALTER TABLE public.clients_pro DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.offres_pro DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_pro DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs DISABLE ROW LEVEL SECURITY;

-- ==================== SYSTEM HEALTH VIEW ====================
CREATE OR REPLACE VIEW public.pro_system_health AS
SELECT
  u.user_id,
  COALESCE(c.clients_count, 0) AS clients_count,
  COALESCE(o.offres_count, 0) AS offres_count,
  COALESCE(op.operations_count, 0) AS operations_count,
  l.last_sync_at,
  l.last_error_at
FROM (
  SELECT DISTINCT user_id FROM public.clients_pro
  UNION
  SELECT DISTINCT user_id FROM public.offres_pro
  UNION
  SELECT DISTINCT user_id FROM public.operations_pro
  UNION
  SELECT DISTINCT user_id FROM public.sync_logs WHERE user_id IS NOT NULL
) u
LEFT JOIN (
  SELECT user_id, COUNT(*) AS clients_count FROM public.clients_pro GROUP BY user_id
) c ON c.user_id = u.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS offres_count FROM public.offres_pro GROUP BY user_id
) o ON o.user_id = u.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS operations_count FROM public.operations_pro GROUP BY user_id
) op ON op.user_id = u.user_id
LEFT JOIN (
  SELECT
    user_id,
    MAX(created_at) FILTER (WHERE status = 'ok') AS last_sync_at,
    MAX(created_at) FILTER (WHERE status = 'error') AS last_error_at
  FROM public.sync_logs
  WHERE user_id IS NOT NULL
  GROUP BY user_id
) l ON l.user_id = u.user_id;
