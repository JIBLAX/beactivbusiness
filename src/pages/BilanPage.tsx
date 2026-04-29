import { useState, useMemo } from "react";
import { useApp } from "@/store/AppContext";
import { generateBilanPDF, generateAnnualBilanPDF } from "@/lib/pdfExport";
import type { AnnualMonthSnap } from "@/lib/pdfExport";
import { getFiscalReminders, getDaysUntil, getStatusColor, getStatusLabel } from "@/lib/fiscalDates";
import { useBaSalesMonth, useBaSalesYear } from "@/hooks/useBaSalesMonth";
import { useFjmProOps } from "@/hooks/useFjmProOps";
import AnnualWrapped from "@/components/stats/AnnualWrapped";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(m: string): string {
  const [y, mo] = m.split("-");
  return `${MONTHS[parseInt(mo) - 1]} ${y}`;
}

function getQuarterMonths(year: number, quarter: number): string[] {
  const startMonth = (quarter - 1) * 3 + 1;
  return [0, 1, 2].map(i => `${year}-${String(startMonth + i).padStart(2, "0")}`);
}

export default function BilanPage() {
  const { financeEntries, expenses, portageMonths, offres, prospects, urssafMode, versementsPerso } = useApp();
  const selectedMonth = getCurrentMonth();
  const currentYear = new Date().getFullYear();

  const [showSapTable, setShowSapTable] = useState(false);
  const [showTva, setShowTva] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showWrapped, setShowWrapped] = useState(false);
  const [wrappedYear, setWrappedYear] = useState(currentYear);
  const [sapYear, setSapYear] = useState(currentYear);
  const [sapQuarter, setSapQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));

  const { sales: baSales, total: baSalesTotal } = useBaSalesMonth(selectedMonth);
  const { sales: baSalesYear } = useBaSalesYear(sapYear);
  const { sales: baSalesWrapped } = useBaSalesYear(wrappedYear);
  const { ops: fjmOps } = useFjmProOps(selectedMonth);
  const fjmRevenuTotal = fjmOps.filter(o => o.family === "revenu").reduce((s, o) => s + (o.actual || 0), 0);
  const fjmChargesTotal = fjmOps.filter(o => o.family !== "revenu").reduce((s, o) => s + (o.actual || 0), 0);

  const portageEnabled = portageMonths[selectedMonth] ?? false;
  const monthEntries = useMemo(() => financeEntries.filter(e => e.month === selectedMonth), [financeEntries, selectedMonth]);
  const monthExpenses = useMemo(() => expenses.filter(e => e.month === selectedMonth), [expenses, selectedMonth]);

  const isPortageEligible = (e: any) => {
    const o = offres.find(of => of.name === e.offre);
    return o?.portageEligible ?? false;
  };

  const localMicro = monthEntries.filter(e => {
    if (portageEnabled && isPortageEligible(e)) return false;
    if (e.paymentMode === "especes") return e.cashDeclaration === "micro";
    if (!portageEnabled) return true;
    return e.type === "micro";
  }).reduce((s, e) => s + e.amount, 0);

  const declaredMicro = localMicro + baSalesTotal;

  const declaredPortage = portageEnabled ? monthEntries.filter(e => {
    if (isPortageEligible(e)) return true;
    if (e.paymentMode === "especes") return e.cashDeclaration === "portage";
    return e.type === "portage";
  }).reduce((s, e) => s + e.amount, 0) : 0;

  const especesNonDeclarees = monthEntries.filter(e => e.paymentMode === "especes" && e.cashDeclaration === "non_declare").reduce((s, e) => s + e.amount, 0);
  const totalReel = monthEntries
    .filter(e => !(e.paymentMode === "especes" && e.cashDeclaration === "non_declare"))
    .reduce((s, e) => s + e.amount, 0) + baSalesTotal + fjmRevenuTotal;
  const totalDepenses = monthExpenses.reduce((s, e) => s + e.amount, 0) + fjmChargesTotal;
  const urssaf = declaredMicro * 0.261;
  const beneficeNet = totalReel - urssaf - totalDepenses;
  const monthVersements = versementsPerso[selectedMonth] ?? {};

  const tvaEntries = useMemo(() => monthEntries.filter(e => {
    const offre = offres.find(o => o.name === e.offre);
    return offre?.tvaEnabled;
  }), [monthEntries, offres]);
  const tvaCollectee = tvaEntries.reduce((s, e) => s + e.amount, 0) * 0.20;

  const sapClientNames = useMemo(() => new Set(prospects.filter(p => p.sapEnabled).map(p => p.name)), [prospects]);
  const sapMonths = useMemo(() => getQuarterMonths(sapYear, sapQuarter), [sapYear, sapQuarter]);
  const sapData = useMemo(() => {
    return sapMonths.map(month => {
      const entries = financeEntries.filter(e => e.month === month && e.clientName && sapClientNames.has(e.clientName));
      const baSap = baSalesYear.filter(s => s.date.startsWith(month) && s.is_sap);
      const uniqueClients = new Set([
        ...entries.map(e => e.clientName),
        ...baSap.map(s => s.client_name),
      ].filter(Boolean) as string[]);
      return {
        month,
        nbClients: uniqueClients.size,
        hours: entries.reduce((s, e) => s + (e.sapHours || 0), 0) + baSap.reduce((s, b) => s + (b.sap_hours || 0), 0),
        ca: entries.reduce((s, e) => s + e.amount, 0) + baSap.reduce((s, b) => s + b.amount, 0),
      };
    });
  }, [sapMonths, financeEntries, sapClientNames, baSalesYear]);

  const reminders = useMemo(() => getFiscalReminders(currentYear, urssafMode), [currentYear, urssafMode]);
  const upcomingReminders = reminders.filter(r => getDaysUntil(r.date) >= 0).slice(0, 5);
  const nextReminder = upcomingReminders[0];

  const annualYearComplete = wrappedYear < currentYear;

  const handleAnnualExportPDF = () => {
    const allMonths = Array.from({ length: 12 }, (_, i) =>
      `${wrappedYear}-${String(i + 1).padStart(2, "0")}`
    );
    const months: AnnualMonthSnap[] = allMonths.map(month => {
      const entries = financeEntries.filter(e => e.month === month);
      const exps = expenses.filter(e => e.month === month);
      const baTotal = baSalesWrapped.filter(s => s.date?.startsWith(month)).reduce((s, e) => s + e.amount, 0);
      const portageOn = portageMonths[month] ?? false;
      const localMicroM = entries.filter(e => {
        if (portageOn) return false;
        if (e.paymentMode === "especes") return e.cashDeclaration === "micro";
        return true;
      }).reduce((s, e) => s + e.amount, 0);
      const declared = localMicroM + baTotal;
      const urssafM = declared * 0.261;
      const localReel = entries
        .filter(e => !(e.paymentMode === "especes" && e.cashDeclaration === "non_declare"))
        .reduce((s, e) => s + e.amount, 0);
      const totalReel = localReel + baTotal;
      const totalDep = exps.reduce((s, e) => s + e.amount, 0);
      return {
        month,
        totalReel,
        declaredMicro: declared,
        urssaf: urssafM,
        totalDepenses: totalDep,
        beneficeNet: totalReel - urssafM - totalDep,
        baSalesTotal: baTotal,
      };
    });
    generateAnnualBilanPDF({ year: wrappedYear, months });
  };

  const handleExportPDF = () => {
    generateBilanPDF({
      month: selectedMonth,
      totalReel,
      declaredMicro,
      declaredPortage,
      especesNonDeclarees,
      urssaf,
      totalDepenses,
      beneficeNet,
      gestionPerso: 0,
      restePerso: beneficeNet,
      entries: monthEntries,
      expenses: monthExpenses,
      portageEnabled,
      tvaAmount: tvaCollectee,
      versements: monthVersements,
      baSales,
    });
  };

  return (
    <div className="px-4 pt-4 pb-24">
      {showWrapped && (
        <AnnualWrapped
          year={wrappedYear}
          financeEntries={financeEntries}
          expenses={expenses}
          prospects={prospects}
          offres={offres}
          baSales={baSalesWrapped}
          onClose={() => setShowWrapped(false)}
        />
      )}

      <h1 className="font-display text-[22px] font-bold text-foreground mb-5">Bilan</h1>

      {/* Annual Wrapped */}
      <div className="card-elevated rounded-2xl p-4 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: "hsl(348 63% 30% / 0.15)" }}>🎁</div>
            <div>
              <div className="text-[13px] font-semibold text-foreground">Annual Wrapped</div>
              <div className="text-[10px] text-muted-foreground">Résumé visuel de l'année</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={wrappedYear} onChange={e => setWrappedYear(Number(e.target.value))}
              className="rounded-xl px-2 py-1.5 text-xs input-field">
              {[currentYear - 1, currentYear].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => setShowWrapped(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white btn-primary">
              Voir
            </button>
          </div>
        </div>
      </div>

      {/* PDF Export — Mensuel */}
      <button onClick={handleExportPDF}
        className="w-full rounded-2xl p-4 flex items-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] mb-3"
        style={{ background: "linear-gradient(135deg, hsl(348 63% 30%), hsl(348 63% 22%))", border: "1px solid hsl(348 63% 40% / 0.3)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: "hsl(0 0% 100% / 0.1)" }}>📄</div>
        <div className="flex-1 text-left">
          <div className="text-[13px] font-semibold text-white">Bilan Mensuel PDF</div>
          <div className="text-[10px] text-white/60">{formatMonth(selectedMonth)} — Télécharger le récap</div>
        </div>
        <span className="text-white/40 text-sm">↓</span>
      </button>

      {/* PDF Export — Annuel */}
      <div className="card-elevated rounded-2xl p-4 flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: annualYearComplete ? "hsl(348 63% 30% / 0.15)" : "hsl(0 0% 100% / 0.04)" }}>
          🗓️
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-foreground">Bilan Annuel PDF</div>
          <div className="text-[10px] text-muted-foreground">
            {annualYearComplete
              ? `Exercice ${wrappedYear} complet — prêt à exporter`
              : `Disponible après clôture de l'exercice ${wrappedYear}`}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select value={wrappedYear} onChange={e => setWrappedYear(Number(e.target.value))}
            className="rounded-xl px-2 py-1.5 text-xs input-field">
            {[currentYear - 1, currentYear].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={handleAnnualExportPDF}
            disabled={!annualYearComplete}
            className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={annualYearComplete
              ? { background: "linear-gradient(135deg, hsl(348 63% 30%), hsl(348 63% 22%))", color: "white", border: "1px solid hsl(348 63% 40% / 0.3)" }
              : { background: "hsl(0 0% 100% / 0.04)", color: "hsl(0 0% 100% / 0.25)", border: "1px solid hsl(0 0% 100% / 0.06)", cursor: "not-allowed" }
            }>
            {annualYearComplete ? "↓ Export" : "🔒 Fermé"}
          </button>
        </div>
      </div>

      {/* NOVA SAP */}
      <div className="card-elevated rounded-2xl mb-3 overflow-hidden">
        <button onClick={() => setShowSapTable(!showSapTable)}
          className="w-full p-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: "hsl(217 70% 60% / 0.1)" }}>📋</div>
            <div>
              <div className="text-[13px] font-semibold text-foreground">NOVA SAP</div>
              <div className="text-[10px] text-muted-foreground">
                {sapClientNames.size} client{sapClientNames.size > 1 ? "s" : ""} SAP · Déclarations
              </div>
            </div>
          </div>
          <span className={`text-muted-foreground text-xs transition-transform ${showSapTable ? "rotate-180" : ""}`}>▾</span>
        </button>

        {showSapTable && (
          <div className="px-4 pb-4 animate-fade-up" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)" }}>
            <div className="flex gap-2 mt-3 mb-3">
              <select value={sapYear} onChange={e => setSapYear(Number(e.target.value))}
                className="flex-1 rounded-xl px-3 py-2 text-sm input-field">
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(q => (
                  <button key={q} onClick={() => setSapQuarter(q)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${sapQuarter === q ? "text-foreground btn-primary" : "text-muted-foreground"}`}
                    style={sapQuarter !== q ? { background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.06)" } : undefined}>
                    T{q}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(0 0% 100% / 0.06)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "hsl(0 0% 100% / 0.03)" }}>
                    <th className="text-left p-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Mois</th>
                    <th className="text-center p-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Clients</th>
                    <th className="text-center p-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Heures</th>
                    <th className="text-right p-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">CA</th>
                  </tr>
                </thead>
                <tbody>
                  {sapData.map((row, i) => (
                    <tr key={row.month} style={{ borderTop: i > 0 ? "1px solid hsl(0 0% 100% / 0.04)" : undefined }}>
                      <td className="p-3 font-medium text-foreground text-[13px]">{formatMonth(row.month)}</td>
                      <td className="p-3 text-center text-foreground">{row.nbClients}</td>
                      <td className="p-3 text-center text-foreground">{row.hours}h</td>
                      <td className="p-3 text-right value-lg text-success">{row.ca.toFixed(0)}€</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* TVA Tracking */}
      <div className="card-elevated rounded-2xl mb-3 overflow-hidden">
        <button onClick={() => setShowTva(!showTva)}
          className="w-full p-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: "hsl(38 92% 55% / 0.1)" }}>🧾</div>
            <div>
              <div className="text-[13px] font-semibold text-foreground">Suivi TVA</div>
              <div className="text-[10px] text-muted-foreground">
                {tvaCollectee > 0 ? `${tvaCollectee.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€ collectée ce mois` : "Aucune TVA ce mois"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tvaCollectee > 0 && (
              <span className="text-[13px] font-semibold" style={{ color: "hsl(38 92% 55%)" }}>
                {tvaCollectee.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
              </span>
            )}
            <span className={`text-muted-foreground text-xs transition-transform ${showTva ? "rotate-180" : ""}`}>▾</span>
          </div>
        </button>

        {showTva && (
          <div className="px-4 pb-4 animate-fade-up" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)" }}>
            {tvaEntries.length > 0 ? (
              <>
                <div className="pt-3 space-y-2">
                  {tvaEntries.map(e => (
                    <div key={e.id} className="flex items-center justify-between rounded-xl p-2.5" style={{ background: "hsl(0 0% 100% / 0.02)" }}>
                      <div>
                        <div className="text-[12px] font-medium text-foreground">{e.clientName || e.label}</div>
                        <div className="text-[10px] text-muted-foreground">{e.offre}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[12px] font-semibold text-foreground">{e.amount.toLocaleString("fr-FR")}€ HT</div>
                        <div className="text-[10px] font-medium" style={{ color: "hsl(38 92% 55%)" }}>+{(e.amount * 0.20).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€ TVA</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl p-3 flex items-center justify-between" style={{ background: "hsl(38 92% 55% / 0.08)", border: "1px solid hsl(38 92% 55% / 0.15)" }}>
                  <span className="text-[11px] font-semibold text-foreground">TVA à reverser</span>
                  <span className="text-[15px] font-bold" style={{ color: "hsl(38 92% 55%)" }}>{tvaCollectee.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</span>
                </div>
              </>
            ) : (
              <div className="pt-3 text-center text-[12px] text-muted-foreground py-6">
                Aucune entrée avec TVA activée ce mois
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fiscal Reminders */}
      <div className="card-elevated rounded-2xl mb-4 overflow-hidden">
        <button onClick={() => setShowReminders(!showReminders)}
          className="w-full p-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: "hsl(152 55% 52% / 0.1)" }}>📅</div>
            <div>
              <div className="text-[13px] font-semibold text-foreground">Échéances Fiscales</div>
              <div className="text-[10px] text-muted-foreground">
                {nextReminder ? `Prochain : ${nextReminder.label}` : "Aucune échéance à venir"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {nextReminder && (
              <span className="text-[11px] font-semibold" style={{ color: getStatusColor(getDaysUntil(nextReminder.date)) }}>
                {getStatusLabel(getDaysUntil(nextReminder.date))}
              </span>
            )}
            <span className={`text-muted-foreground text-xs transition-transform ${showReminders ? "rotate-180" : ""}`}>▾</span>
          </div>
        </button>

        {showReminders && (
          <div className="px-4 pb-4 animate-fade-up space-y-2" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)" }}>
            <div className="pt-3" />
            {upcomingReminders.map(r => {
              const days = getDaysUntil(r.date);
              const color = getStatusColor(days);
              return (
                <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl p-3 transition-all hover:scale-[1.01]"
                  style={{ background: "hsl(0 0% 100% / 0.02)", border: "1px solid hsl(0 0% 100% / 0.04)" }}>
                  <div className="text-xl">{r.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-foreground">{r.label}</div>
                    <div className="text-[10px] text-muted-foreground">{r.description}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[11px] font-bold" style={{ color }}>{getStatusLabel(days)}</span>
                    <span className="text-[9px] text-muted-foreground/60">↗ Accéder</span>
                  </div>
                </a>
              );
            })}
            {reminders.filter(r => getDaysUntil(r.date) < 0).length > 0 && (
              <div className="text-[10px] text-muted-foreground text-center pt-2">
                {reminders.filter(r => getDaysUntil(r.date) < 0).length} échéance(s) passée(s) masquée(s)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
