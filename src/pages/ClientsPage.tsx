import { useMemo, useState } from "react";
import { useApp } from "@/store/AppContext";
import { Prospect } from "@/data/types";

function formatDurationFromOffre(offre: string, offres: any[]): string {
  const found = offres.find((o: any) => o.name === offre);
  if (!found?.duration) return "";
  const u = found.duration.unit === "jours" ? "j" : found.duration.unit === "semaines" ? "sem" : "mois";
  return `${found.duration.value} ${u}`;
}

function getOffreType(offreName: string, offres: any[]): "programme" | "seance" {
  const found = offres.find((o: any) => o.name === offreName);
  if (!found) return "seance";
  if (found.theme === "PROGRAMMES") return "programme";
  return "seance";
}

function getClientSessionCount(entries: any[], offreName: string, offres: any[]): { label: string; count: number } {
  const found = offres.find((o: any) => o.name === offreName);
  if (!found) return { label: `${entries.length} entrées`, count: entries.length };
  
  if (found.theme === "PROGRAMMES") {
    return { label: "1 programme", count: 1 };
  }
  
  // For JM COACHING with min_quantity (JM PASS types) — count sessions
  if (found.minQuantity || found.unitPrice) {
    // Each entry might represent multiple sessions based on amount / unitPrice
    const unitPrice = found.unitPrice || found.price;
    const totalSessions = entries.reduce((sum: number, e: any) => {
      if (unitPrice > 0) {
        return sum + Math.round(e.amount / unitPrice);
      }
      return sum + 1;
    }, 0);
    return { label: `${totalSessions} séance${totalSessions > 1 ? "s" : ""}`, count: totalSessions };
  }
  
  // For à la carte or one shot
  if (found.isAlaCarte) {
    return { label: `${entries.length} séance${entries.length > 1 ? "s" : ""}`, count: entries.length };
  }
  
  return { label: `${entries.length} séance${entries.length > 1 ? "s" : ""}`, count: entries.length };
}

