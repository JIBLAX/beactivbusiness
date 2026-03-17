import { useState, useMemo } from "react";
import { useApp } from "@/store/AppContext";
import ClientAutocomplete from "@/components/ui/ClientAutocomplete";
import { EXPENSE_CATEGORIES, Expense, FinanceEntry, ExpenseCategory, PAYMENT_MODES } from "@/data/types";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(m: string): string {
  const [y, mo] = m.split("-");
  return `${MONTHS[parseInt(mo) - 1]} ${y}`;
}

function calcUrssaf(ca: number): number {
  return ca * 0.261;
}

function calcGestionPerso(revenuDispo: number): number {
  if (revenuDispo < 500) return 0;
  if (revenuDispo < 1000) return revenuDispo * 0.10;
  if (revenuDispo < 1500) return revenuDispo * 0.15;
  if (revenuDispo < 2000) return revenuDispo * 0.20;
  if (revenuDispo < 2500) return revenuDispo * 0.25;
  return revenuDispo * 0.30;
}

const PRORATA_BUREAU = 13 / 43; // 30.23%

function addMonths(month: string, offset: number): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function FinancesPage() {
  const { financeEntries, setFinanceEntries, expenses, setExpenses, portageEnabled, setPortageEnabled, versementsPerso, setVersementsPerso, offres } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ category: "LOCAUX & BUREAUX", amount: 0 });

  // New entry state
  const [entrySource, setEntrySource] = useState<"offre" | "externe">("offre");
  const [entryOffre, setEntryOffre] = useState("");
  const [entryExterneLabel, setEntryExterneLabel] = useState("");
  const [entryClientName, setEntryClientName] = useState("");
  const [entryAmount, setEntryAmount] = useState(0);
  const [entryType, setEntryType] = useState<"micro" | "portage" | "nova">("micro");
  const [entryPaymentMode, setEntryPaymentMode] = useState<string>("cb");
  const [entryInstallments, setEntryInstallments] = useState(1);

  const activeOffres = offres.filter(o => o.active);

  const monthEntries = useMemo(() => financeEntries.filter(e => e.month === selectedMonth), [financeEntries, selectedMonth]);
  const monthExpenses = useMemo(() => expenses.filter(e => e.month === selectedMonth), [expenses, selectedMonth]);

  const caMicro = monthEntries.filter(e => e.type === "micro").reduce((s, e) => s + e.amount, 0);
  const caPortage = monthEntries.filter(e => e.type === "portage").reduce((s, e) => s + e.amount, 0);
  const novaSap = monthEntries.filter(e => e.type === "nova").reduce((s, e) => s + e.amount, 0);
  const totalEntrees = caMicro + caPortage + novaSap;
  const totalDepenses = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const urssaf = calcUrssaf(caMicro);
  const revenuDispo = totalEntrees - urssaf - totalDepenses;
  const gestionPerso = calcGestionPerso(revenuDispo);
  const restePerso = revenuDispo - gestionPerso;
  const versementReel = versementsPerso[selectedMonth] ?? null;
  const versementPct = restePerso > 0 && versementReel !== null ? Math.round((versementReel / restePerso) * 100) : null;

  const bureauExpenses = monthExpenses.filter(e => e.category === "LOCAUX & BUREAUX");
  const prorataAmount = bureauExpenses.reduce((s, e) => s + e.amount, 0) * PRORATA_BUREAU;

  // When selecting an offer, auto-fill amount
  const handleOffreSelect = (offreName: string) => {
    setEntryOffre(offreName);
    const found = offres.find(o => o.name === offreName);
    if (found) setEntryAmount(found.price);
  };

  const resetEntryForm = () => {
    setEntrySource("offre");
    setEntryOffre("");
    setEntryExterneLabel("");
    setEntryClientName("");
    setEntryAmount(0);
    setEntryType("micro");
    setEntryPaymentMode("cb");
    setEntryInstallments(1);
  };

  const addEntry = () => {
    const label = entrySource === "offre" ? entryOffre : entryExterneLabel;
    if (!label || !entryAmount) return;

    const groupId = "grp" + Date.now();
    const installmentAmount = Math.round((entryAmount / entryInstallments) * 100) / 100;
    const newEntries: FinanceEntry[] = [];

    for (let i = 0; i < entryInstallments; i++) {
      const month = addMonths(selectedMonth, i);
      newEntries.push({
        id: "fe" + Date.now() + "_" + i,
        month,
        type: entryType,
        label: entryInstallments > 1 ? `${label} (${i + 1}/${entryInstallments})` : label,
        amount: installmentAmount,
        offre: entrySource === "offre" ? entryOffre : undefined,
        clientName: entryClientName || undefined,
        paymentMode: entryPaymentMode as any,
        installmentGroup: entryInstallments > 1 ? groupId : undefined,
        installmentIndex: entryInstallments > 1 ? i + 1 : undefined,
        installmentTotal: entryInstallments > 1 ? entryInstallments : undefined,
      });
    }

    setFinanceEntries([...financeEntries, ...newEntries]);
    setShowAddEntry(false);
    resetEntryForm();
  };

  const addExpense = () => {
    if (!newExpense.label || !newExpense.amount) return;
    const exp: Expense = {
      id: "ex" + Date.now(),
      month: selectedMonth,
      category: newExpense.category as ExpenseCategory,
      label: newExpense.label || "",
      amount: Number(newExpense.amount) || 0,
      date: new Date().toISOString().split("T")[0],
    };
    setExpenses([...expenses, exp]);
    setShowAddExpense(false);
    setNewExpense({ category: "LOCAUX & BUREAUX", amount: 0 });
  };

  const monthOptions = useMemo(() => {
    const opts: string[] = [];
    for (let y = 2025; y <= 2027; y++) {
      for (let m = 1; m <= 12; m++) {
        opts.push(`${y}-${String(m).padStart(2, "0")}`);
      }
    }
    return opts;
  }, []);

  const paymentModeLabel = (mode?: string) => {
    const found = PAYMENT_MODES.find(p => p.value === mode);
    return found ? found.label : "";
  };

  return (
    <div className="px-3.5">
      <h1 className="font-display text-[25px] font-extrabold text-foreground mb-0.5 pt-1">Finances</h1>
      <p className="text-xs text-muted-foreground mb-3.5">Entrées, dépenses & répartition</p>

      {/* Portage Switch */}
      <div className="flex items-center justify-between glass-card rounded-xl p-3 relative overflow-hidden mb-3">
        <div>
          <div className="text-sm font-semibold text-foreground">Portage JUMP</div>
          <div className="text-[11px] text-muted-foreground">Activ Reset uniquement</div>
        </div>
        <label className="relative inline-block w-11 h-6 cursor-pointer">
          <input type="checkbox" checked={portageEnabled} onChange={e => setPortageEnabled(e.target.checked)} className="opacity-0 w-0 h-0" />
          <span className={`absolute inset-0 rounded-full transition-all ${portageEnabled ? "bg-bordeaux/30 border-bordeaux-2" : "bg-surface-3 border-border"}`}
            style={{ border: "1px solid" }}>
            <span className={`absolute h-[18px] w-[18px] rounded-full bottom-[2px] transition-all
              ${portageEnabled ? "left-[22px] bg-bordeaux-2" : "left-[2px] bg-muted-foreground"}`} />
          </span>
        </label>
      </div>

      {/* Month Selector */}
      <div className="flex gap-2 mb-3">
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          className="flex-1 rounded-xl p-2.5 text-sm outline-none"
          style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
          {monthOptions.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
      </div>

      {/* Summary Card */}
      <div className="rounded-2xl p-4 mb-3"
        style={{ background: "linear-gradient(135deg, hsl(348 63% 30% / 0.18), hsl(348 63% 30% / 0.08))", border: "1px solid hsl(348 63% 30% / 0.3)" }}>
        <div className="text-[10px] uppercase tracking-[2px] text-bordeaux-2 mb-1">{formatMonth(selectedMonth)}</div>
        <div className="font-display text-4xl font-extrabold text-foreground leading-none">{totalEntrees.toFixed(0)}€</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">Total entrées</div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="glass-card rounded-xl p-3 relative overflow-hidden">
          <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">MICRO</div>
          <div className="text-xl font-bold text-success">{caMicro.toFixed(0)}€</div>
        </div>
        <div className="glass-card rounded-xl p-3 relative overflow-hidden">
          <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">URSSAF 26.1%</div>
          <div className="text-xl font-bold text-destructive">-{urssaf.toFixed(0)}€</div>
        </div>
        {portageEnabled && (
          <div className="glass-card rounded-xl p-3 relative overflow-hidden">
            <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">PORTAGE</div>
            <div className="text-xl font-bold text-info">{caPortage.toFixed(0)}€</div>
          </div>
        )}
        <div className="glass-card rounded-xl p-3 relative overflow-hidden">
          <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">NOVA SAP</div>
          <div className="text-xl font-bold text-beige-2">{novaSap.toFixed(0)}€</div>
        </div>
        <div className="glass-card rounded-xl p-3 relative overflow-hidden">
          <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">DÉPENSES</div>
          <div className="text-xl font-bold text-destructive">-{totalDepenses.toFixed(0)}€</div>
        </div>
        <div className="glass-card rounded-xl p-3 relative overflow-hidden">
          <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">RESTE PERSO</div>
          <div className={`text-xl font-bold ${restePerso >= 0 ? "text-success" : "text-destructive"}`}>{restePerso.toFixed(0)}€</div>
        </div>
      </div>

      {/* Gestion Perso */}
      <div className="glass-card rounded-xl p-3 relative overflow-hidden mb-3">
        <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">GESTION PERSO</div>
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold text-warning">{gestionPerso.toFixed(0)}€</div>
          <div className="text-[11px] text-muted-foreground">
            {revenuDispo < 500 ? "0%" : revenuDispo < 1000 ? "10%" : revenuDispo < 1500 ? "15%" : revenuDispo < 2000 ? "20%" : revenuDispo < 2500 ? "25%" : "30%"}
          </div>
        </div>
      </div>

      {/* Versement Perso */}
      <div className="glass-card rounded-xl p-3 relative overflow-hidden mb-3">
        <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">VERSEMENT PERSO RÉEL</div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={versementReel ?? ""}
            onChange={e => setVersementsPerso({ ...versementsPerso, [selectedMonth]: e.target.value ? Number(e.target.value) : null })}
            placeholder="Montant versé"
            className="flex-1 rounded-lg p-2 text-sm outline-none"
            style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}
          />
          {versementPct !== null && (
            <div className={`text-sm font-bold ${versementPct >= 80 ? "text-success" : versementPct >= 50 ? "text-warning" : "text-destructive"}`}>
              {versementPct}%
            </div>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">Prévu: {restePerso.toFixed(0)}€</div>
      </div>

      {/* Prorata Bureau */}
      <div className="glass-card rounded-xl p-3 relative overflow-hidden mb-3">
        <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">PRORATA BUREAU (13/43m² = 30.23%)</div>
        <div className="text-lg font-bold text-beige-2">{prorataAmount.toFixed(0)}€</div>
      </div>

      {/* Entrées */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] uppercase tracking-[2px] text-bordeaux-2 font-bold pb-1 border-b border-bordeaux/20">ENTRÉES</div>
          <button onClick={() => { resetEntryForm(); setShowAddEntry(true); }} className="text-xs text-bordeaux-2 cursor-pointer">+ Ajouter</button>
        </div>
        {monthEntries.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">Aucune entrée</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {monthEntries.map(e => (
              <div key={e.id} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{e.label}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                    <span>{e.type.toUpperCase()}</span>
                    {e.clientName && <span>· {e.clientName}</span>}
                    {e.paymentMode && <span className="px-1.5 py-0.5 rounded-full text-[9px]" style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))" }}>{paymentModeLabel(e.paymentMode)}</span>}
                  </div>
                </div>
                <div className="text-sm font-bold text-success ml-2">+{e.amount}€</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dépenses */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] uppercase tracking-[2px] text-bordeaux-2 font-bold pb-1 border-b border-bordeaux/20">DÉPENSES PRO</div>
          <button onClick={() => setShowAddExpense(true)} className="text-xs text-bordeaux-2 cursor-pointer">+ Ajouter</button>
        </div>
        {monthExpenses.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">Aucune dépense</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {monthExpenses.map(e => (
              <div key={e.id} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
                <div>
                  <div className="text-sm font-medium text-foreground">{e.label}</div>
                  <div className="text-[10px] text-muted-foreground">{e.category}</div>
                </div>
                <div className="text-sm font-bold text-destructive">-{e.amount}€</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Entry Sheet */}
      {showAddEntry && (
        <div className="fixed inset-0 z-[200] flex items-end" onClick={() => setShowAddEntry(false)}
          style={{ background: "rgba(5,3,3,0.76)" }}>
          <div className="w-full max-h-[85dvh] rounded-t-[22px] overflow-y-auto pb-6" onClick={e => e.stopPropagation()}
            style={{ background: "linear-gradient(180deg, hsl(var(--surface2)) 0%, hsl(var(--surface1)) 100%)", borderTop: "1px solid hsl(var(--glass-border))" }}>
            <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ background: "hsl(var(--glass-border))" }} />
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <h2 className="font-display text-lg font-bold text-foreground">Nouvelle entrée</h2>
              <button onClick={() => setShowAddEntry(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-sm text-muted-foreground"
                style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))" }}>✕</button>
            </div>
            <div className="px-4 space-y-3">
              {/* Source toggle: Offre client vs Externe */}
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1.5 block">Source</label>
                <div className="flex gap-1.5">
                  {([["offre", "💼 Offre client"], ["externe", "📄 Saisie libre"]] as const).map(([val, lbl]) => (
                    <button key={val} onClick={() => setEntrySource(val)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${entrySource === val ? "text-foreground" : "text-muted-foreground"}`}
                      style={{
                        background: entrySource === val ? "linear-gradient(135deg, hsl(var(--bordeaux2) / 0.3), hsl(var(--bordeaux) / 0.15))" : "hsl(var(--surface3))",
                        border: `1px solid ${entrySource === val ? "hsl(var(--bordeaux2))" : "hsl(var(--glass-border))"}`,
                      }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {entrySource === "offre" ? (
                <>
                  {/* Offer dropdown */}
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Offre *</label>
                    <select value={entryOffre} onChange={e => handleOffreSelect(e.target.value)}
                      className="w-full rounded-xl p-2.5 text-sm outline-none"
                      style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                      <option value="">— Sélectionner une offre —</option>
                      {activeOffres.map(o => (
                        <option key={o.id} value={o.name}>{o.name} — {o.price}€</option>
                      ))}
                    </select>
                  </div>
                  {/* Client autocomplete */}
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Client</label>
                    <ClientAutocomplete value={entryClientName} onChange={v => setEntryClientName(v)} />
                  </div>
                </>
              ) : (
                <>
                  {/* Manual label */}
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Libellé *</label>
                    <input value={entryExterneLabel} onChange={e => setEntryExterneLabel(e.target.value)} placeholder="Ex: URSSAF, Impôts, Remboursement..."
                      className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                  </div>
                </>
              )}

              {/* Type */}
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Type</label>
                <select value={entryType} onChange={e => setEntryType(e.target.value as any)}
                  className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                  <option value="micro">Micro-entreprise</option>
                  {portageEnabled && <option value="portage">Portage JUMP</option>}
                  <option value="nova">Nova SAP</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Montant total €</label>
                <input type="number" value={entryAmount || ""} onChange={e => setEntryAmount(Number(e.target.value))} placeholder="0"
                  className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Mode de paiement</label>
                <select value={entryPaymentMode} onChange={e => setEntryPaymentMode(e.target.value)}
                  className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                  {PAYMENT_MODES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              {/* Installments */}
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1.5 block">Paiement</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map(n => (
                    <button key={n} onClick={() => setEntryInstallments(n)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${entryInstallments === n ? "text-foreground" : "text-muted-foreground"}`}
                      style={{
                        background: entryInstallments === n ? "linear-gradient(135deg, hsl(var(--bordeaux2) / 0.3), hsl(var(--bordeaux) / 0.15))" : "hsl(var(--surface3))",
                        border: `1px solid ${entryInstallments === n ? "hsl(var(--bordeaux2))" : "hsl(var(--glass-border))"}`,
                      }}>
                      {n === 1 ? "Comptant" : `${n}× fois`}
                    </button>
                  ))}
                </div>
                {entryInstallments > 1 && entryAmount > 0 && (
                  <div className="text-[11px] text-muted-foreground mt-1.5">
                    → {entryInstallments} × {Math.round(entryAmount / entryInstallments)}€ sur {entryInstallments} mois à partir de {formatMonth(selectedMonth)}
                  </div>
                )}
              </div>

              <button onClick={addEntry} className="w-full py-3 rounded-xl font-semibold text-sm text-foreground"
                style={{ background: "linear-gradient(135deg, hsl(var(--bordeaux2)), hsl(var(--bordeaux)))" }}>
                Ajouter l'entrée
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Sheet */}
      {showAddExpense && (
        <div className="fixed inset-0 z-[200] flex items-end" onClick={() => setShowAddExpense(false)}
          style={{ background: "rgba(5,3,3,0.76)" }}>
          <div className="w-full max-h-[80dvh] rounded-t-[22px] overflow-y-auto pb-6" onClick={e => e.stopPropagation()}
            style={{ background: "linear-gradient(180deg, hsl(var(--surface2)) 0%, hsl(var(--surface1)) 100%)", borderTop: "1px solid hsl(var(--glass-border))" }}>
            <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ background: "hsl(var(--glass-border))" }} />
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <h2 className="font-display text-lg font-bold text-foreground">Nouvelle dépense</h2>
              <button onClick={() => setShowAddExpense(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-sm text-muted-foreground"
                style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))" }}>✕</button>
            </div>
            <div className="px-4 space-y-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Catégorie</label>
                <select value={newExpense.category} onChange={e => setNewExpense(p => ({ ...p, category: e.target.value as ExpenseCategory }))}
                  className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Libellé *</label>
                <input value={newExpense.label || ""} onChange={e => setNewExpense(p => ({ ...p, label: e.target.value }))} placeholder="Description"
                  className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Montant €</label>
                <input type="number" value={newExpense.amount || ""} onChange={e => setNewExpense(p => ({ ...p, amount: Number(e.target.value) }))} placeholder="0"
                  className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
              </div>
              <button onClick={addExpense} className="w-full py-3 rounded-xl font-semibold text-sm text-foreground"
                style={{ background: "linear-gradient(135deg, hsl(var(--bordeaux2)), hsl(var(--bordeaux)))" }}>
                Ajouter la dépense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
