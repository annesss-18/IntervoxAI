import { db } from '@/firebase/admin'
import { User } from '@/types'
import { logger } from '@/lib/logger'

export const UserRepository = {
  findById: async (uid: string): Promise<User | null> => {
    try {
      const doc = await db.collection('users').doc(uid).get()
      if (!doc.exists) return null
      return { id: doc.id, ...doc.data() } as User
    } catch (error) {
      logger.error(`Error finding user by id ${uid}:`, error)
      throw new Error('Failed to fetch user')
    }
  },

  exists: async (uid: string): Promise<boolean> => {
    try {
      const doc = await db.collection('users').doc(uid).get()
      return doc.exists
    } catch (error) {
      logger.error(`Error checking user existence ${uid}:`, error)
      throw error
    }
  },

  create: async (uid: string, data: Omit<User, 'id'>): Promise<void> => {
    try {
      await db.collection('users').doc(uid).set(data)
    } catch (error) {
      logger.error(`Error creating user ${uid}:`, error)
      throw new Error('Failed to create user')
    }
  },

  createTransactionally: async (uid: string, data: Omit<User, 'id'>): Promise<void> => {
    try {
      await db.runTransaction(async (t) => {
        const ref = db.collection('users').doc(uid)
        const doc = await t.get(ref)
        if (doc.exists) {
          throw new Error('User already exists')
        }
        t.set(ref, data)
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'User already exists') {
        throw error
      }
      logger.error(`Error creating user transactionally ${uid}:`, error)
      throw new Error('Failed to create user')
    }
  },
}
