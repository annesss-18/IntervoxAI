import { db } from '@/firebase/admin'
import { Interview, SessionCardData } from '@/types'
import { logger } from '@/lib/logger'

export const InterviewRepository = {
  async findByUserId(userId: string): Promise<any[]> {
    // returning raw data, mapped in service
    try {
      const snapshot = await db
        .collection('interview_sessions')
        .where('userId', '==', userId)
        .orderBy('startedAt', 'desc')
        .get()

      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      logger.error('Error fetching interview sessions:', error)
      return []
    }
  },

  async findById(id: string): Promise<any | null> {
    try {
      const doc = await db.collection('interview_sessions').doc(id).get()
      if (!doc.exists) return null
      return { id: doc.id, ...doc.data() }
    } catch (error) {
      logger.error(`Error fetching interview session ${id}:`, error)
      return null
    }
  },

  async update(id: string, data: Partial<Interview>): Promise<void> {
    try {
      await db.collection('interview_sessions').doc(id).update(data)
    } catch (error) {
      logger.error(`Error updating session ${id}:`, error)
      throw new Error('Failed to update session')
    }
  },
}
