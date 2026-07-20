/**
 * Fetches all rows from a Supabase query in chunks (default 500) using
 * `.range(from, to)` to avoid the 1000-row default limit and to keep memory
 * pressure predictable on large datasets.
 *
 * Usage:
 *   const rows = await fetchAllPaginated(
 *     () => supabase.from("focus_sessions").select("id, duration_minutes"),
 *   );
 */
type Rangeable<T> = {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
};

export async function fetchAllPaginated<T>(
  buildQuery: () => Rangeable<T>,
  chunkSize = 500,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  // Hard cap to protect against runaway loops (500 * 200 = 100k rows).
  for (let iter = 0; iter < 200; iter++) {
    const to = from + chunkSize - 1;
    const { data, error } = await buildQuery().range(from, to);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < chunkSize) break;
    from += chunkSize;
  }
  return all;
}