import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFjmProOps } from "@/hooks/useFjmProOps";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const URSSAF_RATE = 0.261;

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
}
function getAllMonths() {
  const start = new Date(2025,8,1);
  const end = new Date(new Date().getFullYear(), new Date().getMonth()+3, 1);
  const months: string[] = [];
  const d = new Date(start);
  while (d <= end) {
    months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
    d.setMonth(d.getMonth()+1);
  }
  return months;
}
function formatMonth(m: string) {
  const [y,mo] = m.split("-");
  return `${MONTHS[parseInt(mo)-1]} ${y}`;
}
function lastDayOf(monthKey: string) {
  const [y,m] = monthKey.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

interface BaSale {
  id: string;
  client_name: string | null;
  offer_name: string | null;
  amount: number;
  payment_mode: string | null;
  sale_type: "individual" | "duo" | "trio" | "classe" | null;
  participant_count: number | null;
}

const SALE_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  duo:    { label: "DUO",    color: "hsl(280 60% 55%)" },
  trio:   { label: "TRIO",   color: "hsl(260 60% 55%)" },
  classe: { label: "CLASSE", color: "hsl(200 70% 50%)" },
};

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl p-4 stat-card">
      <div className={`value-lg text-[18px] ${color}`}>{value >= 0 ? "+" : ""}{value.toFixed(0)}€</div>
      <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-bold text-foreground mb-2">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Row({ left, sub, right, color }: { left: string; sub?: string; right: string; color: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl stat-card">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-foreground truncate">{left}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </div>
      <span className={`value-lg text-[14px] flex-shrink-0 ${color}`}>{right}</span>
    </div>
  );
}

