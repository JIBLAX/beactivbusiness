import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { FinanceEntry, Expense } from "@/data/types";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const EI = {
  name:    "MFAUME JONATHAN",
  address: "22 RUE PONSARD",
  city:    "38100 GRENOBLE",
  forme:   "Entrepreneur individuel",
  siren:   "824 253 751",
  siret:   "824 253 751 00039",
  ape:     "9609Z",
  sap:     "SAP824253751",
  tva:     "Non assujetti a la TVA",
};

function formatMonth(m: string): string {
  const [y, mo] = m.split("-");
  return `${MONTHS[parseInt(mo) - 1]} ${y}`;
}

// Safe formatter: avoids locale-specific characters that jsPDF can't render
function amt(n: number): string {
  const abs = Math.round(Math.abs(n));
  const s = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return s + " EUR";
}
function amtDec(n: number): string {
  const abs = Math.abs(n);
  const s = abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ").replace(".", ",");
  return (n < 0 ? "- " : "") + s + " EUR";
}

// Color palette — light document style (like a real accounting doc)
const C = {
  primary:   [139, 42, 60]   as [number, number, number],
  primaryDk: [100, 28, 42]   as [number, number, number],
  primaryLt: [248, 238, 240] as [number, number, number],
  dark:      [25, 25, 30]    as [number, number, number],
  text:      [30, 30, 35]    as [number, number, number],
  muted:     [100, 100, 110] as [number, number, number],
  light:     [245, 244, 242] as [number, number, number],
  white:     [255, 255, 255] as [number, number, number],
  success:   [22, 120, 70]   as [number, number, number],
  successLt: [230, 247, 238] as [number, number, number],
  danger:    [185, 38, 38]   as [number, number, number],
  dangerLt:  [252, 235, 235] as [number, number, number],
  blue:      [50, 90, 160]   as [number, number, number],
  blueLt:    [232, 239, 252] as [number, number, number],
  amber:     [140, 90, 20]   as [number, number, number],
  amberLt:   [252, 243, 228] as [number, number, number],
  border:    [215, 213, 210] as [number, number, number],
};

const PAYMENT_LABELS: Record<string, string> = {
  especes: "Especes",
  cb: "Carte bancaire",
  virement: "Virement",
  prelevement: "Prelevement",
};

export interface BaSaleSnap {
  client_name: string | null;
  offer_name: string | null;
  amount: number;
  sale_type?: string | null;
  is_sap?: boolean | null;
  sap_hours?: number | null;
}

export interface BilanData {
  month: string;
  totalReel: number;
  declaredMicro: number;
  declaredPortage: number;
  especesNonDeclarees: number;
  urssaf: number;
  totalDepenses: number;
  beneficeNet: number;
  gestionPerso: number;
  restePerso: number;
  entries: FinanceEntry[];
  expenses: Expense[];
  portageEnabled: boolean;
  tvaAmount: number;
  versements: Record<string, number | null>;
  baSales?: BaSaleSnap[];
}

