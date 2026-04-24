import { FinanceEntry, Offre } from "@/data/types";
import { TAUX_TVA, getTauxUrssaf } from "@/lib/constants";

/** Vrai si l'offre de l'entrée est marquée `portageEligible`. */
export function isPortageEligible(entry: Pick<FinanceEntry, "offre">, offres: Offre[]): boolean {
  if (!entry.offre) return false;
  const o = offres.find(of => of.name === entry.offre);
  return o?.portageEligible ?? false;
}

/**
 * Détermine si une entrée contribue au CA déclaré en micro-entreprise pour le mois donné.
 *
 * Règles (unifiées Finances / Bilan / Stats) :
 * - Si portage actif ce mois ET offre portage-éligible → exclu (passe en portage).
 * - Si paiement en espèces → dépend strictement de `cashDeclaration` == "micro".
 * - Sinon si portage INactif → inclus (tout le reste est micro).
 * - Sinon (portage actif, offre non-éligible) → inclus seulement si `type === "micro"`.
 */
export function isDeclaredMicro(
  entry: FinanceEntry,
  offres: Offre[],
  portageMonths: Record<string, boolean>,
): boolean {
  const portageOn = portageMonths[entry.month] ?? false;
  if (portageOn && isPortageEligible(entry, offres)) return false;
  if (entry.paymentMode === "especes") return entry.cashDeclaration === "micro";
  if (!portageOn) return true;
  return entry.type === "micro";
}

/**
 * Détermine si une entrée est déclarée via le portage salarial ce mois-ci.
 * Retourne toujours `false` si le portage n'est pas activé pour ce mois.
 */
export function isDeclaredPortage(
  entry: FinanceEntry,
  offres: Offre[],
  portageMonths: Record<string, boolean>,
): boolean {
  const portageOn = portageMonths[entry.month] ?? false;
  if (!portageOn) return false;
  if (isPortageEligible(entry, offres)) return true;
  if (entry.paymentMode === "especes") return entry.cashDeclaration === "portage";
  return entry.type === "portage";
}

/** Vrai si une entrée est une espèce non déclarée (ni micro ni portage). */
export function isEspecesNonDeclaree(entry: FinanceEntry): boolean {
  return entry.paymentMode === "especes" && entry.cashDeclaration === "non_declare";
}

/** Somme du CA micro déclarable pour l'ensemble des entrées (multi-mois compatible). */
export function sumMicroCA(
  entries: FinanceEntry[],
  offres: Offre[],
  portageMonths: Record<string, boolean>,
): number {
  return entries
    .filter(e => isDeclaredMicro(e, offres, portageMonths))
    .reduce((s, e) => s + e.amount, 0);
}

/** Somme du CA déclaré en portage (0 si portage désactivé partout). */
export function sumPortageCA(
  entries: FinanceEntry[],
  offres: Offre[],
  portageMonths: Record<string, boolean>,
): number {
  return entries
    .filter(e => isDeclaredPortage(e, offres, portageMonths))
    .reduce((s, e) => s + e.amount, 0);
}

/** Somme des espèces non déclarées (incluse dans le "total réel" mais pas dans l'URSSAF). */
export function sumEspecesNonDeclarees(entries: FinanceEntry[]): number {
  return entries
    .filter(isEspecesNonDeclaree)
    .reduce((s, e) => s + e.amount, 0);
}

/**
 * Total réel d'un mois : tout ce qui rentre, quel que soit le canal déclaratif.
 * Source unique pour les tuiles "Revenus" / "CA" affichés dans Finances et Bilan.
 */
export function computeMonthlyTotalReel(
  monthEntries: FinanceEntry[],
  baSalesTotal: number,
  fjmRevenuTotal: number = 0,
): number {
  return monthEntries.reduce((s, e) => s + e.amount, 0) + baSalesTotal + fjmRevenuTotal;
}

/**
 * Total réel annuel : somme des entrées locales de l'année + ba_sales. FJM hors scope annuel
 * (FJM se charge par mois, agrégeable si besoin à l'appelant).
 */
export function computeYearlyTotalReel(
  financeEntries: FinanceEntry[],
  baSalesTotal: number,
  year: number,
): number {
  const local = financeEntries
    .filter(e => e.month.startsWith(String(year)))
    .reduce((s, e) => s + e.amount, 0);
  return local + baSalesTotal;
}

/**
 * Calcul de cotisations URSSAF — unique point d'application du taux.
 * Taux piloté par `year` (défaut : année courante). Voir `getTauxUrssaf`.
 */
export function computeUrssaf(microCA: number, year: number = new Date().getFullYear()): number {
  return microCA * getTauxUrssaf(year);
}

/** Calcul de TVA collectée sur un ensemble d'entrées dont l'offre a `tvaEnabled`. */
export function computeTVACollectee(entries: FinanceEntry[], offres: Offre[]): number {
  const base = entries
    .filter(e => {
      const o = offres.find(of => of.name === e.offre);
      return o?.tvaEnabled;
    })
    .reduce((s, e) => s + e.amount, 0);
  return base * TAUX_TVA;
}