export default function ComptaPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const allMonths = useMemo(() => getAllMonths(), []);
  const [sales, setSales] = useState<BaSale[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const { ops, loading: opsLoading } = useFjmProOps(selectedMonth);

  useEffect(() => {
    setSalesLoading(true);
    const start = `${selectedMonth}-01`;
    const end = `${selectedMonth}-${String(lastDayOf(selectedMonth)).padStart(2,"0")}`;
    supabase
      .from("ba_sales")
      .select("id, client_name, offer_name, amount, payment_mode, sale_type, participant_count")
      .gte("date", start)
      .lte("date", end)
      .then(({ data }) => {
        setSales((data ?? []) as BaSale[]);
        setSalesLoading(false);
      }, () => setSalesLoading(false));
  }, [selectedMonth]);

  const revenusCoaching = sales.reduce((s,r) => s + (r.amount||0), 0);
  const revenusDiv      = ops.filter(o => o.family === "revenu").reduce((s,o) => s + (o.actual||0), 0);
  const totalRevenus    = revenusCoaching + revenusDiv;
  const chargesFixes    = ops.filter(o => o.family === "charge_fixe").reduce((s,o) => s + (o.actual||0), 0);
  const chargesVar      = ops.filter(o => o.family === "charge_variable").reduce((s,o) => s + (o.actual||0), 0);
  const totalCharges    = chargesFixes + chargesVar;
  const urssaf          = revenusCoaching * URSSAF_RATE;
  const resultatNet     = totalRevenus - totalCharges - urssaf;

  const loading = salesLoading || opsLoading;

  const exportPDF = () => {
    const doc = new jsPDF();
    const month = formatMonth(selectedMonth);
    doc.setFontSize(18);
    doc.setTextColor(139,42,60);
    doc.text(`Bilan Comptable — ${month}`, 14, 20);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("BE ACTIV BUSINESS × FINANCES JM", 14, 27);

    autoTable(doc, {
      startY: 34,
      head: [["Client / Groupe","Type","Offre","Montant"]],
      body: sales.map(s => [
        s.client_name||"—",
        s.sale_type === "duo" ? "DUO" : s.sale_type === "trio" ? "TRIO" : s.sale_type === "classe" ? `CLASSE (${s.participant_count||"?"})` : "Individuel",
        s.offer_name||"—",
        `${s.amount.toFixed(2)}€`,
      ]),
      headStyles: { fillColor: [139,42,60] },
      foot: [["","","Total coaching",`${revenusCoaching.toFixed(2)}€`]],
      footStyles: { fillColor: [40,120,80], textColor: 255 },
      theme: "grid",
    });

    const chargeRows = ops.filter(o => o.family !== "revenu")
      .map(o => [o.family === "charge_fixe" ? "Fixe" : "Variable", o.category, o.label||o.subcategory||"—", `${o.actual.toFixed(2)}€`]);
    const revenuDivRows = ops.filter(o => o.family === "revenu")
      .map(o => [o.category, o.label||"—", `${o.actual.toFixed(2)}€`]);

    if (revenuDivRows.length > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 6,
        head: [["Catégorie","Libellé","Montant"]],
        body: revenuDivRows,
        headStyles: { fillColor: [40,100,160] },
        foot: [["","Total revenus divers",`${revenusDiv.toFixed(2)}€`]],
        footStyles: { fillColor: [40,100,160], textColor: 255 },
        theme: "grid",
      });
    }

    if (chargeRows.length > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 6,
        head: [["Type","Catégorie","Libellé","Montant"]],
        body: chargeRows,
        headStyles: { fillColor: [80,50,50] },
        foot: [["","","Total charges",`${totalCharges.toFixed(2)}€`]],
        footStyles: { fillColor: [80,50,50], textColor: 255 },
        theme: "grid",
      });
    }

    const fy = (doc as any).lastAutoTable.finalY + 14;
    doc.setFontSize(11); doc.setTextColor(40);
    doc.text(`Total Revenus     +${totalRevenus.toFixed(2)}€`, 14, fy);
    doc.text(`Total Charges     -${totalCharges.toFixed(2)}€`, 14, fy+8);
    doc.text(`URSSAF 26.1%     -${urssaf.toFixed(2)}€`, 14, fy+16);
    doc.setFontSize(14);
    doc.setTextColor(resultatNet >= 0 ? 40 : 200, resultatNet >= 0 ? 160 : 40, 40);
    doc.text(`Résultat net      ${resultatNet >= 0 ? "+" : ""}${resultatNet.toFixed(2)}€`, 14, fy+28);

    doc.save(`bilan-${selectedMonth}.pdf`);
  };

  return (
    <div className="px-4 pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          className="flex-1 rounded-2xl px-4 py-3 text-sm font-medium input-field appearance-none">
          {allMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
        <button onClick={exportPDF} className="px-4 py-3 rounded-2xl text-sm font-semibold text-white btn-primary flex-shrink-0">
          📄 PDF
        </button>
      </div>

      {loading && (
        <div className="text-center text-muted-foreground text-sm py-12">Chargement…</div>
      )}

      {!loading && (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <KpiCard label="Coaching clients" value={revenusCoaching} color="text-success" />
            <KpiCard label="Revenus divers" value={revenusDiv} color="text-info" />
            <KpiCard label="Charges fixes" value={-chargesFixes} color="text-destructive" />
            <KpiCard label="Charges variables" value={-chargesVar} color="text-destructive" />
          </div>

          {/* Résultat */}
          <div className="rounded-2xl p-4 mb-5 stat-card">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] text-muted-foreground">Total revenus</span>
              <span className="value-lg text-[14px] text-success">+{totalRevenus.toFixed(0)}€</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] text-muted-foreground">Total charges</span>
              <span className="value-lg text-[14px] text-destructive">-{totalCharges.toFixed(0)}€</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] text-muted-foreground">URSSAF 26.1%</span>
              <span className="value-lg text-[13px] text-destructive">-{urssaf.toFixed(0)}€</span>
            </div>
            <div className="micro-divider my-3" />
            <div className="flex justify-between items-center">
              <span className="text-[13px] font-bold text-foreground">Résultat net</span>
              <span className={`value-lg text-[20px] ${resultatNet >= 0 ? "text-success" : "text-destructive"}`}>
                {resultatNet >= 0 ? "+" : ""}{resultatNet.toFixed(0)}€
              </span>
            </div>
          </div>

          {/* Ventes coaching */}
          {sales.length > 0 && (
            <Section title="💰 Ventes clients">
              {sales.map(s => {
                const badge = s.sale_type ? SALE_TYPE_BADGE[s.sale_type] : null;
                const sub = [s.offer_name, s.sale_type === "classe" && s.participant_count ? `${s.participant_count} présents` : null].filter(Boolean).join(" · ");
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl stat-card">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-medium text-foreground truncate">{s.client_name||"—"}</span>
                        {badge && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: badge.color + "33", color: badge.color }}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
                    </div>
                    <span className="value-lg text-[14px] flex-shrink-0 text-success">+{s.amount}€</span>
                  </div>
                );
              })}
            </Section>
          )}

          {/* Revenus divers FJM */}
          {ops.filter(o => o.family === "revenu").length > 0 && (
            <Section title="➕ Revenus divers (FJM)">
              {ops.filter(o => o.family === "revenu").map(o => (
                <Row key={o.id} left={o.label} sub={o.category} right={`+${o.actual}€`} color="text-info" />
              ))}
            </Section>
          )}

          {/* Charges fixes */}
          {ops.filter(o => o.family === "charge_fixe").length > 0 && (
            <Section title="🔒 Charges fixes (FJM)">
              {ops.filter(o => o.family === "charge_fixe").map(o => (
                <Row key={o.id} left={o.label} sub={o.category} right={`-${o.actual}€`} color="text-destructive" />
              ))}
            </Section>
          )}

          {/* Charges variables */}
          {ops.filter(o => o.family === "charge_variable").length > 0 && (
            <Section title="📊 Charges variables (FJM)">
              {ops.filter(o => o.family === "charge_variable").map(o => (
                <Row key={o.id} left={o.label} sub={o.category} right={`-${o.actual}€`} color="text-destructive" />
              ))}
            </Section>
          )}

          {sales.length === 0 && ops.length === 0 && (
            <div className="rounded-2xl p-8 text-center stat-card" style={{ border: "1px dashed hsl(0 0% 100% / 0.06)" }}>
              <div className="text-2xl mb-2">📭</div>
              <div className="text-muted-foreground text-[12px]">Aucune donnée pour ce mois</div>
              <div className="text-muted-foreground text-[10px] mt-1">FJM synchronisera ses opérations automatiquement</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
