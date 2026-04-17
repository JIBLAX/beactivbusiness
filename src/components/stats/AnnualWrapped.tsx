import { useMemo, useRef, useState } from "react";
import { FinanceEntry, Expense, Prospect, Offre } from "@/data/types";
import html2canvas from "html2canvas-pro";
import type { BaSaleRow } from "@/hooks/useBaSalesMonth";

const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

interface Props {
  year: number;
  financeEntries: FinanceEntry[];
  expenses: Expense[];
  prospects: Prospect[];
  offres: Offre[];
  baSales?: BaSaleRow[];
  onClose: () => void;
}

export default function AnnualWrapped({ year, financeEntries, expenses, prospects, offres, baSales = [], onClose }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const yearEntries = useMemo(() => financeEntries.filter(e => e.month.startsWith(String(year))), [financeEntries, year]);
  const yearExpenses = useMemo(() => expenses.filter(e => e.month.startsWith(String(year))), [expenses, year]);
  const yearBaSales = useMemo(() => baSales.filter(s => s.date.startsWith(String(year))), [baSales, year]);

  const baSalesCA = yearBaSales.reduce((s, e) => s + e.amount, 0);
  const totalCA = yearEntries.reduce((s, e) => s + e.amount, 0) + baSalesCA;
  const totalExpenses = yearExpenses.reduce((s, e) => s + e.amount, 0);
  const totalURSSAF = totalCA * 0.261;
  const netProfit = totalCA - totalURSSAF - totalExpenses;

  const clients = useMemo(() => {
    const names = new Set([
      ...yearEntries.map(e => e.clientName),
      ...yearBaSales.map(s => s.client_name),
    ].filter(Boolean));
    return names.size;
  }, [yearEntries, yearBaSales]);

  const sapClients = useMemo(() => {
    const sapNames = new Set([
      ...yearEntries.filter(e => e.sapHours && e.sapHours > 0).map(e => e.clientName),
      ...yearBaSales.filter(s => s.is_sap).map(s => s.client_name),
    ].filter(Boolean));
    return sapNames.size;
  }, [yearEntries, yearBaSales]);

  const bestMonth = useMemo(() => {
    const map: Record<string, number> = {};
    yearEntries.forEach(e => { map[e.month] = (map[e.month] || 0) + e.amount; });
    yearBaSales.forEach(s => { const mk = s.date.substring(0, 7); map[mk] = (map[mk] || 0) + s.amount; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    const [mk, val] = sorted[0];
    const mi = parseInt(mk.split("-")[1]) - 1;
    return { name: MONTHS[mi], amount: val };
  }, [yearEntries, yearBaSales]);

  const topOffre = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    yearEntries.forEach(e => {
      if (e.offre) {
        if (!map[e.offre]) map[e.offre] = { count: 0, revenue: 0 };
        map[e.offre].count++;
        map[e.offre].revenue += e.amount;
      }
    });
    yearBaSales.forEach(s => {
      if (s.offer_name) {
        if (!map[s.offer_name]) map[s.offer_name] = { count: 0, revenue: 0 };
        map[s.offer_name].count++;
        map[s.offer_name].revenue += s.amount;
      }
    });
    const sorted = Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue);
    return sorted.length > 0 ? { name: sorted[0][0], ...sorted[0][1] } : null;
  }, [yearEntries, yearBaSales]);

  const avgMonthly = totalCA / 12;
  const totalEntries = yearEntries.length + yearBaSales.length;

  const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

  const exportAsImage = async () => {
    if (!wrapRef.current || exporting) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(wrapRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 3,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `BE_ACTIV_Wrapped_${year}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Export error:", err);
    }
    setExporting(false);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}>
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto mx-4">
        {/* Exportable area */}
        <div ref={wrapRef} style={{ background: "#0a0a0a", padding: "24px 16px 16px" }}>
          {/* Header with branding */}
          <div className="text-center mb-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: "hsl(348 63% 50%)" }}>BE ACTIV · JM COACH SPORTIF</div>
            <div className="font-display text-[44px] font-black leading-none" style={{ background: "linear-gradient(135deg, hsl(348 63% 50%), hsl(38 92% 55%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {year}
            </div>
            <div className="text-[10px] font-semibold mt-1 tracking-[0.3em]" style={{ color: "hsl(0 0% 45%)" }}>WRAPPED</div>
          </div>

          {/* Main CA */}
          <div className="rounded-3xl p-5 mb-3 text-center" style={{ background: "linear-gradient(135deg, hsl(348 63% 25% / 0.3), hsl(280 50% 20% / 0.2))", border: "1px solid hsl(348 63% 40% / 0.2)" }}>
            <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: "hsl(0 0% 50%)" }}>Chiffre d'affaires total</div>
            <div className="text-[40px] font-black" style={{ color: "hsl(0 0% 95%)" }}>{fmt(totalCA)}€</div>
            <div className="text-[11px] mt-1" style={{ color: "hsl(0 0% 50%)" }}>{fmt(avgMonthly)}€ / mois en moyenne</div>
          </div>

          {/* Grid stats */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(152 55% 30% / 0.15)", border: "1px solid hsl(152 55% 40% / 0.15)" }}>
              <div className="text-[26px] font-black" style={{ color: "hsl(152 55% 55%)" }}>{fmt(netProfit)}€</div>
              <div className="text-[10px] mt-1" style={{ color: "hsl(0 0% 50%)" }}>Bénéfice net</div>
            </div>
            <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(0 60% 30% / 0.15)", border: "1px solid hsl(0 60% 40% / 0.15)" }}>
              <div className="text-[26px] font-black" style={{ color: "hsl(0 60% 55%)" }}>{fmt(totalURSSAF)}€</div>
              <div className="text-[10px] mt-1" style={{ color: "hsl(0 0% 50%)" }}>URSSAF</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-2xl p-3 text-center" style={{ background: "hsl(217 70% 30% / 0.15)", border: "1px solid hsl(217 70% 40% / 0.12)" }}>
              <div className="text-[22px] font-black" style={{ color: "hsl(0 0% 92%)" }}>{clients}</div>
              <div className="text-[9px] mt-1" style={{ color: "hsl(0 0% 50%)" }}>Clients</div>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: "hsl(38 92% 30% / 0.15)", border: "1px solid hsl(38 92% 40% / 0.12)" }}>
              <div className="text-[22px] font-black" style={{ color: "hsl(0 0% 92%)" }}>{totalEntries}</div>
              <div className="text-[9px] mt-1" style={{ color: "hsl(0 0% 50%)" }}>Entrées</div>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: "hsl(270 50% 30% / 0.15)", border: "1px solid hsl(270 50% 40% / 0.12)" }}>
              <div className="text-[22px] font-black" style={{ color: "hsl(0 0% 92%)" }}>{sapClients}</div>
              <div className="text-[9px] mt-1" style={{ color: "hsl(0 0% 50%)" }}>Clients SAP</div>
            </div>
          </div>

          {/* Highlights */}
          {bestMonth && (
            <div className="rounded-2xl p-4 mb-3 flex items-center gap-4" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
              <div className="text-3xl">🏆</div>
              <div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(0 0% 50%)" }}>Meilleur mois</div>
                <div className="text-[15px] font-bold" style={{ color: "hsl(0 0% 92%)" }}>{bestMonth.name}</div>
                <div className="text-[14px] font-bold" style={{ color: "hsl(152 55% 55%)" }}>{fmt(bestMonth.amount)}€</div>
              </div>
            </div>
          )}

          {topOffre && (
            <div className="rounded-2xl p-4 mb-3 flex items-center gap-4" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
              <div className="text-3xl">⭐</div>
              <div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(0 0% 50%)" }}>Offre #1</div>
                <div className="text-[15px] font-bold" style={{ color: "hsl(0 0% 92%)" }}>{topOffre.name}</div>
                <div className="text-[12px]" style={{ color: "hsl(0 0% 55%)" }}>{topOffre.count} ventes · {fmt(topOffre.revenue)}€</div>
              </div>
            </div>
          )}

          <div className="rounded-2xl p-4 mb-4" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
            <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "hsl(0 0% 50%)" }}>Dépenses totales</div>
            <div className="text-[20px] font-black" style={{ color: "hsl(0 0% 92%)" }}>{fmt(totalExpenses)}€</div>
          </div>

          {/* Footer branding */}
          <div className="text-center pt-2 pb-1">
            <div className="text-[9px] font-semibold tracking-[0.2em]" style={{ color: "hsl(348 63% 45%)" }}>BE ACTIV BUSINESS</div>
          </div>
        </div>

        {/* Action buttons (outside exportable area) */}
        <div className="flex gap-2 mt-3 mb-8">
          <button onClick={exportAsImage} disabled={exporting}
            className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-white btn-primary disabled:opacity-50">
            {exporting ? "Export..." : "📸 Exporter Story"}
          </button>
          <button onClick={onClose} className="px-5 py-3.5 rounded-2xl text-sm font-semibold text-muted-foreground"
            style={{ background: "hsl(0 0% 100% / 0.05)" }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
