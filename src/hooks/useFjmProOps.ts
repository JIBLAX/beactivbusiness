import { useState, useEffect, useCallback, useRef } from "react";
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

const REFETCH_THROTTLE_MS = 1500;

export function useFjmProOps(monthKey: string) {
  const [ops, setOps] = useState<FjmProOp[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef(0);
  const suffixRef = useRef<string>();
  if (!suffixRef.current) suffixRef.current = Math.random().toString(36).slice(2, 8);
  const suffix = suffixRef.current;

  const fetch = useCallback(() => {
    lastFetchRef.current = Date.now();
    return supabase
      .from("fjm_pro_operations")
      .select("*")
      .eq("month_key", monthKey)
      .order("family")
      .then(({ data, error }) => {
        if (error) console.error("useFjmProOps fetch error:", error);
        setOps((data ?? []) as FjmProOp[]);
        setLoading(false);
      }, (err) => {
        console.error("useFjmProOps fetch threw:", err);
        setLoading(false);
      });
  }, [monthKey]);

  useEffect(() => {
    setLoading(true);
    fetch();

    const channel = supabase
      .channel(`fjm_pro_ops_${monthKey}_${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fjm_pro_operations" }, () => fetch())
      .subscribe();

    const onVisible = () => {
      if (document.hidden) return;
      if (Date.now() - lastFetchRef.current < REFETCH_THROTTLE_MS) return;
      fetch();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [monthKey, fetch, suffix]);

  return { ops, loading };
}
