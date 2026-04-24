// Taux et seuils fiscaux — source unique de vérité.
// Mettre à jour ici pour propager à toute l'app (Finances, Bilan, Stats, PDF).

/**
 * Taux URSSAF micro-entrepreneur BNC (prestations libérales), par année.
 * Source : loi de finances + barèmes CIPAV. Étendre au fil des années.
 */
export const TAUX_URSSAF_BY_YEAR: Record<number, number> = {
  2023: 0.211,
  2024: 0.211,
  2025: 0.231,
  2026: 0.261,
};

/** Taux appliqué quand l'année n'est pas connue (le plus récent déclaré). */
const TAUX_URSSAF_DEFAULT = 0.261;

/** Retourne le taux URSSAF pour une année donnée, avec fallback sur le plus récent. */
export function getTauxUrssaf(year: number): number {
  return TAUX_URSSAF_BY_YEAR[year] ?? TAUX_URSSAF_DEFAULT;
}

/** Taux URSSAF de l'année courante — pratique pour les labels UI. */
export const TAUX_URSSAF = getTauxUrssaf(new Date().getFullYear());

/** Seuil de franchise TVA micro-entrepreneur — prestations de services. */
export const SEUIL_TVA = 36800;

/** Seuil de chiffre d'affaires micro-entreprise — prestations de services. */
export const SEUIL_MICRO = 77700;

/** Taux de TVA standard appliqué aux offres `tvaEnabled`. */
export const TAUX_TVA = 0.20;

/** Prorata de la part pro affectée aux locaux & bureaux (ex : 13 / 43 ≈ 30.23 %). */
export const PRORATA_BUREAU = 13 / 43;

/** Helper d'affichage : "26.1 %" pour UI / PDF (année courante). */
export const TAUX_URSSAF_LABEL = `${(TAUX_URSSAF * 100).toFixed(1)} %`;

/** Formate un taux en pourcentage français avec virgule ("26,1 %"). */
export function formatTaux(rate: number): string {
  return `${(rate * 100).toFixed(1).replace(".", ",")} %`;
}
