import { useState, useMemo } from "react";
import { useApp } from "@/store/AppContext";
import { getMonthEditState, getSealedLabel } from "@/lib/quarterLock";
import { useBaSalesMonth } from "@/hooks/useBaSalesMonth";
import { useFjmProOps } from "@/hooks/useFjmProOps";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

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
  const { financeEntries, expenses, portageMonths, setPortageMonths, offres, quarterEdits } = useApp();
  const selectedMonth = getCurrentMonth();

  const portageEnabled = portageMonths[selectedMonth] ?? false;
  const editState = getMonthEditState(selectedMonth, quarterEdits);
  const editable = editState.editable;
  const sealedLabel = getSealedLabel(editState);

  const { total: baSalesTotal } = useBaSalesMonth(selectedMonth);
  const { ops: fjmOps } = useFjmProOps(selectedMonth);
  const fjmRevenuTotal = fjmOps.filter(o => o.family === "revenu").reduce((s, o) => s + (o.actual || 0), 0);
  const fjmChargesTotal = fjmOps.filter(o => o.family !== "revenu").reduce((s, o) => s + (o.actual || 0), 0);

  const monthEntries = useMemo(() => financeEntries.filter(e => e.month === selectedMonth), [financeEntries, selectedMonth]);
  const monthExpenses = useMemo(() => expenses.filter(e => e.month === selectedMonth), [expenses, selectedMonth]);

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
  const totalReel = monthEntries.reduce((s, e) => s + e.amount, 0) + baSalesTotal + fjmRevenuTotal;
  const totalDepenses = monthExpenses.reduce((s, e) => s + e.amount, 0) + fjmChargesTotal;
  const urssaf = calcUrssaf(declaredMicro);
  const beneficeNet = totalReel - urssaf - totalDepenses;

  const bureauExpenses = monthExpenses.filter(e => e.category === "LOCAUX & BUREAUX");
  const prorataAmount = bureauExpenses.reduce((s, e) => s + e.amount, 0) * PRORATA_BUREAU;

  return (
    <div className="px-4 pt-4 pb-24">
      {/* Month header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-foreground"
          style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
          {formatMonth(selectedMonth)}
        </div>
        {editState.sealed && (
          <div className="badge-pill" style={{
            background: editState.editsRemaining > 0 ? "hsl(38 92% 55% / 0.1)" : "hsl(0 62% 50% / 0.1)",
            color: editState.editsRemaining > 0 ? "hsl(38 92% 55%)" : "hsl(0 62% 60%)"
          }}>{sealedLabel}</div>
        )}
      </div>

      {/* Revenue hero card */}
      <div className="card-hero rounded-3xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-label mb-1">Revenus {formatMonth(selectedMonth)}</div>
            <div className="value-lg text-[36px] text-foreground leading-none">{totalReel.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: "hsl(348 63% 30% / 0.15)" }}>💰</div>
        </div>

        {(() => {
          const items = [
            ...(localMicro > 0 ? [{ label: "CA Local", sub: "Déclaré URSSAF", value: localMicro, color: "hsl(152 55% 52%)" }] : []),
            ...(baSalesTotal > 0 ? [{ label: "BE ACTIV", sub: "Coaching clients", value: baSalesTotal, color: "hsl(217 70% 60%)" }] : []),
            ...(fjmRevenuTotal > 0 ? [{ label: "Revenus FJM", sub: "Divers", value: fjmRevenuTotal, color: "hsl(38 92% 55%)" }] : []),
            ...(especesNonDeclarees > 0 ? [{ label: "Espèces", sub: "Non déclarées", value: especesNonDeclarees, color: "hsl(38 92% 55%)" }] : []),
            ...(portageEnabled ? [{ label: "Portage JUMP", sub: "Via JUMP", value: declaredPortage, color: "hsl(262 80% 65%)" }] : []),
            { label: "URSSAF dû", sub: "26.1% du CA Micro", value: -urssaf, color: "hsl(0 62% 50%)" },
          ];
          const cols = items.length <= 2 ? "grid-cols-2" : items.length === 3 ? "grid-cols-3" : "grid-cols-2";
          return (
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
          );
        })()}
        {portageEnabled && (
          <div className="mt-3 px-3 py-2 rounded-xl text-[10px] text-muted-foreground" style={{ background: "hsl(217 70% 60% / 0.08)", border: "1px solid hsl(217 70% 60% / 0.15)" }}>
            ℹ️ Les offres marquées <strong className="text-foreground">Portage</strong> passent par <strong className="text-foreground">JUMP</strong> — non déclarées à l'URSSAF.
          </div>
        )}
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
              dont <span style={{ color: "hsl(38 92% 55%)" }}>{fjmChargesTotal.toFixed(0)}€ FJM</span>
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
    </div>
  );
}
