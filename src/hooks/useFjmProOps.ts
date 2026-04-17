import { useState, useEffect } from "react";
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

  useEffect(() => {
    setLoading(true);
    supabase
      .from("fjm_pro_operations")
      .select("*")
      .eq("month_key", monthKey)
      .order("family")
      .then(({ data }) => {
        setOps((data ?? []) as FjmProOp[]);
        setLoading(false);
      }, () => setLoading(false));
  }, [monthKey]);

  return { ops, loading };
}
