// src/firebase.jsx
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCmmIn2xhY2TCr7Qsdmm80wug2f4I4ZxMU",
  authDomain: "bananacare-12432.firebaseapp.com",
  projectId: "bananacare-12432",
  storageBucket: "bananacare-12432.firebasestorage.app",
  messagingSenderId: "489425905298",
  appId: "1:489425905298:web:6f3a1bb68179fe5650284b",
  measurementId: "G-08SR58ND6L",
};

const app = initializeApp(firebaseConfig);

// Analytics는 브라우저 환경에서만
try {
  if (typeof window !== "undefined") getAnalytics(app);
} catch {}

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
