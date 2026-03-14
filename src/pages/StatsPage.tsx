import { useMemo } from "react";
import { useApp } from "@/store/AppContext";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

function parseDate(d: string): Date | null {
  if (!d) return null;
  const parts = d.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
}

function getMonthKey(d: string): string {
  const date = parseDate(d);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function formatMonthLabel(m: string): string {
  const [y, mo] = m.split("-");
  return `${MONTH_LABELS[parseInt(mo) - 1]} ${y.slice(2)}`;
}

export default function StatsPage() {
  const { prospects, activResetClients, financeEntries, expenses, versementsPerso } = useApp();

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const monthMap: Record<string, { rdv: number; bilans: number; closings: number; ca: number }> = {};

    prospects.forEach(p => {
      const mk = getMonthKey(p.date);
      if (!mk) return;
      if (!monthMap[mk]) monthMap[mk] = { rdv: 0, bilans: 0, closings: 0, ca: 0 };
      monthMap[mk].rdv++;
      if (p.presence === "OUI") monthMap[mk].bilans++;
      if (p.closing === "OUI") {
        monthMap[mk].closings++;
        monthMap[mk].ca += p.prixReel || 0;
      }
    });

    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({
        month: formatMonthLabel(month),
        ...data,
        taux: data.bilans > 0 ? Math.round((data.closings / data.bilans) * 100) : 0,
      }));
  }, [prospects]);

  // Global KPIs
  const totalRdv = prospects.filter(p => p.statut === "RDV").length;
  const totalBilans = prospects.filter(p => p.presence === "OUI").length;
  const totalClosings = prospects.filter(p => p.closing === "OUI").length;
  const tauxClosing = totalBilans > 0 ? Math.round((totalClosings / totalBilans) * 100) : 0;
  const caTotal = prospects.reduce((sum, p) => sum + (p.prixReel || 0), 0);

  // Top sources
  const sourceStats = useMemo(() => {
    const map: Record<string, { total: number; closed: number }> = {};
    prospects.forEach(p => {
      if (!map[p.source]) map[p.source] = { total: 0, closed: 0 };
      map[p.source].total++;
      if (p.closing === "OUI") map[p.source].closed++;
    });
    return Object.entries(map)
      .map(([source, data]) => ({ source, ...data, rate: data.total > 0 ? Math.round((data.closed / data.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [prospects]);

  // Top objections
  const objectionStats = useMemo(() => {
    const map: Record<string, number> = {};
    prospects.forEach(p => {
      if (p.objection && p.objection !== "AUCUNE") {
        map[p.objection] = (map[p.objection] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [prospects]);

  // Versement history
  const versementData = useMemo(() => {
    return Object.entries(versementsPerso)
      .filter(([_, v]) => v !== null)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, amount]) => ({
        month: formatMonthLabel(month),
        amount: amount || 0,
      }));
  }, [versementsPerso]);

  // Activ Reset summary
  const arActive = activResetClients.filter(c => c.currentPhase < c.phases.length - 1 || !c.phases[c.phases.length - 1]?.done).length;
  const arCertified = activResetClients.filter(c => c.phases[c.phases.length - 1]?.done).length;

  return (
    <div className="px-3.5 pb-8">
      <h1 className="font-display text-[25px] font-extrabold text-foreground mb-0.5 pt-1">Statistiques</h1>
      <p className="text-xs text-muted-foreground mb-3.5">Mes performances</p>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: "RDV TOTAL", value: totalRdv, color: "text-foreground" },
          { label: "BILANS", value: totalBilans, color: "text-foreground" },
          { label: "CLOSINGS", value: totalClosings, color: "text-success" },
          { label: "TAUX CLOSING", value: `${tauxClosing}%`, color: "text-bordeaux-2" },
        ].map(k => (
          <div key={k.label} className="glass-card rounded-xl p-3 relative overflow-hidden text-center">
            <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">{k.label}</div>
            <div className={`text-[30px] font-bold leading-none ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* CA 6 mois */}
      <div className="glass-card rounded-xl p-3.5 relative overflow-hidden mb-4">
        <div className="text-[10px] uppercase tracking-[2px] text-bordeaux-2 font-bold mb-3">ÉVOLUTION MENSUELLE</div>
        {monthlyData.length > 0 ? (
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="colorCA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(148, 33%, 46%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(148, 33%, 46%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorClosings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(348, 63%, 38%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(348, 63%, 38%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "hsl(25, 15%, 62%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(25, 15%, 62%)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(0, 8%, 8%)", border: "1px solid hsl(0, 0%, 100%, 0.1)", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "hsl(30, 50%, 93%)" }}
                />
                <Area type="monotone" dataKey="bilans" stroke="hsl(210, 45%, 47%)" fill="none" strokeDasharray="5 5" strokeWidth={2} />
                <Area type="monotone" dataKey="closings" stroke="hsl(348, 63%, 38%)" fill="url(#colorClosings)" strokeWidth={2} dot={{ fill: "hsl(348, 63%, 38%)", r: 3 }} />
                <Area type="monotone" dataKey="rdv" stroke="hsl(148, 33%, 46%)" fill="url(#colorCA)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">Pas encore de données</div>
        )}
        <div className="flex gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-3 h-0.5 bg-success rounded" /> RDV</div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-3 h-0.5 bg-info rounded" style={{ borderBottom: "1px dashed" }} /> Bilans</div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-3 h-0.5 bg-bordeaux-2 rounded" /> Closings</div>
        </div>
      </div>

      {/* Historique mensuel */}
      {monthlyData.length > 0 && (
        <div className="glass-card rounded-xl p-3.5 relative overflow-hidden mb-4">
          <div className="text-[10px] uppercase tracking-[2px] text-bordeaux-2 font-bold mb-3">HISTORIQUE MENSUEL</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground uppercase tracking-wider">
                  <th className="text-left py-1.5 font-semibold">MOIS</th>
                  <th className="text-center py-1.5 font-semibold">RDV</th>
                  <th className="text-center py-1.5 font-semibold">BILANS</th>
                  <th className="text-center py-1.5 font-semibold">CLOSINGS</th>
                  <th className="text-center py-1.5 font-semibold">TAUX</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map(m => (
                  <tr key={m.month} className="border-t border-border">
                    <td className="py-2 text-foreground font-medium">{m.month}</td>
                    <td className="py-2 text-center text-foreground">{m.rdv}</td>
                    <td className="py-2 text-center text-info">{m.bilans}</td>
                    <td className="py-2 text-center text-success">{m.closings}</td>
                    <td className="py-2 text-center text-bordeaux-2 font-bold">{m.taux}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sources */}
      <div className="glass-card rounded-xl p-3.5 relative overflow-hidden mb-4">
        <div className="text-[10px] uppercase tracking-[2px] text-bordeaux-2 font-bold mb-3">TOP SOURCES</div>
        {sourceStats.map(s => {
          const maxTotal = Math.max(...sourceStats.map(x => x.total));
          return (
            <div key={s.source} className="mb-2.5">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{s.source}</span>
                <span className="text-foreground font-medium">{s.total} ({s.rate}%)</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(s.total / maxTotal) * 100}%`, background: "linear-gradient(90deg, hsl(var(--bordeaux)), hsl(var(--bordeaux2)))" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Objections */}
      {objectionStats.length > 0 && (
        <div className="glass-card rounded-xl p-3.5 relative overflow-hidden mb-4">
          <div className="text-[10px] uppercase tracking-[2px] text-bordeaux-2 font-bold mb-3">OBJECTIONS</div>
          {objectionStats.map(([obj, count]) => (
            <div key={obj} className="flex items-center justify-between py-1.5 border-b border-border last:border-none">
              <span className="text-sm text-foreground">{obj}</span>
              <span className="text-sm font-bold text-warning">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Activ Reset Summary */}
      <div className="glass-card rounded-xl p-3.5 relative overflow-hidden mb-4">
        <div className="text-[10px] uppercase tracking-[2px] text-bordeaux-2 font-bold mb-3">ACTIV RESET</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{activResetClients.length}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">TOTAL</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">{arActive}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">EN COURS</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">{arCertified}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">CERTIFIED</div>
          </div>
        </div>
      </div>

      {/* Versement Perso History */}
      {versementData.length > 0 && (
        <div className="glass-card rounded-xl p-3.5 relative overflow-hidden mb-4">
          <div className="text-[10px] uppercase tracking-[2px] text-bordeaux-2 font-bold mb-3">VERSEMENTS PERSO</div>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={versementData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "hsl(25, 15%, 62%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(25, 15%, 62%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(0, 8%, 8%)", border: "1px solid hsl(0, 0%, 100%, 0.1)", borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="amount" stroke="hsl(148, 33%, 46%)" strokeWidth={2} dot={{ fill: "hsl(148, 33%, 46%)", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
