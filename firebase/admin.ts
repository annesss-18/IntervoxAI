import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";

const initFirebaseAdmin = () => {
  const apps = getApps();

  if (!apps.length) {
    if (
      !process.env.FIREBASE_PRIVATE_KEY ||
      !process.env.FIREBASE_CLIENT_EMAIL ||
      !process.env.FIREBASE_PROJECT_ID
    ) {
      // Skip admin init when service-account env vars are missing.
      console.warn(
        "Firebase service account not found. Skipping initialization - set FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL and FIREBASE_PROJECT_ID to enable Firebase admin features.",
      );
    } else {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };

      initializeApp({
        credential: cert(serviceAccount),
      });
    }
  }

  // Return throw-on-access proxies when admin SDK is unavailable.
  if (getApps().length) {
    return {
      auth: getAuth(),
      db: getFirestore("prod"),
    };
  }

  const thrower = (name: string) =>
    new Proxy(
      {},
      {
        get: () => {
          throw new Error(
            `Firebase admin not initialized: attempted to access ${name}. Set service account env vars to initialize.`,
          );
        },
      },
    ) as unknown;

  return {
    auth: thrower("auth") as unknown as Auth,
    db: thrower("db") as unknown as Firestore,
  };
};

export const { auth, db } = initFirebaseAdmin();
