import { auth } from '@/firebase/admin'
import { cookies } from 'next/headers'
import { SignInParams, SignUpParams, User } from '@/types'
import { UserRepository } from '@/lib/repositories/user.repository'
import { logger } from '@/lib/logger'
import { signInSchema, signUpSchema } from '@/lib/schemas'

const SESSION_EXPIRY = 60 * 60 * 24 * 5 // 5 days

export const AuthService = {
  async signUp(params: SignUpParams) {
    const validation = signUpSchema.safeParse(params)
    if (!validation.success) {
      throw new Error('Invalid input data')
    }
    const { uid, name, email, idToken } = validation.data

    await UserRepository.createTransactionally(uid, { name, email })
    if (idToken) {
      await this.setSessionCookie(idToken)
    }
    return { success: true }
  },

  async signIn(params: SignInParams) {
    const validation = signInSchema.safeParse(params)
    if (!validation.success) {
      throw new Error('Invalid input data')
    }
    const { email, idToken } = validation.data

    // Verify user exists in Auth
    try {
      await auth.getUserByEmail(email)
    } catch {
      throw new Error('User not found')
    }

    await this.setSessionCookie(idToken)
    return { success: true }
  },

  async setSessionCookie(idToken: string) {
    const cookieStore = await cookies()
    const isProduction =
      process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'

    try {
      // Create session cookie
      const sessionCookie = await auth.createSessionCookie(idToken, {
        expiresIn: SESSION_EXPIRY * 1000,
      })

      cookieStore.set('session', sessionCookie, {
        maxAge: SESSION_EXPIRY,
        httpOnly: true,
        secure: isProduction,
        path: '/',
        sameSite: 'lax',
      })
    } catch (error) {
      logger.error('Error setting session cookie:', error)
      throw new Error('Failed to create session')
    }
  },

  async getCurrentUser(): Promise<User | null> {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    if (!sessionCookie) return null

    try {
      // Check for revocation
      const decodedClaims = await auth.verifySessionCookie(sessionCookie, true)
      return await UserRepository.findById(decodedClaims.uid)
    } catch (error) {
      logger.error('Error verifying session cookie:', error)
      return null
    }
  },

  async googleAuthenticate(params: { uid: string; email: string; name: string; idToken: string }) {
    const { uid, email, name, idToken } = params

    // Optimistically try to create, if it exists, proceed to sign in
    try {
      await UserRepository.createTransactionally(uid, { name, email })
    } catch (e: unknown) {
      // If user already exists, that's fine for Google Auth, we just sign them in.
      // But strict transaction error checking is good practice.
      if (e instanceof Error && e.message === 'User already exists') {
        // User exists, proceed to set cookie
      } else {
        throw e
      }
    }

    await this.setSessionCookie(idToken)
    return { success: true }
  },
}
