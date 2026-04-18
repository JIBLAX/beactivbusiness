import { useState, useEffect } from "react"
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

function monthBounds(monthKey: string): [string, string] {
  const [y, m] = monthKey.split("-").map(Number)
  const last = new Date(y, m, 0).getDate()
  return [`${monthKey}-01`, `${monthKey}-${String(last).padStart(2, "0")}`]
}

export function useBaSalesMonth(monthKey: string) {
  const [sales, setSales] = useState<BaSaleRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const [start, end] = monthBounds(monthKey)
    supabase
      .from("ba_sales")
      .select("id, client_name, offer_name, amount, payment_mode, sale_type, participant_count, is_sap, sap_hours, date")
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false })
      .then(({ data }) => {
        setSales((data ?? []) as BaSaleRow[])
        setLoading(false)
      }, () => setLoading(false))
  }, [monthKey])

  const total = sales.reduce((s, r) => s + (r.amount ?? 0), 0)
  return { sales, loading, total }
}

export function useBaSalesYear(year: number) {
  const [sales, setSales] = useState<BaSaleRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .from("ba_sales")
      .select("id, client_name, offer_name, amount, payment_mode, sale_type, participant_count, is_sap, sap_hours, date")
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`)
      .order("date", { ascending: false })
      .then(({ data }) => {
        setSales((data ?? []) as BaSaleRow[])
        setLoading(false)
      }, () => setLoading(false))
  }, [year])

  return { sales, loading }
}
