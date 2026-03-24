import { useMemo, useRef } from "react";
import { FinanceEntry, Expense, Prospect, Offre } from "@/data/types";
import html2canvas from "html2canvas-pro";

const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

interface Props {
  year: number;
  financeEntries: FinanceEntry[];
  expenses: Expense[];
  prospects: Prospect[];
  offres: Offre[];
  onClose: () => void;
}

export default function AnnualWrapped({ year, financeEntries, expenses, prospects, offres, onClose }: Props) {
  const yearEntries = useMemo(() => financeEntries.filter(e => e.month.startsWith(String(year))), [financeEntries, year]);
  const yearExpenses = useMemo(() => expenses.filter(e => e.month.startsWith(String(year))), [expenses, year]);

  const totalCA = yearEntries.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = yearExpenses.reduce((s, e) => s + e.amount, 0);
  const totalURSSAF = totalCA * 0.261;
  const netProfit = totalCA - totalURSSAF - totalExpenses;

  const clients = useMemo(() => {
    const names = new Set(yearEntries.map(e => e.clientName).filter(Boolean));
    return names.size;
  }, [yearEntries]);

  const sapClients = useMemo(() => {
    const sapNames = new Set(yearEntries.filter(e => e.sapHours && e.sapHours > 0).map(e => e.clientName).filter(Boolean));
    return sapNames.size;
  }, [yearEntries]);

  const bestMonth = useMemo(() => {
    const map: Record<string, number> = {};
    yearEntries.forEach(e => { map[e.month] = (map[e.month] || 0) + e.amount; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    const [mk, val] = sorted[0];
    const mi = parseInt(mk.split("-")[1]) - 1;
    return { name: MONTHS[mi], amount: val };
  }, [yearEntries]);

  const topOffre = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    yearEntries.forEach(e => {
      if (e.offre) {
        if (!map[e.offre]) map[e.offre] = { count: 0, revenue: 0 };
        map[e.offre].count++;
        map[e.offre].revenue += e.amount;
      }
    });
    const sorted = Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue);
    return sorted.length > 0 ? { name: sorted[0][0], ...sorted[0][1] } : null;
  }, [yearEntries]);

  const avgMonthly = totalCA / 12;
  const totalEntries = yearEntries.length;

  const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}>
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="text-center mb-6 pt-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">Votre année</div>
          <div className="font-display text-[48px] font-black leading-none" style={{ background: "linear-gradient(135deg, hsl(348 63% 50%), hsl(38 92% 55%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {year}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 tracking-wide">WRAPPED</div>
        </div>

        {/* Main CA */}
        <div className="rounded-3xl p-6 mb-3 text-center" style={{ background: "linear-gradient(135deg, hsl(348 63% 25% / 0.3), hsl(280 50% 20% / 0.2))", border: "1px solid hsl(348 63% 40% / 0.2)" }}>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Chiffre d'affaires total</div>
          <div className="value-lg text-[42px] text-foreground font-black">{fmt(totalCA)}€</div>
          <div className="text-[12px] text-muted-foreground mt-1">{fmt(avgMonthly)}€ / mois en moyenne</div>
        </div>

        {/* Grid stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(152 55% 30% / 0.15)", border: "1px solid hsl(152 55% 40% / 0.15)" }}>
            <div className="value-lg text-[28px] text-success">{fmt(netProfit)}€</div>
            <div className="text-[10px] text-muted-foreground mt-1">Bénéfice net</div>
          </div>
          <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(0 60% 30% / 0.15)", border: "1px solid hsl(0 60% 40% / 0.15)" }}>
            <div className="value-lg text-[28px] text-destructive">{fmt(totalURSSAF)}€</div>
            <div className="text-[10px] text-muted-foreground mt-1">URSSAF</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-2xl p-3 text-center" style={{ background: "hsl(217 70% 30% / 0.15)", border: "1px solid hsl(217 70% 40% / 0.12)" }}>
            <div className="value-lg text-[24px] text-foreground">{clients}</div>
            <div className="text-[9px] text-muted-foreground mt-1">Clients</div>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: "hsl(38 92% 30% / 0.15)", border: "1px solid hsl(38 92% 40% / 0.12)" }}>
            <div className="value-lg text-[24px] text-foreground">{totalEntries}</div>
            <div className="text-[9px] text-muted-foreground mt-1">Entrées</div>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: "hsl(270 50% 30% / 0.15)", border: "1px solid hsl(270 50% 40% / 0.12)" }}>
            <div className="value-lg text-[24px] text-foreground">{sapClients}</div>
            <div className="text-[9px] text-muted-foreground mt-1">Clients SAP</div>
          </div>
        </div>

        {/* Highlights */}
        {bestMonth && (
          <div className="rounded-2xl p-4 mb-3 flex items-center gap-4" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
            <div className="text-3xl">🏆</div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Meilleur mois</div>
              <div className="text-[15px] font-bold text-foreground">{bestMonth.name}</div>
              <div className="value-lg text-[14px] text-success">{fmt(bestMonth.amount)}€</div>
            </div>
          </div>
        )}

        {topOffre && (
          <div className="rounded-2xl p-4 mb-3 flex items-center gap-4" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
            <div className="text-3xl">⭐</div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Offre #1</div>
              <div className="text-[15px] font-bold text-foreground">{topOffre.name}</div>
              <div className="text-[12px] text-muted-foreground">{topOffre.count} ventes · {fmt(topOffre.revenue)}€</div>
            </div>
          </div>
        )}

        <div className="rounded-2xl p-4 mb-6" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Dépenses totales</div>
          <div className="value-lg text-[20px] text-foreground">{fmt(totalExpenses)}€</div>
        </div>

        {/* Close */}
        <button onClick={onClose} className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white btn-primary mb-8">
          Fermer le Wrapped
        </button>
      </div>
    </div>
  );
}
