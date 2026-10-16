import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth, signInAnonymously } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";

// NEXT_PUBLIC_* values are inlined at build time, so each must be referenced literally.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

function app(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(config);
}

export function db(): Firestore {
  return getFirestore(app());
}

export function auth(): Auth {
  return getAuth(app());
}

/** Anonymous sign-in, reusing the existing session if there is one. Returns the uid. */
export async function ensureSignedIn(): Promise<string> {
  const a = auth();
  await a.authStateReady();
  if (a.currentUser) return a.currentUser.uid;
  const cred = await signInAnonymously(a);
  return cred.user.uid;
}