export default function ClientsPage() {
  const { prospects, setProspects, financeEntries, offres } = useApp();
  const [selectedClient, setSelectedClient] = useState<Prospect | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Prospect>>({});

  const clients = useMemo(() => prospects.filter(p => p.closing === "OUI" && p.offre && p.offre !== "-"), [prospects]);

  const getClientEntries = (name: string) => financeEntries.filter(e => e.clientName === name);
  const getClientTotal = (name: string) => getClientEntries(name).reduce((s, e) => s + e.amount, 0);
  const getClientSapHours = (name: string) => getClientEntries(name).reduce((s, e) => s + (e.sapHours || 0), 0);
  const getClientSapTotal = (name: string) => getClientEntries(name).filter(e => e.sapHours && e.sapHours > 0).reduce((s, e) => s + e.amount, 0);

  const getSessionInfo = (client: Prospect) => {
    const entries = getClientEntries(client.name);
    return getClientSessionCount(entries, client.offre, offres);
  };

  const startEdit = (c: Prospect) => {
    setEditData({ ...c });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!editData.id) return;
    setProspects(prospects.map(p => p.id === editData.id ? { ...p, ...editData } as Prospect : p));
    setSelectedClient({ ...selectedClient!, ...editData } as Prospect);
    setEditing(false);
  };

  if (selectedClient) {
    const entries = getClientEntries(selectedClient.name);
    const totalPaid = getClientTotal(selectedClient.name);
    const sapHours = getClientSapHours(selectedClient.name);
    const sapTotal = getClientSapTotal(selectedClient.name);
    const duration = formatDurationFromOffre(selectedClient.offre, offres);
    const sessionInfo = getSessionInfo(selectedClient);
    const offreType = getOffreType(selectedClient.offre, offres);

    return (
      <div className="px-4 pt-4 pb-24">
        <button onClick={() => { setSelectedClient(null); setEditing(false); }}
          className="flex items-center gap-2 text-muted-foreground text-sm mb-4 hover:text-foreground transition-colors">
          ← Retour
        </button>

        {/* Client header */}
        <div className="card-hero rounded-3xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm ${selectedClient.sex === "F" ? "text-pink-400" : "text-blue-400"}`}>
                  {selectedClient.sex === "F" ? "♀" : "♂"}
                </span>
                <div className="font-display text-[20px] font-bold text-foreground">{selectedClient.name}</div>
              </div>
              <div className="badge-pill mt-1" style={{ background: "hsl(348 63% 30% / 0.15)", color: "hsl(348 63% 45%)" }}>
                {selectedClient.offre}
              </div>
            </div>
            {!editing && (
              <button onClick={() => startEdit(selectedClient)} className="badge-pill cursor-pointer"
                style={{ background: "hsl(0 0% 100% / 0.05)", color: "hsl(0 0% 70%)" }}>✏️ Modifier</button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3 mt-4 pt-4" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label mb-1 block">Téléphone</label>
                  <input value={editData.contact || ""} onChange={e => setEditData(p => ({ ...p, contact: e.target.value }))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
                </div>
                <div>
                  <label className="section-label mb-1 block">Âge</label>
                  <input type="number" value={editData.age || ""} onChange={e => setEditData(p => ({ ...p, age: Number(e.target.value) || undefined }))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
                </div>
              </div>
              <div>
                <label className="section-label mb-1 block">Objectif</label>
                <input value={editData.objectif || ""} onChange={e => setEditData(p => ({ ...p, objectif: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
              </div>
              <div>
                <label className="section-label mb-1 block">Notes</label>
                <textarea value={editData.notes || ""} onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm input-field resize-none" rows={3} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">SAP Domicile</span>
                <button onClick={() => setEditData(p => ({ ...p, sapEnabled: !p.sapEnabled }))}
                  className={`w-12 h-7 rounded-full transition-all relative`}
                  style={{ background: editData.sapEnabled ? "hsl(152 55% 42%)" : "hsl(0 0% 15%)" }}>
                  <div className={`absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white transition-all shadow-sm
                    ${editData.sapEnabled ? "left-[26px]" : "left-[3px]"}`} />
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={saveEdit} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white btn-primary">✓ Sauvegarder</button>
                <button onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground input-field">Annuler</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
              {selectedClient.contact && (
                <a href={`tel:${selectedClient.contact}`} className="stat-card rounded-xl p-3 flex items-center gap-2 active:scale-[0.97] transition-transform">
                  <span className="text-lg">📞</span>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Téléphone</div>
                    <div className="text-[12px] font-medium text-foreground">{selectedClient.contact}</div>
                  </div>
                </a>
              )}
              {selectedClient.objectif && (
                <div className="stat-card rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground">Objectif</div>
                  <div className="text-[12px] font-semibold text-foreground">{selectedClient.objectif}</div>
                </div>
              )}
              {selectedClient.age && (
                <div className="stat-card rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground">Âge</div>
                  <div className="text-[12px] font-semibold text-foreground">{selectedClient.age} ans</div>
                </div>
              )}
              {duration && (
                <div className="stat-card rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground">Durée offre</div>
                  <div className="text-[12px] font-semibold text-foreground">{duration}</div>
                </div>
              )}
              {selectedClient.date && (
                <div className="stat-card rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground">Inscription</div>
                  <div className="text-[12px] font-semibold text-foreground">{selectedClient.date}</div>
                </div>
              )}
              {selectedClient.sapEnabled && (
                <div className="stat-card rounded-xl p-3" style={{ borderColor: "hsl(217 70% 60% / 0.2)" }}>
                  <div className="text-[10px] text-info font-semibold">SAP ACTIVÉ</div>
                  <div className="text-[12px] font-medium text-foreground">{sapHours}h — {sapTotal}€</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="stat-card rounded-2xl p-4 text-center">
            <div className="section-label mb-1">Total payé</div>
            <div className="value-lg text-[22px] text-success">{totalPaid.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
          </div>
          <div className="stat-card rounded-2xl p-4 text-center">
            <div className="section-label mb-1">{offreType === "programme" ? "Programme" : "Séances"}</div>
            <div className="value-lg text-[22px] text-foreground">{sessionInfo.count}</div>
          </div>
        </div>

        {/* Payment history */}
        {entries.length > 0 && (
          <div className="card-elevated rounded-2xl overflow-hidden mb-4">
            <div className="p-4 pb-2">
              <div className="section-label">Historique des paiements</div>
            </div>
            <div className="divide-y" style={{ borderColor: "hsl(0 0% 100% / 0.04)" }}>
              {entries.map(e => {
                const entryOffre = offres.find(o => o.name === e.offre);
                const sessionsInEntry = entryOffre?.unitPrice && entryOffre.unitPrice > 0 
                  ? Math.round(e.amount / entryOffre.unitPrice) 
                  : null;
                return (
                  <div key={e.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-medium text-foreground">{e.label}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {e.month}
                        {e.paymentMode ? ` · ${e.paymentMode}` : ""}
                        {sessionsInEntry ? ` · ${sessionsInEntry} séance${sessionsInEntry > 1 ? "s" : ""}` : ""}
                        {e.sapHours ? ` · ${e.sapHours}h SAP` : ""}
                      </div>
                    </div>
                    <div className="value-lg text-[14px] text-success">+{e.amount}€</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedClient.notes && (
          <div className="card-elevated rounded-2xl p-4">
            <div className="section-label mb-2">Notes</div>
            <div className="text-[13px] text-muted-foreground leading-relaxed">{selectedClient.notes}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] font-bold text-foreground">Clients</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">{clients.length} clients actifs</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: "Total", value: clients.length, color: "text-foreground" },
          { label: "Femmes", value: clients.filter(c => c.sex === "F").length, color: "text-pink-400" },
          { label: "Hommes", value: clients.filter(c => c.sex === "H").length, color: "text-blue-400" },
        ].map(k => (
          <div key={k.label} className="stat-card rounded-2xl p-3 text-center">
            <div className={`value-lg text-[24px] ${k.color}`}>{k.value}</div>
            <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Client list */}
      <div className="space-y-2">
        {clients.map(c => {
          const info = getSessionInfo(c);
          return (
            <button key={c.id} onClick={() => setSelectedClient(c)}
              className="w-full text-left card-elevated rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                style={{ background: c.sex === "F" ? "hsl(330 60% 50% / 0.12)" : "hsl(210 60% 50% / 0.12)", color: c.sex === "F" ? "hsl(330 60% 60%)" : "hsl(210 60% 60%)" }}>
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-foreground">{c.name}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.offre}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="value-lg text-[14px] text-success">{getClientTotal(c.name).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
                <div className="text-[10px] text-muted-foreground">{info.label}</div>
              </div>
              <span className="text-muted-foreground text-xs">›</span>
            </button>
          );
        })}
      </div>

      {clients.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">👤</div>
          <div className="text-sm">Aucun client pour l'instant</div>
        </div>
      )}
    </div>
  );
}