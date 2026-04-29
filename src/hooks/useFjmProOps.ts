import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

const STALE_MS = 5_000;

async function fetchFjmProOps(monthKey: string): Promise<FjmProOp[]> {
  const { data, error } = await (supabase as any)
    .from("operations_pro")
    .select("*")
    .eq("month_key", monthKey)
    .order("family");

  if (!error && data?.length) {
    return (data as any[]).map((r) => ({
      id: r.id,
      fjm_op_id: r.external_ref ?? r.id,
      month_key: r.month_key,
      family: r.family,
      category: r.category ?? "",
      subcategory: r.subcategory ?? null,
      label: r.label,
      forecast: Number(r.forecast) || 0,
      actual: Number(r.actual) || 0,
      date: r.operation_date ?? null,
      source_type: r.source_type ?? null,
    }));
  }

  const legacy = await supabase
    .from("fjm_pro_operations")
    .select("*")
    .eq("month_key", monthKey)
    .order("family");
  if (legacy.error) throw legacy.error;
  return (legacy.data ?? []) as FjmProOp[];
}

export function useFjmProOps(monthKey: string) {
  const qc = useQueryClient();
  const suffixRef = useRef<string>();
  if (!suffixRef.current) suffixRef.current = Math.random().toString(36).slice(2, 8);
  const suffix = suffixRef.current;

  const q = useQuery({
    queryKey: ["fjm_pro_ops", monthKey],
    queryFn: () => fetchFjmProOps(monthKey),
    staleTime: STALE_MS,
  });
  useEffect(() => { if (q.error) console.error("useFjmProOps error:", q.error); }, [q.error]);

  useEffect(() => {
    const channel = supabase
      .channel(`fjm_pro_ops_${monthKey}_${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "operations_pro" }, () => {
        qc.invalidateQueries({ queryKey: ["fjm_pro_ops"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [monthKey, suffix, qc]);

  return { ops: q.data ?? [], loading: q.isLoading, error: (q.error as Error | null) ?? null };
}
