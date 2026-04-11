// Initialize Firebase Admin once.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Newline escapes in env vars need to be converted back to real newlines.
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
};

const app =
  getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0]!;

export const auth = getAuth(app);
export const db = getFirestore(app, process.env.FIREBASE_DATABASE_ID || "prod");
