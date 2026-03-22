
-- Add group coaching fields to prospects
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS group_type text DEFAULT NULL;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS group_id text DEFAULT NULL;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS is_group_leader boolean DEFAULT false;

-- Create structures table for B2B clients
CREATE TABLE public.structures (
  id text NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  contact_name text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  city text DEFAULT '',
  structure_type text DEFAULT 'entreprise',
  people_count integer DEFAULT 1,
  offre text DEFAULT '',
  amount numeric DEFAULT 0,
  frequency text DEFAULT 'ponctuel',
  notes text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own structures"
  ON public.structures
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_structures_updated_at
  BEFORE UPDATE ON public.structures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
