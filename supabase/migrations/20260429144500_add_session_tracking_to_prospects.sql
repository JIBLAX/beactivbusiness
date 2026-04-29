ALTER TABLE public.prospects
ADD COLUMN IF NOT EXISTS seances_prevues INTEGER;

ALTER TABLE public.prospects
ADD COLUMN IF NOT EXISTS seances_effectuees INTEGER;

ALTER TABLE public.prospects
ADD COLUMN IF NOT EXISTS periode_debut DATE;

ALTER TABLE public.prospects
ADD COLUMN IF NOT EXISTS periode_fin DATE;
