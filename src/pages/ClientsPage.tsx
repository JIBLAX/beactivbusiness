import { useMemo } from "react";
import { useApp } from "@/store/AppContext";

export default function ClientsPage() {
  const { prospects } = useApp();

  const clients = useMemo(() => {
    return prospects.filter(p => p.closing === "OUI" && p.offre && p.offre !== "-");
  }, [prospects]);

  const activPrograms = clients.filter(p =>
    p.offre.includes("ACTIV PROGRAM")
  );
  const otherClients = clients.filter(p =>
    !p.offre.includes("ACTIV PROGRAM")
  );

  return (
    <div className="px-3.5">
      <h1 className="font-display text-[25px] font-extrabold text-foreground mb-0.5 pt-1">Clients</h1>
      <p className="text-xs text-muted-foreground mb-3.5">Base clients — {clients.length} actifs</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="glass-card rounded-xl p-3 relative overflow-hidden text-center">
          <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">TOTAL</div>
          <div className="text-2xl font-bold text-foreground">{clients.length}</div>
        </div>
        <div className="glass-card rounded-xl p-3 relative overflow-hidden text-center">
          <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">ACTIV</div>
          <div className="text-2xl font-bold text-bordeaux-2">{activPrograms.length}</div>
        </div>
        <div className="glass-card rounded-xl p-3 relative overflow-hidden text-center">
          <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] mb-1">AUTRES</div>
          <div className="text-2xl font-bold text-beige-2">{otherClients.length}</div>
        </div>
      </div>

      {/* Activ Program Clients */}
      {activPrograms.length > 0 && (
        <>
          <div className="text-[9px] uppercase tracking-[2px] text-bordeaux-2 font-bold mb-2 pb-1 border-b border-bordeaux/20">
            ACTIV PROGRAM
          </div>
          <div className="flex flex-col gap-2 mb-4">
            {activPrograms.map(c => (
              <div key={c.id} className="glass-card rounded-xl p-3 relative overflow-hidden border-l-[3px] !border-l-success">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="font-semibold text-[15px] text-foreground">{c.name}</div>
                  <span className={`text-[10px] font-bold ${c.sex === "F" ? "text-pink-300" : "text-blue-300"}`}>{c.sex === "F" ? "♀" : "♂"}</span>
                </div>
                <div className="font-display text-sm text-bordeaux-2 font-bold mb-1">{c.offre}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{c.contact}</span>
                  <span className="text-[11px] text-muted-foreground">{c.date}</span>
                </div>
                {c.objectif && (
                  <div className="mt-1.5">
                    <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                      style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}>
                      {c.objectif}
                    </span>
                  </div>
                )}
                {c.notes && <div className="text-[11px] text-muted-foreground mt-1 italic">{c.notes}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Other Clients */}
      {otherClients.length > 0 && (
        <>
          <div className="text-[9px] uppercase tracking-[2px] text-muted-foreground font-bold mb-2 pb-1 border-b border-border">
            AUTRES CLIENTS
          </div>
          <div className="flex flex-col gap-2">
            {otherClients.map(c => (
              <div key={c.id} className="glass-card rounded-xl p-3 relative overflow-hidden">
                <div className="flex items-start justify-between mb-1">
                  <div className="font-semibold text-[15px] text-foreground">{c.name}</div>
                  <span className="text-[11px] text-beige-2">{c.offre}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{c.contact}</span>
                  <span className="text-[11px] text-muted-foreground">{c.date}</span>
                </div>
                {c.notes && <div className="text-[11px] text-muted-foreground mt-1 italic">{c.notes}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {clients.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-2.5">🏆</div>
          <div className="text-sm">Aucun client pour l'instant</div>
        </div>
      )}
    </div>
  );
}
