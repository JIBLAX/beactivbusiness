import { useState } from "react";
import { useApp } from "@/store/AppContext";
import { Offre } from "@/data/types";

export default function OffresPage() {
  const { offres, setOffres, prospects, setProspects, activResetClients, setActivResetClients, financeEntries, setFinanceEntries } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editName, setEditName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState(0);

  const startEdit = (o: Offre) => {
    setEditingId(o.id);
    setEditPrice(o.price);
    setEditName(o.name);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const today = new Date().toISOString().split("T")[0];
    const oldOffre = offres.find(o => o.id === editingId);
    if (!oldOffre) return;

    const oldName = oldOffre.name;
    const newOffreName = editName || oldOffre.name;
    const nameChanged = oldName !== newOffreName;

    // Update the offer
    setOffres(offres.map(o => {
      if (o.id !== editingId) return o;
      const priceChanged = o.price !== editPrice;
      return {
        ...o,
        name: newOffreName,
        price: editPrice,
        priceHistory: priceChanged
          ? [...o.priceHistory, { price: editPrice, date: today }]
          : o.priceHistory,
      };
    }));

    // Propagate name change to prospects, AR clients, and finance entries
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

  const addOffre = () => {
    if (!newName) return;
    const today = new Date().toISOString().split("T")[0];
    const offre: Offre = {
      id: "o" + Date.now(),
      name: newName.toUpperCase(),
      price: newPrice,
      active: true,
      priceHistory: [{ price: newPrice, date: today }],
    };
    setOffres([...offres, offre]);
    setShowAdd(false);
    setNewName("");
    setNewPrice(0);
  };

  return (
    <div className="px-3.5 pb-8">
      <h1 className="font-display text-[25px] font-extrabold text-foreground mb-0.5 pt-1">Offres</h1>
      <p className="text-xs text-muted-foreground mb-3.5">Gestion des offres & tarifs</p>

      <div className="glass-card rounded-xl p-3 relative overflow-hidden mb-3">
        <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">INFO</div>
        <div className="text-[11px] text-muted-foreground">Les modifications de prix s'appliquent aux nouveaux clients. Les changements de nom se propagent partout.</div>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {offres.map(o => (
          <div key={o.id} className={`glass-card rounded-xl p-3.5 relative overflow-hidden transition-opacity ${!o.active ? "opacity-50" : ""}`}>
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
                  <div className="font-semibold text-[14px] text-foreground flex-1 pr-2">{o.name}</div>
                  <div className="font-display text-lg font-bold text-bordeaux-2">{o.price}€</div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(o)} className="text-[11px] text-beige-2 underline underline-offset-2 cursor-pointer">Modifier</button>
                    <button onClick={() => toggleActive(o.id)} className={`text-[11px] cursor-pointer ${o.active ? "text-success" : "text-muted-foreground"}`}>
                      {o.active ? "✓ Active" : "Désactivée"}
                    </button>
                  </div>
                  {o.priceHistory.length > 1 && (
                    <div className="text-[10px] text-muted-foreground">
                      {o.priceHistory.length} modif.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

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
