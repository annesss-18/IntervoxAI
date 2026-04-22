"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import { useRouter } from "next/navigation";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

// TODO: Remove MAINTENANCE_BYPASS after env rotation is complete.
const MAINTENANCE_BYPASS =
  process.env.NEXT_PUBLIC_MAINTENANCE_BYPASS_MODE === "true";

/**
 * Minimal mock user for maintenance bypass mode.
 * This is cast to Firebase's User type — only the fields the UI actually reads
 * (uid, displayName, email, photoURL) are populated. Firebase SDK methods on
 * this object will throw, but they are never called during browse-only bypass.
 */
const MOCK_FIREBASE_USER = MAINTENANCE_BYPASS
  ? ({
      uid: "demo-user-maintenance",
      displayName: "Maintenance User",
      email: "maintenance@intervoxai.com",
      photoURL: null,
      emailVerified: true,
    } as unknown as User)
  : null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(
    MAINTENANCE_BYPASS ? MOCK_FIREBASE_USER : null,
  );
  const [loading, setLoading] = useState(!MAINTENANCE_BYPASS);
  const router = useRouter();
  const lastUserIdRef = useRef<string | null>(
    MAINTENANCE_BYPASS ? "demo-user-maintenance" : null,
  );

  useEffect(() => {
    // In bypass mode, skip Firebase Auth entirely — the mock user is already set.
    if (MAINTENANCE_BYPASS) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);

      if (!user) {
        const hadAuthenticatedUser = lastUserIdRef.current !== null;
        lastUserIdRef.current = null;
        if (hadAuthenticatedUser) {
          await fetch("/api/auth/signout", {
            method: "DELETE",
            credentials: "same-origin",
          }).catch(() => undefined);
          router.refresh();
        }
        return;
      }

      const userChanged = lastUserIdRef.current !== user.uid;
      lastUserIdRef.current = user.uid;

      if (userChanged) {
        router.refresh();
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
