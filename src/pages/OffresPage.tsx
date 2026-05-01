import { useState } from "react";
import { useApp } from "@/store/AppContext";
import { Offre, OffreDuration, OffreTheme, OFFRE_THEMES } from "@/data/types";
import logoBeActiv from "@/assets/logo-beactiv.png";
import logoCardioMouv from "@/assets/logo-cardiomouv.png";
import logoJM from "@/assets/logo-jm.png";

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

const THEME_LOGOS: Record<string, string> = {
  "COLLECTIF": logoCardioMouv,
  "ACTION": logoJM,
  "TRANSFORMATION": logoBeActiv,
};

/** Formule métier — mappe vers offerType + isAlaCarte (cf. INITIAL_OFFRES). */
type OffreFormule = "ala_carte" | "abonnement_seances" | "programme_acces" | "abonnement_acces";

function formuleFromOffre(o: Offre): OffreFormule {
  if (o.isAlaCarte) return "ala_carte";
  if (o.offerType === "programme" && !o.duration) return "abonnement_acces";
  if (o.offerType === "programme") return "programme_acces";
  return "abonnement_seances";
}

const FORMULE_OPTIONS: { key: OffreFormule; label: string; hint: string }[] = [
  { key: "ala_carte", label: "À la carte", hint: "Une séance à la fois, prix unitaire" },
  { key: "abonnement_seances", label: "Abonnement / pass séances", hint: "Forfait sur une durée (ex. JM Pass, pack séances)" },
  { key: "programme_acces", label: "Programme (accès)", hint: "Accès programme sur une période (ex. Activ Reset)" },
  { key: "abonnement_acces", label: "Abonnement accès continu", hint: "Renouvelable, durée indéterminée (accès en continu)" },
];

