import type { FirebaseApp } from 'firebase/app';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function getRequiredEnv(key: keyof FirebaseConfig): string {
  const value = import.meta.env[`VITE_FIREBASE_${key.toUpperCase()}`];
  if (!value) {
    throw new Error(`Missing Firebase config: VITE_FIREBASE_${key.toUpperCase()}`);
  }
  return value;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: getRequiredEnv('apiKey'),
  authDomain: getRequiredEnv('authDomain'),
  projectId: getRequiredEnv('projectId'),
  storageBucket: getRequiredEnv('storageBucket'),
  messagingSenderId: getRequiredEnv('messagingSenderId'),
  appId: getRequiredEnv('appId'),
};

const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { app, auth, db, provider, signInWithPopup, signOut };
