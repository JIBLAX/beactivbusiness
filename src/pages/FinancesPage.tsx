import { useState, useMemo, useEffect } from "react";
import { useApp } from "@/store/AppContext";
import { getMonthEditState, getSealedLabel } from "@/lib/quarterLock";
import { useBaSalesMonth, useBaSalesYear } from "@/hooks/useBaSalesMonth";
import { useFjmProOps } from "@/hooks/useFjmProOps";
import { supabase } from "@/integrations/supabase/client";


const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const MONTHS_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(m: string): string {
  const [y, mo] = m.split("-");
  return `${MONTHS[parseInt(mo) - 1]} ${y}`;
}

function calcUrssaf(ca: number): number { return ca * 0.261; }

const PRORATA_BUREAU = 13 / 43;

export default function FinancesPage() {
  const { financeEntries, expenses, portageMonths, setPortageMonths, offres, quarterEdits, monthlyGoal, setMonthlyGoal, user } = useApp();
  const selectedMonth = getCurrentMonth();

  const portageEnabled = portageMonths[selectedMonth] ?? false;
  const editState = getMonthEditState(selectedMonth, quarterEdits);
  const editable = editState.editable;
  const sealedLabel = getSealedLabel(editState);

  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [health, setHealth] = useState<{ clients: number; offres: number; operations: number; lastSyncAt: string | null; lastErrorAt: string | null }>({
    clients: 0,
    offres: 0,
    operations: 0,
    lastSyncAt: null,
    lastErrorAt: null,
  });

  useEffect(() => {
    if (!user?.id) return;
    (supabase as any)
      .from("pro_system_health")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .then(({ data }: any) => {
        const row = data?.[0];
        if (!row) return;
        setHealth({
          clients: Number(row.clients_count) || 0,
          offres: Number(row.offres_count) || 0,
          operations: Number(row.operations_count) || 0,
          lastSyncAt: row.last_sync_at ?? null,
          lastErrorAt: row.last_error_at ?? null,
        });
      });
  }, [user?.id]);

  const saveGoal = () => {
    const v = Number(goalInput);
    if (v > 0) setMonthlyGoal(v);
    setEditingGoal(false);
  };

  // Current month data
  const { total: baSalesTotal } = useBaSalesMonth(selectedMonth);
  const { ops: fjmOps } = useFjmProOps(selectedMonth);
  const fjmRevenuTotal = fjmOps.filter(o => o.family === "revenu").reduce((s, o) => s + (o.actual || 0), 0);
  const fjmChargesTotal = fjmOps.filter(o => o.family !== "revenu").reduce((s, o) => s + (o.actual || 0), 0);

  const monthEntries = useMemo(() => financeEntries.filter(e => e.month === selectedMonth), [financeEntries, selectedMonth]);
  const monthExpenses = useMemo(() => expenses.filter(e => e.month === selectedMonth), [expenses, selectedMonth]);

  // Sparkline — last 6 months
  const currentYear = new Date().getFullYear();
  const { sales: yearBaSales } = useBaSalesYear(currentYear);

  const last6 = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }, []);

  const sparkData = useMemo(() => last6.map(month => {
    const local = financeEntries
      .filter(e => e.month === month && !(e.paymentMode === "especes" && e.cashDeclaration === "non_declare"))
      .reduce((s, e) => s + e.amount, 0);
    const ba = yearBaSales.filter(s => s.date.startsWith(month)).reduce((s, r) => s + r.amount, 0);
    return { month, total: local + ba };
  }), [last6, financeEntries, yearBaSales]);

  const sparkMax = Math.max(...sparkData.map(d => d.total), 1);

  const isPortageEligible = (e: any) => {
    const o = offres.find(of => of.name === e.offre);
    return o?.portageEligible ?? false;
  };

  const localMicro = monthEntries.filter(e => {
    if (portageEnabled && isPortageEligible(e)) return false;
    if (e.paymentMode === "especes") return e.cashDeclaration === "micro";
    if (!portageEnabled) return true;
    return e.type === "micro";
  }).reduce((s, e) => s + e.amount, 0);

  const declaredMicro = localMicro + baSalesTotal;

  const declaredPortage = portageEnabled ? monthEntries.filter(e => {
    if (isPortageEligible(e)) return true;
    if (e.paymentMode === "especes") return e.cashDeclaration === "portage";
    return e.type === "portage";
  }).reduce((s, e) => s + e.amount, 0) : 0;

  const especesNonDeclarees = monthEntries.filter(e => e.paymentMode === "especes" && e.cashDeclaration === "non_declare").reduce((s, e) => s + e.amount, 0);
  // Espèces non déclarées exclues du CA officiel
  const totalReel = monthEntries
    .filter(e => !(e.paymentMode === "especes" && e.cashDeclaration === "non_declare"))
    .reduce((s, e) => s + e.amount, 0) + baSalesTotal + fjmRevenuTotal;
  const totalDepenses = monthExpenses.reduce((s, e) => s + e.amount, 0) + fjmChargesTotal;
  const urssaf = calcUrssaf(declaredMicro);
  const beneficeNet = totalReel - urssaf - totalDepenses;

  const bureauExpenses = monthExpenses.filter(e => e.category === "LOCAUX & BUREAUX");
  const prorataAmount = bureauExpenses.reduce((s, e) => s + e.amount, 0) * PRORATA_BUREAU;

  const goalPct = Math.min(100, (totalReel / monthlyGoal) * 100);
  const goalColor = goalPct >= 100 ? "hsl(152 55% 42%)" : goalPct >= 70 ? "hsl(38 92% 55%)" : "hsl(0 62% 50%)";

  return (
    <div className="px-4 pt-4 pb-24">
      {/* Sealed badge */}
      {editState.sealed && (
        <div className="flex justify-end mb-3">
          <div className="badge-pill" style={{
            background: editState.editsRemaining > 0 ? "hsl(38 92% 55% / 0.1)" : "hsl(0 62% 50% / 0.1)",
            color: editState.editsRemaining > 0 ? "hsl(38 92% 55%)" : "hsl(0 62% 60%)"
          }}>{sealedLabel}</div>
        </div>
      )}

      {/* Revenue hero card */}
      <div className="card-hero rounded-3xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-label mb-1">REVENUS <span className="text-white font-bold">{formatMonth(selectedMonth).toUpperCase()}</span></div>
            <div className="value-lg text-[36px] text-foreground leading-none">{totalReel.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: "hsl(348 63% 30% / 0.15)" }}>💰</div>
        </div>

        {/* Breakdown grid */}
        {(() => {
          const items = [
            ...(localMicro > 0 ? [{ label: "CA Micro", sub: "Déclaré URSSAF", value: localMicro, color: "hsl(152 55% 52%)" }] : []),
            ...(baSalesTotal > 0 ? [{ label: "BE ACTIV", sub: "Ventes coaching", value: baSalesTotal, color: "hsl(217 70% 60%)" }] : []),
            ...(fjmRevenuTotal > 0 ? [{ label: "Autres revenus", sub: "Opérations pro", value: fjmRevenuTotal, color: "hsl(38 92% 55%)" }] : []),
            ...(portageEnabled ? [{ label: "Portage JUMP", sub: "Via JUMP", value: declaredPortage, color: "hsl(262 80% 65%)" }] : []),
            { label: "URSSAF dû", sub: "26.1% du CA Micro", value: -urssaf, color: "hsl(0 62% 50%)" },
          ];
          const cols = items.length <= 2 ? "grid-cols-2" : items.length === 3 ? "grid-cols-3" : "grid-cols-2";
          return (
            <>
              <div className={`grid gap-2 ${cols}`}>
                {items.map(k => (
                  <div key={k.label} className="rounded-2xl p-3 text-center" style={{ background: "hsl(0 0% 100% / 0.03)" }}>
                    <div className="value-lg text-[15px] leading-none mb-1" style={{ color: k.color }}>
                      {Math.abs(k.value).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
                    </div>
                    <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">{k.label}</div>
                    <div className="text-[8px] text-muted-foreground/60 mt-0.5">{k.sub}</div>
                  </div>
                ))}
              </div>
              {especesNonDeclarees > 0 && (
                <div className="mt-2 px-3 py-2 rounded-xl flex items-center justify-between"
                  style={{ background: "hsl(0 0% 100% / 0.02)", border: "1px dashed hsl(0 0% 100% / 0.08)" }}>
                  <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Espèces hors bilan</span>
                  <span className="text-[11px] font-semibold text-muted-foreground/40">+{especesNonDeclarees.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</span>
                </div>
              )}
            </>
          );
        })()}

        {/* Goal progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Objectif mensuel</span>
            {editingGoal ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  type="number"
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveGoal()}
                  className="w-20 rounded-lg px-2 py-1 text-[11px] text-center font-semibold text-foreground"
                  style={{ background: "hsl(0 0% 100% / 0.08)", border: "1px solid hsl(0 0% 100% / 0.15)", outline: "none" }}
                  placeholder={String(monthlyGoal)}
                />
                <button onClick={saveGoal} className="text-[10px] px-2 py-1 rounded-lg font-semibold" style={{ background: "hsl(152 55% 42% / 0.2)", color: "hsl(152 55% 52%)" }}>✓</button>
              </div>
            ) : (
              <button onClick={() => { setGoalInput(String(monthlyGoal)); setEditingGoal(true); }}
                className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: goalColor }}>
                {goalPct.toFixed(0)}% · {monthlyGoal.toLocaleString("fr-FR")}€
                <span className="text-muted-foreground text-[9px]">✏️</span>
              </button>
            )}
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.06)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${goalPct}%`, background: goalColor }} />
          </div>
          {goalPct >= 100 && (
            <div className="text-[9px] font-bold mt-1 text-center" style={{ color: "hsl(152 55% 52%)" }}>
              🎯 Objectif atteint ! +{(totalReel - monthlyGoal).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
            </div>
          )}
        </div>

        {portageEnabled && (
          <div className="mt-3 px-3 py-2 rounded-xl text-[10px] text-muted-foreground" style={{ background: "hsl(217 70% 60% / 0.08)", border: "1px solid hsl(217 70% 60% / 0.15)" }}>
            ℹ️ Les offres marquées <strong className="text-foreground">Portage</strong> passent par <strong className="text-foreground">JUMP</strong> — non déclarées à l'URSSAF.
          </div>
        )}
      </div>

      {/* Sparkline — 6 derniers mois */}
      <div className="card-elevated rounded-2xl p-4 mb-3">
        <div className="flex items-end justify-between gap-1" style={{ height: 56 }}>
          {sparkData.map((d, i) => {
            const barH = Math.max(4, (d.total / sparkMax) * 44);
            const isCurrent = d.month === selectedMonth;
            const mo = parseInt(d.month.split("-")[1]) - 1;
            return (
              <div key={d.month} className="flex-1 flex flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t-md transition-all duration-500"
                  style={{ height: barH, background: isCurrent ? goalColor : "hsl(0 0% 100% / 0.10)" }} />
                <span className="text-[8px] font-medium" style={{ color: isCurrent ? "hsl(0 0% 80%)" : "hsl(0 0% 35%)" }}>
                  {MONTHS_SHORT[mo]}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Tendance 6 mois</span>
          {(() => {
            const prev = sparkData[sparkData.length - 2]?.total ?? 0;
            const curr = sparkData[sparkData.length - 1]?.total ?? 0;
            if (prev === 0) return null;
            const diff = curr - prev;
            const pct = ((diff / prev) * 100).toFixed(0);
            return (
              <span className="text-[9px] font-semibold" style={{ color: diff >= 0 ? "hsl(152 55% 52%)" : "hsl(0 62% 50%)" }}>
                {diff >= 0 ? "▲" : "▼"} {Math.abs(Number(pct))}% vs mois dernier
              </span>
            );
          })()}
        </div>
      </div>

      {/* Portage JUMP switch */}
      <div className="card-elevated rounded-2xl p-4 mb-3 flex items-center justify-between">
        <div>
          <div className="text-[13px] font-semibold text-foreground">Portage JUMP</div>
          <div className="text-[10px] text-muted-foreground">
            {portageEnabled ? "Actif — Offres éligibles exclues de l'URSSAF" : `Activer pour ${formatMonth(selectedMonth)}`}
          </div>
        </div>
        <button onClick={() => editable && setPortageMonths({ ...portageMonths, [selectedMonth]: !portageEnabled })}
          className={`w-12 h-7 rounded-full transition-all relative ${!editable ? "opacity-40" : ""}`}
          style={{ background: portageEnabled ? "hsl(152 55% 42%)" : "hsl(0 0% 15%)" }}
          disabled={!editable}>
          <div className={`absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white transition-all shadow-sm
            ${portageEnabled ? "left-[26px]" : "left-[3px]"}`} />
        </button>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="stat-card rounded-2xl p-4">
          <div className="section-label mb-2">Bénéfice Net</div>
          <div className={`value-lg text-[22px] ${beneficeNet >= 0 ? "text-success" : "text-destructive"}`}>
            {beneficeNet.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
          </div>
        </div>
        <div className="stat-card rounded-2xl p-4">
          <div className="section-label mb-2">Dépenses</div>
          <div className="value-lg text-[22px] text-destructive">
            -{totalDepenses.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
          </div>
          {fjmChargesTotal > 0 && (
            <div className="text-[9px] text-muted-foreground mt-1">
              dont <span style={{ color: "hsl(38 92% 55%)" }}>{fjmChargesTotal.toFixed(0)}€ synchronisées</span>
            </div>
          )}
        </div>
      </div>

      {/* Prorata Bureau */}
      {prorataAmount > 0 && (
        <div className="stat-card rounded-2xl p-4 mb-4">
          <div className="section-label mb-1">Prorata Bureau (30.23%)</div>
          <div className="value-lg text-[18px] text-foreground">{prorataAmount.toFixed(0)}€</div>
        </div>
      )}

      {/* Santé système (PRO unifié) */}
      <div className="card-elevated rounded-2xl p-4 mb-4">
        <div className="section-label mb-3">Santé système</div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="stat-card rounded-xl p-3 text-center">
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${health.clients > 0 ? "text-success" : "text-muted-foreground"}`}>Clients</div>
            <div className="text-[14px] font-bold text-foreground">{health.clients}</div>
          </div>
          <div className="stat-card rounded-xl p-3 text-center">
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${health.offres > 0 ? "text-success" : "text-muted-foreground"}`}>Offres</div>
            <div className="text-[14px] font-bold text-foreground">{health.offres}</div>
          </div>
          <div className="stat-card rounded-xl p-3 text-center">
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${health.operations > 0 ? "text-success" : "text-muted-foreground"}`}>Ops PRO</div>
            <div className="text-[14px] font-bold text-foreground">{health.operations}</div>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground">
          Dernière sync: {health.lastSyncAt ? new Date(health.lastSyncAt).toLocaleString("fr-FR") : "—"}
        </div>
        <div className={`text-[10px] mt-1 ${health.lastErrorAt ? "text-destructive" : "text-success"}`}>
          {health.lastErrorAt ? `Dernière erreur: ${new Date(health.lastErrorAt).toLocaleString("fr-FR")}` : "Aucune erreur récente"}
        </div>
      </div>
    </div>
  );
}
