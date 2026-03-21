import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Prospect, ActivResetClient, FinanceEntry, Expense, AppPage, Offre, INITIAL_OFFRES } from "@/data/types";
import { initialProspects } from "@/data/prospects";
import { initialActivResetClients } from "@/data/activResetClients";
import { seedFinanceEntries } from "@/data/seedFinances";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  currentPage: AppPage;
  prospects: Prospect[];
  activResetClients: ActivResetClient[];
  financeEntries: FinanceEntry[];
  expenses: Expense[];
  portageMonths: Record<string, boolean>;
  versementsPerso: Record<string, Record<string, number | null>>;
  offres: Offre[];
  urssafMode: "mois" | "trimestre";
  loading: boolean;
  setCurrentPage: (p: AppPage) => void;
  setProspects: (p: Prospect[]) => void;
  setActivResetClients: (c: ActivResetClient[] | ((prev: ActivResetClient[]) => ActivResetClient[])) => void;
  setFinanceEntries: (e: FinanceEntry[]) => void;
  setExpenses: (e: Expense[]) => void;
  setPortageMonths: (v: Record<string, boolean>) => void;
  setVersementsPerso: (v: Record<string, Record<string, number | null>>) => void;
  setOffres: (o: Offre[]) => void;
  setUrssafMode: (m: "mois" | "trimestre") => void;
}

const AppContext = createContext<AppState | null>(null);

function prospectToRow(p: Prospect, userId: string) {
  return {
    id: p.id, user_id: userId, sex: p.sex, name: p.name, contact: p.contact, source: p.source,
    statut: p.statut, date: p.date, type: p.type, presence: p.presence, heure: p.heure,
    objectif: p.objectif, objection: p.objection, closing: p.closing, offre: p.offre,
    notes: p.notes, profile: p.profile, prix_reel: p.prixReel ?? 0, note_bilan: p.noteBilan ?? 0,
    note_profil: p.noteProfil ?? 0, bilan_validated: p.bilanValidated ?? false,
    age: p.age ?? null, sap_enabled: p.sapEnabled ?? false,
  };
}

function rowToProspect(r: any): Prospect {
  return {
    id: r.id, sex: r.sex, name: r.name, contact: r.contact ?? "", source: r.source ?? "",
    statut: r.statut ?? "CONTACT", date: r.date ?? "", type: r.type ?? "", presence: r.presence ?? "",
    heure: r.heure ?? "", objectif: r.objectif ?? "", objection: r.objection ?? "",
    closing: r.closing ?? "NON", offre: r.offre ?? "-", notes: r.notes ?? "", profile: r.profile ?? "",
    prixReel: Number(r.prix_reel) || 0, noteBilan: Number(r.note_bilan) || 0,
    noteProfil: Number(r.note_profil) || 0, bilanValidated: r.bilan_validated ?? false,
    age: r.age ?? undefined, sapEnabled: r.sap_enabled ?? false,
  };
}

function arClientToRow(c: ActivResetClient, userId: string) {
  return {
    id: c.id, user_id: userId, name: c.name, phone: c.phone, offre: c.offre,
    start_date: c.startDate, current_phase: c.currentPhase, phases: JSON.parse(JSON.stringify(c.phases)),
    objectif_atteint: c.objectifAtteint ?? null, cycle: c.cycle, notes: c.notes,
  };
}

function rowToArClient(r: any): ActivResetClient {
  return {
    id: r.id, name: r.name, phone: r.phone ?? "", offre: r.offre ?? "",
    startDate: r.start_date ?? "", currentPhase: r.current_phase ?? 0,
    phases: (r.phases as any) ?? [], objectifAtteint: r.objectif_atteint,
    cycle: r.cycle ?? 1, notes: r.notes ?? "",
  };
}

function financeToRow(f: FinanceEntry, userId: string) {
  return {
    id: f.id, user_id: userId, month: f.month, type: f.type, label: f.label,
    amount: f.amount, offre: f.offre ?? null, client_name: f.clientName ?? null,
    payment_mode: f.paymentMode ?? null, installment_group: f.installmentGroup ?? null,
    installment_index: f.installmentIndex ?? null, installment_total: f.installmentTotal ?? null,
    sap_hours: f.sapHours ?? null, cash_declaration: f.cashDeclaration ?? null,
  };
}

