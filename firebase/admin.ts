import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _app: App | undefined;

function getApp(): App {
  if (_app) return _app;

  if (getApps().length > 0) {
    _app = getApps()[0]!;
    return _app;
  }

  _app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Restore escaped newlines in the environment variable.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });

  return _app;
}

let _auth: Auth | undefined;
let _db: Firestore | undefined;

// Initialize Auth lazily.
export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    if (!_auth) _auth = getAuth(getApp());
    return Reflect.get(_auth, prop, receiver);
  },
});

// Initialize Firestore lazily.
export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop, receiver) {
    if (!_db)
      _db = getFirestore(getApp(), process.env.FIREBASE_DATABASE_ID || "prod");
    return Reflect.get(_db, prop, receiver);
  },
});
