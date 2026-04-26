import { useMemo, useState } from "react";
import { useApp } from "@/store/AppContext";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import AnnualWrapped from "@/components/stats/AnnualWrapped";
import { useBaSalesYear } from "@/hooks/useBaSalesMonth";
import { SEUIL_MICRO, SEUIL_TVA, getTauxUrssaf } from "@/lib/constants";
import { computeTVACollectee, computeUrssaf, computeYearlyTotalReel, sumMicroCA } from "@/lib/revenue";
import { findOffreByName } from "@/lib/offres";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const QUARTERS = [
  { label: "T1", months: ["01", "02", "03"] },
  { label: "T2", months: ["04", "05", "06"] },
  { label: "T3", months: ["07", "08", "09"] },
  { label: "T4", months: ["10", "11", "12"] },
];

const PIE_COLORS = [
  "hsl(348, 63%, 40%)", "hsl(152, 55%, 50%)", "hsl(217, 70%, 58%)",
  "hsl(38, 92%, 55%)", "hsl(280, 50%, 55%)", "hsl(45, 80%, 50%)",
];

export default function StatsPage() {
  const { financeEntries, expenses, prospects, offres, portageMonths, urssafMode, setUrssafMode, structures } = useApp();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [showWrapped, setShowWrapped] = useState(false);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const { sales: baSales } = useBaSalesYear(currentYear);

  const yearEntries = useMemo(() => financeEntries.filter(e => e.month.startsWith(String(currentYear))), [financeEntries, currentYear]);
  const yearExpenses = useMemo(() => expenses.filter(e => e.month.startsWith(String(currentYear))), [expenses, currentYear]);

  const yearlyBaSalesTotal = useMemo(() => baSales.reduce((s, e) => s + e.amount, 0), [baSales]);

  // Filtered entries for month filter
  const filteredEntries = useMemo(() => {
    if (selectedMonth === null) return yearEntries;
    const mk = `${currentYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
    return yearEntries.filter(e => e.month === mk);
  }, [yearEntries, selectedMonth, currentYear]);
  const filteredExpenses = useMemo(() => {
    if (selectedMonth === null) return yearExpenses;
    const mk = `${currentYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
    return yearExpenses.filter(e => e.month === mk);
  }, [yearExpenses, selectedMonth, currentYear]);

  // ba_sales filtered for selected period
  const filteredBaSalesTotal = useMemo(() => {
    if (selectedMonth === null) return yearlyBaSalesTotal;
    const mk = `${currentYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
    return baSales.filter(s => s.date.startsWith(mk)).reduce((s, e) => s + e.amount, 0);
  }, [baSales, selectedMonth, currentYear, yearlyBaSalesTotal]);

  // Filtered (month or year) — used for KPI cards
  const filteredCA = filteredEntries.reduce((s, e) => s + e.amount, 0) + filteredBaSalesTotal;
  const filteredExp = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const filteredMicroCA = useMemo(() => sumMicroCA(filteredEntries, offres, portageMonths) + filteredBaSalesTotal, [filteredEntries, portageMonths, offres, filteredBaSalesTotal]);
  const filteredURSSAF = computeUrssaf(filteredMicroCA, currentYear);
  const filteredNet = filteredCA - filteredURSSAF - filteredExp;
  const filteredTVA = useMemo(() => computeTVACollectee(filteredEntries, offres), [filteredEntries, offres]);

  // Year-level values for URSSAF table, projections
  const yearlyCA = computeYearlyTotalReel(financeEntries, yearlyBaSalesTotal, currentYear);
  const yearlyExpenses = yearExpenses.reduce((s, e) => s + e.amount, 0);
  const yearlyMicroCA = useMemo(() => sumMicroCA(yearEntries, offres, portageMonths) + yearlyBaSalesTotal, [yearEntries, portageMonths, offres, yearlyBaSalesTotal]);
  const yearlyURSSAF = computeUrssaf(yearlyMicroCA, currentYear);

  // URSSAF breakdown by period
  const urssafBreakdown = useMemo(() => {
    if (urssafMode === "trimestre") {
      return QUARTERS.map(q => {
        const entries = yearEntries.filter(e => {
          const mo = e.month.split("-")[1];
          return q.months.includes(mo);
        });
        const baCaQ = baSales.filter(s => q.months.includes(s.date.split("-")[1])).reduce((s, e) => s + e.amount, 0);
        const microCA = sumMicroCA(entries, offres, portageMonths) + baCaQ;
        const totalCA = entries.reduce((s, e) => s + e.amount, 0) + baCaQ;
        const urssaf = computeUrssaf(microCA, currentYear);
        const isPast = q.months.every(mo => parseInt(mo) - 1 <= currentMonth);
        const isCurrent = q.months.some(mo => parseInt(mo) - 1 === currentMonth);
        return { label: q.label, ca: totalCA, microCA, urssaf, isPast, isCurrent };
      });
    } else {
      return Array.from({ length: currentMonth + 1 }, (_, i) => {
        const mk = `${currentYear}-${String(i + 1).padStart(2, "0")}`;
        const entries = yearEntries.filter(e => e.month === mk);
        const baCaM = baSales.filter(s => s.date.startsWith(mk)).reduce((s, e) => s + e.amount, 0);
        const microCA = sumMicroCA(entries, offres, portageMonths) + baCaM;
        const totalCA = entries.reduce((s, e) => s + e.amount, 0) + baCaM;
        return { label: MONTHS[i], ca: totalCA, microCA, urssaf: computeUrssaf(microCA, currentYear), isPast: i < currentMonth, isCurrent: i === currentMonth };
      });
    }
  }, [yearEntries, baSales, urssafMode, currentYear, currentMonth, portageMonths, offres]);

  // TVA (year-level for gauges/year view)
  const tvaAmount = useMemo(() => computeTVACollectee(yearEntries, offres), [yearEntries, offres]);

  const clients = useMemo(() => prospects.filter(p => p.closing === "OUI" && p.offre && p.offre !== "-"), [prospects]);

  const filteredActiveClientsCount = useMemo(() => {
    if (selectedMonth === null) return clients.length;
    const names = new Set(filteredEntries.map(e => e.clientName).filter(Boolean));
    return clients.filter(c => names.has(c.name)).length;
  }, [filteredEntries, clients, selectedMonth]);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const data: { month: string; ca: number; net: number }[] = [];
    for (let m = 0; m <= currentMonth; m++) {
      const mk = `${currentYear}-${String(m + 1).padStart(2, "0")}`;
      const ca = financeEntries.filter(e => e.month === mk).reduce((s, e) => s + e.amount, 0);
      const baCa = baSales.filter(s => s.date.startsWith(mk)).reduce((s, e) => s + e.amount, 0);
      const exp = expenses.filter(e => e.month === mk).reduce((s, e) => s + e.amount, 0);
      const totalCa = ca + baCa;
      data.push({ month: MONTHS[m], ca: totalCa, net: totalCa - (totalCa * getTauxUrssaf(currentYear)) - exp });
    }
    return data;
  }, [financeEntries, expenses, baSales, currentYear, currentMonth]);

  // Offer breakdown (local entries + ba_sales)
  const offerStats = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    yearEntries.forEach(e => {
      if (e.offre) {
        if (!map[e.offre]) map[e.offre] = { count: 0, revenue: 0 };
        map[e.offre].count++;
        map[e.offre].revenue += e.amount;
      }
    });
    baSales.forEach(s => {
      if (s.offer_name) {
        if (!map[s.offer_name]) map[s.offer_name] = { count: 0, revenue: 0 };
        map[s.offer_name].count++;
        map[s.offer_name].revenue += s.amount;
      }
    });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).map(([name, data], i) => ({
      name, ...data, color: PIE_COLORS[i % PIE_COLORS.length]
    }));
  }, [yearEntries, baSales]);

  // Triangle breakdown : COLLECTIF / ACTION / TRANSFORMATION (local + ba_sales)
  const themeStats = useMemo(() => {
    const out = {
      COLLECTIF:      { revenue: 0, count: 0, color: "hsl(217 70% 60%)", icon: "🤝", label: "Collectif" },
      ACTION:         { revenue: 0, count: 0, color: "hsl(38 92% 55%)",  icon: "⚡", label: "Action" },
      TRANSFORMATION: { revenue: 0, count: 0, color: "hsl(348 63% 55%)", icon: "🔥", label: "Transformation" },
    };
    const bump = (offerName: string | null | undefined, amount: number) => {
      const theme = findOffreByName(offerName, offres)?.theme;
      if (!theme || !(theme in out)) return;
      out[theme as keyof typeof out].revenue += amount;
      out[theme as keyof typeof out].count += 1;
    };
    // Quand un mois est sélectionné, on calcule sur la période filtrée.
    const tEntries = selectedMonth === null ? yearEntries : filteredEntries;
    const tBaSales = selectedMonth === null
      ? baSales
      : baSales.filter(s => s.date.startsWith(`${currentYear}-${String((selectedMonth ?? 0) + 1).padStart(2, "0")}`));
    tEntries.forEach(e => bump(e.offre, e.amount));
    tBaSales.forEach(s => bump(s.offer_name, s.amount));
    return out;
  }, [yearEntries, filteredEntries, baSales, offres, selectedMonth, currentYear]);

  const themeTotal = themeStats.COLLECTIF.revenue + themeStats.ACTION.revenue + themeStats.TRANSFORMATION.revenue;

  // Pipeline structures : CA projeté annualisé selon la fréquence.
  // Non inclus dans le CA réalisé (Structures n'ont pas de date de paiement).
  const structuresPipeline = useMemo(() => {
    const activeStructures = structures.filter(s => s.active);
    const freqMultiplier: Record<string, number> = { ponctuel: 1, mensuel: 12, trimestriel: 4, annuel: 1 };
    const annualProjected = activeStructures.reduce((sum, s) => sum + (s.amount || 0) * (freqMultiplier[s.frequency] ?? 1), 0);
    return { count: activeStructures.length, annualProjected };
  }, [structures]);

  // Projections (always year-level)
  const monthsPassed = currentMonth + 1;
  const avgMonthlyCA = monthsPassed > 0 ? yearlyCA / monthsPassed : 0;
  const projectedCA = avgMonthlyCA * 12;
  const microPct = (projectedCA / SEUIL_MICRO) * 100;
  const tvaPct = (projectedCA / SEUIL_TVA) * 100;

  // IR estimate (year view only) — abattement 34% services micro-entrepreneur
  const IR_BRACKETS = [
    { min: 0, max: 11497, rate: 0 },
    { min: 11497, max: 29315, rate: 0.11 },
    { min: 29315, max: 83823, rate: 0.30 },
    { min: 83823, max: 180294, rate: 0.41 },
    { min: 180294, max: Infinity, rate: 0.45 },
  ];
  const revenuImposable = yearlyCA * 0.66;
  const irEstime = IR_BRACKETS.reduce((ir, b) => {
    if (revenuImposable <= b.min) return ir;
    return ir + (Math.min(revenuImposable, b.max) - b.min) * b.rate;
  }, 0);

  const urssafPaid = urssafBreakdown.filter(p => p.isPast).reduce((s, p) => s + p.urssaf, 0);
  const urssafRemaining = yearlyURSSAF - urssafPaid;

  const periodLabel = selectedMonth !== null ? MONTHS[selectedMonth] : String(currentYear);

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-[22px] font-bold text-foreground">Statistiques</h1>
        <button onClick={() => setShowWrapped(true)}
          className="badge-pill text-[10px] font-semibold cursor-pointer px-3 py-1.5"
          style={{ background: "linear-gradient(135deg, hsl(348 63% 40% / 0.2), hsl(38 92% 45% / 0.2))", color: "hsl(38 92% 55%)", border: "1px solid hsl(38 92% 45% / 0.15)" }}>
          🎁 Wrapped {currentYear}
        </button>
      </div>
      <p className="text-[12px] text-muted-foreground mb-3">Santé financière — {periodLabel}</p>

      {/* Month filter */}
      <div className="flex gap-1 overflow-x-auto pb-3 mb-3 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
        <button onClick={() => setSelectedMonth(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${selectedMonth === null ? "btn-primary text-white" : "text-muted-foreground"}`}
          style={selectedMonth !== null ? { background: "hsl(0 0% 100% / 0.04)" } : {}}>
          Année
        </button>
        {Array.from({ length: currentMonth + 1 }, (_, i) => (
          <button key={i} onClick={() => setSelectedMonth(i)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${selectedMonth === i ? "btn-primary text-white" : "text-muted-foreground"}`}
            style={selectedMonth !== i ? { background: "hsl(0 0% 100% / 0.04)" } : {}}>
            {MONTHS[i].slice(0, 3)}
          </button>
        ))}
      </div>

      {showWrapped && (
        <AnnualWrapped year={currentYear} financeEntries={financeEntries} expenses={expenses} prospects={prospects} offres={offres} portageMonths={portageMonths} baSales={baSales} onClose={() => setShowWrapped(false)} />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="card-hero rounded-2xl p-4">
          <div className="section-label mb-1">{selectedMonth === null ? `CA ${currentYear}` : `CA ${MONTHS[selectedMonth]}`}</div>
          <div className="value-lg text-[26px] text-foreground">{filteredCA.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
          {selectedMonth === null && (
            <div className="text-[10px] text-muted-foreground mt-1">{avgMonthlyCA.toFixed(0)}€/mois moy.</div>
          )}
        </div>
        <div className="card-hero rounded-2xl p-4">
          <div className="section-label mb-1">Bénéfice Net</div>
          <div className={`value-lg text-[26px] ${filteredNet >= 0 ? "text-success" : "text-destructive"}`}>
            {filteredNet.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">{filteredActiveClientsCount} client{filteredActiveClientsCount > 1 ? "s" : ""} actif{filteredActiveClientsCount > 1 ? "s" : ""}</div>
        </div>
      </div>

      {selectedMonth === null ? (
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="stat-card rounded-2xl p-3 text-center">
            <div className="value-lg text-[18px] text-destructive">{yearlyURSSAF.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
            <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-1">URSSAF</div>
          </div>
          <div className="stat-card rounded-2xl p-3 text-center">
            <div className="value-lg text-[18px] text-destructive">{yearlyExpenses.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
            <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-1">Dépenses</div>
          </div>
          <div className="stat-card rounded-2xl p-3 text-center">
            <div className="value-lg text-[18px] text-warning">{tvaAmount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
            <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-1">TVA</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="stat-card rounded-2xl p-3 text-center">
            <div className="value-lg text-[18px] text-destructive">{filteredURSSAF.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
            <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-1">URSSAF</div>
          </div>
          <div className="stat-card rounded-2xl p-3 text-center">
            <div className="value-lg text-[18px] text-destructive">{filteredExp.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
            <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-1">Dépenses</div>
          </div>
          <div className="stat-card rounded-2xl p-3 text-center">
            <div className="value-lg text-[18px] text-foreground">{filteredActiveClientsCount}</div>
            <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-1">Clients actifs</div>
          </div>
          <div className="stat-card rounded-2xl p-3 text-center">
            <div className="value-lg text-[18px] text-warning">{filteredTVA.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
            <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-1">TVA</div>
          </div>
        </div>
      )}

      {/* Triangle des thèmes : COLLECTIF / ACTION / TRANSFORMATION (toujours visible) */}
      {themeTotal > 0 && (
        <div className="card-elevated rounded-2xl p-4 mb-5">
          <div className="section-label mb-1">Triangle {selectedMonth === null ? currentYear : MONTHS[selectedMonth]}</div>
          <div className="text-[10px] text-muted-foreground mb-3">Répartition du CA par pilier d'offres</div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(["COLLECTIF", "ACTION", "TRANSFORMATION"] as const).map(key => {
              const t = themeStats[key];
              const pct = themeTotal > 0 ? (t.revenue / themeTotal) * 100 : 0;
              return (
                <div key={key} className="rounded-2xl p-3 text-center" style={{ background: `${t.color.replace(")", " / 0.08)")}`, border: `1px solid ${t.color.replace(")", " / 0.15)")}` }}>
                  <div className="text-xl mb-1">{t.icon}</div>
                  <div className="value-lg text-[14px]" style={{ color: t.color }}>{t.revenue.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
                  <div className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">{t.label}</div>
                  <div className="text-[9px] font-semibold mt-1" style={{ color: t.color }}>{pct.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>
          <div className="h-2 rounded-full overflow-hidden flex" style={{ background: "hsl(0 0% 100% / 0.04)" }}>
            {(["COLLECTIF", "ACTION", "TRANSFORMATION"] as const).map(key => {
              const t = themeStats[key];
              const pct = themeTotal > 0 ? (t.revenue / themeTotal) * 100 : 0;
              if (pct === 0) return null;
              return <div key={key} style={{ width: `${pct}%`, background: t.color }} />;
            })}
          </div>
        </div>
      )}

      {selectedMonth === null && <>
      {/* URSSAF Detail Section */}
      <div className="card-elevated rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="section-label">Cotisations URSSAF {currentYear}</div>
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid hsl(0 0% 100% / 0.1)" }}>
            <button
              onClick={() => setUrssafMode("trimestre")}
              className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all ${
                urssafMode === "trimestre"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Trimestre
            </button>
            <button
              onClick={() => setUrssafMode("mois")}
              className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all ${
                urssafMode === "mois"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mois
            </button>
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground mb-3">
          Taux {currentYear} : {(getTauxUrssaf(currentYear) * 100).toFixed(1)}% · Base : CA Micro-entreprise (hors Portage)
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: "hsl(0 0% 100% / 0.02)" }}>
                <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Période</th>
                <th className="text-right px-3 py-2 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">CA Micro</th>
                <th className="text-right px-3 py-2 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">URSSAF dû</th>
                <th className="text-center px-3 py-2 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody>
              {urssafBreakdown.map((p, i) => (
                <tr key={p.label} style={{ borderTop: i > 0 ? "1px solid hsl(0 0% 100% / 0.04)" : undefined }}>
                  <td className="px-3 py-2.5 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      {p.isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                      {p.label}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-foreground">{p.microCA.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</td>
                  <td className="px-3 py-2.5 text-right value-lg text-destructive">{p.urssaf.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</td>
                  <td className="px-3 py-2.5 text-center">
                    {p.isPast && !p.isCurrent ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-warning">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning" /> À payer
                      </span>
                    ) : p.isCurrent ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" /> En cours
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid hsl(0 0% 100% / 0.08)" }}>
                <td className="px-3 py-2.5 font-semibold text-foreground">TOTAL</td>
                <td className="px-3 py-2.5 text-right font-semibold text-foreground">{yearlyMicroCA.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</td>
                <td className="px-3 py-2.5 text-right value-lg font-semibold text-destructive">{yearlyURSSAF.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Threshold gauges */}
      <div className="card-elevated rounded-2xl p-4 mb-5">
        <div className="section-label mb-3">Seuils prévisionnels {currentYear}</div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[12px] font-medium text-foreground">Seuil TVA</span>
              <span className="text-[11px] font-semibold" style={{ color: tvaPct > 80 ? "hsl(38 92% 55%)" : "hsl(0 0% 50%)" }}>
                {projectedCA.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€ / {SEUIL_TVA.toLocaleString()}€
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{
                width: `${Math.min(tvaPct, 100)}%`,
                background: tvaPct > 100 ? "hsl(0 62% 50%)" : tvaPct > 80 ? "hsl(38 92% 55%)" : "hsl(152 55% 52%)"
              }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[12px] font-medium text-foreground">Seuil Micro-entreprise</span>
              <span className="text-[11px] font-semibold" style={{ color: microPct > 80 ? "hsl(0 62% 50%)" : "hsl(0 0% 50%)" }}>
                {projectedCA.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€ / {SEUIL_MICRO.toLocaleString()}€
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{
                width: `${Math.min(microPct, 100)}%`,
                background: microPct > 100 ? "hsl(0 62% 50%)" : microPct > 80 ? "hsl(38 92% 55%)" : "hsl(152 55% 52%)"
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* CA Evolution */}
      {monthlyData.length > 1 && (
        <div className="card-elevated rounded-2xl p-4 mb-5">
          <div className="section-label mb-3">Évolution CA {currentYear}</div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                <defs>
                  <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(152, 55%, 52%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(152, 55%, 52%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(0, 0%, 40%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(0, 0%, 40%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(0, 0%, 7%)", border: "1px solid hsl(0, 0%, 12%)", borderRadius: "12px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="ca" stroke="hsl(152, 55%, 52%)" fill="url(#caGrad)" strokeWidth={2} dot={{ fill: "hsl(152, 55%, 52%)", r: 3, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="net" stroke="hsl(217, 70%, 60%)" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-3 justify-center">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><span className="w-3 h-0.5 rounded-full" style={{ background: "hsl(152, 55%, 52%)" }} /> CA</div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><span className="w-3 h-0.5 rounded-full" style={{ background: "hsl(217, 70%, 60%)" }} /> Bénéfice</div>
          </div>
        </div>
      )}

      {/* Pipeline structures (prévisionnel, non réalisé) */}
      {structuresPipeline.count > 0 && (
        <div className="card-elevated rounded-2xl p-4 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: "hsl(217 70% 60% / 0.12)" }}>🏢</div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-foreground">Pipeline structures</div>
            <div className="text-[10px] text-muted-foreground">
              {structuresPipeline.count} structure{structuresPipeline.count > 1 ? "s" : ""} active{structuresPipeline.count > 1 ? "s" : ""} · CA projeté annualisé
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="value-lg text-[16px]" style={{ color: "hsl(217 70% 60%)" }}>{structuresPipeline.annualProjected.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
            <div className="text-[9px] text-muted-foreground">prévisionnel</div>
          </div>
        </div>
      )}

      {/* Top Offres */}
      {offerStats.length > 0 && (
        <div className="card-elevated rounded-2xl p-4 mb-5">
          <div className="section-label mb-3">Top Offres {currentYear}</div>
          <div className="space-y-3">
            {offerStats.slice(0, 6).map(s => {
              const maxRev = Math.max(...offerStats.map(x => x.revenue));
              return (
                <div key={s.name}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-foreground font-medium truncate pr-2">{s.name}</span>
                    <span className="value-lg text-success flex-shrink-0">{s.revenue.toFixed(0)}€</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.04)" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(s.revenue / maxRev) * 100}%`, background: s.color }} />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{s.count} entrées</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* IR Estimate */}
      {irEstime > 0 && (
        <div className="card-elevated rounded-2xl p-4 mb-5">
          <div className="section-label mb-1">Prévision Impôt sur le Revenu {currentYear}</div>
          <div className="text-[10px] text-muted-foreground mb-3">Estimation indicative · Abattement 34% · 1 part · Revenus uniques</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted-foreground">Revenu imposable estimé</div>
              <div className="value-lg text-[18px] text-foreground">{revenuImposable.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-muted-foreground">IR estimé</div>
              <div className="value-lg text-[22px] text-warning">{irEstime.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
            </div>
          </div>
        </div>
      )}
      </>}
    </div>
  );
}
