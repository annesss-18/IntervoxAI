'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/firebase/client'
import { signOut as signOutAction } from '@/lib/actions/auth.action'
import { useRouter } from 'next/navigation'

type AuthContextType = {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      setLoading(false)

      if (!user) {
        // User logged out
        await signOutAction()
        router.refresh()
      } else {
        // User logged in or session refreshed
        // Ideally we also check/refresh the server cookie here if needed
        // For now, we rely on the login form to set the initial cookie using server action
        // But if the server cookie expires and the client is still logged in,
        // we might want to refresh it here.
        // Leaving that enhancement for later to keep this focused on the "not updating" issue.
        router.refresh()
      }
    })

    return () => unsubscribe()
  }, [router])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}
