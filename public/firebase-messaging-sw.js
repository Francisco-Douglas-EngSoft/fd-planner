/* Service worker de mensagens do Firebase (push em segundo plano).
   NÃO é o SW de cache do app — é dedicado ao FCM, conforme o guia PWA. */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// A config pública chega pelos query params usados no register().
const params = new URL(location).searchParams;
const firebaseConfig = {
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
};

if (firebaseConfig.projectId && firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title =
      (payload.notification && payload.notification.title) ||
      (payload.data && payload.data.title) ||
      "FD-Planner";
    const options = {
      body:
        (payload.notification && payload.notification.body) ||
        (payload.data && payload.data.body) ||
        "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: (payload.data && payload.data.tag) || "fdplanner",
      data: payload.data || {},
    };
    self.registration.showNotification(title, options);
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
