export interface FiscalReminder {
  id: string;
  label: string;
  date: string;
  category: "urssaf" | "tva" | "impots" | "cfe";
  icon: string;
  url: string;
  description: string;
}

export function getFiscalReminders(year: number, urssafMode: "mois" | "trimestre"): FiscalReminder[] {
  const reminders: FiscalReminder[] = [];

  // URSSAF deadlines
  if (urssafMode === "trimestre") {
    const quarters = [
      { q: "T1", date: `${year}-04-30`, label: `URSSAF T1 ${year}` },
      { q: "T2", date: `${year}-07-31`, label: `URSSAF T2 ${year}` },
      { q: "T3", date: `${year}-10-31`, label: `URSSAF T3 ${year}` },
      { q: "T4", date: `${year + 1}-01-31`, label: `URSSAF T4 ${year}` },
    ];
    quarters.forEach(q => {
      reminders.push({
        id: `urssaf-${q.q}-${year}`,
        label: q.label,
        date: q.date,
        category: "urssaf",
        icon: "🏛️",
        url: "https://www.autoentrepreneur.urssaf.fr/portail/accueil.html",
        description: `Déclaration et paiement ${q.q}`,
      });
    });
  } else {
    for (let m = 1; m <= 12; m++) {
      const nextMonth = m === 12 ? 1 : m + 1;
      const nextYear = m === 12 ? year + 1 : year;
      const lastDay = new Date(nextYear, nextMonth, 0).getDate();
      reminders.push({
        id: `urssaf-m${m}-${year}`,
        label: `URSSAF ${getMonthShort(m)} ${year}`,
        date: `${nextYear}-${String(nextMonth).padStart(2, "0")}-${lastDay}`,
        category: "urssaf",
        icon: "🏛️",
        url: "https://www.autoentrepreneur.urssaf.fr/portail/accueil.html",
        description: `Déclaration mensuelle ${getMonthShort(m)}`,
      });
    }
  }

  // CFE
  reminders.push({
    id: `cfe-${year}`,
    label: `CFE ${year}`,
    date: `${year}-12-15`,
    category: "cfe",
    icon: "🏢",
    url: "https://www.impots.gouv.fr/accueil",
    description: "Cotisation Foncière des Entreprises",
  });

  // Impôts sur le revenu
  reminders.push({
    id: `ir-${year}`,
    label: `Déclaration IR ${year - 1}`,
    date: `${year}-05-25`,
    category: "impots",
    icon: "📄",
    url: "https://www.impots.gouv.fr/accueil",
    description: `Déclaration des revenus ${year - 1}`,
  });

  // TVA si applicable
  reminders.push({
    id: `tva-${year}`,
    label: `Déclaration TVA ${year}`,
    date: `${year + 1}-04-30`,
    category: "tva",
    icon: "🧾",
    url: "https://www.impots.gouv.fr/accueil",
    description: "CA12 — Déclaration annuelle de TVA",
  });

  return reminders.sort((a, b) => a.date.localeCompare(b.date));
}

function getMonthShort(m: number): string {
  return ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"][m - 1];
}

export function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getStatusColor(days: number): string {
  if (days < 0) return "hsl(0 0% 40%)";
  if (days <= 7) return "hsl(0 62% 50%)";
  if (days <= 30) return "hsl(38 92% 55%)";
  return "hsl(152 55% 52%)";
}

export function getStatusLabel(days: number): string {
  if (days < 0) return "Passé";
  if (days === 0) return "Aujourd'hui !";
  if (days <= 7) return `${days}j — Urgent`;
  if (days <= 30) return `${days}j`;
  return `${days}j`;
}
