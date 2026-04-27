import { useState, useEffect, useCallback, useRef } from "react"
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
}

const BA_SALES_SELECT = "id, client_name, offer_name, amount, payment_mode, sale_type, participant_count, is_sap, sap_hours, date, catalog_price, discount_amount, discount_percent"

// Skip a refetch when one already happened very recently (e.g. realtime event +
// visibilitychange firing back-to-back).
const REFETCH_THROTTLE_MS = 1500

function monthBounds(monthKey: string): [string, string] {
  const [y, m] = monthKey.split("-").map(Number)
  const last = new Date(y, m, 0).getDate()
  return [`${monthKey}-01`, `${monthKey}-${String(last).padStart(2, "0")}`]
}

// Per-instance suffix so multiple hook calls with the same monthKey/year don't
// collide on the same Supabase realtime channel name.
function useChannelSuffix() {
  const ref = useRef<string>()
  if (!ref.current) ref.current = Math.random().toString(36).slice(2, 8)
  return ref.current
}

export function useBaSalesMonth(monthKey: string) {
  const [sales, setSales] = useState<BaSaleRow[]>([])
  const [loading, setLoading] = useState(true)
  const lastFetchRef = useRef(0)
  const suffix = useChannelSuffix()

  const fetch = useCallback(() => {
    lastFetchRef.current = Date.now()
    const [start, end] = monthBounds(monthKey)
    return supabase
      .from("ba_sales")
      .select(BA_SALES_SELECT)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("useBaSalesMonth fetch error:", error)
        setSales((data ?? []) as BaSaleRow[])
        setLoading(false)
      }, (err) => {
        console.error("useBaSalesMonth fetch threw:", err)
        setLoading(false)
      })
  }, [monthKey])

  useEffect(() => {
    setLoading(true)
    fetch()

    const channel = supabase
      .channel(`ba_sales_month_${monthKey}_${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ba_sales" }, () => fetch())
      .subscribe()

    const onVisible = () => {
      if (document.hidden) return
      if (Date.now() - lastFetchRef.current < REFETCH_THROTTLE_MS) return
      fetch()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [monthKey, fetch, suffix])

  const total = sales.reduce((s, r) => s + (r.amount ?? 0), 0)
  return { sales, loading, total }
}

export function useBaSalesYear(year: number) {
  const [sales, setSales] = useState<BaSaleRow[]>([])
  const [loading, setLoading] = useState(true)
  const lastFetchRef = useRef(0)
  const suffix = useChannelSuffix()

  const fetch = useCallback(() => {
    lastFetchRef.current = Date.now()
    return supabase
      .from("ba_sales")
      .select(BA_SALES_SELECT)
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`)
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("useBaSalesYear fetch error:", error)
        setSales((data ?? []) as BaSaleRow[])
        setLoading(false)
      }, (err) => {
        console.error("useBaSalesYear fetch threw:", err)
        setLoading(false)
      })
  }, [year])

  useEffect(() => {
    setLoading(true)
    fetch()

    const channel = supabase
      .channel(`ba_sales_year_${year}_${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ba_sales" }, () => fetch())
      .subscribe()

    const onVisible = () => {
      if (document.hidden) return
      if (Date.now() - lastFetchRef.current < REFETCH_THROTTLE_MS) return
      fetch()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [year, fetch, suffix])

  return { sales, loading }
}
