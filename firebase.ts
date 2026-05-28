import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';
// @ts-ignore
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore to prevent 'Could not reach backend' issues in some environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Safe initialization of messaging that avoids errors in cross-origin iframes
export const messaging = (typeof window !== 'undefined' && 'Notification' in window && window.self === window.top) 
  ? getMessaging(app) 
  : null;

