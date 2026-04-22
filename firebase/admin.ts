// Initialize Firebase Admin lazily.
//
// During the env-variable rotation window, Firebase credentials may be absent.
// Eager initialization (at import time) would crash the build because cert()
// requires a "project_id" string. Lazy initialization defers the crash to the
// first actual Firebase call, which the maintenance-bypass code paths avoid.
import {
  initializeApp,
  getApps,
  cert,
  type App,
} from "firebase-admin/app";
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
      // Newline escapes in env vars need to be converted back to real newlines.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });

  return _app;
}

let _auth: Auth | undefined;
let _db: Firestore | undefined;

/** Firebase Auth — initialized on first access. */
export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    if (!_auth) _auth = getAuth(getApp());
    return Reflect.get(_auth, prop, receiver);
  },
});

/** Firestore — initialized on first access. */
export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop, receiver) {
    if (!_db) _db = getFirestore(getApp(), process.env.FIREBASE_DATABASE_ID || "prod");
    return Reflect.get(_db, prop, receiver);
  },
});