function rowToFinance(r: any): FinanceEntry {
  return {
    id: r.id, month: r.month, type: r.type, label: r.label, amount: Number(r.amount),
    offre: r.offre ?? undefined, clientName: r.client_name ?? undefined,
    paymentMode: r.payment_mode ?? undefined, installmentGroup: r.installment_group ?? undefined,
    installmentIndex: r.installment_index ?? undefined, installmentTotal: r.installment_total ?? undefined,
    sapHours: r.sap_hours != null ? Number(r.sap_hours) : undefined,
    cashDeclaration: r.cash_declaration ?? undefined,
  };
}

function expenseToRow(e: Expense, userId: string) {
  return { id: e.id, user_id: userId, month: e.month, category: e.category, label: e.label, amount: e.amount, date: e.date };
}

function rowToExpense(r: any): Expense {
  return { id: r.id, month: r.month, category: r.category, label: r.label, amount: Number(r.amount), date: r.date };
}

function offreToRow(o: Offre, userId: string) {
  return {
    id: o.id, user_id: userId, name: o.name, price: o.price, active: o.active,
    price_history: JSON.parse(JSON.stringify(o.priceHistory)),
    duration: o.duration ? JSON.parse(JSON.stringify(o.duration)) : null,
    unit_price: o.unitPrice ?? null, min_quantity: o.minQuantity ?? null,
    is_ala_carte: o.isAlaCarte ?? false, theme: o.theme ?? "PROGRAMMES",
    tva_enabled: o.tvaEnabled ?? false, portage_eligible: o.portageEligible ?? false,
    max_installments: o.maxInstallments ?? null,
  };
}

function rowToOffre(r: any): Offre {
  return {
    id: r.id, name: r.name, price: Number(r.price), active: r.active ?? true,
    priceHistory: (r.price_history as any) ?? [],
    duration: (r.duration as any) ?? undefined,
    unitPrice: r.unit_price != null ? Number(r.unit_price) : undefined,
    minQuantity: r.min_quantity ?? undefined,
    isAlaCarte: r.is_ala_carte ?? false,
    theme: r.theme ?? "PROGRAMMES",
    tvaEnabled: r.tva_enabled ?? false,
    portageEligible: r.portage_eligible ?? false,
    maxInstallments: r.max_installments ?? undefined,
  };
}

