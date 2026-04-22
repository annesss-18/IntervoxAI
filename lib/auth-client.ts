"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/firebase/client";
import { logger } from "@/lib/logger";

let signOutPromise: Promise<void> | null = null;

export async function signOutAndRedirect(): Promise<void> {
  if (signOutPromise) {
    return signOutPromise;
  }

  signOutPromise = (async () => {
    try {
      await signOut(auth);
      await fetch("/api/auth/signout", { method: "DELETE" });
    } catch (error) {
      logger.error("Client sign-out failed:", error);
    } finally {
      signOutPromise = null;
      window.location.assign("/sign-in");
    }
  })();

  return signOutPromise;
}
