"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import {
  refreshSession,
  signOut as signOutAction,
} from "@/lib/actions/auth.action";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const isRefreshingSessionRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);

      if (!user) {
        const hadAuthenticatedUser = lastUserIdRef.current !== null;
        lastUserIdRef.current = null;
        if (hadAuthenticatedUser) {
          await signOutAction();
          router.refresh();
        }
        return;
      }

      const userChanged = lastUserIdRef.current !== user.uid;
      lastUserIdRef.current = user.uid;

      const sessionRefreshNeeded = document.cookie.includes(
        "session-refresh-needed=true",
      );
      let refreshedSession = false;

      if (sessionRefreshNeeded && !isRefreshingSessionRef.current) {
        isRefreshingSessionRef.current = true;
        try {
          const idToken = await user.getIdToken(true);
          const result = await refreshSession(idToken);
          refreshedSession = !!result?.success;
        } catch (error) {
          console.error("Failed to refresh server session cookie:", error);
        } finally {
          isRefreshingSessionRef.current = false;
        }
      }

      if (userChanged || refreshedSession) {
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
