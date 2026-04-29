import { useEffect, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

export interface BaSaleRow {
  id: string
  client_name: string | null
  offer_name: string | null
  amount: number
  payment_mode: string | null
  sale_type: "individual" | "duo" | "trio" | "collectif" | null
  participant_count: number | null
  is_sap: boolean | null
  sap_hours: number | null
  date: string
  catalog_price: number | null
  discount_amount: number | null
  discount_percent: number | null
  is_installment: boolean | null
  financesjm_tx_id: string | null
  service_date: string | null
}

const BA_SALES_SELECT = "id, client_name, offer_name, amount, payment_mode, sale_type, participant_count, is_sap, sap_hours, date, catalog_price, discount_amount, discount_percent, is_installment, financesjm_tx_id, service_date"
const STALE_MS = 5_000

function monthBounds(monthKey: string): [string, string] {
  const [y, m] = monthKey.split("-").map(Number)
  const last = new Date(y, m, 0).getDate()
  return [`${monthKey}-01`, `${monthKey}-${String(last).padStart(2, "0")}`]
}

async function fetchBaSalesMonth(monthKey: string): Promise<BaSaleRow[]> {
  const [start, end] = monthBounds(monthKey)
  const { data, error } = await supabase
    .from("ba_sales")
    .select(BA_SALES_SELECT)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: false })
  if (error) throw error
  return (data ?? []) as BaSaleRow[]
}

async function fetchBaSalesYear(year: number): Promise<BaSaleRow[]> {
  const { data, error } = await supabase
    .from("ba_sales")
    .select(BA_SALES_SELECT)
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`)
    .order("date", { ascending: false })
  if (error) throw error
  return (data ?? []) as BaSaleRow[]
}

// Single per-instance suffix so multiple hook calls with the same key don't
// collide on the Supabase realtime channel name.
function useChannelSuffix() {
  const ref = useRef<string>()
  if (!ref.current) ref.current = Math.random().toString(36).slice(2, 8)
  return ref.current
}

// Subscribe to ba_sales changes and invalidate every cached slice (month/year).
// React Query dedups invalidations into a single refetch per active query key.
function useBaSalesRealtime(channelName: string) {
  const qc = useQueryClient()
  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "ba_sales" }, () => {
        qc.invalidateQueries({ queryKey: ["ba_sales"] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [channelName, qc])
}

export function useBaSalesMonth(monthKey: string) {
  const suffix = useChannelSuffix()
  const q = useQuery({
    queryKey: ["ba_sales", "month", monthKey],
    queryFn: () => fetchBaSalesMonth(monthKey),
    staleTime: STALE_MS,
  })
  useEffect(() => { if (q.error) console.error("useBaSalesMonth error:", q.error) }, [q.error])
  useBaSalesRealtime(`ba_sales_month_${monthKey}_${suffix}`)

  const sales = q.data ?? []
  const total = sales.reduce((s, r) => s + (r.amount ?? 0), 0)
  return { sales, loading: q.isLoading, total, error: (q.error as Error | null) ?? null }
}

export function useBaSalesYear(year: number) {
  const suffix = useChannelSuffix()
  const q = useQuery({
    queryKey: ["ba_sales", "year", year],
    queryFn: () => fetchBaSalesYear(year),
    staleTime: STALE_MS,
  })
  useEffect(() => { if (q.error) console.error("useBaSalesYear error:", q.error) }, [q.error])
  useBaSalesRealtime(`ba_sales_year_${year}_${suffix}`)

  const sales = q.data ?? []
  return { sales, loading: q.isLoading, error: (q.error as Error | null) ?? null }
}
