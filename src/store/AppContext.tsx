import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { Prospect, ActivResetClient, FinanceEntry, Expense, AppPage, Offre, INITIAL_OFFRES, Structure } from "@/data/types";
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
  structures: Structure[];
  urssafMode: "mois" | "trimestre";
  quarterEdits: Record<string, number>;
  incrementQuarterEdit: (quarterKey: string) => void;
  monthlyGoal: number;
  setMonthlyGoal: (v: number) => void;
  loading: boolean;
  setCurrentPage: (p: AppPage) => void;
  setProspects: (p: Prospect[]) => void;
  setActivResetClients: (c: ActivResetClient[] | ((prev: ActivResetClient[]) => ActivResetClient[])) => void;
  setFinanceEntries: (e: FinanceEntry[]) => void;
  setExpenses: (e: Expense[]) => void;
  setPortageMonths: (v: Record<string, boolean>) => void;
  setVersementsPerso: (v: Record<string, Record<string, number | null>>) => void;
  setOffres: (o: Offre[]) => void;
  setStructures: (s: Structure[]) => void;
  setUrssafMode: (m: "mois" | "trimestre") => void;
  setQuarterEdits: (q: Record<string, number>) => void;
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
    group_type: p.groupType ?? null, group_id: p.groupId ?? null, is_group_leader: p.isGroupLeader ?? false,
    montant: p.montant ?? null, paiement_mode: p.paiementMode ?? null, versements_recus: p.versementsRecus ?? null,
    offer_type: p.offerType ?? null, catalog_price_snapshot: p.catalogPriceSnapshot ?? null,
    actual_amount: p.actualAmount ?? null, moyen_paiement: p.moyenPaiement ?? null,
    canal_finance: p.canalFinance ?? null, installments_planned: p.installmentsPlanned ?? null,
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
    groupType: r.group_type ?? null, groupId: r.group_id ?? null, isGroupLeader: r.is_group_leader ?? false,
    montant: r.montant ?? null, paiementMode: r.paiement_mode ?? null, versementsRecus: r.versements_recus ?? null,
    offerType: r.offer_type ?? null, catalogPriceSnapshot: r.catalog_price_snapshot ?? null,
    actualAmount: r.actual_amount ?? null, moyenPaiement: r.moyen_paiement ?? null,
    canalFinance: r.canal_finance ?? null, installmentsPlanned: r.installments_planned ?? null,
  };
}

function arClientToRow(c: ActivResetClient, userId: string) {
  return {
    id: c.id, user_id: userId, name: c.name, phone: c.phone, offre: c.offre,
    start_date: c.startDate, current_phase: c.currentPhase, phases: JSON.parse(JSON.stringify(c.phases)),
    objectif_atteint: c.objectifAtteint ?? null, cycle: c.cycle, notes: c.notes,
    archived: c.archived ?? false,
  };
}

function rowToArClient(r: any): ActivResetClient {
  return {
    id: r.id, name: r.name, phone: r.phone ?? "", offre: r.offre ?? "",
    startDate: r.start_date ?? "", currentPhase: r.current_phase ?? 0,
    phases: (r.phases as any) ?? [], objectifAtteint: r.objectif_atteint,
    cycle: r.cycle ?? 1, notes: r.notes ?? "", archived: r.archived ?? false,
  };
}

function financeToRow(f: FinanceEntry, userId: string) {
  return {
    id: f.id, user_id: userId, month: f.month, type: f.type, label: f.label,
    amount: f.amount, offre: f.offre ?? null, client_name: f.clientName ?? null,
    payment_mode: f.paymentMode ?? null, installment_group: f.installmentGroup ?? null,
    installment_index: f.installmentIndex ?? null, installment_total: f.installmentTotal ?? null,
    sap_hours: f.sapHours ?? null, cash_declaration: f.cashDeclaration ?? null,
    discount_type: f.discountType ?? null, discount_value: f.discountValue ?? null,
    original_amount: f.originalAmount ?? null,
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
    discountType: r.discount_type ?? undefined,
    discountValue: r.discount_value != null ? Number(r.discount_value) : undefined,
    originalAmount: r.original_amount != null ? Number(r.original_amount) : undefined,
  };
}

