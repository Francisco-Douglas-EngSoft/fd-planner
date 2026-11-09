/**
 * fetch com tempo limite para leituras (GET/HEAD) ao Supabase.
 * Se o servidor travar (ex.: 504), a chamada falha rápido e o app usa
 * os dados guardados no aparelho em vez de ficar carregando para sempre.
 * Uploads e escritas não recebem limite (arquivos grandes demoram).
 */
export const READ_TIMEOUT_MS = 12_000;

export function createTimeoutFetch(
  baseFetch: typeof fetch = (...a) => fetch(...a),
  timeoutMs = READ_TIMEOUT_MS,
): typeof fetch {
  return (input, init = {}) => {
    const method = (init.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const isRead = method === "GET" || method === "HEAD";
    if (!isRead || url.includes("/storage/v1/") || init.signal) return baseFetch(input, init);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return baseFetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
  };
}
