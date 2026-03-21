import { useMemo } from "react";
import { useApp } from "@/store/AppContext";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function formatMonth(m: string): string {
  const [y, mo] = m.split("-");
  return `${MONTHS[parseInt(mo) - 1]} ${y.slice(2)}`;
}

const PIE_COLORS = [
  "hsl(348, 63%, 40%)", "hsl(152, 55%, 50%)", "hsl(217, 70%, 58%)",
  "hsl(38, 92%, 55%)", "hsl(280, 50%, 55%)", "hsl(45, 80%, 50%)",
  "hsl(330, 60%, 50%)", "hsl(180, 50%, 45%)", "hsl(0, 62%, 50%)",
];

const SEUIL_MICRO = 77700;
const SEUIL_TVA = 36800;

export default function StatsPage() {
  const { financeEntries, expenses, prospects, offres, portageMonths } = useApp();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Year entries only
  const yearEntries = useMemo(() => financeEntries.filter(e => e.month.startsWith(String(currentYear))), [financeEntries, currentYear]);
  const yearExpenses = useMemo(() => expenses.filter(e => e.month.startsWith(String(currentYear))), [expenses, currentYear]);

  const yearlyCA = yearEntries.reduce((s, e) => s + e.amount, 0);
  const yearlyExpenses = yearExpenses.reduce((s, e) => s + e.amount, 0);

  // Monthly CA data for chart
  const monthlyData = useMemo(() => {
    const data: { month: string; ca: number; expenses: number; net: number }[] = [];
    for (let m = 0; m <= currentMonth; m++) {
      const mk = `${currentYear}-${String(m + 1).padStart(2, "0")}`;
      const ca = financeEntries.filter(e => e.month === mk).reduce((s, e) => s + e.amount, 0);
      const exp = expenses.filter(e => e.month === mk).reduce((s, e) => s + e.amount, 0);
      const urssaf = ca * 0.261;
      data.push({ month: formatMonth(mk), ca, expenses: exp, net: ca - urssaf - exp });
    }
    return data;
  }, [financeEntries, expenses, currentYear, currentMonth]);

  // Yearly URSSAF
  const yearlyMicroCA = useMemo(() => {
    return yearEntries.filter(e => {
      const month = e.month;
      const portageOn = portageMonths[month] ?? false;
      if (portageOn && (e.offre?.includes("ACTIV RESET") || e.offre?.includes("ACTIV PROGRAM"))) return false;
      if (e.paymentMode === "especes") return e.cashDeclaration === "micro";
      return e.type === "micro";
    }).reduce((s, e) => s + e.amount, 0);
  }, [yearEntries, portageMonths]);

  const yearlyURSSAF = yearlyMicroCA * 0.261;
  const yearlyNet = yearlyCA - yearlyURSSAF - yearlyExpenses;

  // TVA calculation
  const tvaTotalOffres = useMemo(() => {
    return yearEntries.filter(e => {
      const offre = offres.find(o => o.name === e.offre);
      return offre?.tvaEnabled;
    }).reduce((s, e) => s + e.amount, 0);
  }, [yearEntries, offres]);
  const tvaAmount = tvaTotalOffres * 0.20;

  // Clients count
  const clients = useMemo(() => prospects.filter(p => p.closing === "OUI" && p.offre && p.offre !== "-"), [prospects]);

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

  // Projections
  const monthsPassed = currentMonth + 1;
  const avgMonthlyCA = monthsPassed > 0 ? yearlyCA / monthsPassed : 0;
  const projectedCA = avgMonthlyCA * 12;
  const microPct = (projectedCA / SEUIL_MICRO) * 100;
  const tvaPct = (projectedCA / SEUIL_TVA) * 100;

  return (
    <div className="px-4 pt-4 pb-24">
      <h1 className="font-display text-[22px] font-bold text-foreground mb-1">Statistiques</h1>
      <p className="text-[12px] text-muted-foreground mb-5">Santé financière — {currentYear}</p>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="card-hero rounded-2xl p-4">
          <div className="section-label mb-1">CA {currentYear}</div>
          <div className="value-lg text-[26px] text-foreground">{yearlyCA.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
          <div className="text-[10px] text-muted-foreground mt-1">{avgMonthlyCA.toFixed(0)}€/mois moy.</div>
        </div>
        <div className="card-hero rounded-2xl p-4">
          <div className="section-label mb-1">Bénéfice Net</div>
          <div className={`value-lg text-[26px] ${yearlyNet >= 0 ? "text-success" : "text-destructive"}`}>
            {yearlyNet.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">{clients.length} clients</div>
        </div>
      </div>

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

      {/* CA Evolution Chart */}
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
                <Tooltip contentStyle={{ background: "hsl(0, 0%, 7%)", border: "1px solid hsl(0, 0%, 12%)", borderRadius: "12px", fontSize: "12px", boxShadow: "0 8px 24px hsl(0 0% 0% / 0.3)" }} labelStyle={{ color: "hsl(0, 0%, 96%)" }} />
                <Area type="monotone" dataKey="ca" stroke="hsl(152, 55%, 52%)" fill="url(#caGrad)" strokeWidth={2} dot={{ fill: "hsl(152, 55%, 52%)", r: 3, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="net" stroke="hsl(217, 70%, 60%)" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-3 justify-center">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><span className="w-3 h-0.5 rounded-full" style={{ background: "hsl(152, 55%, 52%)" }} /> CA</div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><span className="w-3 h-0.5 rounded-full" style={{ background: "hsl(217, 70%, 60%)", borderBottom: "1px dashed" }} /> Bénéfice</div>
          </div>
        </div>
      )}

      {/* Monthly breakdown table */}
      <div className="card-elevated rounded-2xl overflow-hidden mb-5">
        <div className="p-4 pb-2">
          <div className="section-label">Détail mensuel</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: "hsl(0 0% 100% / 0.02)" }}>
                <th className="text-left px-4 py-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Mois</th>
                <th className="text-right px-3 py-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">CA</th>
                <th className="text-right px-3 py-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Dép.</th>
                <th className="text-right px-4 py-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Net</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((m, i) => (
                <tr key={m.month} style={{ borderTop: i > 0 ? "1px solid hsl(0 0% 100% / 0.04)" : undefined }}>
                  <td className="px-4 py-2.5 font-medium text-foreground">{m.month}</td>
                  <td className="px-3 py-2.5 text-right value-lg text-success">{m.ca.toFixed(0)}€</td>
                  <td className="px-3 py-2.5 text-right text-destructive">{m.expenses.toFixed(0)}€</td>
                  <td className={`px-4 py-2.5 text-right value-lg ${m.net >= 0 ? "text-foreground" : "text-destructive"}`}>{m.net.toFixed(0)}€</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* Sex distribution */}
      {clients.length > 0 && (
        <div className="card-elevated rounded-2xl p-4 mb-5">
          <div className="section-label mb-3">Répartition H/F</div>
          <div className="flex items-center gap-6">
            <div className="w-[80px] h-[80px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[
                    { name: "F", value: clients.filter(c => c.sex === "F").length },
                    { name: "H", value: clients.filter(c => c.sex === "H").length },
                  ]} dataKey="value" cx="50%" cy="50%" innerRadius={22} outerRadius={38} strokeWidth={0}>
                    <Cell fill="hsl(330, 60%, 55%)" />
                    <Cell fill="hsl(210, 60%, 55%)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 flex-1">
              {[
                { label: "Femmes", value: clients.filter(c => c.sex === "F").length, color: "hsl(330, 60%, 55%)" },
                { label: "Hommes", value: clients.filter(c => c.sex === "H").length, color: "hsl(210, 60%, 55%)" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-[12px] text-foreground">{s.label}</span>
                  </div>
                  <span className="value-lg text-[13px] text-foreground">{s.value} <span className="text-muted-foreground font-normal text-[10px]">({clients.length > 0 ? Math.round((s.value / clients.length) * 100) : 0}%)</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
