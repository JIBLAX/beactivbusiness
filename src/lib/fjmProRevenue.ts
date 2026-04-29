/**
 * Les ventes Be Activ saisies dans Finances JM sont poussées vers ba_sales ET operations_pro.
 * Côté Business, ne pas additionner / afficher deux fois cette même catégorie.
 */
export const FJM_CATEGORY_SYNCED_IN_BA_SALES = "JM | Be Activ";

export function filterFjmProOtherRevenues<T extends { family: string; category: string }>(
  ops: T[],
): T[] {
  return ops.filter(
    (o) => o.family === "revenu" && o.category !== FJM_CATEGORY_SYNCED_IN_BA_SALES,
  );
}
