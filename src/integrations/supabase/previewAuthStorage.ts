/**
 * Provedor de storage para autenticação do Supabase.
 * Retorna `localStorage` por padrão. A lógica de broker de preview
 * foi removida após a migração para ambiente de produção próprio.
 */
export interface PreviewAuthStorage {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

export function brokeredPreviewStorage(): PreviewAuthStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  return localStorage;
}
