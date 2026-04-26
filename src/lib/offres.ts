import { Offre } from "@/data/types";

/** Comparaison insensible à la casse et aux espaces/accents superflus. */
function normalize(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Cherche une offre par son nom OU par l'un de ses `aliases`.
 * Comparaison insensible à la casse et aux accents.
 *
 * Cela permet de relier les entrées libellées différemment (typos, variantes,
 * anciens noms) à la bonne offre du catalogue — sans perdre le lien thème /
 * portage / TVA / prix unitaire.
 */
export function findOffreByName(name: string | null | undefined, offres: Offre[]): Offre | undefined {
  if (!name) return undefined;
  const target = normalize(name);
  return offres.find(o => {
    if (normalize(o.name) === target) return true;
    return (o.aliases ?? []).some(a => normalize(a) === target);
  });
}