export default function OffresPage() {
  const { offres, setOffres, prospects, setProspects, activResetClients, setActivResetClients, financeEntries, setFinanceEntries } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editName, setEditName] = useState("");
  const [editDuration, setEditDuration] = useState<OffreDuration | undefined>();
  const [editUnitPrice, setEditUnitPrice] = useState<number | undefined>();
  const [editMinQty, setEditMinQty] = useState<number | undefined>();
  const [editTheme, setEditTheme] = useState<OffreTheme>("TRANSFORMATION");
  const [editTva, setEditTva] = useState(false);
  const [editPortage, setEditPortage] = useState(false);
  const [editMaxInstallments, setEditMaxInstallments] = useState<number | undefined>();
  const [editSessionTracking, setEditSessionTracking] = useState(false);
  const [editMinSessionsValidate, setEditMinSessionsValidate] = useState<number | undefined>();
  const [editFormule, setEditFormule] = useState<OffreFormule>("abonnement_seances");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState(0);
  const [newDuration, setNewDuration] = useState<OffreDuration>({ value: 1, unit: "mois" });
  const [newUnitPrice, setNewUnitPrice] = useState<number | undefined>();
  const [newMinQty, setNewMinQty] = useState<number | undefined>();
  const [newTheme, setNewTheme] = useState<OffreTheme>("TRANSFORMATION");
  const [newTva, setNewTva] = useState(false);
  const [newPortage, setNewPortage] = useState(false);
  const [newMaxInstallments, setNewMaxInstallments] = useState<number | undefined>();
  const [newSessionTracking, setNewSessionTracking] = useState(false);
  const [newMinSessionsValidate, setNewMinSessionsValidate] = useState<number | undefined>();
  const [newFormule, setNewFormule] = useState<OffreFormule>("abonnement_seances");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [openThemes, setOpenThemes] = useState<Set<OffreTheme>>(() => new Set(["ACTION", "TRANSFORMATION", "COLLECTIF"]));

  const startEdit = (o: Offre) => {
    setEditingId(o.id); setEditPrice(o.price); setEditName(o.name);
    setEditDuration(o.duration); setEditUnitPrice(o.unitPrice); setEditMinQty(o.minQuantity);
    setEditTheme(o.theme || "TRANSFORMATION"); setEditTva(o.tvaEnabled || false);
    setEditPortage(o.portageEligible || false); setEditMaxInstallments(o.maxInstallments);
    setEditSessionTracking(o.sessionTrackingEnabled ?? false);
    setEditMinSessionsValidate(o.minSessionsToValidate);
    setEditFormule(formuleFromOffre(o));
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
      const updatedAliases = nameChanged && !o.aliases.includes(oldName)
        ? [...o.aliases, oldName]
        : o.aliases;
      const ot = (editFormule === "programme_acces" || editFormule === "abonnement_acces") ? "programme" : "session";
      const ala = editFormule === "ala_carte";
      const unitOk = editFormule === "abonnement_seances" ? editUnitPrice : undefined;
      const minOk = editFormule === "abonnement_seances" ? editMinQty : undefined;
      const durationOk = (ala || editFormule === "abonnement_acces") ? undefined : editDuration;
      return {
        ...o, name: newOffreName, price: editPrice,
        aliases: updatedAliases,
        offerType: ot,
        duration: durationOk,
        isAlaCarte: ala, unitPrice: unitOk, minQuantity: minOk,
        theme: editTheme, tvaEnabled: editTva, portageEligible: editPortage,
        maxInstallments: editMaxInstallments,
        sessionTrackingEnabled: editSessionTracking,
        minSessionsToValidate: editMinSessionsValidate,
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

  const addOffre = (asDraft = false) => {
    if (!newName) return;
    const today = new Date().toISOString().split("T")[0];
    const ala = newFormule === "ala_carte";
    const ot = (newFormule === "programme_acces" || newFormule === "abonnement_acces") ? "programme" : "session";
    const unitOk = newFormule === "abonnement_seances" ? newUnitPrice : undefined;
    const minOk = newFormule === "abonnement_seances" ? newMinQty : undefined;
    const durationOk = (ala || newFormule === "abonnement_acces") ? undefined : newDuration;
    const offre: Offre = {
      id: "o" + Date.now(), name: newName.toUpperCase(), price: newPrice, active: !asDraft,
      priceHistory: [{ price: newPrice, date: today }],
      aliases: [],
      offerType: ot,
      duration: durationOk,
      isAlaCarte: ala, unitPrice: unitOk, minQuantity: minOk,
      theme: newTheme, tvaEnabled: newTva, portageEligible: newPortage,
      maxInstallments: newMaxInstallments,
      isDraft: asDraft,
      sessionTrackingEnabled: newSessionTracking,
      minSessionsToValidate: newMinSessionsValidate,
    };
    setOffres([...offres, offre]);
    setShowAdd(false);
    setNewName(""); setNewPrice(0); setNewDuration({ value: 1, unit: "mois" });
    setNewFormule("abonnement_seances"); setNewUnitPrice(undefined); setNewMinQty(undefined);
    setNewTheme("TRANSFORMATION"); setNewTva(false); setNewPortage(false); setNewMaxInstallments(undefined);
    setNewSessionTracking(false); setNewMinSessionsValidate(undefined);
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

  const renderOffreCard = (o: Offre) => {
    const formule = formuleFromOffre(o);
    return (
    <div key={o.id} className={`card-elevated rounded-2xl p-4 transition-all ${!o.active ? "opacity-35" : ""} ${o.isDraft ? "border-l-4" : ""}`}
      style={o.isDraft ? { borderLeftColor: "hsl(38 92% 55%)" } : {}}>
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
          <div>
            <label className="section-label mb-2 block">Formule</label>
            <div className="flex flex-col gap-2">
              {FORMULE_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setEditFormule(opt.key);
                    if (opt.key === "programme_acces" || opt.key === "abonnement_acces") { setEditUnitPrice(undefined); setEditMinQty(undefined); }
                  }}
                  className={`rounded-xl px-3 py-2.5 text-left text-sm transition-colors border ${
                    editFormule === opt.key
                      ? "border-[hsl(348_63%_45%)] bg-[hsl(348_63%_45%/0.12)] text-foreground"
                      : "border-[hsl(0_0%_100%/0.08)] bg-[hsl(0_0%_100%/0.03)] text-muted-foreground hover:border-[hsl(0_0%_100%/0.14)]"
                  }`}
                >
                  <span className="font-semibold text-foreground">{opt.label}</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>
          {editFormule !== "ala_carte" && editFormule !== "abonnement_acces" && (
            <div className="flex gap-2">
              <input type="number" value={editDuration?.value || ""} onChange={e => setEditDuration({ value: Number(e.target.value), unit: editDuration?.unit || "mois" })}
                placeholder="Durée" className="flex-1 rounded-xl px-3 py-2.5 text-sm input-field" />
              <select value={editDuration?.unit || "mois"} onChange={e => setEditDuration({ value: editDuration?.value || 1, unit: e.target.value as any })}
                className="rounded-xl px-3 py-2.5 text-sm input-field">
                {DURATION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          )}
          {editFormule === "abonnement_seances" && (
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
          )}
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
          <div className="flex items-center justify-between pt-1">
            <span className="text-[12px] text-muted-foreground">Suivi des séances (CRM)</span>
            <ToggleSwitch checked={editSessionTracking} onChange={() => setEditSessionTracking(!editSessionTracking)} />
          </div>
          {editSessionTracking && (
            <div>
              <label className="section-label mb-1 block">Séances min. à valider (objectif)</label>
              <input type="number" min={1} value={editMinSessionsValidate ?? ""} onChange={e => setEditMinSessionsValidate(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="ex : 4" className="w-full rounded-xl px-3 py-2 text-sm input-field" />
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
              <div className="flex items-center gap-2">
                {o.isDraft && (
                  <span className="badge-pill text-[9px] flex-shrink-0" style={{ background: "hsl(38 92% 55% / 0.15)", color: "hsl(38 92% 60%)" }}>BROUILLON</span>
                )}
                <div className="text-[14px] font-semibold text-foreground leading-tight">{o.name}</div>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="badge-pill text-[10px]" style={{ background: "hsl(217 70% 50% / 0.12)", color: "hsl(217 70% 62%)" }}>
                  {formule === "ala_carte"
                    ? "⚡ À la carte"
                    : formule === "programme_acces"
                      ? "📘 Programme"
                      : formule === "abonnement_acces"
                        ? "♾️ Abonnement accès continu"
                        : "🎫 Pass / abonnement séances"}
                </span>
                {o.duration ? (
                  <span className="badge-pill text-[10px]" style={{ background: "hsl(0 0% 100% / 0.04)", color: "hsl(0 0% 70%)" }}>
                    📅 {formatDuration(o.duration)}
                  </span>
                ) : formule === "ala_carte" ? (
                  <span className="badge-pill text-[10px]" style={{ background: "hsl(0 0% 100% / 0.04)", color: "hsl(0 0% 50%)" }}>Séance unitaire</span>
                ) : null}
                {o.unitPrice != null && formule === "abonnement_seances" && (
                  <span className="text-[10px] text-muted-foreground">{o.unitPrice}€/séance</span>
                )}
                {o.minQuantity != null && formule === "abonnement_seances" && (
                  <span className="text-[10px] text-muted-foreground">min. {o.minQuantity}</span>
                )}
                {formule === "abonnement_acces" && (
                  <span className="badge-pill text-[9px]" style={{ background: "hsl(152 55% 45% / 0.12)", color: "hsl(152 55% 55%)" }}>
                    Renouvelable · durée indéterminée
                  </span>
                )}
                {o.tvaEnabled && <span className="badge-pill text-[9px]" style={{ background: "hsl(38 92% 55% / 0.1)", color: "hsl(38 92% 55%)" }}>TVA</span>}
                {o.portageEligible && <span className="badge-pill text-[9px]" style={{ background: "hsl(217 70% 60% / 0.1)", color: "hsl(217 70% 60%)" }}>PORTAGE</span>}
                {o.maxInstallments && o.maxInstallments > 1 && <span className="badge-pill text-[9px]" style={{ background: "hsl(280 60% 55% / 0.1)", color: "hsl(280 60% 55%)" }}>Jusqu'à {o.maxInstallments}×</span>}
                {o.sessionTrackingEnabled && (
                  <span className="badge-pill text-[9px]" style={{ background: "hsl(152 55% 42% / 0.12)", color: "hsl(152 55% 50%)" }}>
                    Suivi séances{o.minSessionsToValidate != null ? ` · min ${o.minSessionsToValidate}` : ""}
                  </span>
                )}
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
              {o.isDraft && (
                <button onClick={() => setOffres(offres.map(x => x.id === o.id ? { ...x, isDraft: false, active: true } : x))}
                  className="badge-pill text-[10px] cursor-pointer" style={{ background: "hsl(152 55% 45% / 0.15)", color: "hsl(152 55% 55%)" }}>
                  ✓ Valider
                </button>
              )}
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
  };

  return (
    <div className="app-shell px-4 pt-4 pb-24">
      <div className="page-hero flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] font-bold text-foreground">Offres</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Catalogue & tarifs</p>
        </div>
        <div className="stat-card rounded-xl px-3 py-2 text-center">
          <div className="value-lg text-[18px] text-foreground">{activeCount}<span className="text-sm text-muted-foreground font-normal">/{offres.length}</span></div>
          <div className="text-[8px] text-muted-foreground uppercase tracking-wider">actives</div>
        </div>
      </div>
      {/* Search bar */}
      <div className="mb-4">
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="🔍 Rechercher une offre..."
          className="surface-input px-4 py-2.5 text-[13px]" />
      </div>

      {OFFRE_THEMES.map(theme => {
        const allThemeOffers = offres.filter(o => (o.theme || "TRANSFORMATION") === theme);
        const sq = searchQuery.toLowerCase();
        const themeOffers = sq ? allThemeOffers.filter(o => o.name.toLowerCase().includes(sq)) : allThemeOffers;
        if (themeOffers.length === 0) return null;
        const isOpen = openThemes.has(theme);
        return (
          <div key={theme} className="mb-6">
            <button
              type="button"
              onClick={() => setOpenThemes(prev => {
                const n = new Set(prev);
                if (n.has(theme)) n.delete(theme); else n.add(theme);
                return n;
              })}
              className="section-card w-full flex items-center gap-3 mb-3 px-3 py-2 text-left"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "hsl(0 0% 100% / 0.04)" }}>
                <img src={THEME_LOGOS[theme]} alt={theme} className="w-full h-full object-cover" />
              </div>
              <div className="section-label flex-1">{theme} ({themeOffers.length})</div>
              <span className="text-xs text-muted-foreground">{isOpen ? "▾" : "▸"}</span>
            </button>
            {isOpen && (
              <div className="space-y-2">
                {themeOffers.map(renderOffreCard)}
              </div>
            )}
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
        <div className="modal-backdrop fixed inset-0 z-[200] flex items-end" onClick={() => setShowAdd(false)}>
          <div className="modal-surface w-full max-h-[85dvh] rounded-t-3xl overflow-y-auto pb-8 animate-fade-up" onClick={e => e.stopPropagation()}>
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
              <div>
                <label className="section-label mb-2 block">Formule</label>
                <div className="flex flex-col gap-2">
                  {FORMULE_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setNewFormule(opt.key);
                        if (opt.key === "programme_acces" || opt.key === "abonnement_acces") { setNewUnitPrice(undefined); setNewMinQty(undefined); }
                      }}
                      className={`rounded-xl px-3 py-2.5 text-left text-sm transition-colors border ${
                        newFormule === opt.key
                          ? "border-[hsl(348_63%_45%)] bg-[hsl(348_63%_45%/0.12)] text-foreground"
                          : "border-[hsl(0_0%_100%/0.08)] bg-[hsl(0_0%_100%/0.03)] text-muted-foreground hover:border-[hsl(0_0%_100%/0.14)]"
                      }`}
                    >
                      <span className="font-semibold text-foreground">{opt.label}</span>
                      <span className="block text-[11px] text-muted-foreground mt-0.5">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
              {newFormule !== "ala_carte" && newFormule !== "abonnement_acces" && (
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
              {newFormule === "abonnement_seances" && (
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
              )}
              <div className="flex items-center justify-between py-1">
                <span className="text-[12px] text-muted-foreground">TVA 20%</span>
                <ToggleSwitch checked={newTva} onChange={() => setNewTva(!newTva)} />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[12px] text-muted-foreground">Éligible Portage JUMP</span>
                <ToggleSwitch checked={newPortage} onChange={() => setNewPortage(!newPortage)} />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[12px] text-muted-foreground">Paiement en plusieurs fois</span>
                <ToggleSwitch checked={!!newMaxInstallments && newMaxInstallments > 1} onChange={() => setNewMaxInstallments(newMaxInstallments && newMaxInstallments > 1 ? undefined : 3)} />
              </div>
              {newMaxInstallments && newMaxInstallments > 1 && (
                <div>
                  <label className="section-label mb-2 block">Nombre de fois max</label>
                  <input type="number" value={newMaxInstallments} onChange={e => setNewMaxInstallments(Number(e.target.value) || undefined)}
                    min={2} max={12} className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
                </div>
              )}
              <div className="flex items-center justify-between py-1">
                <span className="text-[12px] text-muted-foreground">Suivi des séances (CRM)</span>
                <ToggleSwitch checked={newSessionTracking} onChange={() => setNewSessionTracking(!newSessionTracking)} />
              </div>
              {newSessionTracking && (
                <div>
                  <label className="section-label mb-2 block">Séances min. à valider</label>
                  <input type="number" min={1} value={newMinSessionsValidate ?? ""} onChange={e => setNewMinSessionsValidate(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="ex : 4" className="w-full rounded-xl px-3 py-2.5 text-sm input-field" />
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button onClick={() => addOffre(false)} className="flex-1 py-3.5 rounded-2xl font-semibold text-sm text-white btn-primary">
                  ✓ Créer l'offre
                </button>
                <button onClick={() => addOffre(true)} className="px-4 py-3.5 rounded-2xl font-semibold text-sm text-muted-foreground"
                  style={{ background: "hsl(38 92% 55% / 0.1)", color: "hsl(38 92% 60%)" }}>
                  📝 Brouillon
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
