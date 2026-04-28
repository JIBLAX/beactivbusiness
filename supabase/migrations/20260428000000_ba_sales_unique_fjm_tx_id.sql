-- 1. Supprimer les doublons existants : garder la ligne avec l'id le plus petit
--    pour chaque financesjm_tx_id non-null.
DELETE FROM ba_sales a
USING ba_sales b
WHERE a.id > b.id
  AND a.financesjm_tx_id = b.financesjm_tx_id
  AND a.financesjm_tx_id IS NOT NULL;

-- 2. Ajouter une contrainte UNIQUE sur financesjm_tx_id.
--    Les NULL sont autorisés en doublon (comportement standard PostgreSQL).
ALTER TABLE ba_sales
  ADD CONSTRAINT ba_sales_financesjm_tx_id_unique
  UNIQUE (financesjm_tx_id);
