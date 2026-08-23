import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'demo-app.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'demo-block-fuel',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'demo-block-fuel.appspot.com',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: process.env.FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000',
};

// Initialize Firebase safely (Server-side)
let app: any;
let db: Firestore;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
} catch (err) {
  console.warn('Firebase initialization warning:', err);
  app = {} as any;
  db = {} as Firestore;
}

export { app, db };
