import { supabase } from "@/integrations/supabase/client";
import { FinanceEntry, Offre, Prospect } from "@/data/types";

/**
 * Fire-and-forget insert into ba_sales for each entry that has a clientName.
 * Finance JM polls ba_sales (financesjm_tx_id IS NULL) to import pending sales.
 */
export function pushToBaSales(
  entries: FinanceEntry[],
  offres: Offre[],
  prospects: Prospect[],
  userId: string,
) {
  const rows = entries
    .filter(e => !!e.clientName)
    .map(e => {
      const offre = offres.find(o => o.name === e.offre);
      const client = prospects.find(p => p.name === e.clientName);
      return {
        user_id: userId,
        offer_id: offre?.id ?? null,
        client_id: client?.id ?? null,
        client_name: e.clientName!,
        amount: e.amount,
        catalog_price: offre?.price ?? null,
        date: e.month + "-01",
        channel: e.paymentMode === "especes" ? "especes" : "banque",
        payment_mode: e.paymentMode ?? null,
        is_installment: !!e.installmentGroup,
        total_amount: e.installmentTotal != null ? e.amount * e.installmentTotal : null,
        installment_label:
          e.installmentIndex != null && e.installmentTotal != null
            ? `Versement ${e.installmentIndex}/${e.installmentTotal}`
            : null,
      };
    });

  if (rows.length === 0) return;
  supabase.from("ba_sales").insert(rows).then(() => {}, console.error);
}
