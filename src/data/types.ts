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
  age?: number;
  sapEnabled?: boolean;
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
  type: "micro" | "portage";
  label: string;
  amount: number;
  offre?: string;
  clientName?: string;
  paymentMode?: "especes" | "cb" | "virement" | "prelevement";
  installmentGroup?: string;
  installmentIndex?: number;
  installmentTotal?: number;
  sapHours?: number;
  cashDeclaration?: "micro" | "portage" | "non_declare"; // pour espèces uniquement
}

export const PAYMENT_MODES = [
  { value: "especes", label: "Espèces" },
  { value: "cb", label: "Carte Bancaire" },
  { value: "virement", label: "Virement" },
  { value: "prelevement", label: "Prélèvement Auto." },
] as const;

export const CASH_DECLARATIONS = [
  { value: "micro", label: "Micro" },
  { value: "portage", label: "Portage" },
  { value: "non_declare", label: "Non déclaré" },
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
  "ACTIV RESET ONLINE",
  "ACTIV RESET HYBRIDE",
  "ACTIV PROGRAM",
  "JM PASS",
  "JM PASS COACHING",
  "JM PASS COACHING +",
  "CARDIO MOUV PASS 4",
  "CARDIO MOUV PACK 10",
  "COACHING À LA CARTE",
  "CARDIO MOUV ONE SHOT",
  "ACTIV TRAINING",
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

export type OffreTheme = "COURS COLLECTIFS" | "JM COACHING" | "PROGRAMMES";

export const OFFRE_THEMES: OffreTheme[] = ["COURS COLLECTIFS", "JM COACHING", "PROGRAMMES"];

export interface OffreDuration {
  value: number;
  unit: "jours" | "semaines" | "mois";
}

export interface Offre {
  id: string;
  name: string;
  price: number;
  active: boolean;
  priceHistory: { price: number; date: string }[];
  duration?: OffreDuration;
  unitPrice?: number;
  minQuantity?: number;
  isAlaCarte?: boolean;
  theme?: OffreTheme;
  tvaEnabled?: boolean;
  portageEligible?: boolean;
  maxInstallments?: number; // ex: 3 = payable en 1, 2 ou 3 fois
}

export const INITIAL_OFFRES: Offre[] = [
  { id: "o1", name: "ACTIV RESET ONLINE", price: 525, active: true, priceHistory: [{ price: 525, date: "2026-01-01" }], duration: { value: 12, unit: "semaines" }, theme: "PROGRAMMES" },
  { id: "o2", name: "ACTIV RESET HYBRIDE", price: 1350, active: true, priceHistory: [{ price: 1350, date: "2026-01-01" }], duration: { value: 12, unit: "semaines" }, theme: "PROGRAMMES" },
  { id: "o3", name: "ACTIV PROGRAM ESSENTIEL", price: 160, active: true, priceHistory: [{ price: 160, date: "2026-01-01" }], duration: { value: 8, unit: "semaines" }, theme: "PROGRAMMES" },
  { id: "o4", name: "JM PASS", price: 240, active: true, priceHistory: [{ price: 240, date: "2026-01-01" }], duration: { value: 1, unit: "mois" }, unitPrice: 60, minQuantity: 4, theme: "JM COACHING" },
  { id: "o5", name: "JM PASS COACHING", price: 250, active: true, priceHistory: [{ price: 250, date: "2026-01-01" }], duration: { value: 1, unit: "mois" }, unitPrice: 62.5, minQuantity: 4, theme: "JM COACHING" },
  { id: "o6", name: "JM PASS COACHING +", price: 240, active: true, priceHistory: [{ price: 240, date: "2026-01-01" }], duration: { value: 3, unit: "mois" }, unitPrice: 60, minQuantity: 4, theme: "JM COACHING" },
  { id: "o7", name: "COACHING À LA CARTE", price: 65, active: true, priceHistory: [{ price: 65, date: "2026-01-01" }], isAlaCarte: true, theme: "JM COACHING" },
  { id: "o8", name: "CARDIO MOUV STRUCTURE", price: 115, active: true, priceHistory: [{ price: 115, date: "2026-01-01" }], duration: { value: 1, unit: "mois" }, theme: "COURS COLLECTIFS" },
  { id: "o9", name: "CARDIO MOUV ONE SHOT", price: 15, active: true, priceHistory: [{ price: 15, date: "2026-01-01" }], isAlaCarte: true, theme: "COURS COLLECTIFS" },
  { id: "o10", name: "CARDIO MOUV PASS 4", price: 45, active: true, priceHistory: [{ price: 45, date: "2026-01-01" }], duration: { value: 4, unit: "semaines" }, theme: "COURS COLLECTIFS" },
  { id: "o11", name: "CARDIO MOUV PACK 10", price: 130, active: true, priceHistory: [{ price: 130, date: "2026-01-01" }], duration: { value: 5, unit: "mois" }, theme: "COURS COLLECTIFS" },
  { id: "o12", name: "ACTIV TRAINING ONE SHOT", price: 10, active: true, priceHistory: [{ price: 10, date: "2026-01-01" }], isAlaCarte: true, theme: "COURS COLLECTIFS" },
];