async function syncToSupabase<T>(table: string, items: T[], toRow: (item: T, userId: string) => any, userId: string) {
  const client = supabase as any;
  await client.from(table).delete().eq("user_id", userId);
  if (items.length > 0) {
    const rows = items.map(i => toRow(i, userId));
    await client.from(table).upsert(rows);
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<AppPage>("finances");
  const [prospects, setProspectsState] = useState<Prospect[]>([]);
  const [activResetClients, setActivResetClientsState] = useState<ActivResetClient[]>([]);
  const [financeEntries, setFinanceEntriesState] = useState<FinanceEntry[]>([]);
  const [expenses, setExpensesState] = useState<Expense[]>([]);
  const [portageMonths, setPortageMonthsState] = useState<Record<string, boolean>>({});
  const [versementsPerso, setVersementsPersoState] = useState<Record<string, Record<string, number | null>>>({});
  const [offres, setOffresState] = useState<Offre[]>([]);
  const [urssafMode, setUrssafModeState] = useState<"mois" | "trimestre">("trimestre");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadAllData(user.id);
  }, [user]);

  const loadAllData = async (userId: string) => {
    setLoading(true);
    try {
      const [pRes, arRes, fRes, eRes, oRes, sRes] = await Promise.all([
        supabase.from("prospects").select("*").eq("user_id", userId),
        supabase.from("activ_reset_clients").select("*").eq("user_id", userId),
        supabase.from("finance_entries").select("*").eq("user_id", userId),
        supabase.from("expenses").select("*").eq("user_id", userId),
        supabase.from("offres").select("*").eq("user_id", userId),
        supabase.from("app_settings").select("*").eq("user_id", userId).maybeSingle(),
      ]);

      const loadedOffres = (oRes.data && oRes.data.length > 0) ? oRes.data.map(rowToOffre) : null;
      if (!loadedOffres) {
        setOffresState(INITIAL_OFFRES);
        await syncToSupabase("offres", INITIAL_OFFRES, offreToRow, userId);
      } else {
        setOffresState(loadedOffres);
      }

      if (pRes.data && pRes.data.length > 0) {
        setProspectsState(pRes.data.map(rowToProspect));
      } else {
        setProspectsState(initialProspects);
        await syncToSupabase("prospects", initialProspects, prospectToRow, userId);
      }

      if (arRes.data && arRes.data.length > 0) {
        setActivResetClientsState(arRes.data.map(rowToArClient));
      } else {
        setActivResetClientsState(initialActivResetClients);
        await syncToSupabase("activ_reset_clients", initialActivResetClients, arClientToRow, userId);
      }

      if (fRes.data && fRes.data.length > 0) {
        setFinanceEntriesState(fRes.data.map(rowToFinance));
      } else {
        setFinanceEntriesState(seedFinanceEntries);
        await syncToSupabase("finance_entries", seedFinanceEntries, financeToRow, userId);
      }

      setExpensesState((eRes.data ?? []).map(rowToExpense));

      if (sRes.data) {
        setPortageMonthsState((sRes.data.portage_months as any) ?? {});
        setVersementsPersoState((sRes.data.versements_perso as any) ?? {});
        setUrssafModeState(((sRes.data as any).urssaf_mode as any) ?? "trimestre");
      } else {
        await supabase.from("app_settings").insert({ user_id: userId, portage_enabled: false, versements_perso: {}, portage_months: {}, urssaf_mode: "trimestre" } as any);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
    setLoading(false);
  };

  const setProspects = useCallback((p: Prospect[]) => {
    setProspectsState(p);
    if (user) syncToSupabase("prospects", p, prospectToRow, user.id);
  }, [user]);

  const setActivResetClients = useCallback((c: ActivResetClient[] | ((prev: ActivResetClient[]) => ActivResetClient[])) => {
    setActivResetClientsState(prev => {
      const next = typeof c === "function" ? c(prev) : c;
      if (user) syncToSupabase("activ_reset_clients", next, arClientToRow, user.id);
      return next;
    });
  }, [user]);

  const setFinanceEntries = useCallback((e: FinanceEntry[]) => {
    setFinanceEntriesState(e);
    if (user) syncToSupabase("finance_entries", e, financeToRow, user.id);
  }, [user]);

  const setExpenses = useCallback((e: Expense[]) => {
    setExpensesState(e);
    if (user) syncToSupabase("expenses", e, expenseToRow, user.id);
  }, [user]);

  const setPortageMonths = useCallback((v: Record<string, boolean>) => {
    setPortageMonthsState(v);
    if (user) supabase.from("app_settings").update({ portage_months: v as any }).eq("user_id", user.id).then();
  }, [user]);

  const setVersementsPerso = useCallback((v: Record<string, Record<string, number | null>>) => {
    setVersementsPersoState(v);
    if (user) supabase.from("app_settings").update({ versements_perso: v as any }).eq("user_id", user.id).then();
  }, [user]);

  const setOffres = useCallback((o: Offre[]) => {
    setOffresState(o);
    if (user) syncToSupabase("offres", o, offreToRow, user.id);
  }, [user]);

  const setUrssafMode = useCallback((m: "mois" | "trimestre") => {
    setUrssafModeState(m);
    if (user) supabase.from("app_settings").update({ urssaf_mode: m } as any).eq("user_id", user.id).then();
  }, [user]);

  return (
    <AppContext.Provider value={{
      user, isAuthenticated: !!user, currentPage, prospects, activResetClients,
      financeEntries, expenses, portageMonths, versementsPerso, offres, urssafMode, loading,
      setCurrentPage, setProspects, setActivResetClients, setFinanceEntries,
      setExpenses, setPortageMonths, setVersementsPerso, setOffres, setUrssafMode,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
