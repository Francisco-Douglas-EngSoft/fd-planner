/* Carregado pelo service worker do app (importScripts): abre a tela certa ao tocar num aviso. */
self.addEventListener("notificationclick", (event) => {
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ("focus" in c) {
          if ("navigate" in c) c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(url) : undefined;
    }),
  );
});
