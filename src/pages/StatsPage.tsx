import { useMemo, useState } from "react";
import { useApp } from "@/store/AppContext";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import AnnualWrapped from "@/components/stats/AnnualWrapped";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const QUARTERS = [
  { label: "T1", months: ["01", "02", "03"] },
  { label: "T2", months: ["04", "05", "06"] },
  { label: "T3", months: ["07", "08", "09"] },
  { label: "T4", months: ["10", "11", "12"] },
];

function formatMonth(m: string): string {
  const [y, mo] = m.split("-");
  return `${MONTHS[parseInt(mo) - 1]} ${y.slice(2)}`;
}

const PIE_COLORS = [
  "hsl(348, 63%, 40%)", "hsl(152, 55%, 50%)", "hsl(217, 70%, 58%)",
  "hsl(38, 92%, 55%)", "hsl(280, 50%, 55%)", "hsl(45, 80%, 50%)",
];

const SEUIL_MICRO = 77700;
const SEUIL_TVA = 36800;
const TAUX_URSSAF = 0.261;

export default function StatsPage() {
  const { financeEntries, expenses, prospects, offres, portageMonths, urssafMode, setUrssafMode } = useApp();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [showWrapped, setShowWrapped] = useState(false);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const yearEntries = useMemo(() => financeEntries.filter(e => e.month.startsWith(String(currentYear))), [financeEntries, currentYear]);
  const yearExpenses = useMemo(() => expenses.filter(e => e.month.startsWith(String(currentYear))), [expenses, currentYear]);

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

  // Micro CA (excluding portage-eligible entries when portage is active for that month)
  const getMicroCA = (entries: typeof financeEntries) => {
    return entries.filter(e => {
      const portageOn = portageMonths[e.month] ?? false;
      const o = offres.find(of => of.name === e.offre);
      if (portageOn && o?.portageEligible) return false;
      if (e.paymentMode === "especes") return e.cashDeclaration === "micro";
      if (!portageOn) return true;
      return e.type === "micro";
    }).reduce((s, e) => s + e.amount, 0);
  };

  // Filtered (month or year) — used for KPI cards
  const filteredCA = filteredEntries.reduce((s, e) => s + e.amount, 0);
  const filteredExp = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const filteredMicroCA = useMemo(() => getMicroCA(filteredEntries), [filteredEntries, portageMonths, offres]);
  const filteredURSSAF = filteredMicroCA * TAUX_URSSAF;
  const filteredNet = filteredCA - filteredURSSAF - filteredExp;
  const filteredTVA = useMemo(() => {
    return filteredEntries.filter(e => offres.find(o => o.name === e.offre)?.tvaEnabled)
      .reduce((s, e) => s + e.amount, 0) * 0.20;
  }, [filteredEntries, offres]);

  // Year-level values for URSSAF table, projections
  const yearlyCA = yearEntries.reduce((s, e) => s + e.amount, 0);
  const yearlyExpenses = yearExpenses.reduce((s, e) => s + e.amount, 0);
  const yearlyMicroCA = useMemo(() => getMicroCA(yearEntries), [yearEntries, portageMonths, offres]);
  const yearlyURSSAF = yearlyMicroCA * TAUX_URSSAF;
  const yearlyNet = yearlyCA - yearlyURSSAF - yearlyExpenses;

  // URSSAF breakdown by period
  const urssafBreakdown = useMemo(() => {
    if (urssafMode === "trimestre") {
      return QUARTERS.map(q => {
        const entries = yearEntries.filter(e => {
          const mo = e.month.split("-")[1];
          return q.months.includes(mo);
        });
        const microCA = getMicroCA(entries);
        const totalCA = entries.reduce((s, e) => s + e.amount, 0);
        const urssaf = microCA * TAUX_URSSAF;
        const isPast = q.months.every(mo => parseInt(mo) - 1 <= currentMonth);
        const isCurrent = q.months.some(mo => parseInt(mo) - 1 === currentMonth);
        return { label: q.label, ca: totalCA, microCA, urssaf, isPast, isCurrent };
      });
    } else {
      return Array.from({ length: currentMonth + 1 }, (_, i) => {
        const mk = `${currentYear}-${String(i + 1).padStart(2, "0")}`;
        const entries = yearEntries.filter(e => e.month === mk);
        const microCA = getMicroCA(entries);
        const totalCA = entries.reduce((s, e) => s + e.amount, 0);
        return { label: MONTHS[i], ca: totalCA, microCA, urssaf: microCA * TAUX_URSSAF, isPast: i < currentMonth, isCurrent: i === currentMonth };
      });
    }
  }, [yearEntries, urssafMode, currentYear, currentMonth, portageMonths]);

  // TVA (year-level for gauges/year view)
  const tvaTotalOffres = useMemo(() => {
    return yearEntries.filter(e => {
      const offre = offres.find(o => o.name === e.offre);
      return offre?.tvaEnabled;
    }).reduce((s, e) => s + e.amount, 0);
  }, [yearEntries, offres]);
  const tvaAmount = tvaTotalOffres * 0.20;

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
      const exp = expenses.filter(e => e.month === mk).reduce((s, e) => s + e.amount, 0);
      data.push({ month: MONTHS[m], ca, net: ca - (ca * TAUX_URSSAF) - exp });
    }
    return data;
  }, [financeEntries, expenses, currentYear, currentMonth]);

  // Offer breakdown
  const offerStats = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    yearEntries.forEach(e => {
      if (e.offre) {
        if (!map[e.offre]) map[e.offre] = { count: 0, revenue: 0 };
        map[e.offre].count++;
        map[e.offre].revenue += e.amount;
      }
    });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).map(([name, data], i) => ({
      name, ...data, color: PIE_COLORS[i % PIE_COLORS.length]
    }));
  }, [yearEntries]);

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
        <AnnualWrapped year={currentYear} financeEntries={financeEntries} expenses={expenses} prospects={prospects} offres={offres} onClose={() => setShowWrapped(false)} />
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
          Taux : {(TAUX_URSSAF * 100).toFixed(1)}% · Base : CA Micro-entreprise (hors Portage)
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
