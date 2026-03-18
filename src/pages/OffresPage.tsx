import { useState } from "react";
import { useApp } from "@/store/AppContext";
import { Offre, OffreDuration } from "@/data/types";
import { Switch } from "@/components/ui/switch";

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

export default function OffresPage() {
  const { offres, setOffres, prospects, setProspects, activResetClients, setActivResetClients, financeEntries, setFinanceEntries } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editName, setEditName] = useState("");
  const [editDuration, setEditDuration] = useState<OffreDuration | undefined>();
  const [editIsAlaCarte, setEditIsAlaCarte] = useState(false);
  const [editUnitPrice, setEditUnitPrice] = useState<number | undefined>();
  const [editMinQty, setEditMinQty] = useState<number | undefined>();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState(0);
  const [newDuration, setNewDuration] = useState<OffreDuration>({ value: 1, unit: "mois" });
  const [newIsAlaCarte, setNewIsAlaCarte] = useState(false);
  const [newUnitPrice, setNewUnitPrice] = useState<number | undefined>();
  const [newMinQty, setNewMinQty] = useState<number | undefined>();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const startEdit = (o: Offre) => {
    setEditingId(o.id);
    setEditPrice(o.price);
    setEditName(o.name);
    setEditDuration(o.duration);
    setEditIsAlaCarte(o.isAlaCarte || false);
    setEditUnitPrice(o.unitPrice);
    setEditMinQty(o.minQuantity);
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
        ...o,
        name: newOffreName,
        price: editPrice,
        duration: editIsAlaCarte ? undefined : editDuration,
        isAlaCarte: editIsAlaCarte,
        unitPrice: editUnitPrice,
        minQuantity: editMinQty,
        priceHistory: priceChanged
          ? [...o.priceHistory, { price: editPrice, date: today }]
          : o.priceHistory,
      };
    }));

    if (nameChanged) {
      setProspects(prospects.map(p =>
        p.offre === oldName ? { ...p, offre: newOffreName } : p
      ));
      setActivResetClients(prev =>
        prev.map(c => c.offre === oldName ? { ...c, offre: newOffreName } : c)
      );
      setFinanceEntries(financeEntries.map(e =>
        e.offre === oldName ? { ...e, offre: newOffreName, label: e.label === oldName ? newOffreName : e.label.replace(oldName, newOffreName) } : e
      ));
    }

    setEditingId(null);
  };

  const toggleActive = (id: string) => {
    setOffres(offres.map(o => o.id === id ? { ...o, active: !o.active } : o));
  };

  const deleteOffre = (id: string) => {
    setOffres(offres.filter(o => o.id !== id));
    setConfirmDeleteId(null);
  };

  const addOffre = () => {
    if (!newName) return;
    const today = new Date().toISOString().split("T")[0];
    const offre: Offre = {
      id: "o" + Date.now(),
      name: newName.toUpperCase(),
      price: newPrice,
      active: true,
      priceHistory: [{ price: newPrice, date: today }],
      duration: newIsAlaCarte ? undefined : newDuration,
      isAlaCarte: newIsAlaCarte,
      unitPrice: newUnitPrice,
      minQuantity: newMinQty,
    };
    setOffres([...offres, offre]);
    setShowAdd(false);
    setNewName("");
    setNewPrice(0);
    setNewDuration({ value: 1, unit: "mois" });
    setNewIsAlaCarte(false);
    setNewUnitPrice(undefined);
    setNewMinQty(undefined);
  };

  const activeCount = offres.filter(o => o.active).length;
  const alaCarteOffres = offres.filter(o => o.isAlaCarte);
  const programOffres = offres.filter(o => !o.isAlaCarte);

  const renderOffreCard = (o: Offre) => (
    <div key={o.id} className={`glass-card rounded-xl p-3.5 relative overflow-hidden transition-all ${!o.active ? "opacity-40 grayscale" : ""}`}>
      {editingId === o.id ? (
        <div className="space-y-2.5">
          <input value={editName} onChange={e => setEditName(e.target.value)}
            className="w-full rounded-xl p-2.5 text-sm outline-none font-semibold"
            style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
          <div className="flex gap-2 items-center">
            <input type="number" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))}
              className="flex-1 rounded-xl p-2.5 text-sm outline-none"
              style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
            <span className="text-sm text-muted-foreground">€</span>
          </div>

          {/* À la carte toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">À la carte (sans durée)</span>
            <Switch checked={editIsAlaCarte} onCheckedChange={setEditIsAlaCarte} />
          </div>

          {/* Duration */}
          {!editIsAlaCarte && (
            <div className="flex gap-2">
              <input type="number" value={editDuration?.value || ""} onChange={e => setEditDuration({ value: Number(e.target.value), unit: editDuration?.unit || "mois" })}
                placeholder="Durée" className="flex-1 rounded-xl p-2.5 text-sm outline-none"
                style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
              <select value={editDuration?.unit || "mois"} onChange={e => setEditDuration({ value: editDuration?.value || 1, unit: e.target.value as any })}
                className="rounded-xl p-2.5 text-sm outline-none"
                style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                {DURATION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          )}

          {/* Unit price & min qty */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-0.5 block">Prix unitaire €</label>
              <input type="number" value={editUnitPrice || ""} onChange={e => setEditUnitPrice(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="—" className="w-full rounded-xl p-2 text-sm outline-none"
                style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-0.5 block">Min. séances</label>
              <input type="number" value={editMinQty || ""} onChange={e => setEditMinQty(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="—" className="w-full rounded-xl p-2 text-sm outline-none"
                style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={saveEdit} className="flex-1 py-2 rounded-xl text-sm font-semibold text-foreground"
              style={{ background: "linear-gradient(135deg, hsl(var(--bordeaux2)), hsl(var(--bordeaux)))" }}>
              Sauvegarder
            </button>
            <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground"
              style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
              ✕
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-1">
            <div className="flex-1 pr-2">
              <div className="font-display text-[14px] font-bold text-foreground leading-tight">{o.name}</div>
              <div className="flex items-center gap-2 mt-1">
                {o.duration ? (
                  <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-semibold text-beige-2"
                    style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))" }}>
                    📅 {formatDuration(o.duration)}
                  </span>
                ) : o.isAlaCarte ? (
                  <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-semibold text-muted-foreground"
                    style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))" }}>
                    ⚡ À la carte
                  </span>
                ) : null}
                {o.unitPrice && (
                  <span className="text-[10px] text-muted-foreground">{o.unitPrice}€/séance</span>
                )}
                {o.minQuantity && (
                  <span className="text-[10px] text-muted-foreground">min. {o.minQuantity}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-lg font-bold text-bordeaux-2">{o.price}€</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2.5 pt-2" style={{ borderTop: "1px solid hsl(var(--glass-border) / 0.5)" }}>
            <div className="flex items-center gap-3">
              <Switch
                checked={o.active}
                onCheckedChange={() => toggleActive(o.id)}
                className="data-[state=checked]:bg-success data-[state=unchecked]:bg-surface-3"
              />
              <span className={`text-[11px] font-medium ${o.active ? "text-success" : "text-muted-foreground"}`}>
                {o.active ? "Active" : "Désactivée"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => startEdit(o)} className="text-[11px] text-beige-2 underline underline-offset-2 cursor-pointer">Modifier</button>
              {confirmDeleteId === o.id ? (
                <div className="flex gap-1 items-center">
                  <button onClick={() => deleteOffre(o.id)} className="text-[10px] text-destructive font-semibold px-2 py-1 rounded-lg"
                    style={{ background: "hsl(0 50% 43% / 0.1)", border: "1px solid hsl(0 50% 43% / 0.3)" }}>Confirmer</button>
                  <button onClick={() => setConfirmDeleteId(null)} className="text-[10px] text-muted-foreground">✕</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteId(o.id)} className="text-[11px] text-destructive/60 cursor-pointer hover:text-destructive transition-colors">🗑</button>
              )}
              {o.priceHistory.length > 1 && (
                <span className="text-[10px] text-muted-foreground">{o.priceHistory.length} modif.</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="px-3.5 pb-8">
      <h1 className="font-display text-[25px] font-extrabold text-foreground mb-0.5 pt-1">Offres</h1>
      <p className="text-xs text-muted-foreground mb-3.5">Gestion des offres & tarifs</p>

      {/* Summary */}
      <div className="glass-card rounded-xl p-3 relative overflow-hidden mb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-0.5">OFFRES ACTIVES</div>
            <div className="font-display text-2xl font-bold text-foreground">{activeCount}<span className="text-sm text-muted-foreground font-normal">/{offres.length}</span></div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-0.5">INFO</div>
            <div className="text-[11px] text-muted-foreground max-w-[200px]">Nouveaux prix → nouveaux clients. Noms propagés partout.</div>
          </div>
        </div>
      </div>

      {/* Programs */}
      {programOffres.length > 0 && (
        <>
          <div className="text-[9px] uppercase tracking-[2px] text-bordeaux-2 font-bold pb-1 mb-2 border-b border-bordeaux/20">PROGRAMMES</div>
          <div className="flex flex-col gap-2 mb-4">
            {programOffres.map(renderOffreCard)}
          </div>
        </>
      )}

      {/* À la carte */}
      {alaCarteOffres.length > 0 && (
        <>
          <div className="text-[9px] uppercase tracking-[2px] text-bordeaux-2 font-bold pb-1 mb-2 border-b border-bordeaux/20">À LA CARTE</div>
          <div className="flex flex-col gap-2 mb-4">
            {alaCarteOffres.map(renderOffreCard)}
          </div>
        </>
      )}

      {/* FAB */}
      <button onClick={() => setShowAdd(true)}
        className="fixed bottom-5 right-4 z-[60] w-[52px] h-[52px] rounded-full flex items-center justify-center text-2xl text-foreground active:scale-90 transition-transform"
        style={{
          background: "linear-gradient(135deg, hsl(var(--bordeaux2)), hsl(var(--bordeaux)))",
          boxShadow: "0 8px 22px hsl(348 63% 30% / 0.5)",
        }}>
        +
      </button>

      {/* Add Sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-[200] flex items-end" onClick={() => setShowAdd(false)}
          style={{ background: "rgba(5,3,3,0.76)" }}>
          <div className="w-full max-h-[80dvh] rounded-t-[22px] overflow-y-auto pb-6" onClick={e => e.stopPropagation()}
            style={{ background: "linear-gradient(180deg, hsl(var(--surface2)) 0%, hsl(var(--surface1)) 100%)", borderTop: "1px solid hsl(var(--glass-border))" }}>
            <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ background: "hsl(var(--glass-border))" }} />
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <h2 className="font-display text-lg font-bold text-foreground">Nouvelle offre</h2>
              <button onClick={() => setShowAdd(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-sm text-muted-foreground"
                style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))" }}>✕</button>
            </div>
            <div className="px-4 space-y-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Nom de l'offre *</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: ACTIV PROGRAM PREMIUM"
                  className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Prix €</label>
                <input type="number" value={newPrice || ""} onChange={e => setNewPrice(Number(e.target.value))} placeholder="0"
                  className="w-full rounded-xl p-2.5 text-sm outline-none" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
              </div>

              {/* À la carte toggle */}
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-muted-foreground">À la carte (sans durée fixe)</span>
                <Switch checked={newIsAlaCarte} onCheckedChange={setNewIsAlaCarte} />
              </div>

              {/* Duration */}
              {!newIsAlaCarte && (
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Durée</label>
                  <div className="flex gap-2">
                    <input type="number" value={newDuration.value || ""} onChange={e => setNewDuration({ ...newDuration, value: Number(e.target.value) })}
                      placeholder="1" className="flex-1 rounded-xl p-2.5 text-sm outline-none"
                      style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                    <select value={newDuration.unit} onChange={e => setNewDuration({ ...newDuration, unit: e.target.value as any })}
                      className="rounded-xl p-2.5 text-sm outline-none"
                      style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                      {DURATION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Unit price & min qty */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Prix unitaire €</label>
                  <input type="number" value={newUnitPrice || ""} onChange={e => setNewUnitPrice(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Optionnel" className="w-full rounded-xl p-2.5 text-sm outline-none"
                    style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground mb-1 block">Min. séances</label>
                  <input type="number" value={newMinQty || ""} onChange={e => setNewMinQty(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Optionnel" className="w-full rounded-xl p-2.5 text-sm outline-none"
                    style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }} />
                </div>
              </div>

              <button onClick={addOffre} className="w-full py-3 rounded-xl font-semibold text-sm text-foreground"
                style={{ background: "linear-gradient(135deg, hsl(var(--bordeaux2)), hsl(var(--bordeaux)))" }}>
                Créer l'offre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
