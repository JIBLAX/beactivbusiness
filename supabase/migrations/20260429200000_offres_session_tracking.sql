-- Suivi des séances configurable par offre (Business → CRM via sync)
ALTER TABLE public.offres
  ADD COLUMN IF NOT EXISTS session_tracking_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.offres
  ADD COLUMN IF NOT EXISTS min_sessions_to_validate INTEGER;

ALTER TABLE public.offres_pro
  ADD COLUMN IF NOT EXISTS session_tracking_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.offres_pro
  ADD COLUMN IF NOT EXISTS min_sessions_to_validate INTEGER;
