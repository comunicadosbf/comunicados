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

// ---------- PROTECCIÓN CONTRA PUSH DUPLICADOS (bug conocido de iOS Safari) ----------
const notificacionesRecientes = new Map(); // alertaId -> timestamp

function esDuplicado(alertaId) {
  if (!alertaId) return false;
  const ahora = Date.now();
  const anterior = notificacionesRecientes.get(alertaId);

  // limpia entradas viejas (más de 10 segundos) para no acumular memoria
  notificacionesRecientes.forEach((ts, id) => {
    if (ahora - ts > 10000) notificacionesRecientes.delete(id);
  });

  if (anterior && (ahora - anterior) < 5000) {
    return true; // ya se mostró esta misma alerta hace menos de 5 segundos
  }
  notificacionesRecientes.set(alertaId, ahora);
  return false;
}

messaging.onBackgroundMessage((payload) => {
  const alertaId = payload.data?.alertaId || null;

  if (esDuplicado(alertaId)) {
    console.log("Push duplicado ignorado:", alertaId);
    return;
  }

  const titulo = payload.notification?.title || "🔔 Nueva alerta - Beeper BMM";
  const opciones = {
    body: payload.notification?.body || "Tienes una alerta pendiente",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    vibrate: [300, 100, 300, 100, 300],
    tag: "beeper-alerta",
    requireInteraction: true,
    data: {
      alertaId: alertaId,
      url: "./beeper.html"
    }
  };

  self.registration.showNotification(titulo, opciones);
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
