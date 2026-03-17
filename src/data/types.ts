export interface Prospect {
  id: string;
  sex: "F" | "H";
  name: string;
  contact: string;
  source: string;
  statut: string;
  date: string;
  type: string;
  presence: string;
  heure: string;
  objectif: string;
  objection: string;
  closing: string;
  offre: string;
  notes: string;
  profile: string;
  prixReel?: number;
  noteBilan?: number;
  noteProfil?: number;
  bilanValidated?: boolean;
}

export type AppPage = "prospects" | "clients" | "activreset" | "finances" | "stats" | "offres";

export interface ActivResetClient {
  id: string;
  name: string;
  phone: string;
  offre: string;
  startDate: string;
  currentPhase: number;
  phases: PhaseStatus[];
  objectifAtteint?: boolean | null;
  cycle: number;
  notes: string;
}

export interface PhaseStatus {
  id: string;
  label: string;
  shortLabel: string;
  done: boolean;
  startDate: string | null;
  days: number;
}

export const AR_PHASES = [
  { id: "contrat", label: "CONTRAT & PAIEMENT", shortLabel: "Contrat", days: 0 },
  { id: "onboarding", label: "ONBOARDING", shortLabel: "Onboarding", days: 3 },
  { id: "diagnostique", label: "DIAGNOSTIQUE", shortLabel: "Diagnostique", days: 7 },
  { id: "phase1", label: "PHASE 1 — FONDATION (S1-S2)", shortLabel: "Fondation", days: 14 },
  { id: "phase2", label: "PHASE 2 — OPTIMISATION (S3-S8)", shortLabel: "Optimisation", days: 42 },
  { id: "phase3", label: "PHASE 3 — MAINTIEN (S9-S10)", shortLabel: "Maintien", days: 14 },
  { id: "phase4", label: "PHASE 4 — LIBERTÉ (S11)", shortLabel: "Liberté", days: 7 },
  { id: "phase5", label: "PHASE 5 — RETOUR & FIN (S12)", shortLabel: "Retour & Fin", days: 7 },
  { id: "certified", label: "CERTIFIED ACTIV", shortLabel: "Certified", days: 0 },
];

export const AR_PHASES_CYCLE2 = [
  { id: "rediag", label: "PHASE 6 — RE-DIAGNOSTIQUE (S13)", shortLabel: "Re-Diagnostique", days: 7 },
  { id: "reoptim", label: "PHASE 7 — RÉ-OPTIMISATION", shortLabel: "Ré-Optimisation", days: 42 },
  { id: "remaintien", label: "PHASE 8 — RE-MAINTIEN", shortLabel: "Re-Maintien", days: 14 },
  { id: "refin", label: "PHASE 9 — RETOUR & FIN", shortLabel: "Retour & Fin 2", days: 7 },
  { id: "certified2", label: "CERTIFIED 2", shortLabel: "Certified 2", days: 0 },
];

export interface FinanceEntry {
  id: string;
  month: string; // YYYY-MM
  type: "micro" | "portage" | "nova";
  label: string;
  amount: number;
  offre?: string;
  clientName?: string;
  paymentMode?: "especes" | "cb" | "virement" | "prelevement";
  installmentGroup?: string; // links split payments together
  installmentIndex?: number; // 1/3, 2/3, 3/3
  installmentTotal?: number;
}

export const PAYMENT_MODES = [
  { value: "especes", label: "Espèces" },
  { value: "cb", label: "Carte Bancaire" },
  { value: "virement", label: "Virement" },
  { value: "prelevement", label: "Prélèvement Auto." },
] as const;

export interface Expense {
  id: string;
  month: string;
  category: ExpenseCategory;
  label: string;
  amount: number;
  date: string;
}

export type ExpenseCategory =
  | "LOCAUX & BUREAUX"
  | "DÉPLACEMENTS & TRANSPORTS"
  | "EXPÉRIENCE CLIENT"
  | "MATÉRIELS PROS & ENTRETIEN"
  | "BIEN-ÊTRE & SANTÉ"
  | "FORMATION & DÉVELOPPEMENT"
  | "COMMUNICATION & MARKETING"
  | "ABONNEMENTS & OUTILS"
  | "CHARGES SOCIALES & FISCALES";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "LOCAUX & BUREAUX",
  "DÉPLACEMENTS & TRANSPORTS",
  "EXPÉRIENCE CLIENT",
  "MATÉRIELS PROS & ENTRETIEN",
  "BIEN-ÊTRE & SANTÉ",
  "FORMATION & DÉVELOPPEMENT",
  "COMMUNICATION & MARKETING",
  "ABONNEMENTS & OUTILS",
  "CHARGES SOCIALES & FISCALES",
];

export interface MonthlyFinance {
  month: string;
  caMicro: number;
  caPortage: number;
  novaSap: number;
  totalExpenses: number;
  urssaf: number;
  impots: number;
  gestionPerso: number;
  restePerso: number;
  versementReel: number | null;
}

export const OFFRES = [
  "ACTIV PROGRAM STANDARD",
  "ACTIV PROGRAM STANDARD +",
  "ACTIV PROGRAM ONLINE (3 FOIS)",
  "ACTIV PROGRAM HYBRIDE (3 FOIS)",
  "A LA CARTE",
  "TIPS PAYANT",
  "JM PASS",
  "CARDIO MOUV",
  "COACHING BRUT",
];

export const SOURCES = [
  "FITNESS PARK",
  "INSTAGRAM",
  "BOUCHE A OREILLE",
  "COURS COLLECTIFS",
  "GOOGLE",
  "AUTRE",
];

export const OBJECTIFS = ["FATLOSS", "SCULPT", "HEALTH", "STRONG", "AUTRE"];

export interface Offre {
  id: string;
  name: string;
  price: number;
  active: boolean;
  priceHistory: { price: number; date: string }[];
}

export const INITIAL_OFFRES: Offre[] = [
  { id: "o1", name: "ACTIV PROGRAM STANDARD", price: 450, active: true, priceHistory: [{ price: 450, date: "2025-01-01" }] },
  { id: "o2", name: "ACTIV PROGRAM STANDARD +", price: 600, active: true, priceHistory: [{ price: 600, date: "2025-01-01" }] },
  { id: "o3", name: "ACTIV PROGRAM ONLINE (3 FOIS)", price: 350, active: true, priceHistory: [{ price: 350, date: "2025-01-01" }] },
  { id: "o4", name: "ACTIV PROGRAM HYBRIDE (3 FOIS)", price: 500, active: true, priceHistory: [{ price: 500, date: "2025-01-01" }] },
  { id: "o5", name: "A LA CARTE", price: 50, active: true, priceHistory: [{ price: 50, date: "2025-01-01" }] },
  { id: "o6", name: "TIPS PAYANT", price: 20, active: true, priceHistory: [{ price: 20, date: "2025-01-01" }] },
  { id: "o7", name: "JM PASS", price: 80, active: true, priceHistory: [{ price: 80, date: "2025-01-01" }] },
  { id: "o8", name: "CARDIO MOUV", price: 30, active: true, priceHistory: [{ price: 30, date: "2025-01-01" }] },
  { id: "o9", name: "COACHING BRUT", price: 40, active: true, priceHistory: [{ price: 40, date: "2025-01-01" }] },
];
