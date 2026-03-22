import { useMemo, useState } from "react";
import { useApp } from "@/store/AppContext";
import { Prospect, Structure, STRUCTURE_TYPES, STRUCTURE_FREQUENCIES, StructureType, StructureFrequency } from "@/data/types";

/* ── helpers ── */
function formatDurationFromOffre(offre: string, offres: any[]): string {
  const found = offres.find((o: any) => o.name === offre);
  if (!found?.duration) return "";
  const u = found.duration.unit === "jours" ? "j" : found.duration.unit === "semaines" ? "sem" : "mois";
  return `${found.duration.value} ${u}`;
}

function getOffreType(offreName: string, offres: any[]): "programme" | "seance" {
  const found = offres.find((o: any) => o.name === offreName);
  if (!found) return "seance";
  return found.theme === "PROGRAMMES" ? "programme" : "seance";
}

function getClientMetrics(entries: any[], offreName: string, offres: any[]) {
  const found = offres.find((o: any) => o.name === offreName);
  if (!found) return { programmesLabel: "-", programmesCount: 0, seancesLabel: "-", seancesCount: 0 };
  if (found.theme === "PROGRAMMES") {
    const groups = new Set<string>();
    let standalone = 0;
    entries.forEach((e: any) => { if (e.installmentGroup) groups.add(e.installmentGroup); else standalone++; });
    const count = groups.size + standalone;
    return { programmesLabel: `${count || 1} unité${count > 1 ? "s" : ""}`, programmesCount: count || 1, seancesLabel: "-", seancesCount: 0 };
  }
  if (found.minQuantity || found.unitPrice) {
    const unitPrice = found.unitPrice || found.price;
    const totalSessions = entries.reduce((sum: number, e: any) => unitPrice > 0 ? sum + Math.round(e.amount / unitPrice) : sum + 1, 0);
    return { programmesLabel: "-", programmesCount: 0, seancesLabel: `${totalSessions} séance${totalSessions > 1 ? "s" : ""}`, seancesCount: totalSessions };
  }
  return { programmesLabel: "-", programmesCount: 0, seancesLabel: `${entries.length} séance${entries.length > 1 ? "s" : ""}`, seancesCount: entries.length };
}

const GROUP_LABELS: Record<string, string> = { duo: "Duo", trio: "Trio", small_group: "Small Group" };
const GROUP_MAX: Record<string, number> = { duo: 2, trio: 3, small_group: 6 };

