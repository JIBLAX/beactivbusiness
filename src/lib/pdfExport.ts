import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { FinanceEntry, Expense, Offre } from "@/data/types";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function formatMonth(m: string): string {
  const [y, mo] = m.split("-");
  return `${MONTHS[parseInt(mo) - 1]} ${y}`;
}

const BRAND = { primary: [139, 42, 60] as [number, number, number], dark: [12, 12, 14] as [number, number, number], text: [245, 245, 245] as [number, number, number], muted: [120, 120, 130] as [number, number, number], success: [60, 180, 120] as [number, number, number], danger: [220, 60, 60] as [number, number, number] };

interface BilanData {
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
}

export function generateBilanPDF(data: BilanData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, w, 35, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("BILAN MENSUEL", 15, 18);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(formatMonth(data.month).toUpperCase(), 15, 27);
  doc.setFontSize(8);
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, w - 15, 27, { align: "right" });

  y = 45;

  // KPI boxes
  const kpis = [
    { label: "REVENUS TOTAL", value: `${data.totalReel.toLocaleString("fr-FR")}€`, color: BRAND.text },
    { label: "CA MICRO", value: `${data.declaredMicro.toLocaleString("fr-FR")}€`, color: BRAND.success },
    { label: "URSSAF DÛ", value: `-${data.urssaf.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€`, color: BRAND.danger },
    { label: "BÉNÉFICE NET", value: `${data.beneficeNet.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€`, color: data.beneficeNet >= 0 ? BRAND.success : BRAND.danger },
  ];
  const boxW = (w - 30 - 9) / 4;
  kpis.forEach((k, i) => {
    const x = 15 + i * (boxW + 3);
    doc.setFillColor(30, 30, 34);
    doc.roundedRect(x, y, boxW, 22, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.muted);
    doc.text(k.label, x + boxW / 2, y + 8, { align: "center" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...k.color);
    doc.text(k.value, x + boxW / 2, y + 17, { align: "center" });
    doc.setFont("helvetica", "normal");
  });
  y += 30;

  // Entries table
  if (data.entries.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text("ENTRÉES", 15, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [["Client", "Offre", "Mode", "Montant"]],
      body: data.entries.map(e => [
        e.clientName || e.label,
        e.offre || "-",
        e.paymentMode || "-",
        `${e.amount.toLocaleString("fr-FR")}€`,
      ]),
      theme: "plain",
      styles: { fontSize: 8, textColor: [200, 200, 200], cellPadding: 2.5 },
      headStyles: { fillColor: [25, 25, 28], textColor: [160, 160, 170], fontStyle: "bold", fontSize: 7 },
      alternateRowStyles: { fillColor: [20, 20, 22] },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Expenses table
  if (data.expenses.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text("DÉPENSES", 15, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [["Catégorie", "Libellé", "Date", "Montant"]],
      body: data.expenses.map(e => [e.category, e.label, e.date, `-${e.amount.toLocaleString("fr-FR")}€`]),
      theme: "plain",
      styles: { fontSize: 8, textColor: [200, 200, 200], cellPadding: 2.5 },
      headStyles: { fillColor: [25, 25, 28], textColor: [160, 160, 170], fontStyle: "bold", fontSize: 7 },
      alternateRowStyles: { fillColor: [20, 20, 22] },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Summary section
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFillColor(25, 25, 28);
  doc.roundedRect(15, y, w - 30, 55, 3, 3, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);
  doc.text("SYNTHÈSE", 20, y + 8);

  const lines = [
    { label: "Total Revenus", value: `${data.totalReel.toLocaleString("fr-FR")}€` },
    { label: "Total Dépenses", value: `-${data.totalDepenses.toLocaleString("fr-FR")}€` },
    { label: "URSSAF (26.1%)", value: `-${data.urssaf.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€` },
    ...(data.tvaAmount > 0 ? [{ label: "TVA collectée", value: `${data.tvaAmount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€` }] : []),
    { label: "Bénéfice Net", value: `${data.beneficeNet.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€` },
    { label: "Gestion Perso", value: `${data.gestionPerso.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€` },
    { label: "Reste Perso", value: `${data.restePerso.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€` },
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  lines.forEach((l, i) => {
    const ly = y + 14 + i * 5.5;
    doc.setTextColor(...BRAND.muted);
    doc.text(l.label, 22, ly);
    doc.setTextColor(...BRAND.text);
    doc.text(l.value, w - 22, ly, { align: "right" });
  });

  // Footer
  const ph = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.muted);
  doc.text("BeActiv Business — Document généré automatiquement", w / 2, ph - 8, { align: "center" });

  doc.save(`Bilan_${data.month}_BeActiv.pdf`);
}
