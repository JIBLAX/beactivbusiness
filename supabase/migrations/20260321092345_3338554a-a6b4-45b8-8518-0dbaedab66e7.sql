
ALTER TABLE public.expenses ADD COLUMN expense_theme text DEFAULT 'TOUS';
ALTER TABLE public.activ_reset_clients ADD COLUMN archived boolean DEFAULT false;
