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

const DB_NAME = "beeper-dedup-db";
const STORE_NAME = "pushes";

// ---------- Abre (o crea) la base de datos IndexedDB ----------
function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------- Intenta REGISTRAR este alertaId de forma atómica ----------
// Regresa true si YA EXISTÍA (duplicado) o false si se registró por primera vez
async function yaFueRegistrado(alertaId) {
  if (!alertaId) return false;

  const db = await abrirDB();

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    // add() falla si la llave ya existe -> eso es lo que nos da la atomicidad
    const req = store.add({ id: alertaId, ts: Date.now() });

    req.onsuccess = () => resolve(false); // se registró, NO era duplicado
    req.onerror = (e) => {
      e.preventDefault(); // evita que el error se propague como no manejado
      resolve(true); // ya existía -> SÍ es duplicado
    };
  });
}

messaging.onBackgroundMessage((payload) => {
  const alertaId = payload.data?.alertaId || null;

  const manejar = async () => {
    const esDup = await yaFueRegistrado(alertaId);
    if (esDup) {
      console.log("Push duplicado ignorado (IndexedDB):", alertaId);
      return;
    }

    const titulo = payload.notification?.title || "⚠️ Nueva alerta - Beeper BMM";
    const opciones = {
      body: payload.notification?.body || "Tienes una alerta pendiente",
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      vibrate: [300, 100, 300, 100, 300],
      tag: "beeper-alerta-" + alertaId,
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

// Fuerza que este Service Worker tome control inmediatamente al actualizarse
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));
