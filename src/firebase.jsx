// src/firebase.jsx
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCmmIn2xhY2TCr7Qsdmm80wug2f4I4ZxMU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bananacare-12432.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bananacare-12432",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bananacare-12432.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "489425905298",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:489425905298:web:6f3a1bb68179fe5650284b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-08SR58ND6L",
};

const app = initializeApp(firebaseConfig);

// Analytics는 브라우저 환경에서만
try {
  if (typeof window !== "undefined") getAnalytics(app);
} catch {}

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
