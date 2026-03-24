import { useState, useMemo } from "react";
import { useApp } from "@/store/AppContext";
import { OFFRE_THEMES } from "@/data/types";
import { generateBilanPDF } from "@/lib/pdfExport";
import { getFiscalReminders, getDaysUntil, getStatusColor, getStatusLabel } from "@/lib/fiscalDates";
import { getMonthEditState, getSealedLabel } from "@/lib/quarterLock";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(m: string): string {
  const [y, mo] = m.split("-");
  return `${MONTHS[parseInt(mo) - 1]} ${y}`;
}

function calcUrssaf(ca: number): number { return ca * 0.261; }

function calcGestionPerso(revenuDispo: number): number {
  if (revenuDispo < 500) return 0;
  if (revenuDispo < 1000) return revenuDispo * 0.10;
  if (revenuDispo < 1500) return revenuDispo * 0.15;
  if (revenuDispo < 2000) return revenuDispo * 0.20;
  if (revenuDispo < 2500) return revenuDispo * 0.25;
  return revenuDispo * 0.30;
}

function getAllMonths(): string[] {
  const start = new Date(2025, 8, 1);
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 1);
  const months: string[] = [];
  const d = new Date(start);
  while (d <= end) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() + 1);
  }
  return months;
}


function getQuarterMonths(year: number, quarter: number): string[] {
  const startMonth = (quarter - 1) * 3 + 1;
  return [0, 1, 2].map(i => `${year}-${String(startMonth + i).padStart(2, "0")}`);
}

const PRORATA_BUREAU = 13 / 43;

