import { useState, useMemo } from "react";
import { useApp } from "@/store/AppContext";
import ClientAutocomplete from "@/components/ui/ClientAutocomplete";
import { EXPENSE_CATEGORIES, Expense, FinanceEntry, ExpenseCategory, PAYMENT_MODES, CASH_DECLARATIONS, OffreTheme, OFFRE_THEMES } from "@/data/types";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

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

const PRORATA_BUREAU = 13 / 43;

function addMonthsOffset(month: string, offset: number): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isEditable(month: string): boolean {
  const [y, m] = month.split("-").map(Number);
  const endOfMonth = new Date(y, m, 0); // last day of month
  const lockDate = new Date(endOfMonth);
  lockDate.setDate(lockDate.getDate() + 30);
  return new Date() <= lockDate;
}

function getRolling12Months(): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function getQuarterMonths(year: number, quarter: number): string[] {
  const startMonth = (quarter - 1) * 3 + 1;
  return [0, 1, 2].map(i => `${year}-${String(startMonth + i).padStart(2, "0")}`);
}

const THEME_ICONS: Record<string, string> = {
  "COURS COLLECTIFS": "🏃",
  "JM COACHING": "💪",
  "PROGRAMMES": "📋",
};

export default function FinancesPage() {
  const { financeEntries, setFinanceEntries, expenses, setExpenses, portageEnabled, setPortageEnabled, versementsPerso, setVersementsPerso, offres, prospects } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ category: "LOCAUX & BUREAUX", amount: 0 });
  const [showSapTable, setShowSapTable] = useState(false);

  // Edit state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<Partial<FinanceEntry>>({});
  const [editExpense, setEditExpense] = useState<Partial<Expense>>({});

  const currentYear = new Date().getFullYear();
  const [sapYear, setSapYear] = useState(currentYear);
  const [sapQuarter, setSapQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));

  // Add entry form state
  const [addTheme, setAddTheme] = useState<OffreTheme | null>(null);
  const [entrySource, setEntrySource] = useState<"offre" | "externe">("offre");
  const [entryOffre, setEntryOffre] = useState("");
  const [entryExterneLabel, setEntryExterneLabel] = useState("");
  const [entryClientName, setEntryClientName] = useState("");
  const [entryAmount, setEntryAmount] = useState(0);
  const [entryType, setEntryType] = useState<"micro" | "portage">("micro");
  const [entryPaymentMode, setEntryPaymentMode] = useState<string>("cb");
  const [entryInstallments, setEntryInstallments] = useState(1);
  const [entrySapHours, setEntrySapHours] = useState(0);
  const [entryCashDeclaration, setEntryCashDeclaration] = useState<string>("micro");

  const editable = isEditable(selectedMonth);
  const rolling12 = useMemo(() => getRolling12Months(), []);
  const activeOffres = offres.filter(o => o.active);

  const sapClientNames = useMemo(() => {
    return new Set(prospects.filter(p => p.sapEnabled).map(p => p.name));
  }, [prospects]);

  const monthEntries = useMemo(() => financeEntries.filter(e => e.month === selectedMonth), [financeEntries, selectedMonth]);
  const monthExpenses = useMemo(() => expenses.filter(e => e.month === selectedMonth), [expenses, selectedMonth]);

  // Group entries by theme
  const entriesByTheme = useMemo(() => {
    const grouped: Record<string, FinanceEntry[]> = {};
    OFFRE_THEMES.forEach(t => grouped[t] = []);
    grouped["AUTRE"] = [];
    
    monthEntries.forEach(e => {
      const offre = offres.find(o => o.name === e.offre);
      const theme = offre?.theme || "AUTRE";
      if (!grouped[theme]) grouped[theme] = [];
      grouped[theme].push(e);
    });
    return grouped;
  }, [monthEntries, offres]);

  // Revenue calculations
  const declaredMicro = monthEntries.filter(e => {
    if (e.paymentMode === "especes") return e.cashDeclaration === "micro";
    return e.type === "micro";
  }).reduce((s, e) => s + e.amount, 0);

  const declaredPortage = monthEntries.filter(e => {
    if (e.paymentMode === "especes") return e.cashDeclaration === "portage";
    return e.type === "portage";
  }).reduce((s, e) => s + e.amount, 0);

  const nonDeclare = monthEntries.filter(e => e.paymentMode === "especes" && e.cashDeclaration === "non_declare").reduce((s, e) => s + e.amount, 0);
  const totalBancaire = monthEntries.filter(e => e.paymentMode !== "especes").reduce((s, e) => s + e.amount, 0);
  const totalEspeces = monthEntries.filter(e => e.paymentMode === "especes").reduce((s, e) => s + e.amount, 0);
  const totalReel = monthEntries.reduce((s, e) => s + e.amount, 0);

  const totalDepenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const urssaf = calcUrssaf(declaredMicro);
  const revenuDispo = declaredMicro + declaredPortage - urssaf - totalDepenses;
  const gestionPerso = calcGestionPerso(revenuDispo);
  const restePerso = revenuDispo - gestionPerso;
  const versementReel = versementsPerso[selectedMonth] ?? null;
  const versementPct = restePerso > 0 && versementReel !== null ? Math.round((versementReel / restePerso) * 100) : null;

  const bureauExpenses = monthExpenses.filter(e => e.category === "LOCAUX & BUREAUX");
  const prorataAmount = bureauExpenses.reduce((s, e) => s + e.amount, 0) * PRORATA_BUREAU;

  // SAP
  const sapMonths = useMemo(() => getQuarterMonths(sapYear, sapQuarter), [sapYear, sapQuarter]);
  const sapData = useMemo(() => {
    return sapMonths.map(month => {
      const entries = financeEntries.filter(e => e.month === month && e.clientName && sapClientNames.has(e.clientName));
      const uniqueClients = new Set(entries.map(e => e.clientName));
      const totalHours = entries.reduce((s, e) => s + (e.sapHours || 0), 0);
      const totalCA = entries.reduce((s, e) => s + e.amount, 0);
      return { month, nbClients: uniqueClients.size, hours: totalHours, ca: totalCA };
    });
  }, [sapMonths, financeEntries, sapClientNames]);

  const handleOffreSelect = (offreName: string) => {
    setEntryOffre(offreName);
    const found = offres.find(o => o.name === offreName);
    if (found) setEntryAmount(found.price);
  };

  const resetEntryForm = () => {
    setEntrySource("offre"); setEntryOffre(""); setEntryExterneLabel(""); setEntryClientName("");
    setEntryAmount(0); setEntryType("micro"); setEntryPaymentMode("cb");
    setEntryInstallments(1); setEntrySapHours(0); setEntryCashDeclaration("micro"); setAddTheme(null);
  };

  const openAddByTheme = (theme: OffreTheme) => {
    resetEntryForm();
    setAddTheme(theme);
    setEntrySource("offre");
    setShowAddEntry(true);
  };

  const addEntry = () => {
    const label = entrySource === "offre" ? entryOffre : entryExterneLabel;
    if (!label || !entryAmount) return;

    const groupId = "grp" + Date.now();
    const installmentAmount = Math.round((entryAmount / entryInstallments) * 100) / 100;
    const newEntries: FinanceEntry[] = [];

    for (let i = 0; i < entryInstallments; i++) {
      const month = addMonthsOffset(selectedMonth, i);
      newEntries.push({
        id: "fe" + Date.now() + "_" + i, month,
        type: entryType,
        label: entryInstallments > 1 ? `${label} (${i + 1}/${entryInstallments})` : label,
        amount: installmentAmount,
        offre: entrySource === "offre" ? entryOffre : undefined,
        clientName: entryClientName || undefined,
        paymentMode: entryPaymentMode as any,
        installmentGroup: entryInstallments > 1 ? groupId : undefined,
        installmentIndex: entryInstallments > 1 ? i + 1 : undefined,
        installmentTotal: entryInstallments > 1 ? entryInstallments : undefined,
        sapHours: entrySapHours > 0 ? (entryInstallments > 1 ? Math.round((entrySapHours / entryInstallments) * 10) / 10 : entrySapHours) : undefined,
        cashDeclaration: entryPaymentMode === "especes" ? entryCashDeclaration as any : undefined,
      });
    }

    setFinanceEntries([...financeEntries, ...newEntries]);
    setShowAddEntry(false);
    resetEntryForm();
  };

  const addExpense = () => {
    if (!newExpense.label || !newExpense.amount) return;
    const exp: Expense = {
      id: "ex" + Date.now(), month: selectedMonth,
      category: newExpense.category as ExpenseCategory,
      label: newExpense.label || "", amount: Number(newExpense.amount) || 0,
      date: new Date().toISOString().split("T")[0],
    };
    setExpenses([...expenses, exp]);
    setShowAddExpense(false);
    setNewExpense({ category: "LOCAUX & BUREAUX", amount: 0 });
  };

  const startEditEntry = (e: FinanceEntry) => {
    setEditingEntryId(e.id);
    setEditEntry({ ...e });
  };

  const saveEditEntry = () => {
    if (!editingEntryId || !editEntry.label || !editEntry.amount) return;
    setFinanceEntries(financeEntries.map(e => e.id === editingEntryId ? { ...e, ...editEntry, amount: Number(editEntry.amount) } as FinanceEntry : e));
    setEditingEntryId(null);
  };

  const startEditExpense = (e: Expense) => {
    setEditingExpenseId(e.id);
    setEditExpense({ ...e });
  };

  const saveEditExpense = () => {
    if (!editingExpenseId || !editExpense.label || !editExpense.amount) return;
    setExpenses(expenses.map(e => e.id === editingExpenseId ? { ...e, ...editExpense, amount: Number(editExpense.amount) } as Expense : e));
    setEditingExpenseId(null);
  };

  const deleteEntry = (id: string) => setFinanceEntries(financeEntries.filter(e => e.id !== id));
  const deleteExpense = (id: string) => setExpenses(expenses.filter(e => e.id !== id));
  const updateCashDeclaration = (id: string, decl: string) => {
    setFinanceEntries(financeEntries.map(e => e.id === id ? { ...e, cashDeclaration: decl as any } : e));
  };

  const paymentModeLabel = (mode?: string) => PAYMENT_MODES.find(p => p.value === mode)?.label || "";
  const cashDeclLabel = (decl?: string) => decl ? (CASH_DECLARATIONS.find(c => c.value === decl)?.label || "") : "";

  const themeOffres = addTheme ? activeOffres.filter(o => o.theme === addTheme) : activeOffres;

  return (
    <div className="px-3.5">
      <h1 className="font-display text-[25px] font-extrabold text-foreground mb-0.5 pt-1">Finances</h1>
      <p className="text-xs text-muted-foreground mb-3">Entrées, dépenses & répartition</p>

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

      {/* Month Selector — rolling 12 */}
      <div className="flex gap-2 mb-3">
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          className="flex-1 rounded-xl p-2.5 text-sm outline-none"
          style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
          {rolling12.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
        {!editable && (
          <div className="flex items-center px-3 rounded-xl text-[10px] font-semibold text-destructive" style={{ background: "hsl(0 50% 43% / 0.1)", border: "1px solid hsl(0 50% 43% / 0.3)" }}>
            🔒 Scellé
          </div>
        )}
      </div>

      {/* TOTAL Hero */}
      <div className="rounded-2xl p-4 mb-3"
        style={{ background: "linear-gradient(135deg, hsl(348 63% 30% / 0.22), hsl(348 63% 30% / 0.08))", border: "1px solid hsl(348 63% 30% / 0.35)" }}>
        <div className="text-[10px] uppercase tracking-[2px] text-bordeaux-2 mb-1">{formatMonth(selectedMonth)} — REVENUS</div>
        <div className="font-display text-4xl font-extrabold text-foreground leading-none">{totalReel.toFixed(0)}€</div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: "Bancaire", value: totalBancaire, color: "text-foreground" },
            { label: "Espèces", value: totalEspeces, color: "text-warning" },
            { label: "Non déclaré", value: nonDeclare, color: "text-muted-foreground" },
          ].map(k => (
            <div key={k.label} className="rounded-xl p-2 text-center" style={{ background: "hsl(0 0% 100% / 0.04)" }}>
              <div className={`text-sm font-bold ${k.color}`}>{k.value.toFixed(0)}€</div>
              <div className="text-[8px] text-muted-foreground uppercase tracking-wider">{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="glass-card rounded-xl p-3 relative overflow-hidden">
          <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">CA MICRO</div>
          <div className="text-xl font-bold text-success">{declaredMicro.toFixed(0)}€</div>
        </div>
        <div className="glass-card rounded-xl p-3 relative overflow-hidden">
          <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">URSSAF 26.1%</div>
          <div className="text-xl font-bold text-destructive">-{urssaf.toFixed(0)}€</div>
        </div>
        {portageEnabled && (
          <div className="glass-card rounded-xl p-3 relative overflow-hidden">
            <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">PORTAGE</div>
            <div className="text-xl font-bold text-info">{declaredPortage.toFixed(0)}€</div>
          </div>
        )}
        <div className="glass-card rounded-xl p-3 relative overflow-hidden">
          <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">DÉPENSES</div>
          <div className="text-xl font-bold text-destructive">-{totalDepenses.toFixed(0)}€</div>
        </div>
      </div>

      {/* Bénéfice Net */}
      <div className="glass-card rounded-xl p-3 relative overflow-hidden mb-3">
        <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">BÉNÉFICE NET</div>
        <div className={`text-xl font-bold ${revenuDispo >= 0 ? "text-success" : "text-destructive"}`}>{revenuDispo.toFixed(0)}€</div>
      </div>

      {/* Gestion Perso Détaillée */}
      {(() => {
        const fondsPro = gestionPerso * 0.15;
        const plaisirs = gestionPerso * 0.45;
        const cadeaux = plaisirs / 3;
        const voyages = plaisirs / 3;
        const cash = plaisirs / 3;
        const epargne = gestionPerso * 0.15;
        const investPlus = gestionPerso * 0.15;
        const fondUrgence = revenuDispo < 0 ? 0 : gestionPerso * 0.10;
        const pctLabel = revenuDispo < 500 ? "0%" : revenuDispo < 1000 ? "10%" : revenuDispo < 1500 ? "15%" : revenuDispo < 2000 ? "20%" : revenuDispo < 2500 ? "25%" : "30%";

        const categories = [
          { label: "FONDS PRO", value: fondsPro, color: "text-info", pct: "15%", desc: "Réinvestir dans l'entreprise" },
          { label: "PLAISIRS", value: plaisirs, color: "text-warning", pct: "45%", sub: [
            { label: "Cash", value: cash }, { label: "Voyages", value: voyages }, { label: "Cadeaux", value: cadeaux },
          ]},
          { label: "ÉPARGNE", value: epargne, color: "text-success", pct: "15%" },
          { label: "INVEST+", value: investPlus, color: "text-bordeaux-2", pct: "15%" },
          { label: "FOND D'URGENCE", value: fondUrgence, color: "text-destructive", pct: "10%" },
        ];

        return (
          <div className="glass-card rounded-xl p-3.5 relative overflow-hidden mb-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px]">GESTION PERSO</div>
                <div className="text-lg font-bold text-warning">{gestionPerso.toFixed(0)}€</div>
              </div>
              <div className="text-sm font-bold text-muted-foreground">{pctLabel}</div>
            </div>
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.label}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${cat.color}`}>{cat.label}</span>
                      <span className="text-[9px] text-muted-foreground">{cat.pct}</span>
                    </div>
                    <span className={`text-sm font-bold ${cat.color}`}>{cat.value.toFixed(0)}€</span>
                  </div>
                  {cat.desc && <div className="text-[9px] text-muted-foreground ml-0.5">{cat.desc}</div>}
                  {cat.sub && (
                    <div className="ml-4 mt-0.5 space-y-0.5">
                      {cat.sub.map(s => (
                        <div key={s.label} className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{s.label}</span><span>{s.value.toFixed(0)}€</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">RESTE PERSO</span>
                <span className={`text-lg font-bold ${restePerso >= 0 ? "text-success" : "text-destructive"}`}>{restePerso.toFixed(0)}€</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Versement Perso */}
      <div className="glass-card rounded-xl p-3 relative overflow-hidden mb-3">
        <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">VERSEMENT PERSO RÉEL</div>
        <div className="flex items-center gap-3">
          <input type="number" value={versementReel ?? ""} onChange={e => editable && setVersementsPerso({ ...versementsPerso, [selectedMonth]: e.target.value ? Number(e.target.value) : null })}
            placeholder="Montant versé" disabled={!editable} className="flex-1 rounded-lg p-2 text-sm outline-none disabled:opacity-50"
            style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
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
        <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">PRORATA BUREAU (30.23%)</div>
        <div className="text-lg font-bold text-beige-2">{prorataAmount.toFixed(0)}€</div>
      </div>

      {/* NOVA SAP */}
      <div className="mb-4">
        <button onClick={() => setShowSapTable(!showSapTable)}
          className="w-full flex items-center justify-between glass-card rounded-xl p-3 relative overflow-hidden cursor-pointer">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <div>
              <div className="text-sm font-semibold text-foreground">NOVA SAP</div>
              <div className="text-[11px] text-muted-foreground">Clients SAP activés</div>
            </div>
          </div>
          <span className={`text-muted-foreground text-xs transition-transform ${showSapTable ? "rotate-180" : ""}`}>▼</span>
        </button>

        {showSapTable && (
          <div className="mt-2 rounded-xl p-3" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
            <div className="flex gap-2 mb-3">
              <select value={sapYear} onChange={e => setSapYear(Number(e.target.value))}
                className="flex-1 rounded-lg p-2 text-sm outline-none"
                style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(q => (
                  <button key={q} onClick={() => setSapQuarter(q)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${sapQuarter === q ? "text-foreground" : "text-muted-foreground"}`}
                    style={{
                      background: sapQuarter === q ? "linear-gradient(135deg, hsl(var(--bordeaux2) / 0.3), hsl(var(--bordeaux) / 0.15))" : "hsl(var(--glass))",
                      border: `1px solid ${sapQuarter === q ? "hsl(var(--bordeaux2))" : "hsl(var(--glass-border))"}`,
                    }}>
                    T{q}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(var(--glass-border))" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "hsl(var(--glass))" }}>
                    <th className="text-left p-2.5 text-[10px] uppercase tracking-[1.5px] text-muted-foreground font-semibold">Mois</th>
                    <th className="text-center p-2.5 text-[10px] uppercase tracking-[1.5px] text-muted-foreground font-semibold">Clients</th>
                    <th className="text-center p-2.5 text-[10px] uppercase tracking-[1.5px] text-muted-foreground font-semibold">Heures</th>
                    <th className="text-right p-2.5 text-[10px] uppercase tracking-[1.5px] text-muted-foreground font-semibold">CA</th>
                  </tr>
                </thead>
                <tbody>
                  {sapData.map((row, i) => (
                    <tr key={row.month} style={{ borderTop: i > 0 ? "1px solid hsl(var(--glass-border))" : undefined }}>
                      <td className="p-2.5 font-medium text-foreground">{formatMonth(row.month)}</td>
                      <td className="p-2.5 text-center text-foreground">{row.nbClients}</td>
                      <td className="p-2.5 text-center text-foreground">{row.hours}h</td>
                      <td className="p-2.5 text-right font-bold text-success">{row.ca.toFixed(0)}€</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Entrées par thème */}
      <div className="mb-4">
        <div className="text-[9px] uppercase tracking-[2px] text-bordeaux-2 font-bold pb-1 mb-3 border-b border-bordeaux/20">ENTRÉES PAR CATÉGORIE</div>
        
        {OFFRE_THEMES.map(theme => {
          const entries = entriesByTheme[theme] || [];
          const themeTotal = entries.reduce((s, e) => s + e.amount, 0);
          
          return (
            <div key={theme} className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{THEME_ICONS[theme]}</span>
                  <span className="text-xs font-bold text-foreground">{theme}</span>
                  {entries.length > 0 && <span className="text-[10px] text-muted-foreground">({entries.length})</span>}
                </div>
                <div className="flex items-center gap-2">
                  {themeTotal > 0 && <span className="text-xs font-bold text-success">{themeTotal.toFixed(0)}€</span>}
                  {editable && (
                    <button onClick={() => openAddByTheme(theme)} className="text-[10px] text-bordeaux-2 font-semibold px-2 py-1 rounded-lg cursor-pointer"
                      style={{ background: "hsl(var(--bordeaux) / 0.1)", border: "1px solid hsl(var(--bordeaux2) / 0.3)" }}>
                      + Ajouter
                    </button>
                  )}
                </div>
              </div>
              
              {entries.length > 0 && (
                <div className="flex flex-col gap-1 ml-1">
                  {entries.map(e => (
                    <div key={e.id}>
                      {editingEntryId === e.id ? (
                        <div className="rounded-xl p-2.5 space-y-2" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--bordeaux2) / 0.4)" }}>
                          <input value={editEntry.label || ""} onChange={ev => setEditEntry(p => ({ ...p, label: ev.target.value }))}
                            className="w-full rounded-lg p-2 text-sm outline-none" style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                          <div className="flex gap-2">
                            <input type="number" value={editEntry.amount || ""} onChange={ev => setEditEntry(p => ({ ...p, amount: Number(ev.target.value) }))}
                              className="flex-1 rounded-lg p-2 text-sm outline-none" style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                            <input value={editEntry.clientName || ""} onChange={ev => setEditEntry(p => ({ ...p, clientName: ev.target.value }))} placeholder="Client"
                              className="flex-1 rounded-lg p-2 text-sm outline-none" style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={saveEditEntry} className="flex-1 py-2 rounded-lg text-xs font-semibold text-foreground"
                              style={{ background: "linear-gradient(135deg, hsl(var(--bordeaux2)), hsl(var(--bordeaux)))" }}>Sauvegarder</button>
                            <button onClick={() => setEditingEntryId(null)} className="px-3 py-2 rounded-lg text-xs text-muted-foreground"
                              style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))" }}>✕</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-2 rounded-xl" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{e.label}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
                              <span>{e.type === "portage" ? "PORT" : "MICRO"}</span>
                              {e.clientName && <span>· {e.clientName}</span>}
                              {e.paymentMode && <span className="px-1 py-0.5 rounded text-[9px]" style={{ background: "hsl(var(--glass))" }}>{paymentModeLabel(e.paymentMode)}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {e.paymentMode === "especes" && (
                              <select value={e.cashDeclaration || "non_declare"} onChange={ev => editable && updateCashDeclaration(e.id, ev.target.value)}
                                disabled={!editable} className="rounded py-0.5 px-1 text-[10px] outline-none disabled:opacity-50"
                                style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                                {CASH_DECLARATIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                              </select>
                            )}
                            <span className="text-sm font-bold text-success whitespace-nowrap">+{e.amount}€</span>
                            {editable && (
                              <>
                                <button onClick={() => startEditEntry(e)} className="text-[10px] text-beige-2 cursor-pointer">✏️</button>
                                <button onClick={() => deleteEntry(e.id)} className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer">✕</button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Entrées sans thème */}
        {(entriesByTheme["AUTRE"] || []).length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm">📄</span>
              <span className="text-xs font-bold text-foreground">AUTRE</span>
            </div>
            <div className="flex flex-col gap-1 ml-1">
              {(entriesByTheme["AUTRE"] || []).map(e => (
                <div key={e.id} className="flex items-center justify-between p-2 rounded-xl" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{e.label}</div>
                    <div className="text-[10px] text-muted-foreground">{e.clientName || ""}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-success">+{e.amount}€</span>
                    {editable && (
                      <>
                        <button onClick={() => startEditEntry(e)} className="text-[10px] text-beige-2 cursor-pointer">✏️</button>
                        <button onClick={() => deleteEntry(e.id)} className="text-xs text-muted-foreground hover:text-destructive cursor-pointer">✕</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global add button */}
        {editable && (
          <button onClick={() => { resetEntryForm(); setShowAddEntry(true); }} className="w-full py-2.5 rounded-xl text-xs font-semibold text-bordeaux-2 cursor-pointer"
            style={{ background: "hsl(var(--bordeaux) / 0.08)", border: "1px solid hsl(var(--bordeaux2) / 0.25)" }}>
            + Saisie libre
          </button>
        )}
      </div>

      {/* Dépenses */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] uppercase tracking-[2px] text-bordeaux-2 font-bold pb-1 border-b border-bordeaux/20">DÉPENSES PRO</div>
          {editable && <button onClick={() => setShowAddExpense(true)} className="text-xs text-bordeaux-2 cursor-pointer">+ Ajouter</button>}
        </div>
        {monthExpenses.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">Aucune dépense</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {monthExpenses.map(e => (
              <div key={e.id}>
                {editingExpenseId === e.id ? (
                  <div className="rounded-xl p-2.5 space-y-2" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--bordeaux2) / 0.4)" }}>
                    <select value={editExpense.category || ""} onChange={ev => setEditExpense(p => ({ ...p, category: ev.target.value as ExpenseCategory }))}
                      className="w-full rounded-lg p-2 text-sm outline-none" style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                      {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input value={editExpense.label || ""} onChange={ev => setEditExpense(p => ({ ...p, label: ev.target.value }))}
                      className="w-full rounded-lg p-2 text-sm outline-none" style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                    <input type="number" value={editExpense.amount || ""} onChange={ev => setEditExpense(p => ({ ...p, amount: Number(ev.target.value) }))}
                      className="w-full rounded-lg p-2 text-sm outline-none" style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                    <div className="flex gap-2">
                      <button onClick={saveEditExpense} className="flex-1 py-2 rounded-lg text-xs font-semibold text-foreground"
                        style={{ background: "linear-gradient(135deg, hsl(var(--bordeaux2)), hsl(var(--bordeaux)))" }}>Sauvegarder</button>
                      <button onClick={() => setEditingExpenseId(null)} className="px-3 py-2 rounded-lg text-xs text-muted-foreground"
                        style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))" }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
                    <div>
                      <div className="text-sm font-medium text-foreground">{e.label}</div>
                      <div className="text-[10px] text-muted-foreground">{e.category}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-destructive">-{e.amount}€</div>
                      {editable && (
                        <>
                          <button onClick={() => startEditExpense(e)} className="text-[10px] text-beige-2 cursor-pointer">✏️</button>
                          <button onClick={() => deleteExpense(e.id)} className="text-xs text-muted-foreground hover:text-destructive cursor-pointer">✕</button>
                        </>
                      )}
                    </div>
                  </div>
                )}
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
              <h2 className="font-display text-lg font-bold text-foreground">
                {addTheme ? `${THEME_ICONS[addTheme]} ${addTheme}` : "Nouvelle entrée"}
              </h2>
              <button onClick={() => setShowAddEntry(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-sm text-muted-foreground"
                style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))" }}>✕</button>
            </div>
            <div className="px-4 space-y-3">
              {/* Source toggle */}
              {!addTheme && (
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1.5 block">Source</label>
                  <div className="flex gap-1.5">
                    {([["offre", "💼 Offre"], ["externe", "📄 Libre"]] as const).map(([val, lbl]) => (
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
              )}

              {(entrySource === "offre" || addTheme) ? (
                <>
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Offre *</label>
                    <select value={entryOffre} onChange={e => handleOffreSelect(e.target.value)}
                      className="w-full rounded-xl p-2.5 text-sm outline-none"
                      style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                      <option value="">— Sélectionner —</option>
                      {themeOffres.map(o => (
                        <option key={o.id} value={o.name}>{o.name} — {o.price}€</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Client</label>
                    <ClientAutocomplete value={entryClientName} onChange={v => setEntryClientName(v)} />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Libellé *</label>
                  <input value={entryExterneLabel} onChange={e => setEntryExterneLabel(e.target.value)} placeholder="Ex: Remboursement..."
                    className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                </div>
              )}

              {portageEnabled && (
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Type</label>
                  <div className="flex gap-1.5">
                    {([["micro", "Micro"], ["portage", "Portage"]] as const).map(([val, lbl]) => (
                      <button key={val} onClick={() => setEntryType(val)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${entryType === val ? "text-foreground" : "text-muted-foreground"}`}
                        style={{
                          background: entryType === val ? "linear-gradient(135deg, hsl(var(--bordeaux2) / 0.3), hsl(var(--bordeaux) / 0.15))" : "hsl(var(--surface3))",
                          border: `1px solid ${entryType === val ? "hsl(var(--bordeaux2))" : "hsl(var(--glass-border))"}`,
                        }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Montant €</label>
                <input type="number" value={entryAmount || ""} onChange={e => setEntryAmount(Number(e.target.value))} placeholder="0"
                  className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Heures SAP</label>
                <input type="number" value={entrySapHours || ""} onChange={e => setEntrySapHours(Number(e.target.value))} placeholder="0"
                  className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Mode paiement</label>
                <select value={entryPaymentMode} onChange={e => setEntryPaymentMode(e.target.value)}
                  className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                  {PAYMENT_MODES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              {entryPaymentMode === "especes" && (
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1.5 block">Déclaration espèces</label>
                  <div className="flex gap-1.5">
                    {CASH_DECLARATIONS.map(c => (
                      <button key={c.value} onClick={() => setEntryCashDeclaration(c.value)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${entryCashDeclaration === c.value ? "text-foreground" : "text-muted-foreground"}`}
                        style={{
                          background: entryCashDeclaration === c.value ? "linear-gradient(135deg, hsl(var(--bordeaux2) / 0.3), hsl(var(--bordeaux) / 0.15))" : "hsl(var(--surface3))",
                          border: `1px solid ${entryCashDeclaration === c.value ? "hsl(var(--bordeaux2))" : "hsl(var(--glass-border))"}`,
                        }}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                      {n === 1 ? "Comptant" : `${n}×`}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={addEntry} className="w-full py-3 rounded-xl font-semibold text-sm text-foreground"
                style={{ background: "linear-gradient(135deg, hsl(var(--bordeaux2)), hsl(var(--bordeaux)))" }}>
                Ajouter
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