function expenseToRow(e: Expense, userId: string) {
  return { id: e.id, user_id: userId, month: e.month, category: e.category, label: e.label, amount: e.amount, date: e.date, pro_pct: e.proPct ?? 100, portage_pct: e.portagePct ?? null };
}

function rowToExpense(r: any): Expense {
  return { id: r.id, month: r.month, category: r.category, label: r.label, amount: Number(r.amount), date: r.date, proPct: r.pro_pct ?? 100, portagePct: r.portage_pct ?? null };
}

function offreToRow(o: Offre, userId: string) {
  return {
    id: o.id, user_id: userId, name: o.name, price: o.price, active: o.active,
    price_history: JSON.parse(JSON.stringify(o.priceHistory)),
    aliases: o.aliases ?? [],
    duration: o.duration ? JSON.parse(JSON.stringify(o.duration)) : null,
    unit_price: o.unitPrice ?? null, min_quantity: o.minQuantity ?? null,
    is_ala_carte: o.isAlaCarte ?? false, theme: o.theme ?? "TRANSFORMATION",
    tva_enabled: o.tvaEnabled ?? false, portage_eligible: o.portageEligible ?? false,
    max_installments: o.maxInstallments ?? null,
    is_draft: o.isDraft ?? false,
    offer_type: o.offerType ?? null,
    session_tracking_enabled: o.sessionTrackingEnabled ?? false,
    min_sessions_to_validate: o.minSessionsToValidate ?? null,
  };
}

function rowToOffre(r: any): Offre {
  return {
    id: r.id, name: r.name, price: Number(r.price), active: r.active ?? true,
    priceHistory: (r.price_history as any) ?? [],
    aliases: (r.aliases as string[]) ?? [],
    duration: (r.duration as any) ?? undefined,
    unitPrice: r.unit_price != null ? Number(r.unit_price) : undefined,
    minQuantity: r.min_quantity ?? undefined,
    isAlaCarte: r.is_ala_carte ?? false,
    theme: r.theme ?? "TRANSFORMATION",
    tvaEnabled: r.tva_enabled ?? false,
    portageEligible: r.portage_eligible ?? false,
    maxInstallments: r.max_installments ?? undefined,
    isDraft: r.is_draft ?? false,
    offerType: r.offer_type ?? null,
    sessionTrackingEnabled: r.session_tracking_enabled ?? false,
    minSessionsToValidate: r.min_sessions_to_validate ?? undefined,
  };
}

function offreToProRow(o: Offre, userId: string) {
  return {
    user_id: userId,
    external_ref: o.id,
    name: o.name,
    price: o.price,
    active: o.active,
    aliases: o.aliases ?? [],
    duration: o.duration ? JSON.parse(JSON.stringify(o.duration)) : null,
    unit_price: o.unitPrice ?? null,
    min_quantity: o.minQuantity ?? null,
    is_draft: o.isDraft ?? false,
    theme: o.theme ?? "TRANSFORMATION",
    tva_enabled: o.tvaEnabled ?? false,
    portage_eligible: o.portageEligible ?? false,
    max_installments: o.maxInstallments ?? null,
    offer_type: o.offerType ?? null,
    session_tracking_enabled: o.sessionTrackingEnabled ?? false,
    min_sessions_to_validate: o.minSessionsToValidate ?? null,
  };
}

function rowToOffrePro(r: any): Offre {
  return {
    id: r.external_ref ?? r.id,
    name: r.name,
    price: Number(r.price),
    active: r.active ?? true,
    priceHistory: [],
    aliases: (r.aliases as string[]) ?? [],
    duration: (r.duration as any) ?? undefined,
    unitPrice: r.unit_price != null ? Number(r.unit_price) : undefined,
    minQuantity: r.min_quantity ?? undefined,
    isAlaCarte: false,
    theme: r.theme ?? "TRANSFORMATION",
    tvaEnabled: r.tva_enabled ?? false,
    portageEligible: r.portage_eligible ?? false,
    maxInstallments: r.max_installments ?? undefined,
    isDraft: r.is_draft ?? false,
    offerType: r.offer_type ?? null,
    sessionTrackingEnabled: r.session_tracking_enabled ?? false,
    minSessionsToValidate: r.min_sessions_to_validate != null ? Number(r.min_sessions_to_validate) : undefined,
  };
}

