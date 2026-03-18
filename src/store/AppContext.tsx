import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Prospect, ActivResetClient, FinanceEntry, Expense, MonthlyFinance, AppPage, Offre, INITIAL_OFFRES } from "@/data/types";
import { initialProspects } from "@/data/prospects";
import { initialActivResetClients } from "@/data/activResetClients";
import { seedFinanceEntries } from "@/data/seedFinances";

interface AppState {
  isAuthenticated: boolean;
  currentPage: AppPage;
  prospects: Prospect[];
  activResetClients: ActivResetClient[];
  financeEntries: FinanceEntry[];
  expenses: Expense[];
  portageEnabled: boolean;
  versementsPerso: Record<string, number | null>;
  offres: Offre[];
  setAuthenticated: (v: boolean) => void;
  setCurrentPage: (p: AppPage) => void;
  setProspects: (p: Prospect[]) => void;
  setActivResetClients: (c: ActivResetClient[] | ((prev: ActivResetClient[]) => ActivResetClient[])) => void;
  setFinanceEntries: (e: FinanceEntry[]) => void;
  setExpenses: (e: Expense[]) => void;
  setPortageEnabled: (v: boolean) => void;
  setVersementsPerso: (v: Record<string, number | null>) => void;
  setOffres: (o: Offre[]) => void;
}

const AppContext = createContext<AppState | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<AppPage>("prospects");
  const [prospects, setProspects] = useState<Prospect[]>(() => loadFromStorage("ba_prospects", initialProspects));
  const [activResetClients, setActivResetClients] = useState<ActivResetClient[]>(() => loadFromStorage("ba_ar_clients", initialActivResetClients));
  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>(() => loadFromStorage("ba_finances", seedFinanceEntries));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadFromStorage("ba_expenses", []));
  const [portageEnabled, setPortageEnabled] = useState(() => loadFromStorage("ba_portage", false));
  const [versementsPerso, setVersementsPerso] = useState<Record<string, number | null>>(() => loadFromStorage("ba_versements", {}));
  const [offres, setOffres] = useState<Offre[]>(() => loadFromStorage("ba_offres", INITIAL_OFFRES));

  useEffect(() => { localStorage.setItem("ba_prospects", JSON.stringify(prospects)); }, [prospects]);
  useEffect(() => { localStorage.setItem("ba_ar_clients", JSON.stringify(activResetClients)); }, [activResetClients]);
  useEffect(() => { localStorage.setItem("ba_finances", JSON.stringify(financeEntries)); }, [financeEntries]);
  useEffect(() => { localStorage.setItem("ba_expenses", JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem("ba_portage", JSON.stringify(portageEnabled)); }, [portageEnabled]);
  useEffect(() => { localStorage.setItem("ba_versements", JSON.stringify(versementsPerso)); }, [versementsPerso]);
  useEffect(() => { localStorage.setItem("ba_offres", JSON.stringify(offres)); }, [offres]);

  return (
    <AppContext.Provider value={{
      isAuthenticated, currentPage, prospects, activResetClients, financeEntries, expenses, portageEnabled, versementsPerso, offres,
      setAuthenticated, setCurrentPage, setProspects, setActivResetClients, setFinanceEntries, setExpenses, setPortageEnabled, setVersementsPerso, setOffres,
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
