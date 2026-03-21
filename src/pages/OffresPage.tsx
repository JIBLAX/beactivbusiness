import { useState } from "react";
import { useApp } from "@/store/AppContext";
import { Offre, OffreDuration, OffreTheme, OFFRE_THEMES } from "@/data/types";

const DURATION_UNITS = [
  { value: "jours", label: "Jours" },
  { value: "semaines", label: "Semaines" },
  { value: "mois", label: "Mois" },
] as const;

function formatDuration(d?: OffreDuration): string {
  if (!d) return "À la carte";
  const unitLabel = d.unit === "jours" ? "j" : d.unit === "semaines" ? "sem" : "mois";
  return `${d.value} ${unitLabel}`;
}

const THEME_ICONS: Record<string, string> = {
  "COURS COLLECTIFS": "🏃",
  "JM COACHING": "💪",
  "PROGRAMMES": "📋",
};

export default function OffresPage() {
  const { offres, setOffres, prospects, setProspects, activResetClients, setActivResetClients, financeEntries, setFinanceEntries } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editName, setEditName] = useState("");
  const [editDuration, setEditDuration] = useState<OffreDuration | undefined>();
  const [editIsAlaCarte, setEditIsAlaCarte] = useState(false);
  const [editUnitPrice, setEditUnitPrice] = useState<number | undefined>();
  const [editMinQty, setEditMinQty] = useState<number | undefined>();
  const [editTheme, setEditTheme] = useState<OffreTheme>("PROGRAMMES");
  const [editTva, setEditTva] = useState(false);
  const [editPortage, setEditPortage] = useState(false);
  const [editMaxInstallments, setEditMaxInstallments] = useState<number | undefined>();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState(0);
  const [newDuration, setNewDuration] = useState<OffreDuration>({ value: 1, unit: "mois" });
  const [newIsAlaCarte, setNewIsAlaCarte] = useState(false);
  const [newUnitPrice, setNewUnitPrice] = useState<number | undefined>();
  const [newMinQty, setNewMinQty] = useState<number | undefined>();
  const [newTheme, setNewTheme] = useState<OffreTheme>("PROGRAMMES");
  const [newTva, setNewTva] = useState(false);
  const [newPortage, setNewPortage] = useState(false);
  const [newMaxInstallments, setNewMaxInstallments] = useState<number | undefined>();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const startEdit = (o: Offre) => {
    setEditingId(o.id); setEditPrice(o.price); setEditName(o.name);
    setEditDuration(o.duration); setEditIsAlaCarte(o.isAlaCarte || false);
    setEditUnitPrice(o.unitPrice); setEditMinQty(o.minQuantity);
    setEditTheme(o.theme || "PROGRAMMES"); setEditTva(o.tvaEnabled || false);
    setEditPortage(o.portageEligible || false); setEditMaxInstallments(o.maxInstallments);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const today = new Date().toISOString().split("T")[0];
    const oldOffre = offres.find(o => o.id === editingId);
    if (!oldOffre) return;
    const oldName = oldOffre.name;
    const newOffreName = editName || oldOffre.name;
    const nameChanged = oldName !== newOffreName;

    setOffres(offres.map(o => {
      if (o.id !== editingId) return o;
      const priceChanged = o.price !== editPrice;
      return {
        ...o, name: newOffreName, price: editPrice,
        duration: editIsAlaCarte ? undefined : editDuration,
        isAlaCarte: editIsAlaCarte, unitPrice: editUnitPrice, minQuantity: editMinQty,
        theme: editTheme, tvaEnabled: editTva, portageEligible: editPortage,
        maxInstallments: editMaxInstallments,
        priceHistory: priceChanged ? [...o.priceHistory, { price: editPrice, date: today }] : o.priceHistory,
      };
    }));

    if (nameChanged) {
      setProspects(prospects.map(p => p.offre === oldName ? { ...p, offre: newOffreName } : p));
      setActivResetClients(prev => prev.map(c => c.offre === oldName ? { ...c, offre: newOffreName } : c));
      setFinanceEntries(financeEntries.map(e =>
        e.offre === oldName ? { ...e, offre: newOffreName, label: e.label === oldName ? newOffreName : e.label.replace(oldName, newOffreName) } : e
      ));
    }
    setEditingId(null);
  };

  const toggleActive = (id: string) => setOffres(offres.map(o => o.id === id ? { ...o, active: !o.active } : o));
  const deleteOffre = (id: string) => { setOffres(offres.filter(o => o.id !== id)); setConfirmDeleteId(null); };

  const addOffre = () => {
    if (!newName) return;
    const today = new Date().toISOString().split("T")[0];
    const offre: Offre = {
      id: "o" + Date.now(), name: newName.toUpperCase(), price: newPrice, active: true,
      priceHistory: [{ price: newPrice, date: today }],
      duration: newIsAlaCarte ? undefined : newDuration,
      isAlaCarte: newIsAlaCarte, unitPrice: newUnitPrice, minQuantity: newMinQty,
      theme: newTheme, tvaEnabled: newTva, portageEligible: newPortage,
      maxInstallments: newMaxInstallments,
    };
    setOffres([...offres, offre]);
    setShowAdd(false);
    setNewName(""); setNewPrice(0); setNewDuration({ value: 1, unit: "mois" });
    setNewIsAlaCarte(false); setNewUnitPrice(undefined); setNewMinQty(undefined);
    setNewTheme("PROGRAMMES"); setNewTva(false); setNewPortage(false); setNewMaxInstallments(undefined);
  };

  const activeCount = offres.filter(o => o.active).length;

  const ToggleSwitch = ({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
    <button onClick={onChange} disabled={disabled}
      className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${disabled ? "opacity-40" : ""}`}
      style={{ background: checked ? "hsl(152 55% 42%)" : "hsl(0 0% 15%)" }}>
      <div className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all shadow-sm
        ${checked ? "left-[22px]" : "left-[3px]"}`} />
    </button>
  );

  const renderOffreCard = (o: Offre) => (
    <div key={o.id} className={`card-elevated rounded-2xl p-4 transition-all ${!o.active ? "opacity-35" : ""}`}>
      {editingId === o.id ? (
        <div className="space-y-3">
          <input value={editName} onChange={e => setEditName(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold input-field" />
          <div className="flex gap-2 items-center">
            <input type="number" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm input-field" />
            <span className="text-sm text-muted-foreground">€</span>
          </div>
          <div>
            <label className="section-label mb-1 block">Thème</label>
            <select value={editTheme} onChange={e => setEditTheme(e.target.value as OffreTheme)}
              className="w-full rounded-xl px-3 py-2.5 text-sm input-field">
              {OFFRE_THEMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">À la carte</span>
            <ToggleSwitch checked={editIsAlaCarte} onChange={() => setEditIsAlaCarte(!editIsAlaCarte)} />
          </div>
          {!editIsAlaCarte && (
            <div className="flex gap-2">
              <input type="number" value={editDuration?.value || ""} onChange={e => setEditDuration({ value: Number(e.target.value), unit: editDuration?.unit || "mois" })}
                placeholder="Durée" className="flex-1 rounded-xl px-3 py-2.5 text-sm input-field" />
              <select value={editDuration?.unit || "mois"} onChange={e => setEditDuration({ value: editDuration?.value || 1, unit: e.target.value as any })}
                className="rounded-xl px-3 py-2.5 text-sm input-field">
                {DURATION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="section-label mb-1 block">Prix unitaire €</label>
              <input type="number" value={editUnitPrice || ""} onChange={e => setEditUnitPrice(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="—" className="w-full rounded-xl px-3 py-2 text-sm input-field" />
            </div>
            <div>
              <label className="section-label mb-1 block">Min. séances</label>
              <input type="number" value={editMinQty || ""} onChange={e => setEditMinQty(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="—" className="w-full rounded-xl px-3 py-2 text-sm input-field" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">TVA 20%</span>
            <ToggleSwitch checked={editTva} onChange={() => setEditTva(!editTva)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">Éligible Portage JUMP</span>
            <ToggleSwitch checked={editPortage} onChange={() => setEditPortage(!editPortage)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">Paiement en plusieurs fois</span>
            <ToggleSwitch checked={!!editMaxInstallments && editMaxInstallments > 1} onChange={() => setEditMaxInstallments(editMaxInstallments && editMaxInstallments > 1 ? undefined : 3)} />
          </div>
          {editMaxInstallments && editMaxInstallments > 1 && (
            <div>
              <label className="section-label mb-1 block">Nombre de fois max</label>
              <input type="number" value={editMaxInstallments} onChange={e => setEditMaxInstallments(Number(e.target.value) || undefined)}
                min={2} max={12} className="w-full rounded-xl px-3 py-2 text-sm input-field" />
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={saveEdit} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white btn-primary">✓ Sauvegarder</button>
            <button onClick={() => setEditingId(null)} className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground input-field">✕</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 pr-3">
              <div className="text-[14px] font-semibold text-foreground leading-tight">{o.name}</div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {o.duration ? (
                  <span className="badge-pill text-[10px]" style={{ background: "hsl(0 0% 100% / 0.04)", color: "hsl(0 0% 70%)" }}>
                    📅 {formatDuration(o.duration)}
                  </span>
                ) : o.isAlaCarte ? (
                  <span className="badge-pill text-[10px]" style={{ background: "hsl(0 0% 100% / 0.04)", color: "hsl(0 0% 50%)" }}>⚡ À la carte</span>
                ) : null}
                {o.unitPrice && <span className="text-[10px] text-muted-foreground">{o.unitPrice}€/séance</span>}
                {o.minQuantity && <span className="text-[10px] text-muted-foreground">min. {o.minQuantity}</span>}
                {o.tvaEnabled && <span className="badge-pill text-[9px]" style={{ background: "hsl(38 92% 55% / 0.1)", color: "hsl(38 92% 55%)" }}>TVA</span>}
                {o.portageEligible && <span className="badge-pill text-[9px]" style={{ background: "hsl(217 70% 60% / 0.1)", color: "hsl(217 70% 60%)" }}>PORTAGE</span>}
                {o.maxInstallments && o.maxInstallments > 1 && <span className="badge-pill text-[9px]" style={{ background: "hsl(280 60% 55% / 0.1)", color: "hsl(280 60% 55%)" }}>Jusqu'à {o.maxInstallments}×</span>}
              </div>
            </div>
            <div className="value-lg text-[18px]" style={{ color: "hsl(348 63% 45%)" }}>{o.price}€</div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.04)" }}>
            <div className="flex items-center gap-3">
              <ToggleSwitch checked={o.active} onChange={() => toggleActive(o.id)} />
              <span className={`text-[11px] font-medium ${o.active ? "text-success" : "text-muted-foreground"}`}>
                {o.active ? "Active" : "Désactivée"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => startEdit(o)} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Modifier</button>
              {confirmDeleteId === o.id ? (
                <div className="flex gap-1 items-center">
                  <button onClick={() => deleteOffre(o.id)} className="badge-pill text-[10px] cursor-pointer" style={{ background: "hsl(0 62% 50% / 0.1)", color: "hsl(0 62% 55%)" }}>Confirmer</button>
                  <button onClick={() => setConfirmDeleteId(null)} className="text-[10px] text-muted-foreground">✕</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteId(o.id)} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">🗑</button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] font-bold text-foreground">Offres</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Catalogue & tarifs</p>
        </div>
        <div className="stat-card rounded-xl px-3 py-2 text-center">
          <div className="value-lg text-[18px] text-foreground">{activeCount}<span className="text-sm text-muted-foreground font-normal">/{offres.length}</span></div>
          <div className="text-[8px] text-muted-foreground uppercase tracking-wider">actives</div>
        </div>
      </div>

      {OFFRE_THEMES.map(theme => {
        const themeOffers = offres.filter(o => (o.theme || "PROGRAMMES") === theme);
        if (themeOffers.length === 0) return null;
        return (
          <div key={theme} className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">{THEME_ICONS[theme]}</span>
              <div className="section-label flex-1" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.05)", paddingBottom: "6px" }}>{theme}</div>
            </div>
            <div className="space-y-2">
              {themeOffers.map(renderOffreCard)}
            </div>
          </div>
        );
      })}

      {/* FAB */}
      <button onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-5 z-[60] w-14 h-14 rounded-2xl flex items-center justify-center text-2xl text-white btn-primary active:scale-90 transition-transform"
        style={{ boxShadow: "0 8px 24px hsl(348 63% 30% / 0.4)" }}>
        +
      </button>

      {/* Add Sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-[200] flex items-end" onClick={() => setShowAdd(false)}
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-h-[85dvh] rounded-t-3xl overflow-y-auto pb-8 animate-fade-up" onClick={e => e.stopPropagation()}
            style={{ background: "hsl(0 0% 6%)", borderTop: "1px solid hsl(0 0% 100% / 0.08)" }}>
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: "hsl(0 0% 20%)" }} />
            <div className="flex items-center justify-between px-5 pt-3 pb-3">
              <h2 className="font-display text-[17px] font-bold text-foreground">Nouvelle offre</h2>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-sm text-muted-foreground"
                style={{ background: "hsl(0 0% 100% / 0.05)" }}>✕</button>
            </div>
            <div className="px-5 space-y-4">
              <div>
                <label className="section-label mb-2 block">Nom *</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: ACTIV PROGRAM PREMIUM"
                  className="w-full rounded-xl px-3 py-3 text-sm input-field" />
              </div>
              <div>
                <label className="section-label mb-2 block">Prix €</label>
                <input type="number" value={newPrice || ""} onChange={e => setNewPrice(Number(e.target.value))} placeholder="0"
                  className="w-full rounded-xl px-3 py-3 text-sm input-field" />
              </div>
              <div>
                <label className="section-label mb-2 block">Thème</label>
                <select value={newTheme} onChange={e => setNewTheme(e.target.value as OffreTheme)}
                  className="w-full rounded-xl px-3 py-3 text-sm input-field">
                  {OFFRE_THEMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[12px] text-muted-foreground">À la carte</span>
                <ToggleSwitch checked={newIsAlaCarte} onChange={() => setNewIsAlaCarte(!newIsAlaCarte)} />
              </div>
              {!newIsAlaCarte && (
                <div>
                  <label className="section-label mb-2 block">Durée</label>
                  <div className="flex gap-2">
                    <input type="number" value={newDuration.value || ""} onChange={e => setNewDuration({ ...newDuration, value: Number(e.target.value) })}
                      placeholder="1" className="flex-1 rounded-xl px-3 py-3 text-sm input-field" />
                    <select value={newDuration.unit} onChange={e => setNewDuration({ ...newDuration, unit: e.target.value as any })}
                      className="rounded-xl px-3 py-3 text-sm input-field">
                      {DURATION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label mb-2 block">Prix unitaire €</label>
                  <input type="number" value={newUnitPrice || ""} onChange={e => setNewUnitPrice(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="—" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
                </div>
                <div>
                  <label className="section-label mb-2 block">Min. séances</label>
                  <input type="number" value={newMinQty || ""} onChange={e => setNewMinQty(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="—" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[12px] text-muted-foreground">TVA 20%</span>
                <ToggleSwitch checked={newTva} onChange={() => setNewTva(!newTva)} />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[12px] text-muted-foreground">Éligible Portage JUMP</span>
                <ToggleSwitch checked={newPortage} onChange={() => setNewPortage(!newPortage)} />
              </div>
              <button onClick={addOffre} className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white btn-primary mt-2">
                Créer l'offre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
