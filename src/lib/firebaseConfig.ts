// Configuração pública do Firebase Web (chaves publicáveis — seguras no código).
// Origem dos valores: Firebase Console → Configurações do projeto → Geral → Seus apps (Web).
// VAPID key: Cloud Messaging → Configuração da Web → Certificados push da Web.
//
// Você pode preenchê-las aqui como constantes OU via variáveis de ambiente
// VITE_FIREBASE_* (no .env local, na Vercel ou no Cloudflare).

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
} as const;

export const firebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? "";

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId &&
      firebaseVapidKey,
  );
}
