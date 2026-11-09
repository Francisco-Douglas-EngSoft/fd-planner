import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SYNC_CHANGED_EVENT } from "@/lib/offline/idbStore";
import { getPendingTotal, syncNow as runSync } from "@/lib/offline/syncAll";

/** Situação da conexão e quantas alterações aguardam envio. */
export function useSyncStatus() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => {
    void getPendingTotal(userId).then(setPending).catch(() => {});
  }, [userId]);

  useEffect(() => {
    const on = () => {
      setIsOnline(true);
      refresh();
    };
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener(SYNC_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    refresh();
    // Filas antigas (Foco, leitura) vivem no localStorage da mesma aba.
    const timer = setInterval(refresh, 5000);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener(SYNC_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      clearInterval(timer);
    };
  }, [refresh]);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      return await runSync();
    } finally {
      setSyncing(false);
      refresh();
    }
  }, [refresh]);

  return { isOnline, pending, syncing, syncNow };
}
