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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);

      if (!user) {
        const hadAuthenticatedUser = lastUserIdRef.current !== null;
        lastUserIdRef.current = null;
        if (hadAuthenticatedUser) {
          await fetch("/api/auth/signout", {
            method: "POST",
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
