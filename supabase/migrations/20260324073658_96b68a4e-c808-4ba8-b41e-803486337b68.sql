-- Disable RLS on offres and prospects for cross-app sync
ALTER TABLE public.offres DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects DISABLE ROW LEVEL SECURITY;

-- Add draft status column to offres for draft/validated workflow
ALTER TABLE public.offres ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;