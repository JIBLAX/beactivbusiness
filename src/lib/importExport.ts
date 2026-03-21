import * as XLSX from "xlsx";
import type { Prospect, FinanceEntry, Expense, ActivResetClient, Offre } from "@/data/types";

interface AllData {
  prospects: Prospect[];
  financeEntries: FinanceEntry[];
  expenses: Expense[];
  activResetClients: ActivResetClient[];
  offres: Offre[];
}

export function exportToExcel(data: AllData) {
  const wb = XLSX.utils.book_new();

  const prospectRows = data.prospects.map(p => ({
    ID: p.id, Sexe: p.sex, Nom: p.name, Contact: p.contact, Source: p.source,
    Statut: p.statut, Date: p.date, Type: p.type, Présence: p.presence,
    Heure: p.heure, Objectif: p.objectif, Objection: p.objection, Closing: p.closing,
    Offre: p.offre, Notes: p.notes, Profil: p.profile, "Prix réel": p.prixReel ?? "",
    "Note bilan": p.noteBilan ?? "", "Note profil": p.noteProfil ?? "",
    "Bilan validé": p.bilanValidated ? "Oui" : "Non", Âge: p.age ?? "",
    SAP: p.sapEnabled ? "Oui" : "Non",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prospectRows), "Prospects");

  const entryRows = data.financeEntries.map(e => ({
    ID: e.id, Mois: e.month, Type: e.type, Libellé: e.label, Montant: e.amount,
    Offre: e.offre ?? "", Client: e.clientName ?? "", Paiement: e.paymentMode ?? "",
    "Groupe échéance": e.installmentGroup ?? "", "Échéance N°": e.installmentIndex ?? "",
    "Total échéances": e.installmentTotal ?? "", "Heures SAP": e.sapHours ?? "",
    "Déclaration espèces": e.cashDeclaration ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(entryRows), "Entrées");

  const expenseRows = data.expenses.map(e => ({
    ID: e.id, Mois: e.month, Catégorie: e.category, Libellé: e.label,
    Montant: e.amount, Date: e.date,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseRows), "Dépenses");

  const arRows = data.activResetClients.map(c => ({
    ID: c.id, Nom: c.name, Téléphone: c.phone, Offre: c.offre,
    "Date début": c.startDate, "Phase actuelle": c.currentPhase,
    Cycle: c.cycle, "Objectif atteint": c.objectifAtteint == null ? "" : c.objectifAtteint ? "Oui" : "Non",
    Notes: c.notes,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(arRows), "Activ Reset");

  const offreRows = data.offres.map(o => ({
    ID: o.id, Nom: o.name, Prix: o.price, Actif: o.active ? "Oui" : "Non",
    Thème: o.theme ?? "", "À la carte": o.isAlaCarte ? "Oui" : "Non",
    "Prix unitaire": o.unitPrice ?? "", "Qté min": o.minQuantity ?? "",
    "Paiement max": o.maxInstallments ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(offreRows), "Offres");

  XLSX.writeFile(wb, `BeActiv_Export_${new Date().toISOString().split("T")[0]}.xlsx`);
}

export function exportToCSV(data: AllData) {
  const sheets: { name: string; rows: any[] }[] = [
    { name: "prospects", rows: data.prospects },
    { name: "entrees", rows: data.financeEntries },
    { name: "depenses", rows: data.expenses },
    { name: "activ_reset", rows: data.activResetClients },
    { name: "offres", rows: data.offres },
  ];
  sheets.forEach(({ name, rows }) => {
    if (rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BeActiv_${name}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

export function importFromFile(file: File): Promise<Partial<AllData>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const result: Partial<AllData> = {};

        // Try to find sheets by name
        const findSheet = (names: string[]) => {
          for (const n of names) {
            const found = wb.SheetNames.find(s => s.toLowerCase().includes(n.toLowerCase()));
            if (found) return XLSX.utils.sheet_to_json(wb.Sheets[found]);
          }
          return null;
        };

        const prospectRows = findSheet(["prospect"]);
        if (prospectRows) {
          result.prospects = (prospectRows as any[]).map((r, i) => ({
            id: r.ID || r.id || `imp_p${i}`,
            sex: r.Sexe || r.sex || "F",
            name: r.Nom || r.name || "",
            contact: r.Contact || r.contact || "",
            source: r.Source || r.source || "",
            statut: r.Statut || r.statut || "CONTACT",
            date: r.Date || r.date || "",
            type: r.Type || r.type || "",
            presence: r.Présence || r.presence || "",
            heure: r.Heure || r.heure || "",
            objectif: r.Objectif || r.objectif || "",
            objection: r.Objection || r.objection || "",
            closing: r.Closing || r.closing || "NON",
            offre: r.Offre || r.offre || "-",
            notes: r.Notes || r.notes || "",
            profile: r.Profil || r.profile || "",
            prixReel: Number(r["Prix réel"] || r.prixReel) || 0,
            noteBilan: Number(r["Note bilan"] || r.noteBilan) || 0,
            noteProfil: Number(r["Note profil"] || r.noteProfil) || 0,
            bilanValidated: r["Bilan validé"] === "Oui" || r.bilanValidated === true,
            age: r.Âge || r.age ? Number(r.Âge || r.age) : undefined,
            sapEnabled: r.SAP === "Oui" || r.sapEnabled === true,
          }));
        }

        const entryRows = findSheet(["entrée", "entree", "finance"]);
        if (entryRows) {
          result.financeEntries = (entryRows as any[]).map((r, i) => ({
            id: r.ID || r.id || `imp_e${i}`,
            month: r.Mois || r.month || "",
            type: r.Type || r.type || "micro",
            label: r.Libellé || r.label || "",
            amount: Number(r.Montant || r.amount) || 0,
            offre: r.Offre || r.offre || undefined,
            clientName: r.Client || r.clientName || undefined,
            paymentMode: r.Paiement || r.paymentMode || undefined,
            installmentGroup: r["Groupe échéance"] || r.installmentGroup || undefined,
            installmentIndex: r["Échéance N°"] ? Number(r["Échéance N°"]) : r.installmentIndex || undefined,
            installmentTotal: r["Total échéances"] ? Number(r["Total échéances"]) : r.installmentTotal || undefined,
            sapHours: r["Heures SAP"] ? Number(r["Heures SAP"]) : r.sapHours || undefined,
            cashDeclaration: r["Déclaration espèces"] || r.cashDeclaration || undefined,
          }));
        }

        const expenseRows = findSheet(["dépense", "depense", "expense"]);
        if (expenseRows) {
          result.expenses = (expenseRows as any[]).map((r, i) => ({
            id: r.ID || r.id || `imp_x${i}`,
            month: r.Mois || r.month || "",
            category: r.Catégorie || r.category || "LOCAUX & BUREAUX",
            label: r.Libellé || r.label || "",
            amount: Number(r.Montant || r.amount) || 0,
            date: r.Date || r.date || "",
            proPct: Number(r.ProPct || r.proPct || r["% Pro"]) || 100,
          }));
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
