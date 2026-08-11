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

// ============ CACHÉ DE ARCHIVOS ESTÁTICOS (para carga rápida en datos móviles) ============
// IMPORTANTE: esto NUNCA cachea Apps Script, Firestore, Auth ni FCM — solo archivos
// que no cambian (HTML/JS propios, fuentes de Google, SDK de Firebase, íconos).
const CACHE_VERSION = "beeper-shell-v1";

const ARCHIVOS_PROPIOS = [
  "./",
  "./index.html",
  "./emisor.html",
  "./beeper.html",
  "./firebase-config.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Dominios externos que SÍ es seguro cachear (contenido estático, no datos)
function esEstaticoPermitido(url) {
  if (url.origin === self.location.origin) return true; // nuestros propios archivos
  if (url.hostname === "fonts.googleapis.com") return true; // hoja de estilos de fuentes
  if (url.hostname === "fonts.gstatic.com") return true; // archivos de fuente
  if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) return true; // SDK de Firebase
  return false; // TODO lo demás (Apps Script, Firestore, Auth, FCM) NUNCA se cachea
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ARCHIVOS_PROPIOS)).catch((err) => {
      console.warn("No se pudo precachear todo el app shell:", err);
    })
  );
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Solo GET, y solo si está en la lista blanca de contenido estático
  if (event.request.method !== "GET" || !esEstaticoPermitido(url)) {
    return; // no interceptar: pasa directo a la red, tal como si no hubiera Service Worker
  }

  event.respondWith(
    caches.match(event.request).then((cacheado) => {
      if (cacheado) {
        // Cache-first: responde rápido, y de paso actualiza el caché en segundo plano
        fetch(event.request).then((res) => {
          if (res && res.ok) {
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, res));
          }
        }).catch(() => {});
        return cacheado;
      }
      // No estaba en caché: ve a la red y guárdalo para la próxima vez
      return fetch(event.request).then((res) => {
        if (res && res.ok) {
          const copia = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copia));
        }
        return res;
      });
    })
  );
});

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

    const titulo = payload.notification?.title || "⚠️ Nueva Alerta - Beeper BMM";
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

// Limpia versiones viejas del caché y toma control inmediatamente al actualizarse
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((nombres) =>
        Promise.all(nombres.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))
      ),
      clients.claim()
    ])
  );
});
