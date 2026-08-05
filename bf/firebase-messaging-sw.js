importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyASpIjgM--vLfMEuH2QXtKFyztTnl-FeuQ",
  authDomain: "beeper-escalacion-bmm.firebaseapp.com",
  projectId: "beeper-escalacion-bmm",
  storageBucket: "beeper-escalacion-bmm.firebasestorage.app",
  messagingSenderId: "664163671037",
  appId: "1:664163671037:web:6d1712d8c878df760a1794"
});

const messaging = firebase.messaging();

const DEDUP_CACHE = "beeper-dedup-v1";
const VENTANA_DEDUP_MS = 8000; // 8 segundos

// ---------- Verifica (de forma persistente) si ya mostramos este push ----------
async function esDuplicado(alertaId) {
  if (!alertaId) return false;

  const cache = await caches.open(DEDUP_CACHE);
  const clave = new Request("https://dedup.local/" + alertaId);
  const existente = await cache.match(clave);

  if (existente) {
    const data = await existente.json();
    const ahora = Date.now();
    if (ahora - data.ts < VENTANA_DEDUP_MS) {
      return true; // duplicado dentro de la ventana de tiempo
    }
  }

  // guarda/actualiza el timestamp de este alertaId
  await cache.put(clave, new Response(JSON.stringify({ ts: Date.now() })));
  return false;
}

messaging.onBackgroundMessage((payload) => {
  const alertaId = payload.data?.alertaId || null;

  const manejar = async () => {
    if (await esDuplicado(alertaId)) {
      console.log("Push duplicado ignorado:", alertaId);
      return;
    }

    const titulo = payload.notification?.title || "🔔 Nueva alerta - Beeper BMM";
    const opciones = {
      body: payload.notification?.body || "Tienes una alerta pendiente",
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      vibrate: [300, 100, 300, 100, 300],
      tag: "beeper-alerta-" + alertaId, // tag único por alerta
      requireInteraction: true,
      data: {
        alertaId: alertaId,
        url: "./beeper.html"
      }
    };

    return self.registration.showNotification(titulo, opciones);
  };

  return manejar();
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const url = event.notification.data?.url || "./beeper.html";

      for (const client of clientList) {
        if (client.url.includes("beeper.html") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
