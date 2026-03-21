import { useState } from "react";
import { useApp } from "@/store/AppContext";
import { ActivResetClient, AR_PHASES, AR_PHASES_CYCLE2 } from "@/data/types";

function getDaysRemaining(phase: ActivResetClient["phases"][number]): number | null {
  if (!phase.startDate || phase.days === 0) return null;
  const start = new Date(phase.startDate);
  const end = new Date(start.getTime() + phase.days * 86400000);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

export default function ActivResetPage() {
  const { activResetClients, setActivResetClients } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const visibleClients = showArchived ? activResetClients : activResetClients.filter(c => !c.archived);
  const archivedCount = activResetClients.filter(c => c.archived).length;
  const selected = selectedId ? activResetClients.find(c => c.id === selectedId) : null;

  // Alerts
  const alerts = activResetClients.filter(c => !c.archived).flatMap(c => {
    if (c.currentPhase >= c.phases.length) return [];
    const phase = c.phases[c.currentPhase];
    const days = getDaysRemaining(phase);
    if (days !== null && days <= 7 && days >= 0) {
      return [{ client: c, phase, days }];
    }
    return [];
  });

  const validatePhase = (clientId: string) => {
    setActivResetClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const today = new Date().toISOString().split("T")[0];
      const newPhases = [...c.phases];
      newPhases[c.currentPhase] = { ...newPhases[c.currentPhase], done: true };
      if (c.currentPhase + 1 < newPhases.length) {
        newPhases[c.currentPhase + 1] = { ...newPhases[c.currentPhase + 1], startDate: today };
      }
      return { ...c, phases: newPhases, currentPhase: Math.min(c.currentPhase + 1, newPhases.length - 1) };
    }));
  };

  const extendCycle = (clientId: string) => {
    setActivResetClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const today = new Date().toISOString().split("T")[0];
      const cycle2Phases = AR_PHASES_CYCLE2.map((p, i) => ({
        id: p.id,
        label: p.label,
        shortLabel: p.shortLabel,
        done: false,
        startDate: i === 0 ? today : null,
        days: p.days,
      }));
      return {
        ...c,
        phases: [...c.phases, ...cycle2Phases],
        currentPhase: c.phases.length,
        cycle: c.cycle + 1,
      };
    }));
  };

  const isLastPhase = (c: ActivResetClient) => {
    return c.currentPhase === c.phases.length - 1 && c.phases[c.currentPhase]?.done;
  };

  return (
    <div className="px-3.5">
      <h1 className="font-display text-[25px] font-extrabold text-foreground mb-0.5 pt-1">Activ Reset</h1>
      <p className="text-xs text-muted-foreground mb-3.5">Suivi des accompagnements — {activResetClients.length} clients</p>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-2 mb-3.5">
          {alerts.map((a, i) => (
            <div key={i} onClick={() => setSelectedId(a.client.id)}
              className="rounded-xl p-3 cursor-pointer flex items-center gap-2.5"
              style={{ background: "hsl(36 60% 44% / 0.14)", border: "1px solid hsl(36 60% 44% / 0.3)" }}>
              <span className="text-lg">⚠️</span>
              <div>
                <div className="text-sm font-semibold text-warning">{a.client.name}</div>
                <div className="text-[11px] text-muted-foreground">J-{a.days} — {a.phase.shortLabel}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Client Cards */}
      <div className="flex flex-col gap-3">
        {activResetClients.map(c => {
          const currentPhase = c.phases[c.currentPhase];
          const daysLeft = currentPhase ? getDaysRemaining(currentPhase) : null;
          const progress = c.phases.length > 0 ? (c.phases.filter(p => p.done).length / c.phases.length) * 100 : 0;

          return (
            <div key={c.id} onClick={() => setSelectedId(c.id)}
              className="glass-card rounded-xl p-3.5 cursor-pointer transition-transform active:scale-[0.984] relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-[15px] text-foreground">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.offre}</div>
                </div>
                {daysLeft !== null && daysLeft >= 0 && (
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-semibold
                    ${daysLeft <= 7 ? "bg-destructive/20 text-destructive border border-destructive/50" : "bg-warning/15 text-warning border border-warning/40"}`}>
                    J-{daysLeft}
                  </div>
                )}
              </div>

              {/* Current Phase */}
              <div className="text-[10px] tracking-[2px] text-bordeaux-2 uppercase mb-2">
                {currentPhase?.label || "TERMINÉ"}
                {c.cycle > 1 && <span className="ml-1 text-muted-foreground">· Cycle {c.cycle}</span>}
              </div>

              {/* Progress Bar */}
              <div className="flex gap-[2px] items-center">
                {c.phases.map((p, i) => (
                  <div key={i} className="flex-1 h-1.5 rounded-sm transition-all"
                    style={{
                      background: p.done ? "hsl(var(--success))" :
                        i === c.currentPhase ? "hsl(var(--warning) / 0.6)" : "hsl(0 0% 100% / 0.08)",
                    }}>
                    {i === c.currentPhase && (
                      <div className="w-1 h-3 -mt-[3px] mx-auto rounded-sm" style={{ background: "hsl(var(--warning))" }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {activResetClients.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-2.5">🎯</div>
          <div className="text-sm">Aucun client Activ Reset</div>
        </div>
      )}

      {/* Detail Sheet */}
      {selected && (
        <div className="fixed inset-0 z-[200] flex items-end" onClick={() => setSelectedId(null)}
          style={{ background: "rgba(5,3,3,0.76)" }}>
          <div className="w-full max-h-[92dvh] rounded-t-[22px] overflow-y-auto pb-6"
            onClick={e => e.stopPropagation()}
            style={{
              background: "linear-gradient(180deg, hsl(var(--surface2)) 0%, hsl(var(--surface1)) 100%)",
              borderTop: "1px solid hsl(var(--glass-border))",
            }}>
            <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ background: "hsl(var(--glass-border))" }} />
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <h2 className="font-display text-xl font-bold text-foreground">{selected.name}</h2>
              <button onClick={() => setSelectedId(null)} className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm text-muted-foreground"
                style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))" }}>✕</button>
            </div>
            <div className="px-4 pb-2">
              <div className="font-display text-sm text-bordeaux-2 font-bold mb-0.5">{selected.offre}</div>
              <div className="text-[11px] text-muted-foreground mb-1">Depuis le {selected.startDate} · Cycle {selected.cycle}</div>
              {selected.phone && (
                <a href={`tel:${selected.phone.replace(/-/g, "")}`} className="text-sm text-beige-2 flex items-center gap-1">
                  {selected.phone} 📞
                </a>
              )}
            </div>

            {/* Notes */}
            {selected.notes && (
              <div className="mx-4 mb-3 rounded-xl p-3" style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))" }}>
                <div className="text-[11px] text-muted-foreground italic">📝 {selected.notes}</div>
              </div>
            )}

            {/* Phase Timeline */}
            <div className="px-4 pb-4">
              <div className="text-[9px] uppercase tracking-[2px] text-bordeaux-2 font-bold mb-3 pb-1 border-b border-bordeaux/20">
                PARCOURS
              </div>
              {selected.phases.map((phase, i) => {
                const isCurrent = i === selected.currentPhase;
                const isDone = phase.done;
                const isLocked = !isDone && !isCurrent && i > selected.currentPhase;
                const daysLeft = getDaysRemaining(phase);

                return (
                  <div key={i} className="flex gap-2.5 py-2 relative">
                    {/* Line */}
                    {i < selected.phases.length - 1 && (
                      <div className="absolute left-[15px] top-[34px] bottom-[-8px] w-0.5"
                        style={{ background: isDone ? "hsl(148 33% 46% / 0.4)" : isCurrent ? "hsl(36 60% 44% / 0.3)" : "hsl(var(--glass-border))" }} />
                    )}
                    {/* Dot */}
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm border-2 transition-all
                      ${isDone ? "bg-success/20 border-success text-success" :
                        isCurrent ? "bg-warning/20 border-warning text-warning animate-pulse-dot" :
                        "bg-surface-2 border-border text-muted-foreground"}`}
                      style={{ opacity: isLocked ? 0.4 : 1 }}>
                      {isDone ? "✓" : i + 1}
                    </div>
                    {/* Content */}
                    <div className="flex-1 pt-1">
                      <div className={`text-sm font-semibold ${isDone ? "text-muted-foreground line-through" : isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                        {phase.shortLabel}
                      </div>
                      {phase.startDate && <div className="text-[11px] text-muted-foreground">Début: {phase.startDate}</div>}
                      {isCurrent && daysLeft !== null && daysLeft >= 0 && (
                        <div className={`text-[11px] ${daysLeft <= 7 ? "text-destructive" : "text-warning"}`}>J-{daysLeft}</div>
                      )}
                    </div>
                    {/* Validate button */}
                    {isCurrent && !isDone && (
                      <button onClick={(e) => { e.stopPropagation(); validatePhase(selected.id); }}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-semibold tracking-wider uppercase self-center"
                        style={{ background: "hsl(var(--success))", color: "#fff" }}>
                        VALIDER ✓
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Extension button */}
              {isLastPhase(selected) && (
                <button onClick={(e) => { e.stopPropagation(); extendCycle(selected.id); }}
                  className="w-full mt-3 py-3 rounded-xl font-semibold text-sm"
                  style={{ background: "hsl(36 60% 44% / 0.18)", border: "1px solid hsl(36 60% 44% / 0.3)", color: "hsl(36 60% 64%)" }}>
                  🔄 Extension Cycle {selected.cycle + 1}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
