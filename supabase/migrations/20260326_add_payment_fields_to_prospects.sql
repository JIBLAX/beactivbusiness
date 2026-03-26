ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS montant numeric,
  ADD COLUMN IF NOT EXISTS paiement_mode integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS versements_recus integer DEFAULT 0;
