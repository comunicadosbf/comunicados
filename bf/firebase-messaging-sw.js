// firebase-messaging-sw.js
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

// Cuando llega un push y la app está CERRADA o en 2do plano
messaging.onBackgroundMessage((payload) => {
  console.log("Push recibido en 2do plano:", payload);

  const titulo = payload.notification?.title || "🔔 Nueva alerta - Beeper BMM";
  const opciones = {
    body: payload.notification?.body || "Tienes una alerta pendiente",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    vibrate: [300, 100, 300, 100, 300], // patrón de vibración insistente
    tag: "beeper-alerta", // agrupa notificaciones repetidas en una sola
    requireInteraction: true, // la notificación NO desaparece sola
    data: {
      alertaId: payload.data?.alertaId || null,
      url: "./beeper.html"
    }
  };

  self.registration.showNotification(titulo, opciones);
});

// Cuando el usuario TOCA la notificación → abre/enfoca la app en beeper.html
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const url = event.notification.data?.url || "./beeper.html";

      // Si ya hay una ventana abierta, enfócala
      for (const client of clientList) {
        if (client.url.includes("beeper.html") && "focus" in client) {
          return client.focus();
        }
      }
      // Si no, abre una nueva
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});