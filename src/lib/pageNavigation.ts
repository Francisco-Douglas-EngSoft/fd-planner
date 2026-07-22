/**
 * Restringe o número da página ao intervalo válido [1, total].
 * - Se o total ainda não é conhecido (0 ou negativo), preserva o valor
 *   original desde que seja >= 1, senão retorna 1.
 * - Aceita valores fracionários (arredonda) e strings numéricas.
 */
export function clampPage(page: number | string, total: number): number {
  const n = typeof page === "string" ? Number(page) : page;
  if (!Number.isFinite(n)) return 1;
  const rounded = Math.floor(n);
  if (!total || total < 1) return rounded < 1 ? 1 : rounded;
  if (rounded < 1) return 1;
  if (rounded > total) return total;
  return rounded;
}

/** True quando a contagem total de páginas ainda não foi detectada. */
export function isPageCountLoading(total: number): boolean {
  return !total || total < 1;
}