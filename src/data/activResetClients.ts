import { ActivResetClient, AR_PHASES } from "./types";

function createPhases(startDate: string): ActivResetClient["phases"] {
  return AR_PHASES.map((p, i) => ({
    id: p.id,
    label: p.label,
    shortLabel: p.shortLabel,
    done: false,
    startDate: i === 0 ? startDate : null,
    days: p.days,
  }));
}

export const initialActivResetClients: ActivResetClient[] = [
  {
    id: "ar1",
    name: "Morgane DIBILIO",
    phone: "06-72-88-92-76",
    offre: "ACTIV PROGRAM HYBRIDE (3 FOIS)",
    startDate: "2026-01-05",
    currentPhase: 8,
    phases: AR_PHASES.map((p, i) => ({
      id: p.id,
      label: p.label,
      shortLabel: p.shortLabel,
      done: true,
      startDate: i === 0 ? "2026-01-05" : "2026-01-05",
      days: p.days,
    })),
    objectifAtteint: null,
    cycle: 1,
    notes: "HYPER MOTIVEE — Fatloss",
  },
  {
    id: "ar2",
    name: "Stéphanie POITEVIN",
    phone: "06-21-29-61-03",
    offre: "ACTIV PROGRAM STANDARD",
    startDate: "2026-01-05",
    currentPhase: 8,
    phases: AR_PHASES.map((p, i) => ({
      id: p.id,
      label: p.label,
      shortLabel: p.shortLabel,
      done: true,
      startDate: i === 0 ? "2026-01-05" : "2026-01-05",
      days: p.days,
    })),
    objectifAtteint: null,
    cycle: 1,
    notes: "HYPER MOTIVEE — Fatloss",
  },
  {
    id: "ar3",
    name: "Nahéma ROCHE",
    phone: "06-58-29-79-07",
    offre: "ACTIV PROGRAM ONLINE (3 FOIS)",
    startDate: "2026-02-15",
    currentPhase: 4,
    phases: AR_PHASES.map((p, i) => ({
      id: p.id,
      label: p.label,
      shortLabel: p.shortLabel,
      done: i < 4,
      startDate: i === 0 ? "2026-02-15" : i < 4 ? "2026-02-15" : null,
      days: p.days,
    })),
    objectifAtteint: null,
    cycle: 1,
    notes: "Fatloss — En Phase 2 Optimisation",
  },
];
