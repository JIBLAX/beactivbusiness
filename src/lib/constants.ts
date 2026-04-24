// Taux et seuils fiscaux — source unique de vérité.
// Mettre à jour ici pour propager à toute l'app (Finances, Bilan, Stats, PDF).

/** Taux URSSAF micro-entrepreneur BNC (prestations libérales). 2026 = 26.1 %. */
export const TAUX_URSSAF = 0.261;

/** Seuil de franchise TVA micro-entrepreneur — prestations de services. */
export const SEUIL_TVA = 36800;

/** Seuil de chiffre d'affaires micro-entreprise — prestations de services. */
export const SEUIL_MICRO = 77700;

/** Taux de TVA standard appliqué aux offres `tvaEnabled`. */
export const TAUX_TVA = 0.20;

/** Prorata de la part pro affectée aux locaux & bureaux (ex : 13 / 43 ≈ 30.23 %). */
export const PRORATA_BUREAU = 13 / 43;

/** Helper d'affichage : "26.1 %" pour UI / PDF. */
export const TAUX_URSSAF_LABEL = `${(TAUX_URSSAF * 100).toFixed(1)} %`;