function structureToRow(s: Structure, userId: string) {
  return {
    id: s.id, user_id: userId, name: s.name, contact_name: s.contactName, phone: s.phone,
    email: s.email, city: s.city, structure_type: s.structureType, people_count: s.peopleCount,
    offre: s.offre, amount: s.amount, frequency: s.frequency, notes: s.notes, active: s.active,
  };
}

function rowToStructure(r: any): Structure {
  return {
    id: r.id, name: r.name, contactName: r.contact_name ?? "", phone: r.phone ?? "",
    email: r.email ?? "", city: r.city ?? "", structureType: r.structure_type ?? "entreprise",
    peopleCount: r.people_count ?? 1, offre: r.offre ?? "", amount: Number(r.amount) || 0,
    frequency: r.frequency ?? "ponctuel", notes: r.notes ?? "", active: r.active ?? true,
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

async function syncOffresPro(items: Offre[], userId: string) {
  const client = supabase as any;
  await client.from("offres_pro").delete().eq("user_id", userId);
  if (items.length > 0) {
    await client.from("offres_pro").insert(items.map(o => offreToProRow(o, userId)));
  }
}

// ─── Local cache ─────────────────────────────────────────────────────────────
const CACHE_KEY = "ba_app_data";
const CACHE_VER = 2;

function crmRowToProspect(r: any): Prospect {
  return {
    id: `bcrm_${r.id}`,
    sex: (r.sex as "F" | "H") ?? "F",
    name: r.name ?? "",
    contact: r.phone ?? r.contact ?? "",
    source: "CRM",
    statut: "CLIENT",
    date: r.created_at ? r.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
    type: "",
    presence: "",
    heure: "",
    objectif: r.objectif ?? "",
    objection: "",
    closing: "OUI",
    offre: r.offre ?? "-",
    notes: r.notes ?? "",
    profile: "",
    sapEnabled: r.sap_enabled ?? false,
    groupType: r.group_type ?? null,
    groupId: r.group_id ?? null,
    isGroupLeader: r.is_group_leader ?? false,
  };
}

function proClientRowToProspect(r: any): Prospect {
  return {
    id: `cpro_${r.id}`,
    sex: (r.sex as "F" | "H") ?? "F",
    name: r.name ?? "",
    contact: r.contact ?? "",
    source: r.source ?? "",
    statut: r.statut ?? "CLIENT",
    date: r.date ?? (r.created_at ? r.created_at.split("T")[0] : ""),
    type: "",
    presence: "",
    heure: "",
    objectif: r.objectif ?? "",
    objection: "",
    closing: r.closing ?? "OUI",
    offre: r.offre ?? "-",
    notes: r.notes ?? "",
    profile: r.profile ?? "",
    age: r.age ?? undefined,
    sapEnabled: r.sap_enabled ?? false,
    groupId: r.group_id ?? null,
    isGroupLeader: r.is_group_leader ?? false,
  };
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
  const [structures, setStructuresState] = useState<Structure[]>([]);
  const [urssafMode, setUrssafModeState] = useState<"mois" | "trimestre">("trimestre");
  const [quarterEdits, setQuarterEditsState] = useState<Record<string, number>>({});
  const [monthlyGoal, setMonthlyGoalState] = useState<number>(2500);

  // Dedup guard — prevents double loadAllData when both onAuthStateChange + getSession fire
  const loadedUserRef = useRef<string | null>(null);

  const restoreFromCache = (userId: string): boolean => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return false;
      const c = JSON.parse(raw);
      if (c.v !== CACHE_VER || c.userId !== userId) return false;
      if (c.prospects)         setProspectsState(c.prospects);
      if (c.activResetClients) setActivResetClientsState(c.activResetClients);
      if (c.financeEntries)    setFinanceEntriesState(c.financeEntries);
      if (c.expenses)          setExpensesState(c.expenses);
      if (c.offres)            setOffresState(c.offres);
      if (c.structures)        setStructuresState(c.structures);
      setPortageMonthsState(c.portageMonths ?? {});
      setVersementsPersoState(c.versementsPerso ?? {});
      setUrssafModeState(c.urssafMode ?? "trimestre");
      setQuarterEditsState(c.quarterEdits ?? {});
      return true;
    } catch { return false; }
  };

  const persistToCache = (userId: string, data: {
    prospects: Prospect[]; activResetClients: ActivResetClient[];
    financeEntries: FinanceEntry[]; expenses: Expense[]; offres: Offre[];
    structures: Structure[]; portageMonths: Record<string, boolean>;
    versementsPerso: Record<string, Record<string, number | null>>;
    urssafMode: "mois" | "trimestre"; quarterEdits: Record<string, number>;
  }) => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ v: CACHE_VER, userId, ...data })); } catch {}
  };

  // Single auth effect — no separate useEffect([user]) to avoid double-trigger
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (!u) {
        setLoading(false);
        loadedUserRef.current = null;
        try { localStorage.removeItem(CACHE_KEY); } catch {}
        return;
      }
      if (loadedUserRef.current === u.id) return;
      loadedUserRef.current = u.id;
      const hasCached = restoreFromCache(u.id);
      if (hasCached) {
        setLoading(false);
        loadAllData(u.id, true); // silent background refresh
      } else {
        loadAllData(u.id, false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadAllData = async (userId: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [pRes, arRes, fRes, eRes, oProRes, oRes, sRes, stRes, crmRes, clientsProRes] = await Promise.all([
        supabase.from("prospects").select("*").eq("user_id", userId),
        supabase.from("activ_reset_clients").select("*").eq("user_id", userId),
        supabase.from("finance_entries").select("*").eq("user_id", userId),
        supabase.from("expenses").select("*").eq("user_id", userId),
        (supabase as any).from("offres_pro").select("*").eq("user_id", userId),
        supabase.from("offres").select("*").eq("user_id", userId),
        supabase.from("app_settings").select("*").eq("user_id", userId).maybeSingle(),
        (supabase as any).from("structures").select("*").eq("user_id", userId),
        (supabase as any).from("be_activ_clients").select("*"),
        (supabase as any).from("clients_pro").select("*").eq("user_id", userId),
      ]);

      // Offres — fire-and-forget seed sync (no blocking await)
      const offresData = oProRes.data?.length
        ? oProRes.data.map(rowToOffrePro)
        : (oRes.data?.length ? oRes.data.map(rowToOffre) : INITIAL_OFFRES);
      setOffresState(offresData);
      if (!oProRes.data?.length) syncOffresPro(offresData, userId).catch(() => {});

      // Prospects + CRM merge
      const localProspects: Prospect[] = pRes.data?.length ? pRes.data.map(rowToProspect) : initialProspects;
      if (!pRes.data?.length) syncToSupabase("prospects", initialProspects, prospectToRow, userId).catch(() => {});
      const crmProspects: Prospect[] = (crmRes.data ?? []).map(crmRowToProspect);
      const coreProspects: Prospect[] = (clientsProRes.data ?? []).map(proClientRowToProspect);
      const localNames = new Set(localProspects.map((p: Prospect) => p.name.toLowerCase()));
      const mergedProspects = [
        ...localProspects,
        ...coreProspects.filter(cp => cp.name && !localNames.has(cp.name.toLowerCase())),
        ...crmProspects.filter(cp => cp.name && !localNames.has(cp.name.toLowerCase())),
      ];
      setProspectsState(mergedProspects);

      // ActivReset clients
      const arData = arRes.data?.length ? arRes.data.map(rowToArClient) : initialActivResetClients;
      setActivResetClientsState(arData);
      if (!arRes.data?.length) syncToSupabase("activ_reset_clients", initialActivResetClients, arClientToRow, userId).catch(() => {});

      // Finance entries
      const financeData = fRes.data?.length ? fRes.data.map(rowToFinance) : seedFinanceEntries;
      setFinanceEntriesState(financeData);
      if (!fRes.data?.length) syncToSupabase("finance_entries", seedFinanceEntries, financeToRow, userId).catch(() => {});

      // Expenses + structures
      const expensesData = (eRes.data ?? []).map(rowToExpense);
      const structuresData = (stRes.data ?? []).map(rowToStructure);
      setExpensesState(expensesData);
      setStructuresState(structuresData);

      // App settings
      let portageMonthsData: Record<string, boolean> = {};
      let versementsPersoData: Record<string, Record<string, number | null>> = {};
      let urssafModeData: "mois" | "trimestre" = "trimestre";
      let quarterEditsData: Record<string, number> = {};
      if (sRes.data) {
        portageMonthsData  = (sRes.data.portage_months as any) ?? {};
        versementsPersoData = (sRes.data.versements_perso as any) ?? {};
        urssafModeData      = ((sRes.data as any).urssaf_mode as any) ?? "trimestre";
        quarterEditsData    = ((sRes.data as any).quarter_edits as any) ?? {};
        const goalData = (sRes.data as any).monthly_goal;
        if (goalData) setMonthlyGoalState(Number(goalData));
      } else {
        supabase.from("app_settings").insert({ user_id: userId, portage_enabled: false, versements_perso: {}, portage_months: {}, urssaf_mode: "trimestre" } as any).catch(() => {});
      }
      setPortageMonthsState(portageMonthsData);
      setVersementsPersoState(versementsPersoData);
      setUrssafModeState(urssafModeData);
      setQuarterEditsState(quarterEditsData);

      // Persist fresh data to cache for next startup
      persistToCache(userId, {
        prospects: mergedProspects, activResetClients: arData,
        financeEntries: financeData, expenses: expensesData,
        offres: offresData, structures: structuresData,
        portageMonths: portageMonthsData, versementsPerso: versementsPersoData,
        urssafMode: urssafModeData, quarterEdits: quarterEditsData,
      });
    } catch (err) {
      console.error("Error loading data:", err);
    }
    if (!silent) setLoading(false);
  };

  const setProspects = useCallback((p: Prospect[]) => {
    setProspectsState(p);
    const localOnly = p.filter(pr => !pr.id.startsWith("bcrm_") && !pr.id.startsWith("cpro_"));
    if (user) syncToSupabase("prospects", localOnly, prospectToRow, user.id);
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
    if (user) supabase.from("app_settings").update({ portage_months: v as any }).eq("user_id", user.id).then(() => {}, console.error);
  }, [user]);

  const setVersementsPerso = useCallback((v: Record<string, Record<string, number | null>>) => {
    setVersementsPersoState(v);
    if (user) supabase.from("app_settings").update({ versements_perso: v as any }).eq("user_id", user.id).then(() => {}, console.error);
  }, [user]);

  const setOffres = useCallback((o: Offre[]) => {
    setOffresState(o);
    if (user) syncOffresPro(o, user.id);
  }, [user]);

  const setStructures = useCallback((s: Structure[]) => {
    setStructuresState(s);
    if (user) syncToSupabase("structures", s, structureToRow, user.id);
  }, [user]);

  const setUrssafMode = useCallback((m: "mois" | "trimestre") => {
    setUrssafModeState(m);
    if (user) supabase.from("app_settings").update({ urssaf_mode: m } as any).eq("user_id", user.id).then(() => {}, console.error);
  }, [user]);

  const setQuarterEdits = useCallback((q: Record<string, number>) => {
    setQuarterEditsState(q);
    if (user) supabase.from("app_settings").update({ quarter_edits: q } as any).eq("user_id", user.id).then(() => {}, console.error);
  }, [user]);

  const setMonthlyGoal = useCallback((v: number) => {
    setMonthlyGoalState(v);
    if (user) supabase.from("app_settings").update({ monthly_goal: v } as any).eq("user_id", user.id).then(() => {}, console.error);
  }, [user]);

  const incrementQuarterEdit = useCallback((quarterKey: string) => {
    setQuarterEditsState(prev => {
      const updated = { ...prev, [quarterKey]: (prev[quarterKey] ?? 0) + 1 };
      if (user) supabase.from("app_settings").update({ quarter_edits: updated } as any).eq("user_id", user.id).then(() => {}, console.error);
      return updated;
    });
  }, [user]);

  return (
    <AppContext.Provider value={{
      user, isAuthenticated: !!user, currentPage, prospects, activResetClients,
      financeEntries, expenses, portageMonths, versementsPerso, offres, structures, urssafMode, quarterEdits, monthlyGoal, loading,
      setCurrentPage, setProspects, setActivResetClients, setFinanceEntries,
      setExpenses, setPortageMonths, setVersementsPerso, setOffres, setStructures, setUrssafMode, setQuarterEdits, incrementQuarterEdit, setMonthlyGoal,
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
