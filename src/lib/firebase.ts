// Firebase Google sign-in. Loaded only when VITE_SIGNIN is on, so the live bundle stays small until then.
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as fbSignOut, type User } from 'firebase/auth';

// The client's Firebase web config. It isn't secret: Firebase limits it to the allowed domains.
const app = initializeApp({
  apiKey: 'AIzaSyB0cOtLF--pUE1NgPOKcjBni8P-ptiOryo',
  authDomain: 'chesspage-23270.firebaseapp.com',
  projectId: 'chesspage-23270',
  storageBucket: 'chesspage-23270.firebasestorage.app',
  messagingSenderId: '30627820756',
  appId: '1:30627820756:web:a7bc4bbc741a2b04aaf741',
});

const auth = getAuth(app);

export const watch = (fn: (u: User | null) => void) => onAuthStateChanged(auth, fn);

/** Google's page opens in its own window (a new tab on phones). Must run straight from the tap, or browsers block it. */
export const signIn = () => signInWithPopup(auth, new GoogleAuthProvider()).then(() => {});

export const signOut = () => fbSignOut(auth);

/** A fresh ID token for the server (Firebase renews it every hour). */
export const token = () => auth.currentUser?.getIdToken() ?? Promise.resolve(null);
