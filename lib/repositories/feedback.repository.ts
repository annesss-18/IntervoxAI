import { db } from '@/firebase/admin'
import { Feedback } from '@/types'
import { logger } from '@/lib/logger'

export const FeedbackRepository = {
  async create(data: Omit<Feedback, 'id' | 'createdAt'> & { createdAt: string }): Promise<string> {
    try {
      const docRef = await db.collection('feedback').add(data)
      return docRef.id
    } catch (error) {
      logger.error('Error creating feedback:', error)
      throw new Error('Failed to create feedback')
    }
  },

  async findByInterviewId(interviewId: string, userId: string): Promise<Feedback | null> {
    try {
      const snapshot = await db
        .collection('feedback')
        .where('interviewId', '==', interviewId)
        .where('userId', '==', userId)
        .limit(1)
        .get()

      if (snapshot.empty) return null
      const doc = snapshot.docs[0]
      if (!doc) return null // Extra safety, though snapshot.empty checks it
      return { id: doc.id, ...doc.data() } as Feedback
    } catch (error) {
      logger.error(`Error fetching feedback for interview ${interviewId}:`, error)
      return null
    }
  },

  async findManyByInterviewIds(
    interviewIds: string[],
    userId: string
  ): Promise<Map<string, number>> {
    if (interviewIds.length === 0) return new Map()

    const feedbackMap = new Map<string, number>()

    // Batch fetch (limit 10 for 'in' queries)
    const uniqueIds = Array.from(new Set(interviewIds))

    for (let i = 0; i < uniqueIds.length; i += 10) {
      const batch = uniqueIds.slice(i, i + 10)
      try {
        const snapshot = await db
          .collection('feedback')
          .where('interviewId', 'in', batch)
          .where('userId', '==', userId)
          .get()

        snapshot.docs.forEach((doc) => {
          const data = doc.data()
          feedbackMap.set(data.interviewId, data.totalScore)
        })
      } catch (error) {
        logger.error('Error batch fetching feedback:', error)
      }
    }

    return feedbackMap
  },
}
