/**
 * Guarda o último usuário logado para abrir o app sem internet,
 * mesmo quando o token de acesso expirou e não dá para renová-lo.
 * É apagado quando o usuário sai da conta.
 */
import type { User } from "@supabase/supabase-js";

const KEY = "fdplanner_offline_user_v1";

export function saveOfflineUser(user: User): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    /* noop */
  }
}

export function getOfflineUser(): User | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function getOfflineUserId(): string | null {
  return getOfflineUser()?.id ?? null;
}

export function clearOfflineUser(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
