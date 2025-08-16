// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCmmIn2xhY2TCr7Qsdmm80wug2f4I4ZxMU",
  authDomain: "bananacare-12432.firebaseapp.com",
  projectId: "bananacare-12432",
  storageBucket: "bananacare-12432.firebasestorage.app",
  messagingSenderId: "489425905298",
  appId: "1:489425905298:web:6f3a1bb68179fe5650284b",
  measurementId: "G-08SR58ND6L"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// ✅ 로그인 관련
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// ✅ Firestore 데이터베이스
export const db = getFirestore(app);