export function generateBilanPDF(data: BilanData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ML = 14; // margin left
  const MR = 14; // margin right
  const CW = W - ML - MR; // content width

  // Computed helpers
  const localEntriesTotal = data.entries.reduce((s, e) => s + e.amount, 0);
  const baSalesTotal = (data.baSales ?? []).reduce((s, e) => s + e.amount, 0);
  const fjmRevTotal = Math.max(0, Math.round((data.totalReel - localEntriesTotal - baSalesTotal) * 100) / 100);
  const localExpTotal = data.expenses.reduce((s, e) => s + e.amount, 0);
  const fjmChgTotal = Math.max(0, Math.round((data.totalDepenses - localExpTotal) * 100) / 100);

  // ─── HEADER ───────────────────────────────────────────────────────────────
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, W, 52, "F");

  // Left: document title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("BILAN MENSUEL", ML, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(230, 200, 205);
  doc.text(formatMonth(data.month).toUpperCase(), ML, 27);

  doc.setFontSize(7);
  doc.setTextColor(210, 160, 170);
  doc.text("Regime : Micro-entreprise  |  " + EI.tva, ML, 35);
  doc.text(`SIREN ${EI.siren}  |  APE ${EI.ape}  |  N deg. SAP ${EI.sap}`, ML, 42);

  // Right: entrepreneur identity card
  const rx = W - MR;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(EI.name, rx, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(230, 200, 205);
  doc.text(EI.address, rx, 20, { align: "right" });
  doc.text(EI.city, rx, 26, { align: "right" });
  doc.setTextColor(210, 160, 170);
  doc.text(`SIRET ${EI.siret}`, rx, 34, { align: "right" });
  doc.text(`Genere le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`, rx, 41, { align: "right" });
  doc.text(EI.forme, rx, 48, { align: "right" });

  // Thin accent line
  doc.setFillColor(...C.primaryDk);
  doc.rect(0, 52, W, 1.5, "F");

  // ─── KPI STRIP ────────────────────────────────────────────────────────────
  let y = 61;
  const kpis = [
    { label: "TOTAL REVENUS", value: amt(data.totalReel), color: C.text, bg: C.light },
    { label: "BASE URSSAF (MICRO)", value: amt(data.declaredMicro), color: C.blue, bg: C.blueLt },
    { label: "URSSAF DU (26,1%)", value: amt(data.urssaf), color: C.danger, bg: C.dangerLt },
    { label: "BENEFICE NET", value: amt(Math.abs(data.beneficeNet)), color: data.beneficeNet >= 0 ? C.success : C.danger, bg: data.beneficeNet >= 0 ? C.successLt : C.dangerLt },
  ];
  const kpiW = (CW - 9) / 4;
  kpis.forEach((k, i) => {
    const x = ML + i * (kpiW + 3);
    doc.setFillColor(...k.bg);
    doc.roundedRect(x, y, kpiW, 26, 2, 2, "F");
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, kpiW, 26, 2, 2, "S");

    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.muted);
    doc.text(k.label, x + kpiW / 2, y + 7, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...k.color);
    doc.text(k.value, x + kpiW / 2, y + 19, { align: "center" });
  });
  if (data.beneficeNet < 0) {
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.danger);
    doc.text("DEFICIT", kpis.length > 0 ? ML + 3 * (kpiW + 3) + kpiW / 2 : 0, y + 24, { align: "center" });
  }
  y += 33;

  // ─── SECTION HELPERS ──────────────────────────────────────────────────────
  const sectionHeader = (title: string, sub?: string) => {
    doc.setFillColor(...C.primary);
    doc.rect(ML, y, CW, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title, ML + 4, y + 5.5);
    if (sub) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(210, 160, 170);
      doc.text(sub, W - MR - 2, y + 5.5, { align: "right" });
    }
    y += 10;
  };

  const subLabel = (title: string, color: [number, number, number] = C.muted) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...color);
    doc.text(title, ML, y + 4);
    y += 6;
  };

  const totalBar = (label: string, value: string, positive: boolean) => {
    const bg = positive ? C.successLt : C.dangerLt;
    const fg = positive ? C.success : C.danger;
    doc.setFillColor(...bg);
    doc.roundedRect(ML, y, CW, 9, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.text);
    doc.text(label, ML + 4, y + 6);
    doc.setTextColor(...fg);
    doc.text(value, W - MR - 2, y + 6, { align: "right" });
    y += 12;
  };

  const checkPage = (needed = 40) => {
    if (y + needed > H - 18) {
      doc.addPage();
      y = 20;
    }
  };

  // ─── RECETTES ─────────────────────────────────────────────────────────────
  sectionHeader("RECETTES", `Total : ${amt(data.totalReel)}`);

  // — Entrées locales —
  if (data.entries.length > 0) {
    subLabel("Revenus locaux (micro-entreprise)", C.text);
    autoTable(doc, {
      startY: y,
      head: [["Client / Libelle", "Offre", "Mode paiement", "Montant"]],
      body: data.entries.map(e => [
        e.clientName || e.label || "—",
        e.offre || "—",
        PAYMENT_LABELS[e.paymentMode || ""] || (e.paymentMode || "—"),
        amt(e.amount),
      ]),
      foot: [["", "", "Sous-total revenus locaux", amt(localEntriesTotal)]],
      theme: "plain",
      styles: { fontSize: 8, textColor: C.text, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
      headStyles: { fillColor: C.light, textColor: C.muted, fontStyle: "bold", fontSize: 7, lineWidth: 0 },
      footStyles: { fillColor: C.light, textColor: C.text, fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [251, 250, 249] },
      columnStyles: {
        0: { cellWidth: 52 },
        3: { halign: "right", fontStyle: "bold" },
      },
      margin: { left: ML, right: MR },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // — BA Sales —
  if (data.baSales && data.baSales.length > 0) {
    checkPage(30);
    subLabel("Ventes BE ACTIV — Coaching clients (ba_sales)", C.blue);
    autoTable(doc, {
      startY: y,
      head: [["Client", "Offre", "Type de vente", "Montant"]],
      body: data.baSales.map(s => {
        const typeLabel =
          s.sale_type && s.sale_type !== "individual"
            ? s.sale_type.charAt(0).toUpperCase() + s.sale_type.slice(1)
            : s.is_sap
            ? `SAP${s.sap_hours ? " " + s.sap_hours + "h" : ""}`
            : "Individuel";
        return [s.client_name || "—", s.offer_name || "—", typeLabel, amt(s.amount)];
      }),
      foot: [["", "", "Sous-total BE ACTIV", amt(baSalesTotal)]],
      theme: "plain",
      styles: { fontSize: 8, textColor: C.text, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
      headStyles: { fillColor: C.blueLt, textColor: C.blue, fontStyle: "bold", fontSize: 7 },
      footStyles: { fillColor: C.blueLt, textColor: C.blue, fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [240, 245, 254] },
      columnStyles: { 3: { halign: "right", fontStyle: "bold" } },
      margin: { left: ML, right: MR },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // — FJM Pro revenues —
  if (fjmRevTotal > 0.5) {
    checkPage(20);
    subLabel("Revenus divers FJM Pro", C.amber);
    autoTable(doc, {
      startY: y,
      body: [["Revenus professionnels FJM (operations pro)", amt(fjmRevTotal)]],
      foot: [["Sous-total revenus FJM", amt(fjmRevTotal)]],
      theme: "plain",
      styles: { fontSize: 8, textColor: C.text, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
      footStyles: { fillColor: C.amberLt, textColor: C.amber, fontStyle: "bold", fontSize: 7.5 },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
      margin: { left: ML, right: MR },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  totalBar("TOTAL RECETTES", amt(data.totalReel), true);

  // ─── CHARGES ──────────────────────────────────────────────────────────────
  checkPage(30);
  sectionHeader("CHARGES", `Total : ${amt(data.totalDepenses)}`);

  if (data.expenses.length > 0) {
    subLabel("Charges locales (micro-entreprise)", C.text);
    autoTable(doc, {
      startY: y,
      head: [["Categorie", "Libelle", "Date", "Montant"]],
      body: data.expenses.map(e => [e.category, e.label, e.date, amtDec(-e.amount)]),
      foot: [["", "", "Sous-total charges locales", amtDec(-localExpTotal)]],
      theme: "plain",
      styles: { fontSize: 8, textColor: C.text, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
      headStyles: { fillColor: C.light, textColor: C.muted, fontStyle: "bold", fontSize: 7 },
      footStyles: { fillColor: C.dangerLt, textColor: C.danger, fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [251, 250, 249] },
      columnStyles: {
        0: { cellWidth: 50, fontSize: 7 },
        3: { halign: "right", fontStyle: "bold", textColor: C.danger },
      },
      margin: { left: ML, right: MR },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  if (fjmChgTotal > 0.5) {
    checkPage(20);
    subLabel("Charges FJM Pro (fixes + variables)", C.danger);
    autoTable(doc, {
      startY: y,
      body: [["Charges professionnelles FJM (operations pro)", amtDec(-fjmChgTotal)]],
      foot: [["Sous-total charges FJM", amtDec(-fjmChgTotal)]],
      theme: "plain",
      styles: { fontSize: 8, textColor: C.text, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
      footStyles: { fillColor: C.dangerLt, textColor: C.danger, fontStyle: "bold", fontSize: 7.5 },
      columnStyles: { 1: { halign: "right", fontStyle: "bold", textColor: C.danger } },
      margin: { left: ML, right: MR },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  if (data.expenses.length === 0 && fjmChgTotal < 0.5) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...C.muted);
    doc.text("Aucune charge enregistree ce mois.", ML + 4, y + 5);
    y += 10;
  }

  totalBar("TOTAL CHARGES", amtDec(-data.totalDepenses), false);

  // ─── SITUATION FISCALE ────────────────────────────────────────────────────
  checkPage(50);
  sectionHeader("SITUATION FISCALE ET SOCIALE");

  const fiscalBody: [string, string][] = [
    ["Chiffre d'affaires total (brut)", amt(data.totalReel)],
    ["Base imposable micro-entreprise (URSSAF)", amt(data.declaredMicro)],
    ["Taux de cotisation URSSAF", "26,1 %"],
    ["Cotisations sociales dues", amtDec(-data.urssaf)],
  ];
  if (data.especesNonDeclarees > 0) {
    fiscalBody.push(["Especes hors declaration", amt(data.especesNonDeclarees)]);
  }
  if (data.portageEnabled && data.declaredPortage > 0) {
    fiscalBody.push(["CA en portage JUMP (non declare URSSAF)", amt(data.declaredPortage)]);
  }
  if (data.tvaAmount > 0) {
    fiscalBody.push(["CA soumis a TVA (HT)", amt(Math.round(data.tvaAmount / 0.20))]);
    fiscalBody.push(["TVA collectee (20%) — a reverser", amt(data.tvaAmount)]);
  }

  autoTable(doc, {
    startY: y,
    head: [["Rubrique fiscale", "Montant"]],
    body: fiscalBody,
    theme: "plain",
    styles: { fontSize: 8, textColor: C.text, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
    headStyles: { fillColor: C.light, textColor: C.muted, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [251, 250, 249] },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: ML, right: MR },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ─── RESULTAT NET ─────────────────────────────────────────────────────────
  checkPage(60);
  sectionHeader("RESULTAT NET");

  const resultBody: [string, string, string][] = [
    ["(+)", "Total revenus encaisses", amt(data.totalReel)],
    ["(-)", "Total charges deductibles", amtDec(-data.totalDepenses)],
    ["(-)", "Cotisations URSSAF (26,1% base micro)", amtDec(-data.urssaf)],
  ];
  if (data.tvaAmount > 0) {
    resultBody.push(["(~)", "TVA collectee (a reverser)", amt(data.tvaAmount)]);
  }

  autoTable(doc, {
    startY: y,
    head: [["", "Description", "Montant"]],
    body: resultBody,
    theme: "plain",
    styles: { fontSize: 8, textColor: C.text, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
    headStyles: { fillColor: C.light, textColor: C.muted, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [251, 250, 249] },
    columnStyles: {
      0: { cellWidth: 10, textColor: C.muted, fontSize: 8, fontStyle: "bold" },
      1: { cellWidth: 130 },
      2: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: ML, right: MR },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // Final result box
  checkPage(20);
  const isPos = data.beneficeNet >= 0;
  doc.setFillColor(...(isPos ? C.success : C.danger));
  doc.roundedRect(ML, y, CW, 16, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("BENEFICE NET", ML + 5, y + 10.5);
  doc.setFontSize(13);
  doc.text(`${isPos ? "" : "- "}${amt(Math.abs(data.beneficeNet))}`, W - MR - 5, y + 10.5, { align: "right" });
  y += 20;

  // ─── FOOTER (all pages) ───────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...C.primary);
    doc.rect(0, H - 11, W, 11, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(210, 160, 170);
    doc.text("BE ACTIV BUSINESS  |  Document comptable genere automatiquement  |  Usage interne uniquement", W / 2, H - 4, { align: "center" });
    if (totalPages > 1) {
      doc.setTextColor(255, 255, 255);
      doc.text(`${p} / ${totalPages}`, W - MR, H - 4, { align: "right" });
    }
  }

  doc.save(`Bilan_${data.month}_BeActiv.pdf`);
}

// ─── ANNUAL BILAN ─────────────────────────────────────────────────────────────

export interface AnnualMonthSnap {
  month: string;
  totalReel: number;
  declaredMicro: number;
  urssaf: number;
  totalDepenses: number;
  beneficeNet: number;
  baSalesTotal: number;
}

export interface AnnualBilanData {
  year: number;
  months: AnnualMonthSnap[];
}

export function generateAnnualBilanPDF(data: AnnualBilanData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ML = 14;
  const MR = 14;
  const CW = W - ML - MR;

  const totalCA        = data.months.reduce((s, m) => s + m.totalReel, 0);
  const totalMicro     = data.months.reduce((s, m) => s + m.declaredMicro, 0);
  const totalURSSAF    = data.months.reduce((s, m) => s + m.urssaf, 0);
  const totalCharges   = data.months.reduce((s, m) => s + m.totalDepenses, 0);
  const totalBenefice  = data.months.reduce((s, m) => s + m.beneficeNet, 0);

  // ─── HEADER ─────────────────────────────────────────────────────────────
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, W, 52, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(`BILAN ANNUEL ${data.year}`, ML, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(230, 200, 205);
  doc.text(`Exercice fiscal ${data.year}  —  Janvier a Decembre`, ML, 27);

  doc.setFontSize(7);
  doc.setTextColor(210, 160, 170);
  doc.text("Regime : Micro-entreprise  |  " + EI.tva, ML, 35);
  doc.text(`SIREN ${EI.siren}  |  APE ${EI.ape}  |  N deg. SAP ${EI.sap}`, ML, 42);

  const rx = W - MR;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(EI.name, rx, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(230, 200, 205);
  doc.text(EI.address, rx, 20, { align: "right" });
  doc.text(EI.city, rx, 26, { align: "right" });
  doc.setTextColor(210, 160, 170);
  doc.text(`SIRET ${EI.siret}`, rx, 34, { align: "right" });
  doc.text(`Genere le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`, rx, 41, { align: "right" });
  doc.text(EI.forme, rx, 48, { align: "right" });

  doc.setFillColor(...C.primaryDk);
  doc.rect(0, 52, W, 1.5, "F");

  // ─── KPI STRIP ──────────────────────────────────────────────────────────
  let y = 61;
  const kpis = [
    { label: "CA ANNUEL", value: amt(totalCA), color: C.text, bg: C.light },
    { label: "BASE URSSAF", value: amt(totalMicro), color: C.blue, bg: C.blueLt },
    { label: "URSSAF DU", value: amt(totalURSSAF), color: C.danger, bg: C.dangerLt },
    { label: "BENEFICE NET", value: amt(Math.abs(totalBenefice)), color: totalBenefice >= 0 ? C.success : C.danger, bg: totalBenefice >= 0 ? C.successLt : C.dangerLt },
  ];
  const kpiW = (CW - 9) / 4;
  kpis.forEach((k, i) => {
    const x = ML + i * (kpiW + 3);
    doc.setFillColor(...k.bg);
    doc.roundedRect(x, y, kpiW, 26, 2, 2, "F");
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, kpiW, 26, 2, 2, "S");
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.muted);
    doc.text(k.label, x + kpiW / 2, y + 7, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...k.color);
    doc.text(k.value, x + kpiW / 2, y + 19, { align: "center" });
  });
  y += 33;

  // ─── SECTION: RECAPITULATIF MENSUEL ─────────────────────────────────────
  doc.setFillColor(...C.primary);
  doc.rect(ML, y, CW, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("RECAPITULATIF MENSUEL", ML + 4, y + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(210, 160, 170);
  doc.text(`Exercice ${data.year}`, W - MR - 2, y + 5.5, { align: "right" });
  y += 10;

  const monthlyBody = data.months.map(m => [
    formatMonth(m.month),
    amt(m.totalReel),
    amt(m.declaredMicro),
    amtDec(-m.urssaf),
    amtDec(-m.totalDepenses),
    m.beneficeNet >= 0 ? amt(m.beneficeNet) : `- ${amt(Math.abs(m.beneficeNet))}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Mois", "Revenus", "Base URSSAF", "URSSAF", "Charges", "Benefice Net"]],
    body: monthlyBody,
    foot: [["TOTAL", amt(totalCA), amt(totalMicro), amtDec(-totalURSSAF), amtDec(-totalCharges), totalBenefice >= 0 ? amt(totalBenefice) : `- ${amt(Math.abs(totalBenefice))}`]],
    theme: "plain",
    styles: { fontSize: 7.5, textColor: C.text, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
    headStyles: { fillColor: C.light, textColor: C.muted, fontStyle: "bold", fontSize: 7 },
    footStyles: { fillColor: C.primaryLt, textColor: C.primaryDk, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [251, 250, 249] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { halign: "right", fontStyle: "bold" },
      2: { halign: "right" },
      3: { halign: "right", textColor: C.danger },
      4: { halign: "right", textColor: C.danger },
      5: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: ML, right: MR },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ─── SECTION: SITUATION FISCALE ANNUELLE ────────────────────────────────
  if (y + 60 > H - 18) { doc.addPage(); y = 20; }

  doc.setFillColor(...C.primary);
  doc.rect(ML, y, CW, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("SITUATION FISCALE ET SOCIALE — ANNUELLE", ML + 4, y + 5.5);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [["Rubrique", "Montant"]],
    body: [
      ["Chiffre d'affaires total annuel", amt(totalCA)],
      ["Base imposable micro-entreprise (URSSAF)", amt(totalMicro)],
      ["Taux de cotisation URSSAF", "26,1 %"],
      ["Cotisations sociales dues (annuel)", amtDec(-totalURSSAF)],
      ["Total charges deductibles", amtDec(-totalCharges)],
    ],
    theme: "plain",
    styles: { fontSize: 8, textColor: C.text, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
    headStyles: { fillColor: C.light, textColor: C.muted, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [251, 250, 249] },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: ML, right: MR },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ─── RESULT BOX ─────────────────────────────────────────────────────────
  if (y + 20 > H - 18) { doc.addPage(); y = 20; }
  const isPos = totalBenefice >= 0;
  doc.setFillColor(...(isPos ? C.success : C.danger));
  doc.roundedRect(ML, y, CW, 16, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`BENEFICE NET ANNUEL ${data.year}`, ML + 5, y + 10.5);
  doc.setFontSize(13);
  doc.text(`${isPos ? "" : "- "}${amt(Math.abs(totalBenefice))}`, W - MR - 5, y + 10.5, { align: "right" });

  // ─── FOOTER ─────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...C.primary);
    doc.rect(0, H - 11, W, 11, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(210, 160, 170);
    doc.text(`${EI.name}  |  SIRET ${EI.siret}  |  Bilan annuel ${data.year}  |  Usage interne`, W / 2, H - 4, { align: "center" });
    if (totalPages > 1) {
      doc.setTextColor(255, 255, 255);
      doc.text(`${p} / ${totalPages}`, W - MR, H - 4, { align: "right" });
    }
  }

  doc.save(`Bilan_Annuel_${data.year}_BeActiv.pdf`);
}
