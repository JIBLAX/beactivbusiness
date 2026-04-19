import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FjmProOp {
  id: string;
  fjm_op_id: string;
  month_key: string;
  family: "charge_fixe" | "charge_variable" | "revenu";
  category: string;
  subcategory: string | null;
  label: string;
  forecast: number;
  actual: number;
  date: string | null;
  source_type: "bank" | "cash" | null;
}

export function useFjmProOps(monthKey: string) {
  const [ops, setOps] = useState<FjmProOp[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    return supabase
      .from("fjm_pro_operations")
      .select("*")
      .eq("month_key", monthKey)
      .order("family")
      .then(({ data }) => {
        setOps((data ?? []) as FjmProOp[]);
        setLoading(false);
      }, () => setLoading(false));
  }, [monthKey]);

  useEffect(() => {
    setLoading(true);
    fetch();

    // Realtime: picks up FJM writes instantly if the table has realtime enabled
    const channel = supabase
      .channel(`fjm_pro_ops_${monthKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fjm_pro_operations" }, fetch)
      .subscribe();

    // Visibility: auto-refresh when user returns to BA Business from FJM
    const onVisible = () => { if (!document.hidden) fetch(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [monthKey, fetch]);

  return { ops, loading };
}
