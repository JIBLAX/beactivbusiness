import { useState, useMemo } from "react";
import { useApp } from "@/store/AppContext";
import ClientAutocomplete from "@/components/ui/ClientAutocomplete";
import { FinanceEntry, Expense, ExpenseCategory, EXPENSE_CATEGORIES, PAYMENT_MODES, CASH_DECLARATIONS, OffreTheme, OFFRE_THEMES } from "@/data/types";
import { getMonthEditState, getSealedLabel, getQuarterForMonth } from "@/lib/quarterLock";
import logoBeActiv from "@/assets/logo-beactiv.png";
import logoCardioMouv from "@/assets/logo-cardiomouv.png";
import logoJM from "@/assets/logo-jm.png";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(m: string): string {
  const [y, mo] = m.split("-");
  return `${MONTHS[parseInt(mo) - 1]} ${y}`;
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

const THEME_LOGOS: Record<string, string> = {
  "COURS COLLECTIFS": logoCardioMouv,
  "JM COACHING": logoJM,
  "PROGRAMMES": logoBeActiv,
};

export default function ActivitesPage() {
  const { financeEntries, setFinanceEntries, expenses, setExpenses, offres, portageMonths } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [activeTab, setActiveTab] = useState<"entrees" | "depenses">("entrees");
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showQuickCours, setShowQuickCours] = useState(false);
  const [showAddSessions, setShowAddSessions] = useState(false);

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<Partial<FinanceEntry>>({});
  const [editExpense, setEditExpense] = useState<Partial<Expense>>({});
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ category: "LOCAUX & BUREAUX", amount: 0 });

  // Quick cours
  const [quickCoursData, setQuickCoursData] = useState<Record<string, number>>({});
  const [quickCoursPayment, setQuickCoursPayment] = useState<string>("cb");

  // Extra sessions
  const [extraSessionsOffre, setExtraSessionsOffre] = useState("");
  const [extraSessionsClient, setExtraSessionsClient] = useState("");
  const [extraSessionsCount, setExtraSessionsCount] = useState(0);

  // Add entry form
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
  const [entryDiscountType, setEntryDiscountType] = useState<"percent" | "euro" | "none">("none");
  const [entryDiscountValue, setEntryDiscountValue] = useState(0);

  const portageEnabled = portageMonths[selectedMonth] ?? false;
  const editable = isEditable(selectedMonth);
  const allMonths = useMemo(() => getAllMonths(), []);
  const activeOffres = offres.filter(o => o.active);

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

  const totalEntries = monthEntries.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const handleOffreSelect = (offreName: string) => {
    setEntryOffre(offreName);
    const found = offres.find(o => o.name === offreName);
    if (found) {
      if (found.unitPrice && found.minQuantity) {
        setEntryNbSessions(found.minQuantity);
        setEntryAmount(found.unitPrice * found.minQuantity);
      } else {
        setEntryAmount(found.price);
        setEntryNbSessions(0);
      }
      setEntryInstallments(1);
    }
  };

  const handleSessionCountChange = (count: number) => {
    setEntryNbSessions(count);
    const found = offres.find(o => o.name === entryOffre);
    if (found?.unitPrice) setEntryAmount(found.unitPrice * count);
  };

  const resetEntryForm = () => {
    setEntrySource("offre"); setEntryOffre(""); setEntryExterneLabel(""); setEntryClientName("");
    setEntryAmount(0); setEntryType("micro"); setEntryPaymentMode("cb");
    setEntryInstallments(1); setEntrySapHours(0); setEntryCashDeclaration("micro"); setAddTheme(null);
    setEntryNbSessions(0); setEntryDiscountType("none"); setEntryDiscountValue(0);
  };

  const openAddByTheme = (theme: OffreTheme) => {
    if (theme === "COURS COLLECTIFS") {
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
      newEntries.push({
        id: "fe" + Date.now() + "_" + offreName.replace(/\s/g, ""),
        month: selectedMonth, type: "micro",
        label: `${offreName} × ${qty}`,
        amount: found.price * qty, offre: offreName,
        paymentMode: quickCoursPayment as any,
      });
    });
    if (newEntries.length > 0) setFinanceEntries([...financeEntries, ...newEntries]);
    setShowQuickCours(false);
  };

  const addExtraSessions = () => {
    if (!extraSessionsOffre || extraSessionsCount <= 0 || !extraSessionsClient) return;
    const found = offres.find(o => o.name === extraSessionsOffre);
    if (!found?.unitPrice) return;
    const entry: FinanceEntry = {
      id: "fe" + Date.now() + "_extra",
      month: selectedMonth, type: "micro",
      label: `${extraSessionsOffre} +${extraSessionsCount} séances supp.`,
      amount: found.unitPrice * extraSessionsCount, offre: extraSessionsOffre,
      clientName: extraSessionsClient, paymentMode: "cb",
    };
    setFinanceEntries([...financeEntries, entry]);
    setShowAddSessions(false);
    setExtraSessionsOffre(""); setExtraSessionsClient(""); setExtraSessionsCount(0);
  };

  const themeOffres = addTheme ? activeOffres.filter(o => o.theme === addTheme) : activeOffres;

  const addEntry = () => {
    const label = entrySource === "offre" ? entryOffre : entryExterneLabel;
    if (!label || !entryAmount) return;
    const groupId = "grp" + Date.now();

    // Calculate discount
    let finalAmount = entryAmount;
    let originalAmount: number | undefined;
    let discountType: "percent" | "euro" | undefined;
    let discountValue: number | undefined;
    if (entryDiscountType !== "none" && entryDiscountValue > 0) {
      originalAmount = entryAmount;
      discountType = entryDiscountType;
      discountValue = entryDiscountValue;
      if (entryDiscountType === "percent") {
        finalAmount = Math.round(entryAmount * (1 - entryDiscountValue / 100) * 100) / 100;
      } else {
        finalAmount = Math.max(0, entryAmount - entryDiscountValue);
      }
    }

    const installmentAmount = Math.round((finalAmount / entryInstallments) * 100) / 100;
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
        discountType, discountValue, originalAmount,
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

  return (
    <div className="px-4 pt-4 pb-24">
      {/* Month selector */}
      <div className="flex items-center gap-2 mb-5">
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          className="flex-1 rounded-2xl px-4 py-3 text-sm font-medium input-field appearance-none">
          {allMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
        {!editable && (
          <div className="badge-pill" style={{ background: "hsl(0 62% 50% / 0.1)", color: "hsl(0 62% 60%)" }}>🔒 Scellé</div>
        )}
      </div>

      {/* Toggle Cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => setActiveTab("entrees")}
          className={`relative rounded-2xl p-4 text-center transition-all ${
            activeTab === "entrees"
              ? "ring-2 ring-success/40"
              : "opacity-60"
          }`}
          style={{
            background: activeTab === "entrees"
              ? "linear-gradient(135deg, hsl(142 71% 45% / 0.12), hsl(142 71% 45% / 0.04))"
              : "hsl(0 0% 100% / 0.03)",
            border: activeTab === "entrees" ? "1px solid hsl(142 71% 45% / 0.2)" : "1px solid hsl(0 0% 100% / 0.06)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="value-lg text-[20px] text-success">{totalEntries.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
          <div className="text-[11px] font-bold text-foreground tracking-wider mt-1">ENTRÉES</div>
          <div className="text-[9px] text-muted-foreground mt-0.5">{monthEntries.length} opération{monthEntries.length !== 1 ? "s" : ""}</div>
        </button>
        <button
          onClick={() => setActiveTab("depenses")}
          className={`relative rounded-2xl p-4 text-center transition-all ${
            activeTab === "depenses"
              ? "ring-2 ring-destructive/40"
              : "opacity-60"
          }`}
          style={{
            background: activeTab === "depenses"
              ? "linear-gradient(135deg, hsl(0 62% 50% / 0.12), hsl(0 62% 50% / 0.04))"
              : "hsl(0 0% 100% / 0.03)",
            border: activeTab === "depenses" ? "1px solid hsl(0 62% 50% / 0.2)" : "1px solid hsl(0 0% 100% / 0.06)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="value-lg text-[20px] text-destructive">-{totalExpenses.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
          <div className="text-[11px] font-bold text-foreground tracking-wider mt-1">DÉPENSES</div>
          <div className="text-[9px] text-muted-foreground mt-0.5">{monthExpenses.length} dépense{monthExpenses.length !== 1 ? "s" : ""}</div>
        </button>
      </div>

      {/* ENTRÉES TAB */}
      {activeTab === "entrees" && (
      <div className="mb-2">

      {OFFRE_THEMES.map(theme => {
        const entries = entriesByTheme[theme] || [];
        const themeTotal = entries.reduce((s, e) => s + e.amount, 0);
        if (entries.length === 0) return null;

        return (
          <div key={theme} className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {THEME_LOGOS[theme] ? (
                  <div className="w-6 h-6 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "hsl(0 0% 100% / 0.04)" }}>
                    <img src={THEME_LOGOS[theme]} alt={theme} className="w-full h-full object-cover" />
                  </div>
                ) : <span className="text-sm">📄</span>}
                <span className="text-[12px] font-bold text-foreground">{theme}</span>
                <span className="badge-pill text-[10px]" style={{ background: "hsl(0 0% 100% / 0.04)", color: "hsl(0 0% 60%)" }}>{entries.length}</span>
              </div>
              {themeTotal > 0 && <span className="value-lg text-[13px] text-success">{themeTotal.toFixed(0)}€</span>}
            </div>

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
                        <button onClick={saveEditEntry} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white btn-primary">✓</button>
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
                          {e.discountValue && e.discountType && (
                            <span className="badge-pill text-[8px] py-0" style={{ background: "hsl(38 92% 55% / 0.1)", color: "hsl(38 92% 55%)" }}>
                              -{e.discountValue}{e.discountType === "percent" ? "%" : "€"}
                            </span>
                          )}
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
                        {editable && (() => {
                          const entryOffre = offres.find(o => o.name === e.offre);
                          return entryOffre?.unitPrice ? (
                            <button onClick={() => { setShowAddSessions(true); setExtraSessionsOffre(e.offre || ""); setExtraSessionsClient(e.clientName || ""); setExtraSessionsCount(0); }}
                              className="text-[10px] px-1.5 py-0.5 rounded-lg transition-colors"
                              style={{ background: "hsl(38 92% 55% / 0.1)", color: "hsl(38 92% 55%)", border: "1px solid hsl(38 92% 55% / 0.2)" }}>
                              +séances
                            </button>
                          ) : null;
                        })()}
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

      {monthEntries.length === 0 && (
        <div className="rounded-2xl p-6 text-center stat-card" style={{ border: "1px dashed hsl(0 0% 100% / 0.06)" }}>
          <div className="text-muted-foreground text-[11px]">Aucune entrée ce mois</div>
        </div>
      )}
      </div>
      )}

      {/* DÉPENSES TAB */}
      {activeTab === "depenses" && (
      <div>
      {monthExpenses.length > 0 ? (
        <div className="mb-6">
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
                      <button onClick={saveEditExpense} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white btn-primary">✓</button>
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
        </div>
      ) : (
        <div className="rounded-2xl p-6 text-center stat-card mb-6" style={{ border: "1px dashed hsl(0 0% 100% / 0.06)" }}>
          <div className="text-muted-foreground text-[11px]">Aucune dépense ce mois</div>
        </div>
      )}
      </div>
      )}

      {/* FAB */}
      {editable && (
        <>
          <button onClick={() => setShowFabMenu(!showFabMenu)}
            className="fixed bottom-6 right-5 z-[60] w-14 h-14 rounded-2xl flex items-center justify-center text-2xl text-white btn-primary active:scale-90 transition-transform"
            style={{ boxShadow: "0 8px 24px hsl(348 63% 30% / 0.4)" }}>
            <span className={`transition-transform ${showFabMenu ? "rotate-45" : ""}`}>+</span>
          </button>

          {/* FAB Menu */}
          {showFabMenu && (
            <>
              <div className="fixed inset-0 z-[55]" onClick={() => setShowFabMenu(false)} />
              <div className="fixed bottom-24 right-5 z-[60] flex flex-col gap-2 items-end animate-fade-up">
                {[
                  { label: "💰 Entrée", action: () => { setShowFabMenu(false); resetEntryForm(); setShowAddEntry(true); } },
                  { label: "💳 Dépense", action: () => { setShowFabMenu(false); setShowAddExpense(true); } },
                  { label: "🏃 Cours collectifs", action: () => { setShowFabMenu(false); openAddByTheme("COURS COLLECTIFS"); } },
                ].map(item => (
                  <button key={item.label} onClick={item.action}
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[13px] font-semibold text-foreground"
                    style={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 100% / 0.08)", boxShadow: "0 8px 32px hsl(0 0% 0% / 0.5)" }}>
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ADD ENTRY SHEET */}
      {showAddEntry && (
        <div className="fixed inset-0 z-[200] flex items-end" onClick={() => setShowAddEntry(false)}
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-h-[85dvh] rounded-t-3xl overflow-y-auto pb-8 animate-fade-up" onClick={e => e.stopPropagation()}
            style={{ background: "hsl(0 0% 6%)", borderTop: "1px solid hsl(0 0% 100% / 0.08)" }}>
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: "hsl(0 0% 20%)" }} />
            <div className="flex items-center justify-between px-5 pt-3 pb-3">
              <h2 className="font-display text-[17px] font-bold text-foreground">
                {addTheme ? (
                  <span className="flex items-center gap-2">
                    {THEME_LOGOS[addTheme] && <img src={THEME_LOGOS[addTheme]} alt={addTheme} className="w-6 h-6 rounded-lg object-cover" />}
                    {addTheme}
                  </span>
                ) : "Nouvelle entrée"}
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
                  {(() => {
                    const selectedOffre = offres.find(o => o.name === entryOffre);
                    if (selectedOffre?.unitPrice && selectedOffre?.minQuantity) {
                      return (
                        <div>
                          <label className="section-label mb-2 block">Nombre de séances</label>
                          <div className="flex items-center gap-3">
                            <button onClick={() => entryNbSessions > (selectedOffre.minQuantity || 1) && handleSessionCountChange(entryNbSessions - 1)}
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold input-field">−</button>
                            <div className="flex-1 text-center">
                              <div className="value-lg text-[24px] text-foreground">{entryNbSessions}</div>
                              <div className="text-[10px] text-muted-foreground">min. {selectedOffre.minQuantity}</div>
                            </div>
                            <button onClick={() => handleSessionCountChange(entryNbSessions + 1)}
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold input-field">+</button>
                          </div>
                          <div className="text-[11px] text-muted-foreground text-center mt-1">
                            {entryNbSessions} × {selectedOffre.unitPrice}€ = <span className="text-success font-semibold">{entryAmount}€</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
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

              {/* Réduction */}
              <div>
                <label className="section-label mb-2 block">Réduction</label>
                <div className="flex gap-2 mb-2">
                  {([["none", "Aucune"], ["percent", "En %"], ["euro", "En €"]] as const).map(([val, lbl]) => (
                    <button key={val} onClick={() => { setEntryDiscountType(val as any); if (val === "none") setEntryDiscountValue(0); }}
                      className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${entryDiscountType === val ? "text-foreground btn-primary" : "text-muted-foreground input-field"}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
                {entryDiscountType !== "none" && (
                  <div className="space-y-2">
                    <input type="number" value={entryDiscountValue || ""} onChange={e => setEntryDiscountValue(Number(e.target.value))}
                      placeholder={entryDiscountType === "percent" ? "Ex: 10" : "Ex: 50"}
                      className="w-full rounded-xl px-3 py-3 text-sm input-field" />
                    {entryDiscountValue > 0 && entryAmount > 0 && (
                      <div className="rounded-xl p-3 text-center text-[12px]" style={{ background: "hsl(38 92% 55% / 0.08)", border: "1px solid hsl(38 92% 55% / 0.15)" }}>
                        <span className="text-muted-foreground line-through mr-2">{entryAmount}€</span>
                        <span className="text-warning font-bold">
                          → {entryDiscountType === "percent"
                            ? (Math.round(entryAmount * (1 - entryDiscountValue / 100) * 100) / 100).toFixed(2)
                            : Math.max(0, entryAmount - entryDiscountValue).toFixed(2)
                          }€
                        </span>
                        <span className="text-muted-foreground ml-1">(-{entryDiscountValue}{entryDiscountType === "percent" ? "%" : "€"})</span>
                      </div>
                    )}
                  </div>
                )}
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

              {(() => {
                const selectedOffre = offres.find(o => o.name === entryOffre);
                const maxInst = selectedOffre?.maxInstallments && selectedOffre.maxInstallments > 1 ? selectedOffre.maxInstallments : 1;
                if (maxInst <= 1) return null;
                const options = Array.from({ length: maxInst }, (_, i) => i + 1);
                return (
                  <div>
                    <label className="section-label mb-2 block">Paiement</label>
                    <div className="flex gap-2">
                      {options.map(n => (
                        <button key={n} onClick={() => setEntryInstallments(n)}
                          className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${entryInstallments === n ? "text-foreground btn-primary" : "text-muted-foreground input-field"}`}>
                          {n === 1 ? "Comptant" : `${n}×`}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

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

      {/* QUICK COURS COLLECTIFS SHEET */}
      {showQuickCours && (
        <div className="fixed inset-0 z-[200] flex items-end" onClick={() => setShowQuickCours(false)}
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-h-[85dvh] rounded-t-3xl overflow-y-auto pb-8 animate-fade-up" onClick={e => e.stopPropagation()}
            style={{ background: "hsl(0 0% 6%)", borderTop: "1px solid hsl(0 0% 100% / 0.08)" }}>
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: "hsl(0 0% 20%)" }} />
            <div className="flex items-center justify-between px-5 pt-3 pb-3">
              <h2 className="font-display text-[17px] font-bold text-foreground">🏃 Cours Collectifs</h2>
              <button onClick={() => setShowQuickCours(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-sm text-muted-foreground"
                style={{ background: "hsl(0 0% 100% / 0.05)" }}>✕</button>
            </div>
            <div className="px-5 space-y-3">
              <p className="text-[11px] text-muted-foreground">Entrez le nombre vendu pour chaque offre ce mois</p>
              {activeOffres.filter(o => o.theme === "COURS COLLECTIFS").map(o => (
                <div key={o.id} className="rounded-2xl p-4 flex items-center justify-between" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="text-[13px] font-semibold text-foreground">{o.name}</div>
                    <div className="text-[11px] text-muted-foreground">{o.price}€ / unité</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQuickCoursData(p => ({ ...p, [o.name]: Math.max(0, (p[o.name] || 0) - 1) }))}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold input-field">−</button>
                    <div className="w-10 text-center value-lg text-[18px] text-foreground">{quickCoursData[o.name] || 0}</div>
                    <button onClick={() => setQuickCoursData(p => ({ ...p, [o.name]: (p[o.name] || 0) + 1 }))}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold input-field">+</button>
                  </div>
                  {(quickCoursData[o.name] || 0) > 0 && (
                    <div className="ml-3 value-lg text-[13px] text-success min-w-[50px] text-right">
                      {(o.price * (quickCoursData[o.name] || 0)).toFixed(0)}€
                    </div>
                  )}
                </div>
              ))}
              <div>
                <label className="section-label mb-2 block">Mode paiement</label>
                <select value={quickCoursPayment} onChange={e => setQuickCoursPayment(e.target.value)}
                  className="w-full rounded-xl px-3 py-3 text-sm input-field">
                  {PAYMENT_MODES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              {(() => {
                const total = Object.entries(quickCoursData).reduce((s, [name, qty]) => {
                  const o = offres.find(of => of.name === name);
                  return s + (o ? o.price * qty : 0);
                }, 0);
                return total > 0 ? (
                  <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(152 55% 42% / 0.08)", border: "1px solid hsl(152 55% 42% / 0.2)" }}>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total cours collectifs</div>
                    <div className="value-lg text-[24px] text-success">{total.toFixed(0)}€</div>
                  </div>
                ) : null;
              })()}
              <button onClick={addQuickCours} className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white btn-primary mt-2">
                Ajouter les entrées
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD EXTRA SESSIONS SHEET */}
      {showAddSessions && (
        <div className="fixed inset-0 z-[200] flex items-end" onClick={() => setShowAddSessions(false)}
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-h-[80dvh] rounded-t-3xl overflow-y-auto pb-8 animate-fade-up" onClick={e => e.stopPropagation()}
            style={{ background: "hsl(0 0% 6%)", borderTop: "1px solid hsl(0 0% 100% / 0.08)" }}>
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: "hsl(0 0% 20%)" }} />
            <div className="flex items-center justify-between px-5 pt-3 pb-3">
              <h2 className="font-display text-[17px] font-bold text-foreground">💪 Séances supplémentaires</h2>
              <button onClick={() => setShowAddSessions(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-sm text-muted-foreground"
                style={{ background: "hsl(0 0% 100% / 0.05)" }}>✕</button>
            </div>
            <div className="px-5 space-y-4">
              <p className="text-[11px] text-muted-foreground">Ajoutez des séances en plus du minimum inclus dans le PASS</p>
              <div>
                <label className="section-label mb-2 block">Offre JM PASS</label>
                <select value={extraSessionsOffre} onChange={e => setExtraSessionsOffre(e.target.value)}
                  className="w-full rounded-xl px-3 py-3 text-sm input-field">
                  <option value="">— Sélectionner —</option>
                  {activeOffres.filter(o => o.theme === "JM COACHING" && o.unitPrice && o.minQuantity).map(o => (
                    <option key={o.id} value={o.name}>{o.name} — {o.unitPrice}€/séance</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="section-label mb-2 block">Client</label>
                <ClientAutocomplete value={extraSessionsClient} onChange={v => setExtraSessionsClient(v)} />
              </div>
              <div>
                <label className="section-label mb-2 block">Nombre de séances supp.</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => extraSessionsCount > 1 && setExtraSessionsCount(extraSessionsCount - 1)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold input-field">−</button>
                  <div className="flex-1 text-center">
                    <div className="value-lg text-[24px] text-foreground">{extraSessionsCount}</div>
                  </div>
                  <button onClick={() => setExtraSessionsCount(extraSessionsCount + 1)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold input-field">+</button>
                </div>
              </div>
              {extraSessionsOffre && extraSessionsCount > 0 && (() => {
                const found = offres.find(o => o.name === extraSessionsOffre);
                const total = (found?.unitPrice || 0) * extraSessionsCount;
                return (
                  <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(38 92% 55% / 0.08)", border: "1px solid hsl(38 92% 55% / 0.2)" }}>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total séances supplémentaires</div>
                    <div className="value-lg text-[20px] text-warning">{extraSessionsCount} × {found?.unitPrice}€ = {total}€</div>
                  </div>
                );
              })()}
              <button onClick={addExtraSessions} className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white btn-primary mt-2">
                Ajouter les séances
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
