import { useState, useEffect, useCallback } from "react"
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
}

const BA_SALES_SELECT = "id, client_name, offer_name, amount, payment_mode, sale_type, participant_count, is_sap, sap_hours, date"

function monthBounds(monthKey: string): [string, string] {
  const [y, m] = monthKey.split("-").map(Number)
  const last = new Date(y, m, 0).getDate()
  return [`${monthKey}-01`, `${monthKey}-${String(last).padStart(2, "0")}`]
}

export function useBaSalesMonth(monthKey: string) {
  const [sales, setSales] = useState<BaSaleRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(() => {
    const [start, end] = monthBounds(monthKey)
    return supabase
      .from("ba_sales")
      .select(BA_SALES_SELECT)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false })
      .then(({ data }) => {
        setSales((data ?? []) as BaSaleRow[])
        setLoading(false)
      }, () => setLoading(false))
  }, [monthKey])

  useEffect(() => {
    setLoading(true)
    fetch()

    // Realtime: picks up FJM writes instantly if the table has realtime enabled
    const channel = supabase
      .channel(`ba_sales_month_${monthKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ba_sales" }, fetch)
      .subscribe()

    // Visibility: auto-refresh when user returns to BA Business from FJM
    const onVisible = () => { if (!document.hidden) fetch() }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [monthKey, fetch])

  const total = sales.reduce((s, r) => s + (r.amount ?? 0), 0)
  return { sales, loading, total }
}

export function useBaSalesYear(year: number) {
  const [sales, setSales] = useState<BaSaleRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(() => {
    return supabase
      .from("ba_sales")
      .select(BA_SALES_SELECT)
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`)
      .order("date", { ascending: false })
      .then(({ data }) => {
        setSales((data ?? []) as BaSaleRow[])
        setLoading(false)
      }, () => setLoading(false))
  }, [year])

  useEffect(() => {
    setLoading(true)
    fetch()

    const channel = supabase
      .channel(`ba_sales_year_${year}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ba_sales" }, fetch)
      .subscribe()

    const onVisible = () => { if (!document.hidden) fetch() }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [year, fetch])

  return { sales, loading }
}
