import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
  type MessagePayload,
} from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";
import { firebaseConfig, firebaseVapidKey, isFirebaseConfigured } from "./firebaseConfig";

let appInstance: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (!appInstance) {
    appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return appInstance;
}

async function getMessagingIfSupported(): Promise<Messaging | null> {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    if (!(await isSupported())) return null;
  } catch {
    return null;
  }
  return getMessaging(app);
}

async function registerMessagingServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (!("serviceWorker" in navigator)) return undefined;
  // O SW de mensagens lê a config pública dos query params (mantém o arquivo genérico).
  const qs = new URLSearchParams({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  }).toString();
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${qs}`, {
    scope: "/firebase-cloud-messaging-push-scope",
  });
}

export interface EnableFcmResult {
  ok: boolean;
  token?: string;
  error?: "not_configured" | "unsupported" | "permission_denied" | "no_token" | "not_authenticated" | string;
}

/**
 * Solicita permissão, obtém o token FCM e o salva em `fcm_tokens`.
 * Idempotente: pode ser chamado quantas vezes quiser.
 */
export async function enableFcm(): Promise<EnableFcmResult> {
  try {
    if (!isFirebaseConfigured()) return { ok: false, error: "not_configured" };

    if (typeof Notification === "undefined") return { ok: false, error: "unsupported" };
    if (Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return { ok: false, error: "permission_denied" };
    }

    const messaging = await getMessagingIfSupported();
    if (!messaging) return { ok: false, error: "unsupported" };

    const swReg = await registerMessagingServiceWorker();
    const token = await getToken(messaging, {
      vapidKey: firebaseVapidKey,
      serviceWorkerRegistration: swReg,
    });
    if (!token) return { ok: false, error: "no_token" };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "not_authenticated" };

    const { error } = await supabase.from("fcm_tokens").upsert(
      {
        user_id: user.id,
        token,
        user_agent: navigator.userAgent,
        enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,token" },
    );
    if (error) return { ok: false, error: error.message };

    return { ok: true, token };
  } catch (e) {
    console.error("[fcm] enableFcm error", e);
    return { ok: false, error: (e as Error).message };
  }
}

/** Desativa o token FCM deste dispositivo. */
export async function disableFcm(): Promise<void> {
  try {
    const messaging = await getMessagingIfSupported();
    if (!messaging) return;
    const token = await getToken(messaging, { vapidKey: firebaseVapidKey }).catch(() => null);
    if (!token) return;
    await supabase.from("fcm_tokens").update({ enabled: false }).eq("token", token);
  } catch (e) {
    console.error("[fcm] disableFcm error", e);
  }
}

/** Escuta mensagens recebidas com o app em primeiro plano (aba aberta). */
export async function listenForegroundMessages(
  cb: (payload: MessagePayload) => void,
): Promise<() => void> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return () => {};
  return onMessage(messaging, cb);
}

/** Dispara uma notificação de teste via Edge Function (push real do FCM). */
export async function sendTestPush(): Promise<{ ok: boolean; error?: string; sent?: number }> {
  const { data, error } = await supabase.functions.invoke("send-notification", {
    body: {
      title: "🔔 Teste de Notificação",
      body: "As notificações push do FD-Planner estão funcionando!",
      type: "test",
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, sent: (data as { sent?: number })?.sent ?? 0 };
}

export interface TestNotification {
  title: string;
  body: string;
  type: string;
}

/** Todos os tipos de notificação do sistema, usados no teste completo. */
export const TEST_NOTIFICATIONS: TestNotification[] = [
  {
    title: "⏰ Hora de estudar!",
    body: "Está na hora da sua sessão de estudos. Vamos focar!",
    type: "study_reminder",
  },
  {
    title: "🎯 Sessão de foco iniciada",
    body: "Seu Pomodoro começou. Mantenha o foco pelos próximos minutos!",
    type: "pomodoro_start",
  },
  {
    title: "☕ Hora da pausa!",
    body: "Você completou uma sessão de foco. Descanse um pouco antes de voltar.",
    type: "pomodoro_break",
  },
  {
    title: "✅ Tarefa próxima do prazo",
    body: "Você tem uma tarefa chegando no prazo. Não esqueça de concluí-la!",
    type: "task_reminder",
  },
  {
    title: "🛡️ Alerta Anti-Vício",
    body: "Horário crítico detectado. Mantenha o controle e foque nos seus objetivos!",
    type: "impulse_alert",
  },
  {
    title: "🏆 Conquista desbloqueada!",
    body: "Parabéns! Você atingiu uma nova meta de estudos.",
    type: "achievement",
  },
  {
    title: "🎁 Recompensa disponível",
    body: "Você completou seu período de estudos. Resgate a sua recompensa!",
    type: "reward",
  },
];

/**
 * Dispara TODAS as notificações de teste do sistema via Edge Function (push real),
 * uma por vez para evitar rate limit. Retorna quantos pushes foram entregues.
 */
export async function sendAllTestPush(): Promise<{
  ok: boolean;
  delivered: number;
  total: number;
  error?: string;
}> {
  let delivered = 0;
  let lastError: string | undefined;
  for (const n of TEST_NOTIFICATIONS) {
    const { data, error } = await supabase.functions.invoke("send-notification", {
      body: { title: n.title, body: n.body, type: n.type },
    });
    if (error) {
      lastError = error.message;
    } else {
      delivered += (data as { sent?: number })?.sent ?? 0;
    }
    // Pequeno intervalo entre envios para não saturar o FCM.
    await new Promise((r) => setTimeout(r, 700));
  }
  return { ok: lastError === undefined, delivered, total: TEST_NOTIFICATIONS.length, error: lastError };
}

export { isFirebaseConfigured };
