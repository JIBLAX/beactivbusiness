
ALTER TABLE public.offres ADD COLUMN IF NOT EXISTS tva_enabled boolean DEFAULT false;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS portage_months jsonb DEFAULT '{}'::jsonb;
