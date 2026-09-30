import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAGFIxx2gCRLEjYeOZw0kBFTlFNEXpxUIk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "panal-9ebad.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "panal-9ebad",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "panal-9ebad.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "3359727417",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:3359727417:web:e281fcb119aac8e22292e8",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-R2HHNTQL60",
};

export const isFirebaseConfigured = true;

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