export default function FinancesPage() {
  const { financeEntries, expenses, portageMonths, setPortageMonths, versementsPerso, setVersementsPerso, offres, prospects, urssafMode, quarterEdits } = useApp();
  const selectedMonth = getCurrentMonth();
  const [showSapTable, setShowSapTable] = useState(false);
  const [showGestionDetail, setShowGestionDetail] = useState(false);
  const [showTva, setShowTva] = useState(false);
  const [showReminders, setShowReminders] = useState(false);

  const currentYear = new Date().getFullYear();
  const [sapYear, setSapYear] = useState(currentYear);
  const [sapQuarter, setSapQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));

  const portageEnabled = portageMonths[selectedMonth] ?? false;
  const editState = getMonthEditState(selectedMonth, quarterEdits);
  const editable = editState.editable;
  const sealedLabel = getSealedLabel(editState);

  const sapClientNames = useMemo(() => new Set(prospects.filter(p => p.sapEnabled).map(p => p.name)), [prospects]);

  const monthEntries = useMemo(() => financeEntries.filter(e => e.month === selectedMonth), [financeEntries, selectedMonth]);
  const monthExpenses = useMemo(() => expenses.filter(e => e.month === selectedMonth), [expenses, selectedMonth]);

  const isPortageEligible = (e: any) => {
    const o = offres.find(of => of.name === e.offre);
    return o?.portageEligible ?? false;
  };

  const declaredMicro = monthEntries.filter(e => {
    if (portageEnabled && isPortageEligible(e)) return false;
    if (e.paymentMode === "especes") return e.cashDeclaration === "micro";
    if (!portageEnabled) return true;
    return e.type === "micro";
  }).reduce((s, e) => s + e.amount, 0);

  const declaredPortage = portageEnabled ? monthEntries.filter(e => {
    if (isPortageEligible(e)) return true;
    if (e.paymentMode === "especes") return e.cashDeclaration === "portage";
    return e.type === "portage";
  }).reduce((s, e) => s + e.amount, 0) : 0;

  const especesNonDeclarees = monthEntries.filter(e => e.paymentMode === "especes" && e.cashDeclaration === "non_declare").reduce((s, e) => s + e.amount, 0);
  const totalReel = monthEntries.reduce((s, e) => s + e.amount, 0);
  const totalDepenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const urssaf = calcUrssaf(declaredMicro);
  const beneficeNet = totalReel - urssaf - totalDepenses;
  const gestionPerso = calcGestionPerso(beneficeNet);
  const restePerso = beneficeNet - gestionPerso;
  const monthVersements = versementsPerso[selectedMonth] ?? {};
  const totalVerse = Object.values(monthVersements).reduce((s, v) => s + (v ?? 0), 0);

  const bureauExpenses = monthExpenses.filter(e => e.category === "LOCAUX & BUREAUX");
  const prorataAmount = bureauExpenses.reduce((s, e) => s + e.amount, 0) * PRORATA_BUREAU;

  const sapMonths = useMemo(() => getQuarterMonths(sapYear, sapQuarter), [sapYear, sapQuarter]);
  const sapData = useMemo(() => {
    return sapMonths.map(month => {
      const entries = financeEntries.filter(e => e.month === month && e.clientName && sapClientNames.has(e.clientName));
      const uniqueClients = new Set(entries.map(e => e.clientName));
      return { month, nbClients: uniqueClients.size, hours: entries.reduce((s, e) => s + (e.sapHours || 0), 0), ca: entries.reduce((s, e) => s + e.amount, 0) };
    });
  }, [sapMonths, financeEntries, sapClientNames]);

  const fondsPro = gestionPerso * 0.15;
  const plaisirs = gestionPerso * 0.45;
  const epargne = gestionPerso * 0.15;
  const investPlus = gestionPerso * 0.15;
  const fondUrgence = beneficeNet > 0 ? gestionPerso * 0.10 : 0;

  // TVA tracking
  const tvaEntries = useMemo(() => monthEntries.filter(e => {
    const offre = offres.find(o => o.name === e.offre);
    return offre?.tvaEnabled;
  }), [monthEntries, offres]);
  const tvaCA = tvaEntries.reduce((s, e) => s + e.amount, 0);
  const tvaCollectee = tvaCA * 0.20;

  // Fiscal reminders
  const reminders = useMemo(() => getFiscalReminders(currentYear, urssafMode), [currentYear, urssafMode]);
  const upcomingReminders = reminders.filter(r => getDaysUntil(r.date) >= 0).slice(0, 5);
  const nextReminder = upcomingReminders[0];

  // PDF export handler
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
      gestionPerso,
      restePerso,
      entries: monthEntries,
      expenses: monthExpenses,
      portageEnabled: portageEnabled,
      tvaAmount: tvaCollectee,
      versements: monthVersements,
    });
  };

  return (
    <div className="px-4 pt-4 pb-24">
      {/* Month header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-foreground"
          style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
          {formatMonth(selectedMonth)}
        </div>
        {editState.sealed && (
          <div className="badge-pill" style={{
            background: editState.editsRemaining > 0 ? "hsl(38 92% 55% / 0.1)" : "hsl(0 62% 50% / 0.1)",
            color: editState.editsRemaining > 0 ? "hsl(38 92% 55%)" : "hsl(0 62% 60%)"
          }}>{sealedLabel}</div>
        )}
      </div>

      {/* Revenue hero card */}
      <div className="card-hero rounded-3xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-label mb-1">Revenus {formatMonth(selectedMonth)}</div>
            <div className="value-lg text-[36px] text-foreground leading-none">{totalReel.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: "hsl(348 63% 30% / 0.15)" }}>💰</div>
        </div>

        {(() => {
          const items = [
            { label: "CA Micro", sub: "Déclaré URSSAF", value: declaredMicro, color: "hsl(152 55% 52%)" },
            ...(especesNonDeclarees > 0 ? [{ label: "Espèces", sub: "Non déclarées", value: especesNonDeclarees, color: "hsl(38 92% 55%)" }] : []),
            ...(portageEnabled ? [{ label: "Portage JUMP", sub: "Via JUMP", value: declaredPortage, color: "hsl(217 70% 60%)" }] : []),
            { label: "URSSAF dû", sub: "26.1% du CA Micro", value: -urssaf, color: "hsl(0 62% 50%)" },
          ];
          const cols = items.length <= 2 ? "grid-cols-2" : items.length === 3 ? "grid-cols-3" : "grid-cols-2";
          return (
            <div className={`grid gap-2 ${cols}`}>
              {items.map(k => (
                <div key={k.label} className="rounded-2xl p-3 text-center" style={{ background: "hsl(0 0% 100% / 0.03)" }}>
                  <div className="value-lg text-[15px] leading-none mb-1" style={{ color: k.color }}>
                    {Math.abs(k.value).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
                  </div>
                  <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">{k.label}</div>
                  <div className="text-[8px] text-muted-foreground/60 mt-0.5">{k.sub}</div>
                </div>
              ))}
            </div>
          );
        })()}
        {portageEnabled && (
          <div className="mt-3 px-3 py-2 rounded-xl text-[10px] text-muted-foreground" style={{ background: "hsl(217 70% 60% / 0.08)", border: "1px solid hsl(217 70% 60% / 0.15)" }}>
            ℹ️ Les offres marquées <strong className="text-foreground">Portage</strong> passent par <strong className="text-foreground">JUMP</strong> — non déclarées à l'URSSAF.
          </div>
        )}
      </div>

      {/* Portage JUMP switch */}
      <div className="card-elevated rounded-2xl p-4 mb-3 flex items-center justify-between">
        <div>
          <div className="text-[13px] font-semibold text-foreground">Portage JUMP</div>
          <div className="text-[10px] text-muted-foreground">
            {portageEnabled ? "Actif — Offres éligibles exclues de l'URSSAF" : `Activer pour ${formatMonth(selectedMonth)}`}
          </div>
        </div>
        <button onClick={() => editable && setPortageMonths({ ...portageMonths, [selectedMonth]: !portageEnabled })}
          className={`w-12 h-7 rounded-full transition-all relative ${!editable ? "opacity-40" : ""}`}
          style={{ background: portageEnabled ? "hsl(152 55% 42%)" : "hsl(0 0% 15%)" }}
          disabled={!editable}>
          <div className={`absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white transition-all shadow-sm
            ${portageEnabled ? "left-[26px]" : "left-[3px]"}`} />
        </button>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="stat-card rounded-2xl p-4">
          <div className="section-label mb-2">Bénéfice Net</div>
          <div className={`value-lg text-[22px] ${beneficeNet >= 0 ? "text-success" : "text-destructive"}`}>
            {beneficeNet.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
          </div>
        </div>
        <div className="stat-card rounded-2xl p-4">
          <div className="section-label mb-2">Dépenses</div>
          <div className="value-lg text-[22px] text-destructive">
            -{totalDepenses.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
          </div>
        </div>
      </div>

      {/* Gestion Perso */}
      {(() => {
        const cats = [
          { key: "fondsPro", label: "FONDS PRO", value: fondsPro, color: "hsl(217 70% 60%)", pct: "15%" },
          { key: "plaisirs", label: "PLAISIRS", value: plaisirs, color: "hsl(38 92% 55%)", pct: "45%", sub: ["Cash", "Voyages", "Cadeaux"] },
          { key: "epargne", label: "ÉPARGNE", value: epargne, color: "hsl(152 55% 52%)", pct: "15%" },
          { key: "investPlus", label: "INVEST+", value: investPlus, color: "hsl(348 63% 45%)", pct: "15%" },
          { key: "fondUrgence", label: "FOND D'URGENCE", value: fondUrgence, color: "hsl(0 62% 50%)", pct: "10%" },
        ];
        const updateCatVersement = (catKey: string, val: string) => {
          if (!editable) return;
          const updated = { ...monthVersements, [catKey]: val ? Number(val) : null };
          setVersementsPerso({ ...versementsPerso, [selectedMonth]: updated });
        };
        return (
          <div className="card-elevated rounded-2xl mb-4 overflow-hidden">
            <button onClick={() => setShowGestionDetail(!showGestionDetail)}
              className="w-full p-4 flex items-center justify-between text-left">
              <div>
                <div className="section-label mb-1">Gestion Perso</div>
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Prévu</div>
                    <div className="value-lg text-[20px] text-warning">{gestionPerso.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
                  </div>
                  <div className="text-muted-foreground/30 text-lg">→</div>
                  <div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Versé</div>
                    <div className={`value-lg text-[20px] ${totalVerse > 0 ? (totalVerse >= gestionPerso ? "text-success" : "text-warning") : "text-muted-foreground/40"}`}>
                      {totalVerse > 0 ? `${totalVerse.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€` : "—"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Reste Perso</div>
                  <div className={`value-lg text-[16px] ${restePerso >= 0 ? "text-success" : "text-destructive"}`}>
                    {restePerso.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
                  </div>
                </div>
                <span className={`text-muted-foreground text-xs transition-transform ${showGestionDetail ? "rotate-180" : ""}`}>▾</span>
              </div>
            </button>

            {showGestionDetail && (
              <div className="px-4 pb-4 space-y-2 animate-fade-up" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)" }}>
                <div className="pt-3" />
                {cats.map(cat => {
                  const verse = monthVersements[cat.key] ?? null;
                  return (
                    <div key={cat.key} className="rounded-xl p-3" style={{ background: "hsl(0 0% 100% / 0.02)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                          <span className="text-[12px] font-semibold text-foreground">{cat.label}</span>
                          <span className="text-[10px] text-muted-foreground">{cat.pct}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: "hsl(0 0% 100% / 0.03)" }}>
                          <span className="text-[9px] text-muted-foreground uppercase w-10 flex-shrink-0">Prévu</span>
                          <span className="value-lg text-[13px] flex-1" style={{ color: cat.color }}>{cat.value.toFixed(0)}€</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: "hsl(0 0% 100% / 0.03)" }}>
                          <span className="text-[9px] text-muted-foreground uppercase w-10 flex-shrink-0">Versé</span>
                          <input type="number" value={verse ?? ""} onChange={e => updateCatVersement(cat.key, e.target.value)}
                            placeholder="—" disabled={!editable}
                            className="w-full bg-transparent text-[13px] font-semibold text-foreground outline-none disabled:opacity-40"
                            style={{ appearance: "textfield" }} />
                        </div>
                      </div>
                      {cat.sub && (
                        <div className="flex gap-4 mt-2 ml-4">
                          {cat.sub.map(s => (
                            <span key={s} className="text-[10px] text-muted-foreground">{s}: {(plaisirs / 3).toFixed(0)}€</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Prorata Bureau */}
      {prorataAmount > 0 && (
        <div className="stat-card rounded-2xl p-4 mb-4">
          <div className="section-label mb-1">Prorata Bureau (30.23%)</div>
          <div className="value-lg text-[18px] text-foreground">{prorataAmount.toFixed(0)}€</div>
        </div>
      )}

      {/* NOVA SAP */}
      <div className="card-elevated rounded-2xl mb-5 overflow-hidden">
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
      <div className="card-elevated rounded-2xl mb-4 overflow-hidden">
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

      {/* Export PDF */}
      <button onClick={handleExportPDF}
        className="w-full rounded-2xl p-4 flex items-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] mb-6"
        style={{ background: "linear-gradient(135deg, hsl(348 63% 30%), hsl(348 63% 22%))", border: "1px solid hsl(348 63% 40% / 0.3)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: "hsl(0 0% 100% / 0.1)" }}>📄</div>
        <div className="flex-1 text-left">
          <div className="text-[13px] font-semibold text-white">Exporter Bilan PDF</div>
          <div className="text-[10px] text-white/60">{formatMonth(selectedMonth)} — Télécharger le récap</div>
        </div>
        <span className="text-white/40 text-sm">↓</span>
      </button>
    </div>
  );
}
