import { useState, useMemo } from "react";
import { useApp } from "@/store/AppContext";
import { Prospect, SOURCES, OBJECTIFS, FinanceEntry, PAYMENT_MODES } from "@/data/types";

function getSourceBadgeClass(source: string) {
  if (source.includes("FITNESS")) return "badge-source-fp";
  if (source.includes("INSTAGRAM")) return "badge-source-ig";
  if (source.includes("BOUCHE")) return "badge-source-bao";
  if (source.includes("COURS")) return "badge-source-cc";
  return "badge-source-default";
}

function getSourceIcon(source: string) {
  if (source.includes("FITNESS")) return "🏋";
  if (source.includes("INSTAGRAM")) return "📸";
  if (source.includes("BOUCHE")) return "🗣";
  if (source.includes("COURS")) return "🏃";
  return "📌";
}

function parseDate(d: string): Date | null {
  if (!d) return null;
  const parts = d.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
}

function getMonth(d: string): string {
  const date = parseDate(d);
  if (!date) return "";
  return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

export default function ProspectsPage() {
  const { prospects, setProspects, offres, financeEntries, setFinanceEntries } = useApp();
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterClosing, setFilterClosing] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Prospect>>({});
  const [editPaymentMode, setEditPaymentMode] = useState("cb");
  const [editInstallments, setEditInstallments] = useState(1);
  const [newProspect, setNewProspect] = useState<Partial<Prospect>>({ sex: "F", source: "FITNESS PARK", statut: "CONTACT", objectif: "FATLOSS" });
  const activeOffres = offres.filter(o => o.active).map(o => o.name);

  const months = useMemo(() => {
    const m = new Set<string>();
    prospects.forEach(p => { const mo = getMonth(p.date); if (mo) m.add(mo); });
    return Array.from(m).sort((a, b) => {
      const da = new Date("01 " + a);
      const db = new Date("01 " + b);
      return db.getTime() - da.getTime();
    });
  }, [prospects]);

  const filtered = useMemo(() => {
    return prospects.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterMonth !== "all" && getMonth(p.date) !== filterMonth) return false;
      if (filterClosing === "oui" && p.closing !== "OUI") return false;
      if (filterClosing === "non" && p.closing !== "NON") return false;
      return true;
    });
  }, [prospects, search, filterMonth, filterClosing]);

  // KPIs
  const totalRdv = prospects.filter(p => p.statut === "RDV").length;
  const totalBilans = prospects.filter(p => p.presence === "OUI").length;
  const totalClosings = prospects.filter(p => p.closing === "OUI").length;
  const tauxClosing = totalBilans > 0 ? Math.round((totalClosings / totalBilans) * 100) : 0;

  // CA widget
  const caTotal = prospects.reduce((sum, p) => sum + (p.prixReel || 0), 0);

  const selected = selectedId ? prospects.find(p => p.id === selectedId) : null;

  const addProspect = () => {
    if (!newProspect.name) return;
    const p: Prospect = {
      id: "p" + Date.now(),
      sex: (newProspect.sex || "F") as "F" | "H",
      name: newProspect.name || "",
      contact: newProspect.contact || "",
      source: newProspect.source || "FITNESS PARK",
      statut: newProspect.statut || "CONTACT",
      date: newProspect.date || "",
      type: newProspect.type || "PHYSIQUE",
      presence: "",
      heure: newProspect.heure || "",
      objectif: newProspect.objectif || "",
      objection: "",
      closing: "NON",
      offre: "-",
      notes: newProspect.notes || "",
      profile: "",
      prixReel: 0,
      noteBilan: 0,
      noteProfil: 0,
      bilanValidated: false,
    };
    setProspects([p, ...prospects]);
    setShowAdd(false);
    setNewProspect({ sex: "F", source: "FITNESS PARK", statut: "CONTACT", objectif: "FATLOSS" });
  };

  return (
    <div className="px-3.5">
      {/* Header */}
      <h1 className="font-display text-[25px] font-extrabold text-foreground mb-0.5 pt-1">Prospects</h1>
      <p className="text-xs text-muted-foreground mb-3.5">Pipeline & CRM</p>

      {/* CA Widget */}
      <div className="rounded-2xl p-4 mb-3.5"
        style={{ background: "linear-gradient(135deg, hsl(348 63% 30% / 0.18), hsl(348 63% 30% / 0.08))", border: "1px solid hsl(348 63% 30% / 0.3)" }}>
        <div className="text-[10px] uppercase tracking-[2px] text-bordeaux-2 mb-1">CHIFFRE D'AFFAIRES</div>
        <div className="font-display text-4xl font-extrabold text-foreground leading-none">{caTotal}€</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">Total encaissé</div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[{ v: totalRdv, l: "RDV" }, { v: totalBilans, l: "BILANS" }, { v: totalClosings, l: "CLOSINGS" }].map(k => (
            <div key={k.l} className="rounded-xl p-2 text-center" style={{ background: "hsl(0 0% 100% / 0.04)" }}>
              <div className="text-lg font-bold text-foreground">{k.v}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{k.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 mb-3.5">
        <div className="glass-card rounded-xl p-3 relative overflow-hidden">
          <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">TAUX CLOSING</div>
          <div className="font-sans text-[29px] font-bold leading-none text-bordeaux-2">{tauxClosing}%</div>
        </div>
        <div className="glass-card rounded-xl p-3 relative overflow-hidden">
          <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">PROSPECTS</div>
          <div className="font-sans text-[29px] font-bold leading-none text-foreground">{prospects.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2.5 scrollbar-none">
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="flex-shrink-0 py-1.5 px-3 rounded-full text-xs font-sans cursor-pointer outline-none"
          style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
          <option value="all">Tous les mois</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {["all", "oui", "non"].map(f => (
          <button key={f} onClick={() => setFilterClosing(f)}
            className={`flex-shrink-0 py-1.5 px-3 rounded-full text-xs font-sans transition-all
              ${filterClosing === f ? "bg-bordeaux/20 border-bordeaux-2 text-foreground" : "text-muted-foreground"}`}
            style={{ background: filterClosing === f ? undefined : "hsl(var(--glass))", border: `1px solid ${filterClosing === f ? "hsl(var(--bordeaux2))" : "hsl(var(--glass-border))"}` }}>
            {f === "all" ? "Tous" : f === "oui" ? "✓ Closés" : "✗ Non closés"}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-2.5">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un prospect..."
          className="w-full rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none transition-colors"
          style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))", backdropFilter: "blur(10px)" }} />
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {filtered.map(p => (
          <div key={p.id} onClick={() => setSelectedId(p.id)}
            className={`glass-card rounded-xl p-3 cursor-pointer transition-transform active:scale-[0.984] relative overflow-hidden
              ${p.closing === "OUI" ? "border-l-[3px] !border-l-success" : p.objection === "REFLEXION" ? "border-l-[3px] !border-l-warning" : p.closing === "NON" && p.presence === "OUI" ? "border-l-[3px] !border-l-bordeaux-2" : ""}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-semibold text-[15px] text-foreground">{p.name}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{p.contact}</div>
              </div>
              <span className={`text-[10px] font-bold ${p.sex === "F" ? "text-pink-300" : "text-blue-300"}`}>
                {p.sex === "F" ? "♀" : "♂"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${getSourceBadgeClass(p.source)}`}>
                {getSourceIcon(p.source)} {p.source.length > 12 ? p.source.substring(0, 12) : p.source}
              </span>
              {p.closing === "OUI" && <span className="badge-closed inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold">✓ CLOSÉ</span>}
              {p.presence === "OUI" && p.closing !== "OUI" && <span className="badge-present inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold">PRÉSENT</span>}
              {p.presence === "NON" && <span className="badge-absent inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold">ABSENT</span>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{p.date} {p.heure}</span>
              <span className="text-[11px] text-beige-2 max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                {p.offre && p.offre !== "-" ? p.offre : ""}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-4xl mb-2.5">👤</div>
            <div className="text-sm">Aucun prospect trouvé</div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setShowAdd(true)}
        className="fixed bottom-5 right-4 z-[60] w-[52px] h-[52px] rounded-full flex items-center justify-center text-2xl text-foreground active:scale-90 transition-transform"
        style={{
          background: "linear-gradient(135deg, hsl(var(--bordeaux2)), hsl(var(--bordeaux)))",
          border: "none",
          boxShadow: "0 8px 22px hsl(348 63% 30% / 0.5)",
        }}>
        +
      </button>

      {/* Detail Sheet */}
      {selected && (
        <div className="fixed inset-0 z-[200] flex items-end" onClick={() => { setSelectedId(null); setEditMode(false); }}
          style={{ background: "rgba(5,3,3,0.76)" }}>
          <div className="w-full max-h-[92dvh] rounded-t-[22px] overflow-y-auto pb-6"
            onClick={e => e.stopPropagation()}
            style={{
              background: "linear-gradient(180deg, hsl(var(--surface2)) 0%, hsl(var(--surface1)) 100%)",
              borderTop: "1px solid hsl(var(--glass-border))",
              boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
            }}>
            <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-0" style={{ background: "hsl(var(--glass-border))" }} />
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <h2 className="font-display text-xl font-bold text-foreground">{selected.name}</h2>
              <div className="flex gap-1.5">
                {!editMode && (
                  <button onClick={() => { setEditMode(true); setEditData({ ...selected }); }}
                    className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm"
                    style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--beige2))" }}>✎</button>
                )}
                <button onClick={() => { setSelectedId(null); setEditMode(false); }} className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm text-muted-foreground"
                  style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))" }}>✕</button>
              </div>
            </div>

            {editMode ? (
              <div className="px-4 pt-2 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Sexe</label>
                    <select value={editData.sex || "F"} onChange={e => setEditData(p => ({ ...p, sex: e.target.value as "F" | "H" }))}
                      className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                      <option value="F">Femme</option>
                      <option value="H">Homme</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Source</label>
                    <select value={editData.source} onChange={e => setEditData(p => ({ ...p, source: e.target.value }))}
                      className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                      {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Nom</label>
                  <input value={editData.name || ""} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Téléphone</label>
                  <input value={editData.contact || ""} onChange={e => setEditData(p => ({ ...p, contact: e.target.value }))}
                    className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Date RDV</label>
                    <input value={editData.date || ""} onChange={e => setEditData(p => ({ ...p, date: e.target.value }))}
                      className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Heure</label>
                    <input value={editData.heure || ""} onChange={e => setEditData(p => ({ ...p, heure: e.target.value }))}
                      className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Statut</label>
                    <select value={editData.statut} onChange={e => setEditData(p => ({ ...p, statut: e.target.value }))}
                      className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                      <option value="CONTACT">Contact</option>
                      <option value="RDV">RDV</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Type</label>
                    <select value={editData.type} onChange={e => setEditData(p => ({ ...p, type: e.target.value }))}
                      className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                      <option value="PHYSIQUE">Physique</option>
                      <option value="VISIO">Visio</option>
                      <option value="APPEL">Appel</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Présence</label>
                    <select value={editData.presence} onChange={e => setEditData(p => ({ ...p, presence: e.target.value }))}
                      className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                      <option value="">—</option>
                      <option value="OUI">Oui</option>
                      <option value="NON">Non</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Objectif</label>
                    <select value={editData.objectif} onChange={e => setEditData(p => ({ ...p, objectif: e.target.value }))}
                      className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                      <option value="">—</option>
                      {OBJECTIFS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Objection</label>
                    <select value={editData.objection} onChange={e => setEditData(p => ({ ...p, objection: e.target.value }))}
                      className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                      <option value="">—</option>
                      <option value="AUCUNE">Aucune</option>
                      <option value="BUDGET">Budget</option>
                      <option value="REFLEXION">Réflexion</option>
                      <option value="TEMPS">Temps</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Closing</label>
                    <select value={editData.closing} onChange={e => setEditData(p => ({ ...p, closing: e.target.value }))}
                      className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                      <option value="NON">Non</option>
                      <option value="OUI">Oui</option>
                      <option value="R">R</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Offre</label>
                  <select value={editData.offre} onChange={e => setEditData(p => ({ ...p, offre: e.target.value }))}
                    className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                    <option value="-">—</option>
                    {activeOffres.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Prix réel €</label>
                  <input type="number" value={editData.prixReel || ""} onChange={e => setEditData(p => ({ ...p, prixReel: Number(e.target.value) }))}
                    className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Notes</label>
                  <textarea value={editData.notes || ""} onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))}
                    className="w-full rounded-xl p-2.5 text-sm outline-none resize-none min-h-[80px]" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {
                    setProspects(prospects.map(p => p.id === selected.id ? { ...p, ...editData } as Prospect : p));
                    setEditMode(false);
                  }} className="flex-1 py-3 rounded-xl font-semibold text-sm text-foreground"
                    style={{ background: "linear-gradient(135deg, hsl(var(--bordeaux2)), hsl(var(--bordeaux)))" }}>
                    Sauvegarder
                  </button>
                  <button onClick={() => setEditMode(false)} className="px-5 py-3 rounded-xl text-sm text-muted-foreground"
                    style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
                    Annuler
                  </button>
                </div>
                <button onClick={() => {
                  if (confirm("Supprimer ce prospect ?")) {
                    setProspects(prospects.filter(p => p.id !== selected.id));
                    setSelectedId(null);
                    setEditMode(false);
                  }
                }} className="w-full py-2.5 rounded-xl text-sm text-destructive font-medium"
                  style={{ background: "hsl(0 50% 43% / 0.08)", border: "1px solid hsl(0 50% 43% / 0.2)" }}>
                  🗑 Supprimer le prospect
                </button>
              </div>
            ) : (
              <>
                <div className="px-4 pb-2">
                  <div className="flex gap-1.5 flex-wrap mb-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${getSourceBadgeClass(selected.source)}`}>
                      {getSourceIcon(selected.source)} {selected.source}
                    </span>
                    {selected.presence === "OUI" && <span className="badge-present inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold">PRÉSENT</span>}
                    {selected.closing === "OUI" && <span className="badge-closed inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold">✓ CLOSÉ</span>}
                  </div>
                  {selected.contact && selected.contact !== "-" && (
                    <a href={`tel:${selected.contact.replace(/-/g, "")}`} className="text-[15px] font-semibold text-beige-2 flex items-center gap-1.5">
                      {selected.contact} 📞
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 px-3.5 pb-2.5">
                  <div className="rounded-xl p-2.5" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
                    <div className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-0.5">DATE & HEURE</div>
                    <div className="text-sm font-medium text-foreground">{selected.date} {selected.heure}</div>
                  </div>
                  <div className="rounded-xl p-2.5" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
                    <div className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-0.5">TYPE</div>
                    <div className="text-sm font-medium text-foreground">
                      {selected.type === "VISIO" ? "🖥 Visio" : selected.type === "APPEL" ? "📞 Appel" : "🤝 Physique"}
                    </div>
                  </div>
                  {selected.objectif && (
                    <div className="rounded-xl p-2.5" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
                      <div className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-0.5">OBJECTIF</div>
                      <div className="inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold text-foreground"
                        style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))" }}>
                        {selected.objectif}
                      </div>
                    </div>
                  )}
                  {selected.offre && selected.offre !== "-" && (
                    <div className="col-span-2 rounded-xl p-2.5" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
                      <div className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-0.5">OFFRE</div>
                      <div className="font-display text-sm text-bordeaux-2 font-bold">{selected.offre}</div>
                    </div>
                  )}
                </div>

                <div className="mx-3.5 mb-3 rounded-xl p-3"
                  style={{ background: "hsl(348 63% 30% / 0.07)", border: "1px solid hsl(348 63% 30% / 0.2)" }}>
                  <div className="text-[9px] uppercase tracking-[2px] text-bordeaux-2 font-bold mb-2">
                    {selected.bilanValidated ? "✓ BILAN VALIDÉ" : "BILAN"}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="rounded-lg p-2" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">PRÉSENCE</div>
                      <div className="text-sm text-foreground">{selected.presence === "OUI" ? "✓ PRÉSENT" : selected.presence === "NON" ? "✗ ABSENT" : "—"}</div>
                    </div>
                    <div className="rounded-lg p-2" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">CLOSING</div>
                      <div className={`text-sm ${selected.closing === "OUI" ? "text-success" : "text-muted-foreground"}`}>
                        {selected.closing === "OUI" ? "✓ CLOSÉ" : selected.closing}
                      </div>
                    </div>
                    <div className="rounded-lg p-2" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">OBJECTION</div>
                      <div className={`text-sm ${selected.objection === "AUCUNE" ? "text-success" : selected.objection === "BUDGET" ? "text-destructive" : "text-warning"}`}>
                        {selected.objection === "AUCUNE" ? "✓ Aucune" : selected.objection || "—"}
                      </div>
                    </div>
                    <div className="rounded-lg p-2" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">OFFRE</div>
                      <div className="text-sm text-bordeaux-2 font-medium">{selected.offre && selected.offre !== "-" ? selected.offre : "—"}</div>
                    </div>
                  </div>
                </div>

                {selected.notes && (
                  <div className="mx-3.5 mb-3 rounded-xl p-3" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
                    <div className="text-[9px] uppercase tracking-[2px] text-muted-foreground mb-1">NOTES</div>
                    <div className="text-sm text-foreground italic">{selected.notes}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Prospect Sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-[200] flex items-end" onClick={() => setShowAdd(false)}
          style={{ background: "rgba(5,3,3,0.76)" }}>
          <div className="w-full max-h-[92dvh] rounded-t-[22px] overflow-y-auto pb-6"
            onClick={e => e.stopPropagation()}
            style={{
              background: "linear-gradient(180deg, hsl(var(--surface2)) 0%, hsl(var(--surface1)) 100%)",
              borderTop: "1px solid hsl(var(--glass-border))",
            }}>
            <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ background: "hsl(var(--glass-border))" }} />
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <h2 className="font-display text-xl font-bold text-foreground">Nouveau Prospect</h2>
              <button onClick={() => setShowAdd(false)} className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm text-muted-foreground"
                style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))" }}>✕</button>
            </div>
            <div className="px-4 pt-2 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Sexe</label>
                  <select value={newProspect.sex || "F"} onChange={e => setNewProspect(p => ({ ...p, sex: e.target.value as "F" | "H" }))}
                    className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                    <option value="F">Femme</option>
                    <option value="H">Homme</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Source</label>
                  <select value={newProspect.source || "FITNESS PARK"} onChange={e => setNewProspect(p => ({ ...p, source: e.target.value }))}
                    className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Nom *</label>
                <input value={newProspect.name || ""} onChange={e => setNewProspect(p => ({ ...p, name: e.target.value }))} placeholder="Nom complet"
                  className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Téléphone</label>
                <input value={newProspect.contact || ""} onChange={e => setNewProspect(p => ({ ...p, contact: e.target.value }))} placeholder="06-XX-XX-XX-XX"
                  className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Date RDV</label>
                  <input value={newProspect.date || ""} onChange={e => setNewProspect(p => ({ ...p, date: e.target.value }))} placeholder="JJ/MM/AA"
                    className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Heure</label>
                  <input value={newProspect.heure || ""} onChange={e => setNewProspect(p => ({ ...p, heure: e.target.value }))} placeholder="14h"
                    className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                </div>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Notes</label>
                <textarea value={newProspect.notes || ""} onChange={e => setNewProspect(p => ({ ...p, notes: e.target.value }))} placeholder="Notes..."
                  className="w-full rounded-xl p-2.5 text-sm outline-none resize-none min-h-[80px]" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
              </div>
              <button onClick={addProspect}
                className="w-full py-3.5 rounded-xl font-semibold text-[15px] text-foreground mt-1"
                style={{ background: "linear-gradient(135deg, hsl(var(--bordeaux2)), hsl(var(--bordeaux)))" }}>
                Ajouter le prospect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
