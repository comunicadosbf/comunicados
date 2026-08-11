// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyASpIjgM--vLfMEuH2QXtKFyztTnl-FeuQ",
  authDomain: "beeper-escalacion-bmm.firebaseapp.com",
  projectId: "beeper-escalacion-bmm",
  storageBucket: "beeper-escalacion-bmm.firebasestorage.app",
  messagingSenderId: "664163671037",
  appId: "1:664163671037:web:6d1712d8c878df760a1794"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const messaging = getMessaging(app);

export const VAPID_KEY = "BJupmmhl64A_4-D0MVCFhFlKVFmj4WqgJhTHImXgY1SLC6WWMlrJb0QMMWPGObm194hNkZHxb-5hiTc1zktLRsY";

export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwqyCSeX4o7LH9P02GtZo3EodZ5t9LqPb9aMfwCF6Xf3iDp2WV6VGAQhQvwhQBNHVdE/exec";

// Inicia sesión anónima automáticamente al cargar cualquier página
export function iniciarSesionAnonima() {
  return signInAnonymously(auth);
}