import { useState, useMemo } from "react";
import { useApp } from "@/store/AppContext";
import ClientAutocomplete from "@/components/ui/ClientAutocomplete";
import { EXPENSE_CATEGORIES, Expense, FinanceEntry, ExpenseCategory, PAYMENT_MODES, CASH_DECLARATIONS, OffreTheme, OFFRE_THEMES } from "@/data/types";

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

function addMonthsOffset(month: string, offset: number): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isEditable(month: string): boolean {
  const [y, m] = month.split("-").map(Number);
  const endOfMonth = new Date(y, m, 0);
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

const PRORATA_BUREAU = 13 / 43;

export default function FinancesPage() {
  const { financeEntries, setFinanceEntries, expenses, setExpenses, portageMonths, setPortageMonths, versementsPerso, setVersementsPerso, offres, prospects } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ category: "LOCAUX & BUREAUX", amount: 0 });
  const [showSapTable, setShowSapTable] = useState(false);
  const [showGestionDetail, setShowGestionDetail] = useState(false);

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<Partial<FinanceEntry>>({});
  const [editExpense, setEditExpense] = useState<Partial<Expense>>({});

  // Quick-add for cours collectifs
  const [showQuickCours, setShowQuickCours] = useState(false);
  const [quickCoursData, setQuickCoursData] = useState<Record<string, number>>({});
  const [quickCoursPayment, setQuickCoursPayment] = useState<string>("cb");

  // JM PASS extra sessions
  const [showAddSessions, setShowAddSessions] = useState(false);
  const [extraSessionsOffre, setExtraSessionsOffre] = useState("");
  const [extraSessionsClient, setExtraSessionsClient] = useState("");
  const [extraSessionsCount, setExtraSessionsCount] = useState(0);

  const currentYear = new Date().getFullYear();
  const [sapYear, setSapYear] = useState(currentYear);
  const [sapQuarter, setSapQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));

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
  const [entryNbSessions, setEntryNbSessions] = useState(0);

  const portageEnabled = portageMonths[selectedMonth] ?? false;
  const editable = isEditable(selectedMonth);
  const rolling12 = useMemo(() => getRolling12Months(), []);
  const activeOffres = offres.filter(o => o.active);

  const sapClientNames = useMemo(() => new Set(prospects.filter(p => p.sapEnabled).map(p => p.name)), [prospects]);

  const monthEntries = useMemo(() => financeEntries.filter(e => e.month === selectedMonth), [financeEntries, selectedMonth]);
  const monthExpenses = useMemo(() => expenses.filter(e => e.month === selectedMonth), [expenses, selectedMonth]);

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

  // Check if an entry's offre is eligible for portage
  const isPortageEligible = (e: FinanceEntry) => {
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

  const totalReel = monthEntries.reduce((s, e) => s + e.amount, 0);
  const totalDepenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const urssaf = calcUrssaf(declaredMicro);
  const beneficeNet = totalReel - urssaf - totalDepenses;
  const gestionPerso = calcGestionPerso(beneficeNet);
  const restePerso = beneficeNet - gestionPerso;
  const versementReel = versementsPerso[selectedMonth] ?? null;

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

  const handleOffreSelect = (offreName: string) => {
    setEntryOffre(offreName);
    const found = offres.find(o => o.name === offreName);
    if (found) {
      // For JM PASS type offres with unitPrice and minQuantity, default to min sessions
      if (found.unitPrice && found.minQuantity) {
        setEntryNbSessions(found.minQuantity);
        setEntryAmount(found.unitPrice * found.minQuantity);
      } else {
        setEntryAmount(found.price);
        setEntryNbSessions(0);
      }
    }
  };

  // When session count changes for JM PASS type offres
  const handleSessionCountChange = (count: number) => {
    setEntryNbSessions(count);
    const found = offres.find(o => o.name === entryOffre);
    if (found?.unitPrice) {
      setEntryAmount(found.unitPrice * count);
    }
  };

  const resetEntryForm = () => {
    setEntrySource("offre"); setEntryOffre(""); setEntryExterneLabel(""); setEntryClientName("");
    setEntryAmount(0); setEntryType("micro"); setEntryPaymentMode("cb");
    setEntryInstallments(1); setEntrySapHours(0); setEntryCashDeclaration("micro"); setAddTheme(null);
    setEntryNbSessions(0);
  };

  const openAddByTheme = (theme: OffreTheme) => {
    if (theme === "COURS COLLECTIFS") {
      // Open quick-add for cours collectifs
      const coursOffres = activeOffres.filter(o => o.theme === "COURS COLLECTIFS");
      const initial: Record<string, number> = {};
      coursOffres.forEach(o => initial[o.name] = 0);
      setQuickCoursData(initial);
      setQuickCoursPayment("cb");
      setShowQuickCours(true);
      return;
    }
    resetEntryForm();
    setAddTheme(theme);
    setEntrySource("offre");
    setShowAddEntry(true);
  };

  const addQuickCours = () => {
    const newEntries: FinanceEntry[] = [];
    Object.entries(quickCoursData).forEach(([offreName, qty]) => {
      if (qty <= 0) return;
      const found = offres.find(o => o.name === offreName);
      if (!found) return;
      const totalAmount = found.price * qty;
      newEntries.push({
        id: "fe" + Date.now() + "_" + offreName.replace(/\s/g, ""),
        month: selectedMonth, type: "micro",
        label: `${offreName} × ${qty}`,
        amount: totalAmount, offre: offreName,
        paymentMode: quickCoursPayment as any,
      });
    });
    if (newEntries.length > 0) {
      setFinanceEntries([...financeEntries, ...newEntries]);
    }
    setShowQuickCours(false);
  };

  const addExtraSessions = () => {
    if (!extraSessionsOffre || extraSessionsCount <= 0 || !extraSessionsClient) return;
    const found = offres.find(o => o.name === extraSessionsOffre);
    if (!found?.unitPrice) return;
    const amount = found.unitPrice * extraSessionsCount;
    const entry: FinanceEntry = {
      id: "fe" + Date.now() + "_extra",
      month: selectedMonth, type: "micro",
      label: `${extraSessionsOffre} +${extraSessionsCount} séances supp.`,
      amount, offre: extraSessionsOffre,
      clientName: extraSessionsClient,
      paymentMode: "cb",
    };
    setFinanceEntries([...financeEntries, entry]);
    setShowAddSessions(false);
    setExtraSessionsOffre(""); setExtraSessionsClient(""); setExtraSessionsCount(0);
  };

  const addEntry = () => {
    const label = entrySource === "offre" ? entryOffre : entryExterneLabel;
    if (!label || !entryAmount) return;
    const groupId = "grp" + Date.now();
    const installmentAmount = Math.round((entryAmount / entryInstallments) * 100) / 100;
    const found = offres.find(o => o.name === entryOffre);
    const sessionsLabel = entryNbSessions > 0 ? ` (${entryNbSessions} séances)` : "";
    const newEntries: FinanceEntry[] = [];
    for (let i = 0; i < entryInstallments; i++) {
      const month = addMonthsOffset(selectedMonth, i);
      newEntries.push({
        id: "fe" + Date.now() + "_" + i, month, type: entryType,
        label: entryInstallments > 1 ? `${label}${sessionsLabel} (${i + 1}/${entryInstallments})` : `${label}${sessionsLabel}`,
        amount: installmentAmount, offre: entrySource === "offre" ? entryOffre : undefined,
        clientName: entryClientName || undefined, paymentMode: entryPaymentMode as any,
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

  const startEditEntry = (e: FinanceEntry) => { setEditingEntryId(e.id); setEditEntry({ ...e }); };
  const saveEditEntry = () => {
    if (!editingEntryId || !editEntry.label || !editEntry.amount) return;
    setFinanceEntries(financeEntries.map(e => e.id === editingEntryId ? { ...e, ...editEntry, amount: Number(editEntry.amount) } as FinanceEntry : e));
    setEditingEntryId(null);
  };
  const startEditExpense = (e: Expense) => { setEditingExpenseId(e.id); setEditExpense({ ...e }); };
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
  const themeOffres = addTheme ? activeOffres.filter(o => o.theme === addTheme) : activeOffres;

  // Gestion perso breakdown
  const fondsPro = gestionPerso * 0.15;
  const plaisirs = gestionPerso * 0.45;
  const epargne = gestionPerso * 0.15;
  const investPlus = gestionPerso * 0.15;
  const fondUrgence = beneficeNet > 0 ? gestionPerso * 0.10 : 0;

  return (
    <div className="px-4 pt-4 pb-24">
      {/* Month selector */}
      <div className="flex items-center gap-2 mb-5">
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          className="flex-1 rounded-2xl px-4 py-3 text-sm font-medium input-field appearance-none">
          {rolling12.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
        {!editable && (
          <div className="badge-pill" style={{ background: "hsl(0 62% 50% / 0.1)", color: "hsl(0 62% 60%)" }}>
            🔒 Scellé
          </div>
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

        <div className={`grid gap-2 ${portageEnabled ? "grid-cols-3" : "grid-cols-2"}`}>
          {[
            { label: "CA Micro", sub: "Déclaré URSSAF", value: declaredMicro, color: "hsl(152 55% 52%)" },
            ...(portageEnabled ? [{ label: "Portage JUMP", sub: "Charges gérées par JUMP", value: declaredPortage, color: "hsl(217 70% 60%)" }] : []),
            { label: "URSSAF dû", sub: "26.1% du CA Micro", value: -urssaf, color: "hsl(0 62% 50%)" },
          ].map(k => (
            <div key={k.label} className="rounded-2xl p-3 text-center" style={{ background: "hsl(0 0% 100% / 0.03)" }}>
              <div className="value-lg text-[15px] leading-none mb-1" style={{ color: k.color }}>
                {Math.abs(k.value).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
              </div>
              <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">{k.label}</div>
              <div className="text-[8px] text-muted-foreground/60 mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>
        {portageEnabled && (
          <div className="mt-3 px-3 py-2 rounded-xl text-[10px] text-muted-foreground" style={{ background: "hsl(217 70% 60% / 0.08)", border: "1px solid hsl(217 70% 60% / 0.15)" }}>
            ℹ️ Les offres marquées <strong className="text-foreground">Portage</strong> passent par <strong className="text-foreground">JUMP</strong> ce mois — charges sociales gérées par JUMP, <strong className="text-foreground">non déclarées à l'URSSAF</strong>.
          </div>
        )}
      </div>

      {/* Portage JUMP switch for THIS month */}
      <div className="card-elevated rounded-2xl p-4 mb-3 flex items-center justify-between">
        <div>
          <div className="text-[13px] font-semibold text-foreground">Portage JUMP</div>
          <div className="text-[10px] text-muted-foreground">
            {portageEnabled 
              ? "Actif — Activ Reset/Program exclus de la déclaration URSSAF"
              : `Activer pour ${formatMonth(selectedMonth)}`
            }
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

      {/* Financial summary row */}
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
      <div className="card-elevated rounded-2xl mb-4 overflow-hidden">
        <button onClick={() => setShowGestionDetail(!showGestionDetail)}
          className="w-full p-4 flex items-center justify-between text-left">
          <div>
            <div className="section-label mb-1">Gestion Perso</div>
            <div className="value-lg text-[20px] text-warning">{gestionPerso.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] text-muted-foreground">Reste perso</div>
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
            {[
              { label: "FONDS PRO", value: fondsPro, color: "hsl(217 70% 60%)", pct: "15%" },
              { label: "PLAISIRS", value: plaisirs, color: "hsl(38 92% 55%)", pct: "45%", sub: ["Cash", "Voyages", "Cadeaux"] },
              { label: "ÉPARGNE", value: epargne, color: "hsl(152 55% 52%)", pct: "15%" },
              { label: "INVEST+", value: investPlus, color: "hsl(348 63% 45%)", pct: "15%" },
              { label: "FOND D'URGENCE", value: fondUrgence, color: "hsl(0 62% 50%)", pct: "10%" },
            ].map(cat => (
              <div key={cat.label} className="rounded-xl p-3" style={{ background: "hsl(0 0% 100% / 0.02)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                    <span className="text-[12px] font-semibold text-foreground">{cat.label}</span>
                    <span className="text-[10px] text-muted-foreground">{cat.pct}</span>
                  </div>
                  <span className="value-lg text-[13px]" style={{ color: cat.color }}>{cat.value.toFixed(0)}€</span>
                </div>
                {cat.sub && (
                  <div className="flex gap-4 mt-1.5 ml-4">
                    {cat.sub.map(s => (
                      <span key={s} className="text-[10px] text-muted-foreground">{s}: {(plaisirs / 3).toFixed(0)}€</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Versement Perso */}
      <div className="card-elevated rounded-2xl p-4 mb-4">
        <div className="section-label mb-2">Versement Perso Réel</div>
        <div className="flex items-center gap-3">
          <input type="number" value={versementReel ?? ""} onChange={e => editable && setVersementsPerso({ ...versementsPerso, [selectedMonth]: e.target.value ? Number(e.target.value) : null })}
            placeholder="Montant versé" disabled={!editable} className="flex-1 rounded-xl px-3 py-2.5 text-sm input-field disabled:opacity-40" />
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground">Prévu</div>
            <div className="value-lg text-[13px] text-foreground">{restePerso.toFixed(0)}€</div>
          </div>
        </div>
      </div>

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
              <div className="text-[10px] text-muted-foreground">Déclarations SAP</div>
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

      {/* ENTRIES BY THEME */}
      <div className="mb-5">
        <div className="section-label mb-3 pb-2" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.05)" }}>
          Entrées par catégorie
        </div>

        {OFFRE_THEMES.map(theme => {
          const entries = entriesByTheme[theme] || [];
          const themeTotal = entries.reduce((s, e) => s + e.amount, 0);

          return (
            <div key={theme} className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{THEME_ICONS[theme]}</span>
                  <span className="text-[12px] font-bold text-foreground">{theme}</span>
                  {entries.length > 0 && <span className="badge-pill text-[10px]" style={{ background: "hsl(0 0% 100% / 0.04)", color: "hsl(0 0% 60%)" }}>{entries.length}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {themeTotal > 0 && <span className="value-lg text-[13px] text-success">{themeTotal.toFixed(0)}€</span>}
                  {editable && theme === "JM COACHING" && entries.length > 0 && (
                    <button onClick={() => { setShowAddSessions(true); setExtraSessionsOffre(""); setExtraSessionsClient(""); setExtraSessionsCount(0); }}
                      className="badge-pill text-[10px] cursor-pointer"
                      style={{ background: "hsl(38 92% 55% / 0.1)", color: "hsl(38 92% 55%)", border: "1px solid hsl(38 92% 55% / 0.2)" }}>
                      + Séances supp.
                    </button>
                  )}
                  {editable && (
                    <button onClick={() => openAddByTheme(theme)} className="badge-pill text-[10px] cursor-pointer"
                      style={{ background: "hsl(348 63% 30% / 0.1)", color: "hsl(348 63% 45%)", border: "1px solid hsl(348 63% 30% / 0.2)" }}>
                      + Ajouter
                    </button>
                  )}
                </div>
              </div>

              {entries.length > 0 && (
                <div className="space-y-1.5 ml-1">
                  {entries.map(e => (
                    <div key={e.id}>
                      {editingEntryId === e.id ? (
                        <div className="rounded-2xl p-3 space-y-2" style={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(348 63% 30% / 0.3)" }}>
                          <input value={editEntry.label || ""} onChange={ev => setEditEntry(p => ({ ...p, label: ev.target.value }))}
                            className="w-full rounded-xl px-3 py-2 text-sm input-field" />
                          <div className="flex gap-2">
                            <input type="number" value={editEntry.amount || ""} onChange={ev => setEditEntry(p => ({ ...p, amount: Number(ev.target.value) }))}
                              className="flex-1 rounded-xl px-3 py-2 text-sm input-field" placeholder="Montant" />
                            <input value={editEntry.clientName || ""} onChange={ev => setEditEntry(p => ({ ...p, clientName: ev.target.value }))}
                              className="flex-1 rounded-xl px-3 py-2 text-sm input-field" placeholder="Client" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={saveEditEntry} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white btn-primary">✓ Sauver</button>
                            <button onClick={() => setEditingEntryId(null)} className="px-4 py-2 rounded-xl text-xs text-muted-foreground input-field">✕</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 rounded-2xl stat-card">
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-foreground truncate">{e.label}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              {e.clientName && <span>{e.clientName}</span>}
                              {e.paymentMode && <span className="badge-pill text-[8px] py-0" style={{ background: "hsl(0 0% 100% / 0.04)" }}>{paymentModeLabel(e.paymentMode)}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {e.paymentMode === "especes" && (
                              <select value={e.cashDeclaration || "non_declare"} onChange={ev => editable && updateCashDeclaration(e.id, ev.target.value)}
                                disabled={!editable} className="rounded-lg py-1 px-1.5 text-[10px] input-field disabled:opacity-40">
                                {CASH_DECLARATIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                              </select>
                            )}
                            <span className="value-lg text-[14px] text-success">+{e.amount}€</span>
                            {editable && (
                              <>
                                <button onClick={() => startEditEntry(e)} className="text-muted-foreground hover:text-foreground transition-colors p-1">✏️</button>
                                <button onClick={() => deleteEntry(e.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 text-[10px]">✕</button>
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

        {/* Autres entrées */}
        {(entriesByTheme["AUTRE"] || []).length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">📄</span>
              <span className="text-[12px] font-bold text-foreground">AUTRE</span>
            </div>
            <div className="space-y-1.5 ml-1">
              {(entriesByTheme["AUTRE"] || []).map(e => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-2xl stat-card">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-foreground truncate">{e.label}</div>
                    {e.clientName && <div className="text-[10px] text-muted-foreground">{e.clientName}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="value-lg text-[14px] text-success">+{e.amount}€</span>
                    {editable && (
                      <>
                        <button onClick={() => startEditEntry(e)} className="text-muted-foreground hover:text-foreground p-1">✏️</button>
                        <button onClick={() => deleteEntry(e.id)} className="text-muted-foreground hover:text-destructive p-1 text-[10px]">✕</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {editable && (
          <button onClick={() => { resetEntryForm(); setShowAddEntry(true); }}
            className="w-full py-3 rounded-2xl text-xs font-semibold text-muted-foreground"
            style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px dashed hsl(0 0% 100% / 0.1)" }}>
            + Saisie libre
          </button>
        )}
      </div>

      {/* EXPENSES */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="section-label">Dépenses Pro</div>
          {editable && <button onClick={() => setShowAddExpense(true)} className="text-[11px] text-muted-foreground hover:text-foreground font-medium">+ Ajouter</button>}
        </div>
        {monthExpenses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Aucune dépense ce mois</div>
        ) : (
          <div className="space-y-1.5">
            {monthExpenses.map(e => (
              <div key={e.id}>
                {editingExpenseId === e.id ? (
                  <div className="rounded-2xl p-3 space-y-2" style={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(348 63% 30% / 0.3)" }}>
                    <select value={editExpense.category || ""} onChange={ev => setEditExpense(p => ({ ...p, category: ev.target.value as ExpenseCategory }))}
                      className="w-full rounded-xl px-3 py-2 text-sm input-field">
                      {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input value={editExpense.label || ""} onChange={ev => setEditExpense(p => ({ ...p, label: ev.target.value }))}
                      className="w-full rounded-xl px-3 py-2 text-sm input-field" />
                    <input type="number" value={editExpense.amount || ""} onChange={ev => setEditExpense(p => ({ ...p, amount: Number(ev.target.value) }))}
                      className="w-full rounded-xl px-3 py-2 text-sm input-field" />
                    <div className="flex gap-2">
                      <button onClick={saveEditExpense} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white btn-primary">✓ Sauver</button>
                      <button onClick={() => setEditingExpenseId(null)} className="px-4 py-2 rounded-xl text-xs text-muted-foreground input-field">✕</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-2xl stat-card">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-foreground">{e.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{e.category}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="value-lg text-[14px] text-destructive">-{e.amount}€</span>
                      {editable && (
                        <>
                          <button onClick={() => startEditExpense(e)} className="text-muted-foreground hover:text-foreground p-1">✏️</button>
                          <button onClick={() => deleteExpense(e.id)} className="text-muted-foreground hover:text-destructive p-1 text-[10px]">✕</button>
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

      {/* ADD ENTRY SHEET */}
      {showAddEntry && (
        <div className="fixed inset-0 z-[200] flex items-end" onClick={() => setShowAddEntry(false)}
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-h-[85dvh] rounded-t-3xl overflow-y-auto pb-8 animate-fade-up" onClick={e => e.stopPropagation()}
            style={{ background: "hsl(0 0% 6%)", borderTop: "1px solid hsl(0 0% 100% / 0.08)" }}>
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: "hsl(0 0% 20%)" }} />
            <div className="flex items-center justify-between px-5 pt-3 pb-3">
              <h2 className="font-display text-[17px] font-bold text-foreground">
                {addTheme ? `${THEME_ICONS[addTheme]} ${addTheme}` : "Nouvelle entrée"}
              </h2>
              <button onClick={() => setShowAddEntry(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-sm text-muted-foreground"
                style={{ background: "hsl(0 0% 100% / 0.05)" }}>✕</button>
            </div>
            <div className="px-5 space-y-4">
              {!addTheme && (
                <div>
                  <label className="section-label mb-2 block">Source</label>
                  <div className="flex gap-2">
                    {([["offre", "💼 Offre"], ["externe", "📄 Libre"]] as const).map(([val, lbl]) => (
                      <button key={val} onClick={() => setEntrySource(val)}
                        className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${entrySource === val ? "text-foreground btn-primary" : "text-muted-foreground input-field"}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(entrySource === "offre" || addTheme) ? (
                <>
                  <div>
                    <label className="section-label mb-2 block">Offre *</label>
                    <select value={entryOffre} onChange={e => handleOffreSelect(e.target.value)} className="w-full rounded-xl px-3 py-3 text-sm input-field">
                      <option value="">— Sélectionner —</option>
                      {themeOffres.map(o => <option key={o.id} value={o.name}>{o.name} — {o.price}€</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="section-label mb-2 block">Client</label>
                    <ClientAutocomplete value={entryClientName} onChange={v => setEntryClientName(v)} />
                  </div>
                </>
              ) : (
                <div>
                  <label className="section-label mb-2 block">Libellé *</label>
                  <input value={entryExterneLabel} onChange={e => setEntryExterneLabel(e.target.value)} placeholder="Ex: Remboursement..."
                    className="w-full rounded-xl px-3 py-3 text-sm input-field" />
                </div>
              )}

              {portageEnabled && (
                <div>
                  <label className="section-label mb-2 block">Type</label>
                  <div className="flex gap-2">
                    {([["micro", "Micro"], ["portage", "Portage"]] as const).map(([val, lbl]) => (
                      <button key={val} onClick={() => setEntryType(val)}
                        className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${entryType === val ? "text-foreground btn-primary" : "text-muted-foreground input-field"}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="section-label mb-2 block">Montant €</label>
                <input type="number" value={entryAmount || ""} onChange={e => setEntryAmount(Number(e.target.value))} placeholder="0"
                  className="w-full rounded-xl px-3 py-3 text-sm input-field" />
              </div>

              <div>
                <label className="section-label mb-2 block">Heures SAP</label>
                <input type="number" value={entrySapHours || ""} onChange={e => setEntrySapHours(Number(e.target.value))} placeholder="0"
                  className="w-full rounded-xl px-3 py-3 text-sm input-field" />
              </div>

              <div>
                <label className="section-label mb-2 block">Mode paiement</label>
                <select value={entryPaymentMode} onChange={e => setEntryPaymentMode(e.target.value)}
                  className="w-full rounded-xl px-3 py-3 text-sm input-field">
                  {PAYMENT_MODES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              {entryPaymentMode === "especes" && (
                <div>
                  <label className="section-label mb-2 block">Déclaration espèces</label>
                  <div className="flex gap-2">
                    {CASH_DECLARATIONS.map(c => (
                      <button key={c.value} onClick={() => setEntryCashDeclaration(c.value)}
                        className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${entryCashDeclaration === c.value ? "text-foreground btn-primary" : "text-muted-foreground input-field"}`}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="section-label mb-2 block">Paiement</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(n => (
                    <button key={n} onClick={() => setEntryInstallments(n)}
                      className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${entryInstallments === n ? "text-foreground btn-primary" : "text-muted-foreground input-field"}`}>
                      {n === 1 ? "Comptant" : `${n}×`}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={addEntry} className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white btn-primary mt-2">
                Ajouter l'entrée
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD EXPENSE SHEET */}
      {showAddExpense && (
        <div className="fixed inset-0 z-[200] flex items-end" onClick={() => setShowAddExpense(false)}
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-h-[80dvh] rounded-t-3xl overflow-y-auto pb-8 animate-fade-up" onClick={e => e.stopPropagation()}
            style={{ background: "hsl(0 0% 6%)", borderTop: "1px solid hsl(0 0% 100% / 0.08)" }}>
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: "hsl(0 0% 20%)" }} />
            <div className="flex items-center justify-between px-5 pt-3 pb-3">
              <h2 className="font-display text-[17px] font-bold text-foreground">Nouvelle dépense</h2>
              <button onClick={() => setShowAddExpense(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-sm text-muted-foreground"
                style={{ background: "hsl(0 0% 100% / 0.05)" }}>✕</button>
            </div>
            <div className="px-5 space-y-4">
              <div>
                <label className="section-label mb-2 block">Catégorie</label>
                <select value={newExpense.category} onChange={e => setNewExpense(p => ({ ...p, category: e.target.value as ExpenseCategory }))}
                  className="w-full rounded-xl px-3 py-3 text-sm input-field">
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="section-label mb-2 block">Libellé *</label>
                <input value={newExpense.label || ""} onChange={e => setNewExpense(p => ({ ...p, label: e.target.value }))} placeholder="Description"
                  className="w-full rounded-xl px-3 py-3 text-sm input-field" />
              </div>
              <div>
                <label className="section-label mb-2 block">Montant €</label>
                <input type="number" value={newExpense.amount || ""} onChange={e => setNewExpense(p => ({ ...p, amount: Number(e.target.value) }))} placeholder="0"
                  className="w-full rounded-xl px-3 py-3 text-sm input-field" />
              </div>
              <button onClick={addExpense} className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white btn-primary mt-2">
                Ajouter la dépense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
