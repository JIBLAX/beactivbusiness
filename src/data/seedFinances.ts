import { FinanceEntry } from "./types";

// Seed data from ODS spreadsheet — Jan-Mar 2026
export const seedFinanceEntries: FinanceEntry[] = [
  // ===== JANVIER 2026 =====
  // Bancaire (micro)
  { id: "seed-j01", month: "2026-01", type: "micro", label: "CARDIO MOUV – ONE SHOT", amount: 105, offre: "CARDIO MOUV ONE SHOT", clientName: "CARDIO MOUV GROUP", paymentMode: "cb" },
  { id: "seed-j02", month: "2026-01", type: "micro", label: "ACTIV PROGRAM ONLINE (3 FOIS)", amount: 150, offre: "ACTIV PROGRAM ONLINE (3 FOIS)", clientName: "Morgane DIBILIO", paymentMode: "cb" },
  { id: "seed-j03", month: "2026-01", type: "micro", label: "ACTIV PROGRAM STANDARD", amount: 120, offre: "ACTIV PROGRAM STANDARD", clientName: "Stéphanie POITEVIN", paymentMode: "cb" },
  { id: "seed-j04", month: "2026-01", type: "micro", label: "A LA CARTE", amount: 65, offre: "COACHING À LA CARTE", clientName: "Juliette ROULET", paymentMode: "cb" },
  { id: "seed-j05", month: "2026-01", type: "micro", label: "ACTIV PROGRAM STANDARD +", amount: 150, offre: "ACTIV PROGRAM STANDARD +", clientName: "Virginie GACHON", paymentMode: "cb" },
  { id: "seed-j06", month: "2026-01", type: "micro", label: "ACTIV PROGRAM STANDARD", amount: 120, offre: "ACTIV PROGRAM STANDARD", clientName: "Audrey CIMADOMO", paymentMode: "cb" },
  { id: "seed-j07", month: "2026-01", type: "micro", label: "JM PASS SAP DOMICILE", amount: 240, offre: "JM PASS (SAP)", clientName: "Crystelle SCARLATA", paymentMode: "cb", sapHours: 4 },
  { id: "seed-j08", month: "2026-01", type: "micro", label: "JM PASS SAP DOMICILE", amount: 240, offre: "JM PASS (SAP)", clientName: "David ICARRE", paymentMode: "cb", sapHours: 4 },
  { id: "seed-j09", month: "2026-01", type: "micro", label: "JM PASS SAP DOMICILE", amount: 240, offre: "JM PASS (SAP)", clientName: "Yann MONGABURU", paymentMode: "cb", sapHours: 4 },
  { id: "seed-j10", month: "2026-01", type: "micro", label: "JM PASS SAP DOMICILE", amount: 120, offre: "JM PASS (SAP)", clientName: "Audrey CIMADOMO", paymentMode: "cb", sapHours: 2 },
  { id: "seed-j11", month: "2026-01", type: "micro", label: "JM PASS SAP DOMICILE", amount: 240, offre: "JM PASS (SAP)", clientName: "Alice DIDIER", paymentMode: "cb", sapHours: 4 },
  { id: "seed-j12", month: "2026-01", type: "micro", label: "CARDIO MOUV – ONE SHOT", amount: 135, offre: "CARDIO MOUV ONE SHOT", clientName: "CARDIO MOUV GROUP", paymentMode: "cb" },
  { id: "seed-j13", month: "2026-01", type: "micro", label: "CARDIO MOUV – PASS 4", amount: 225, offre: "CARDIO MOUV PASS 4", clientName: "CARDIO MOUV GROUP", paymentMode: "cb" },
  // Espèces (micro)
  { id: "seed-j14", month: "2026-01", type: "micro", label: "A LA CARTE (EXCLUSIV)", amount: 200, offre: "COACHING À LA CARTE", clientName: "Agathe BOURBONNAIS", paymentMode: "especes", cashDeclaration: "non_declare" },
  { id: "seed-j15", month: "2026-01", type: "micro", label: "CARDIO MOUV – STRUCTURE", amount: 115, offre: "CARDIO MOUV ONE SHOT", clientName: "Le LABOW", paymentMode: "especes", cashDeclaration: "non_declare" },
  { id: "seed-j16", month: "2026-01", type: "micro", label: "CARDIO MOUV – ONE SHOT", amount: 45, offre: "CARDIO MOUV ONE SHOT", clientName: "CARDIO MOUV GROUP", paymentMode: "especes", cashDeclaration: "non_declare" },
  { id: "seed-j17", month: "2026-01", type: "micro", label: "JM PASS", amount: 240, offre: "JM PASS", clientName: "Arnaud ETITIA", paymentMode: "especes", cashDeclaration: "non_declare" },
  // Portage JUMP
  { id: "seed-j18", month: "2026-01", type: "portage", label: "ACTIV PROGRAM STANDARD", amount: 390, offre: "ACTIV PROGRAM STANDARD", paymentMode: "virement" },
  { id: "seed-j19", month: "2026-01", type: "portage", label: "ACTIV PROGRAM ONLINE", amount: 150, offre: "ACTIV PROGRAM ONLINE", paymentMode: "virement" },

  // ===== FEVRIER 2026 =====
  // Bancaire (micro)
  { id: "seed-f01", month: "2026-02", type: "micro", label: "ACTIV PROGRAM ONLINE (3 FOIS)", amount: 150, offre: "ACTIV PROGRAM ONLINE (3 FOIS)", clientName: "Morgane DIBILIO", paymentMode: "cb" },
  { id: "seed-f02", month: "2026-02", type: "micro", label: "JM PASS SAP DOMICILE", amount: 300, offre: "JM PASS (SAP)", clientName: "Crystelle SCARLATA", paymentMode: "cb", sapHours: 5 },
  { id: "seed-f03", month: "2026-02", type: "micro", label: "JM PASS SAP DOMICILE", amount: 240, offre: "JM PASS (SAP)", clientName: "Arnaud ETITIA", paymentMode: "cb", sapHours: 4 },
  { id: "seed-f04", month: "2026-02", type: "micro", label: "CARDIO MOUV – ONE SHOT", amount: 285, offre: "CARDIO MOUV ONE SHOT", clientName: "CARDIO MOUV GROUP", paymentMode: "cb" },
  { id: "seed-f05", month: "2026-02", type: "micro", label: "ACTIV PROGRAM STANDARD", amount: 120, offre: "ACTIV PROGRAM STANDARD", clientName: "Catherine FERNANDEZ", paymentMode: "cb" },
  { id: "seed-f06", month: "2026-02", type: "micro", label: "JM PASS SAP DOMICILE", amount: 180, offre: "JM PASS (SAP)", clientName: "Alice DIDIER", paymentMode: "cb", sapHours: 3 },
  { id: "seed-f07", month: "2026-02", type: "micro", label: "JM PASS SAP DOMICILE", amount: 240, offre: "JM PASS (SAP)", clientName: "Yann MONGABURU", paymentMode: "cb", sapHours: 4 },
  { id: "seed-f08", month: "2026-02", type: "micro", label: "JM PASS SAP DOMICILE", amount: 240, offre: "JM PASS (SAP)", clientName: "David ICARRE", paymentMode: "cb", sapHours: 4 },
  { id: "seed-f09", month: "2026-02", type: "micro", label: "JM PASS SAP DOMICILE", amount: 120, offre: "JM PASS (SAP)", clientName: "Audrey CIMADOMO", paymentMode: "cb", sapHours: 2 },
  { id: "seed-f10", month: "2026-02", type: "micro", label: "A LA CARTE", amount: 65, offre: "COACHING À LA CARTE", clientName: "Leila AYOUBIAN", paymentMode: "cb" },
  { id: "seed-f11", month: "2026-02", type: "micro", label: "ACTIV PROGRAM STANDARD", amount: 120, offre: "ACTIV PROGRAM STANDARD", clientName: "Amandine LOISEAU", paymentMode: "cb" },
  { id: "seed-f12", month: "2026-02", type: "micro", label: "ACTIV PROGRAM ONLINE (3 FOIS)", amount: 150, offre: "ACTIV PROGRAM ONLINE (3 FOIS)", clientName: "Nahéma ROCHE", paymentMode: "cb" },
  { id: "seed-f13", month: "2026-02", type: "micro", label: "CARDIO MOUV – PASS 4", amount: 180, offre: "CARDIO MOUV PASS 4", clientName: "CARDIO MOUV GROUP", paymentMode: "cb" },
  // Espèces (micro)
  { id: "seed-f14", month: "2026-02", type: "micro", label: "ACTIV TRAINING SCULPT", amount: 120, offre: "ACTIV TRAINING", clientName: "ACTIV TRAINING GROUP", paymentMode: "especes", cashDeclaration: "non_declare" },
  { id: "seed-f15", month: "2026-02", type: "micro", label: "CARDIO MOUV – ONE SHOT", amount: 15, offre: "CARDIO MOUV ONE SHOT", clientName: "CARDIO MOUV GROUP", paymentMode: "especes", cashDeclaration: "non_declare" },
  { id: "seed-f16", month: "2026-02", type: "micro", label: "CARDIO MOUV – PASS 4", amount: 45, offre: "CARDIO MOUV PASS 4", clientName: "CARDIO MOUV GROUP", paymentMode: "especes", cashDeclaration: "non_declare" },
  { id: "seed-f17", month: "2026-02", type: "micro", label: "A LA CARTE (EXCLUSIV)", amount: 400, offre: "COACHING À LA CARTE", clientName: "Agathe BOURBONNAIS", paymentMode: "especes", cashDeclaration: "non_declare" },
  { id: "seed-f18", month: "2026-02", type: "micro", label: "JM PASS", amount: 240, offre: "JM PASS", clientName: "Murielle AMON", paymentMode: "especes", cashDeclaration: "non_declare" },
  { id: "seed-f19", month: "2026-02", type: "micro", label: "VISIO A LA CARTE", amount: 100, offre: "COACHING À LA CARTE", clientName: "Crystelle SCARLATA", paymentMode: "especes", cashDeclaration: "non_declare" },
  // Portage JUMP
  { id: "seed-f20", month: "2026-02", type: "portage", label: "ACTIV PROGRAM STANDARD", amount: 240, offre: "ACTIV PROGRAM STANDARD", paymentMode: "virement" },
  { id: "seed-f21", month: "2026-02", type: "portage", label: "ACTIV PROGRAM ONLINE", amount: 300, offre: "ACTIV PROGRAM ONLINE", paymentMode: "virement" },

  // ===== MARS 2026 =====
  // Bancaire (micro)
  { id: "seed-m01", month: "2026-03", type: "micro", label: "ACTIV PROGRAM ONLINE (3 FOIS)", amount: 150, offre: "ACTIV PROGRAM ONLINE (3 FOIS)", clientName: "Morgane DIBILIO", paymentMode: "cb" },
  { id: "seed-m02", month: "2026-03", type: "micro", label: "ACTIV PROGRAM ONLINE (3 FOIS)", amount: 175, offre: "ACTIV PROGRAM ONLINE (3 FOIS)", clientName: "Nahéma ROCHE", paymentMode: "cb" },
  { id: "seed-m03", month: "2026-03", type: "micro", label: "A LA CARTE (EXCLUSIV)", amount: 200, offre: "COACHING À LA CARTE", clientName: "Agathe BOURBONNAIS", paymentMode: "especes", cashDeclaration: "non_declare" },
  { id: "seed-m04", month: "2026-03", type: "micro", label: "ACTIV PROGRAM STANDARD", amount: 120, offre: "ACTIV PROGRAM STANDARD", clientName: "Stéphanie POITEVIN", paymentMode: "especes", cashDeclaration: "non_declare" },
  { id: "seed-m05", month: "2026-03", type: "micro", label: "ACTIV PROGRAM STANDARD +", amount: 150, offre: "ACTIV PROGRAM STANDARD +", clientName: "Teddy LUKUNKU", paymentMode: "cb" },
  { id: "seed-m06", month: "2026-03", type: "micro", label: "ACTIV TRAINING SCULPT", amount: 60, offre: "ACTIV TRAINING", clientName: "ACTIV TRAINING GROUP", paymentMode: "especes", cashDeclaration: "non_declare" },
  // Portage JUMP
  { id: "seed-m07", month: "2026-03", type: "portage", label: "ACTIV PROGRAM STANDARD", amount: 150, offre: "ACTIV PROGRAM STANDARD", paymentMode: "virement" },
  { id: "seed-m08", month: "2026-03", type: "portage", label: "ACTIV PROGRAM ONLINE", amount: 150, offre: "ACTIV PROGRAM ONLINE", paymentMode: "virement" },
];