export default function ClientsPage() {
  const { prospects, setProspects, financeEntries, offres, structures, setStructures } = useApp();
  const [tab, setTab] = useState<"particuliers" | "structures">("particuliers");
  const [selectedClient, setSelectedClient] = useState<Prospect | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Prospect>>({});
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Prospect>>({ sex: "F", closing: "OUI", statut: "CLIENT" });

  // Structure state
  const [selectedStructure, setSelectedStructure] = useState<Structure | null>(null);
  const [editingStructure, setEditingStructure] = useState(false);
  const [editStructData, setEditStructData] = useState<Partial<Structure>>({});
  const [showAddStructure, setShowAddStructure] = useState(false);
  const [newStructure, setNewStructure] = useState<Partial<Structure>>({ structureType: "entreprise", frequency: "ponctuel", active: true, peopleCount: 1 });

  // Group management
  const [showGroupSetup, setShowGroupSetup] = useState(false);
  const [groupType, setGroupType] = useState<"duo" | "trio" | "small_group">("duo");
  const [groupLeader, setGroupLeader] = useState<string>("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);

  const clients = useMemo(() => prospects.filter(p => p.closing === "OUI" && p.offre && p.offre !== "-"), [prospects]);
  const getClientEntries = (name: string) => financeEntries.filter(e => e.clientName === name);
  const getClientTotal = (name: string) => getClientEntries(name).reduce((s, e) => s + e.amount, 0);
  const getClientSapHours = (name: string) => getClientEntries(name).reduce((s, e) => s + (e.sapHours || 0), 0);
  const getClientSapTotal = (name: string) => getClientEntries(name).filter(e => e.sapHours && e.sapHours > 0).reduce((s, e) => s + e.amount, 0);
  const getMetrics = (client: Prospect) => getClientMetrics(getClientEntries(client.name), client.offre, offres);

  const getGroupMembers = (client: Prospect) => {
    if (!client.groupId) return [];
    return clients.filter(c => c.groupId === client.groupId && c.id !== client.id);
  };

  const startEdit = (c: Prospect) => { setEditData({ ...c }); setEditing(true); };
  const saveEdit = () => {
    if (!editData.id) return;
    setProspects(prospects.map(p => p.id === editData.id ? { ...p, ...editData } as Prospect : p));
    setSelectedClient({ ...selectedClient!, ...editData } as Prospect);
    setEditing(false);
  };

  const addNewClient = () => {
    if (!newClient.name || !newClient.offre) return;
    const client: Prospect = {
      id: "c" + Date.now(), sex: newClient.sex || "F", name: newClient.name,
      contact: newClient.contact || "", source: newClient.source || "", statut: "CLIENT",
      date: new Date().toISOString().split("T")[0], type: "", presence: "", heure: "",
      objectif: newClient.objectif || "", objection: "", closing: "OUI",
      offre: newClient.offre || "-", notes: newClient.notes || "", profile: "",
      age: newClient.age, sapEnabled: newClient.sapEnabled ?? false,
    };
    setProspects([...prospects, client]);
    setShowAddClient(false);
    setNewClient({ sex: "F", closing: "OUI", statut: "CLIENT" });
  };

  const createGroup = () => {
    if (!groupLeader || groupMembers.length === 0) return;
    const gId = "grp" + Date.now();
    const max = GROUP_MAX[groupType];
    const members = groupMembers.slice(0, max - 1);
    setProspects(prospects.map(p => {
      if (p.id === groupLeader) return { ...p, groupType: groupType, groupId: gId, isGroupLeader: true };
      if (members.includes(p.id)) return { ...p, groupType: groupType, groupId: gId, isGroupLeader: false };
      return p;
    }));
    setShowGroupSetup(false);
    setGroupMembers([]);
    setGroupLeader("");
  };

  const isolateClient = (clientId: string) => {
    const client = prospects.find(p => p.id === clientId);
    let updated = prospects.map(p => {
      if (p.id !== clientId) return p;
      return { ...p, groupType: null as any, groupId: null as any, isGroupLeader: false };
    });
    // If group has only 1 member left, dissolve
    if (client?.groupId) {
      const remaining = updated.filter(p => p.groupId === client.groupId);
      if (remaining.length <= 1) {
        updated = updated.map(p => {
          if (p.groupId === client.groupId) return { ...p, groupType: null as any, groupId: null as any, isGroupLeader: false };
          return p;
        });
      }
    }
    setProspects(updated);
  };

  // Structure methods
  const addStructure = () => {
    if (!newStructure.name) return;
    const s: Structure = {
      id: "st" + Date.now(), name: newStructure.name!, contactName: newStructure.contactName || "",
      phone: newStructure.phone || "", email: newStructure.email || "", city: newStructure.city || "",
      structureType: newStructure.structureType as StructureType || "entreprise",
      peopleCount: newStructure.peopleCount || 1, offre: newStructure.offre || "",
      amount: newStructure.amount || 0, frequency: newStructure.frequency as StructureFrequency || "ponctuel",
      notes: newStructure.notes || "", active: newStructure.active ?? true,
    };
    setStructures([...structures, s]);
    setShowAddStructure(false);
    setNewStructure({ structureType: "entreprise", frequency: "ponctuel", active: true, peopleCount: 1 });
  };

  const saveStructureEdit = () => {
    if (!editStructData.id) return;
    setStructures(structures.map(s => s.id === editStructData.id ? { ...s, ...editStructData } as Structure : s));
    setSelectedStructure({ ...selectedStructure!, ...editStructData } as Structure);
    setEditingStructure(false);
  };

  /* ── CLIENT DETAIL VIEW ── */
  if (selectedClient) {
    const entries = getClientEntries(selectedClient.name);
    const totalPaid = getClientTotal(selectedClient.name);
    const sapHours = getClientSapHours(selectedClient.name);
    const sapTotal = getClientSapTotal(selectedClient.name);
    const duration = formatDurationFromOffre(selectedClient.offre, offres);
    const metrics = getMetrics(selectedClient);
    const members = getGroupMembers(selectedClient);

    return (
      <div className="px-4 pt-4 pb-24">
        <button onClick={() => { setSelectedClient(null); setEditing(false); }}
          className="flex items-center gap-2 text-muted-foreground text-sm mb-4 hover:text-foreground transition-colors">
          ← Retour
        </button>

        <div className="card-hero rounded-3xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm ${selectedClient.sex === "F" ? "text-pink-400" : "text-blue-400"}`}>
                  {selectedClient.sex === "F" ? "♀" : "♂"}
                </span>
                <div className="font-display text-[20px] font-bold text-foreground">{selectedClient.name}</div>
                {selectedClient.groupType && (
                  <span className="badge-pill text-[9px]" style={{ background: "hsl(270 50% 40% / 0.2)", color: "hsl(270 50% 65%)" }}>
                    {GROUP_LABELS[selectedClient.groupType]}
                    {selectedClient.isGroupLeader ? " 👑" : ""}
                  </span>
                )}
              </div>
              <div className="badge-pill mt-1" style={{ background: "hsl(348 63% 34% / 0.15)", color: "hsl(348 63% 50%)" }}>
                {selectedClient.offre}
              </div>
            </div>
            {!editing && (
              <button onClick={() => startEdit(selectedClient)} className="badge-pill cursor-pointer"
                style={{ background: "hsl(0 0% 100% / 0.05)", color: "hsl(0 0% 70%)" }}>✏️ Modifier</button>
            )}
          </div>

          {/* Group members */}
          {members.length > 0 && !editing && (
            <div className="mb-4 p-3 rounded-xl" style={{ background: "hsl(270 30% 20% / 0.15)", border: "1px solid hsl(270 40% 40% / 0.15)" }}>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "hsl(270 50% 60%)" }}>
                Membres du groupe
              </div>
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${m.sex === "F" ? "text-pink-400" : "text-blue-400"}`}>
                      {m.sex === "F" ? "♀" : "♂"}
                    </span>
                    <span className="text-[12px] text-foreground">{m.name}</span>
                    {m.isGroupLeader && <span className="text-[9px]">👑</span>}
                  </div>
                  <button onClick={() => isolateClient(m.id)}
                    className="text-[9px] px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground"
                    style={{ background: "hsl(0 0% 100% / 0.05)" }}>
                    Isoler
                  </button>
                </div>
              ))}
              {selectedClient.groupId && (
                <button onClick={() => isolateClient(selectedClient.id)}
                  className="mt-2 text-[10px] px-3 py-1.5 rounded-lg w-full text-center"
                  style={{ background: "hsl(0 60% 40% / 0.15)", color: "hsl(0 60% 60%)" }}>
                  Quitter le groupe
                </button>
              )}
            </div>
          )}

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
                  className="w-12 h-7 rounded-full transition-all relative"
                  style={{ background: editData.sapEnabled ? "hsl(152 55% 42%)" : "hsl(0 0% 20%)" }}>
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
                  <div className="text-[10px] font-semibold" style={{ color: "hsl(217 70% 58%)" }}>SAP ACTIVÉ</div>
                  <div className="text-[12px] font-medium text-foreground">{sapHours}h — {sapTotal}€</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="stat-card rounded-2xl p-4 text-center">
            <div className="section-label mb-1">Total payé</div>
            <div className="value-lg text-[22px] text-success">{totalPaid.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
          </div>
          <div className="stat-card rounded-2xl p-4 text-center">
            <div className="section-label mb-1">Programmes</div>
            <div className="value-lg text-[22px] text-foreground">{metrics.programmesLabel}</div>
          </div>
          <div className="stat-card rounded-2xl p-4 text-center">
            <div className="section-label mb-1">Séances</div>
            <div className="value-lg text-[22px] text-foreground">{metrics.seancesLabel}</div>
          </div>
        </div>

        {entries.length > 0 && (
          <div className="card-elevated rounded-2xl overflow-hidden mb-4">
            <div className="p-4 pb-2"><div className="section-label">Historique des paiements</div></div>
            <div className="divide-y" style={{ borderColor: "hsl(0 0% 100% / 0.04)" }}>
              {entries.map(e => {
                const entryOffre = offres.find(o => o.name === e.offre);
                const sessionsInEntry = entryOffre?.unitPrice && entryOffre.unitPrice > 0 ? Math.round(e.amount / entryOffre.unitPrice) : null;
                return (
                  <div key={e.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-medium text-foreground">{e.label}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {e.month}{e.paymentMode ? ` · ${e.paymentMode}` : ""}{sessionsInEntry ? ` · ${sessionsInEntry} séance${sessionsInEntry > 1 ? "s" : ""}` : ""}{e.sapHours ? ` · ${e.sapHours}h SAP` : ""}
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

  /* ── STRUCTURE DETAIL VIEW ── */
  if (selectedStructure) {
    return (
      <div className="px-4 pt-4 pb-24">
        <button onClick={() => { setSelectedStructure(null); setEditingStructure(false); }}
          className="flex items-center gap-2 text-muted-foreground text-sm mb-4 hover:text-foreground transition-colors">
          ← Retour
        </button>

        <div className="card-hero rounded-3xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-display text-[20px] font-bold text-foreground">{selectedStructure.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="badge-pill capitalize" style={{ background: "hsl(217 70% 58% / 0.15)", color: "hsl(217 70% 65%)" }}>
                  {selectedStructure.structureType}
                </span>
                {selectedStructure.city && <span className="text-[11px] text-muted-foreground">📍 {selectedStructure.city}</span>}
              </div>
            </div>
            {!editingStructure && (
              <button onClick={() => { setEditStructData({ ...selectedStructure }); setEditingStructure(true); }}
                className="badge-pill cursor-pointer" style={{ background: "hsl(0 0% 100% / 0.05)", color: "hsl(0 0% 70%)" }}>✏️ Modifier</button>
            )}
          </div>

          {editingStructure ? (
            <div className="space-y-3 mt-4 pt-4" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
              <input value={editStructData.name || ""} onChange={e => setEditStructData(p => ({ ...p, name: e.target.value }))}
                placeholder="Nom *" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
              <div className="grid grid-cols-2 gap-3">
                <input value={editStructData.contactName || ""} onChange={e => setEditStructData(p => ({ ...p, contactName: e.target.value }))}
                  placeholder="Contact" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
                <input value={editStructData.phone || ""} onChange={e => setEditStructData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="Téléphone" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={editStructData.email || ""} onChange={e => setEditStructData(p => ({ ...p, email: e.target.value }))}
                  placeholder="Email" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
                <input value={editStructData.city || ""} onChange={e => setEditStructData(p => ({ ...p, city: e.target.value }))}
                  placeholder="Ville" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
              </div>
              <select value={editStructData.structureType || "entreprise"} onChange={e => setEditStructData(p => ({ ...p, structureType: e.target.value as StructureType }))}
                className="w-full rounded-xl px-3 py-2.5 text-sm input-field appearance-none">
                {STRUCTURE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label mb-1 block">Nb personnes</label>
                  <input type="number" value={editStructData.peopleCount || 1} onChange={e => setEditStructData(p => ({ ...p, peopleCount: Number(e.target.value) || 1 }))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
                </div>
                <div>
                  <label className="section-label mb-1 block">Montant (€)</label>
                  <input type="number" value={editStructData.amount || 0} onChange={e => setEditStructData(p => ({ ...p, amount: Number(e.target.value) || 0 }))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
                </div>
              </div>
              <select value={editStructData.offre || ""} onChange={e => setEditStructData(p => ({ ...p, offre: e.target.value }))}
                className="w-full rounded-xl px-3 py-2.5 text-sm input-field appearance-none">
                <option value="">Offre</option>
                {offres.filter(o => o.active).map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
              </select>
              <select value={editStructData.frequency || "ponctuel"} onChange={e => setEditStructData(p => ({ ...p, frequency: e.target.value as StructureFrequency }))}
                className="w-full rounded-xl px-3 py-2.5 text-sm input-field appearance-none">
                {STRUCTURE_FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <textarea value={editStructData.notes || ""} onChange={e => setEditStructData(p => ({ ...p, notes: e.target.value }))}
                placeholder="Notes" className="w-full rounded-xl px-3 py-2.5 text-sm input-field resize-none" rows={3} />
              <div className="flex gap-2 mt-2">
                <button onClick={saveStructureEdit} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white btn-primary">✓ Sauvegarder</button>
                <button onClick={() => setEditingStructure(false)} className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground input-field">Annuler</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
              {selectedStructure.contactName && (
                <div className="stat-card rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground">Contact</div>
                  <div className="text-[12px] font-semibold text-foreground">{selectedStructure.contactName}</div>
                </div>
              )}
              {selectedStructure.phone && (
                <a href={`tel:${selectedStructure.phone}`} className="stat-card rounded-xl p-3 flex items-center gap-2 active:scale-[0.97] transition-transform">
                  <span className="text-lg">📞</span>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Téléphone</div>
                    <div className="text-[12px] font-medium text-foreground">{selectedStructure.phone}</div>
                  </div>
                </a>
              )}
              {selectedStructure.email && (
                <a href={`mailto:${selectedStructure.email}`} className="stat-card rounded-xl p-3 col-span-2 active:scale-[0.97] transition-transform">
                  <div className="text-[10px] text-muted-foreground">Email</div>
                  <div className="text-[12px] font-medium text-foreground">{selectedStructure.email}</div>
                </a>
              )}
              <div className="stat-card rounded-xl p-3">
                <div className="text-[10px] text-muted-foreground">Personnes</div>
                <div className="text-[12px] font-semibold text-foreground">{selectedStructure.peopleCount}</div>
              </div>
              <div className="stat-card rounded-xl p-3">
                <div className="text-[10px] text-muted-foreground">Fréquence</div>
                <div className="text-[12px] font-semibold text-foreground capitalize">{selectedStructure.frequency}</div>
              </div>
              {selectedStructure.offre && (
                <div className="stat-card rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground">Offre</div>
                  <div className="text-[12px] font-semibold text-foreground">{selectedStructure.offre}</div>
                </div>
              )}
              <div className="stat-card rounded-xl p-3">
                <div className="text-[10px] text-muted-foreground">Montant</div>
                <div className="value-lg text-[16px] text-success">{selectedStructure.amount}€</div>
              </div>
            </div>
          )}
        </div>

        {selectedStructure.notes && !editingStructure && (
          <div className="card-elevated rounded-2xl p-4">
            <div className="section-label mb-2">Notes</div>
            <div className="text-[13px] text-muted-foreground leading-relaxed">{selectedStructure.notes}</div>
          </div>
        )}
      </div>
    );
  }

  /* ── MAIN LIST VIEW ── */
  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-[22px] font-bold text-foreground">Clients</h1>
        <div className="flex gap-2">
          {tab === "particuliers" && (
            <>
              <button onClick={() => setShowGroupSetup(true)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg input-field" title="Créer un groupe">
                👥
              </button>
              <button onClick={() => setShowAddClient(true)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold btn-primary">+</button>
            </>
          )}
          {tab === "structures" && (
            <button onClick={() => setShowAddStructure(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold btn-primary">+</button>
          )}
        </div>
      </div>

      {/* Tab switch */}
      <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: "hsl(240 4% 13%)" }}>
        {(["particuliers", "structures"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all capitalize ${tab === t ? "btn-primary text-white" : "text-muted-foreground"}`}>
            {t === "particuliers" ? `Particuliers (${clients.length})` : `Structures (${structures.length})`}
          </button>
        ))}
      </div>

      {/* ── GROUP SETUP MODAL ── */}
      {showGroupSetup && (
        <div className="card-elevated rounded-2xl p-4 mb-4 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[14px] font-semibold text-foreground">Créer un groupe</div>
            <button onClick={() => setShowGroupSetup(false)} className="text-muted-foreground text-lg">×</button>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["duo", "trio", "small_group"] as const).map(g => (
                <button key={g} onClick={() => { setGroupType(g); setGroupMembers([]); }}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-medium transition-all ${groupType === g ? "btn-primary text-white" : "input-field text-muted-foreground"}`}>
                  {GROUP_LABELS[g]} ({GROUP_MAX[g]} max)
                </button>
              ))}
            </div>
            <div>
              <label className="section-label mb-1 block">Client principal</label>
              <select value={groupLeader} onChange={e => setGroupLeader(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm input-field appearance-none">
                <option value="">Choisir...</option>
                {clients.filter(c => !c.groupId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label mb-1 block">Membres ({groupMembers.length}/{GROUP_MAX[groupType] - 1})</label>
              <div className="space-y-1.5">
                {clients.filter(c => !c.groupId && c.id !== groupLeader).map(c => (
                  <label key={c.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-white/[0.03]">
                    <input type="checkbox" checked={groupMembers.includes(c.id)}
                      disabled={!groupMembers.includes(c.id) && groupMembers.length >= GROUP_MAX[groupType] - 1}
                      onChange={e => setGroupMembers(e.target.checked ? [...groupMembers, c.id] : groupMembers.filter(id => id !== c.id))}
                      className="rounded" />
                    <span className="text-[12px] text-foreground">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <button onClick={createGroup} disabled={!groupLeader || groupMembers.length === 0}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white btn-primary disabled:opacity-40">
              ✓ Créer le groupe {GROUP_LABELS[groupType]}
            </button>
          </div>
        </div>
      )}

      {/* ── ADD CLIENT MODAL ── */}
      {showAddClient && tab === "particuliers" && (
        <div className="card-elevated rounded-2xl p-4 mb-4 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[14px] font-semibold text-foreground">Nouveau client</div>
            <button onClick={() => setShowAddClient(false)} className="text-muted-foreground text-lg">×</button>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["F", "H"] as const).map(s => (
                <button key={s} onClick={() => setNewClient(p => ({ ...p, sex: s }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${newClient.sex === s ? "btn-primary text-white" : "input-field text-muted-foreground"}`}>
                  {s === "F" ? "♀ Femme" : "♂ Homme"}
                </button>
              ))}
            </div>
            <input value={newClient.name || ""} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))}
              placeholder="Nom complet *" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
            <select value={newClient.offre || ""} onChange={e => setNewClient(p => ({ ...p, offre: e.target.value }))}
              className="w-full rounded-xl px-3 py-2.5 text-sm input-field appearance-none">
              <option value="">Offre souscrite *</option>
              {offres.filter(o => o.active).map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input value={newClient.contact || ""} onChange={e => setNewClient(p => ({ ...p, contact: e.target.value }))}
                placeholder="Téléphone" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
              <input type="number" value={newClient.age || ""} onChange={e => setNewClient(p => ({ ...p, age: Number(e.target.value) || undefined }))}
                placeholder="Âge" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
            </div>
            <input value={newClient.objectif || ""} onChange={e => setNewClient(p => ({ ...p, objectif: e.target.value }))}
              placeholder="Objectif" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
            <button onClick={addNewClient}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white btn-primary">✓ Ajouter le client</button>
          </div>
        </div>
      )}

      {/* ── ADD STRUCTURE MODAL ── */}
      {showAddStructure && tab === "structures" && (
        <div className="card-elevated rounded-2xl p-4 mb-4 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[14px] font-semibold text-foreground">Nouvelle structure</div>
            <button onClick={() => setShowAddStructure(false)} className="text-muted-foreground text-lg">×</button>
          </div>
          <div className="space-y-3">
            <input value={newStructure.name || ""} onChange={e => setNewStructure(p => ({ ...p, name: e.target.value }))}
              placeholder="Nom de la structure *" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
            <select value={newStructure.structureType || "entreprise"} onChange={e => setNewStructure(p => ({ ...p, structureType: e.target.value as StructureType }))}
              className="w-full rounded-xl px-3 py-2.5 text-sm input-field appearance-none">
              {STRUCTURE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input value={newStructure.contactName || ""} onChange={e => setNewStructure(p => ({ ...p, contactName: e.target.value }))}
                placeholder="Nom du contact" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
              <input value={newStructure.phone || ""} onChange={e => setNewStructure(p => ({ ...p, phone: e.target.value }))}
                placeholder="Téléphone" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={newStructure.email || ""} onChange={e => setNewStructure(p => ({ ...p, email: e.target.value }))}
                placeholder="Email" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
              <input value={newStructure.city || ""} onChange={e => setNewStructure(p => ({ ...p, city: e.target.value }))}
                placeholder="Ville" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={newStructure.peopleCount || 1} onChange={e => setNewStructure(p => ({ ...p, peopleCount: Number(e.target.value) || 1 }))}
                placeholder="Nb personnes" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
              <input type="number" value={newStructure.amount || ""} onChange={e => setNewStructure(p => ({ ...p, amount: Number(e.target.value) || 0 }))}
                placeholder="Montant €" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
            </div>
            <select value={newStructure.offre || ""} onChange={e => setNewStructure(p => ({ ...p, offre: e.target.value }))}
              className="w-full rounded-xl px-3 py-2.5 text-sm input-field appearance-none">
              <option value="">Offre</option>
              {offres.filter(o => o.active).map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
            </select>
            <select value={newStructure.frequency || "ponctuel"} onChange={e => setNewStructure(p => ({ ...p, frequency: e.target.value as StructureFrequency }))}
              className="w-full rounded-xl px-3 py-2.5 text-sm input-field appearance-none">
              {STRUCTURE_FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <textarea value={newStructure.notes || ""} onChange={e => setNewStructure(p => ({ ...p, notes: e.target.value }))}
              placeholder="Notes" className="w-full rounded-xl px-3 py-2.5 text-sm input-field resize-none" rows={2} />
            <button onClick={addStructure}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white btn-primary">✓ Ajouter la structure</button>
          </div>
        </div>
      )}

      {/* ── PARTICULIERS TAB ── */}
      {tab === "particuliers" && (
        <>
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

          <div className="space-y-2">
            {clients.map(c => {
              const m = getMetrics(c);
              const infoLabel = m.programmesCount > 0 ? m.programmesLabel : m.seancesLabel;
              return (
                <button key={c.id} onClick={() => setSelectedClient(c)}
                  className="w-full text-left card-elevated rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                    style={{ background: c.sex === "F" ? "hsl(330 60% 50% / 0.12)" : "hsl(210 60% 50% / 0.12)", color: c.sex === "F" ? "hsl(330 60% 60%)" : "hsl(210 60% 60%)" }}>
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-semibold text-foreground">{c.name}</span>
                      {c.groupType && (
                        <span className="badge-pill text-[8px] py-0.5 px-1.5" style={{ background: "hsl(270 50% 40% / 0.2)", color: "hsl(270 50% 65%)" }}>
                          {GROUP_LABELS[c.groupType]}{c.isGroupLeader ? " 👑" : ""}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.offre}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="value-lg text-[14px] text-success">{getClientTotal(c.name).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
                    <div className="text-[10px] text-muted-foreground">{infoLabel}</div>
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
        </>
      )}

      {/* ── STRUCTURES TAB ── */}
      {tab === "structures" && (
        <>
          <div className="space-y-2">
            {structures.filter(s => s.active).map(s => (
              <button key={s.id} onClick={() => setSelectedStructure(s)}
                className="w-full text-left card-elevated rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: "hsl(217 70% 58% / 0.12)", color: "hsl(217 70% 65%)" }}>
                  🏢
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-foreground">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate capitalize">
                    {s.structureType} · {s.city || "—"} · {s.peopleCount} pers.
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="value-lg text-[14px] text-success">{s.amount}€</div>
                  <div className="text-[10px] text-muted-foreground capitalize">{s.frequency}</div>
                </div>
                <span className="text-muted-foreground text-xs">›</span>
              </button>
            ))}
          </div>

          {structures.filter(s => s.active).length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-4xl mb-3">🏢</div>
              <div className="text-sm">Aucune structure pour l'instant</div>
            </div>
          )}

          {structures.filter(s => !s.active).length > 0 && (
            <div className="mt-6">
              <div className="section-label mb-3">Structures archivées</div>
              <div className="space-y-2 opacity-50">
                {structures.filter(s => !s.active).map(s => (
                  <div key={s.id} className="card-elevated rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-medium text-foreground">{s.name}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{s.structureType}</div>
                    </div>
                    <button onClick={() => setStructures(structures.map(st => st.id === s.id ? { ...st, active: true } : st))}
                      className="text-[10px] px-3 py-1.5 rounded-lg" style={{ background: "hsl(160 60% 45% / 0.15)", color: "hsl(160 60% 50%)" }}>
                      Réactiver
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
