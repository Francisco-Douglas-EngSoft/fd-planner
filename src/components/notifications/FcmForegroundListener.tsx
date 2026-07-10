import { useEffect } from "react";
import { toast } from "sonner";
import { listenForegroundMessages } from "@/lib/firebase";

/**
 * Escuta mensagens FCM recebidas com o app aberto (primeiro plano) e
 * as exibe como toast. Em segundo plano quem cuida é o firebase-messaging-sw.js.
 */
export function FcmForegroundListener() {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    listenForegroundMessages((payload) => {
      const title = payload.notification?.title ?? payload.data?.title ?? "FD-Planner";
      const body = payload.notification?.body ?? payload.data?.body ?? "";
      toast(title, { description: body });
    }).then((fn) => {
      unsubscribe = fn;
    });
    return () => unsubscribe?.();
  }, []);

  return null;
}
