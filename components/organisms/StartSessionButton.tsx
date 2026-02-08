'use client'

import React, { useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Loader2, PlayCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface StartSessionButtonProps {
  templateId: string
}

const StartSessionButton = ({ templateId }: StartSessionButtonProps) => {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleStart = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/interview/session/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateId }),
      })

      if (!response.ok) {
        let message = 'Failed to create session'
        try {
          const errorData = await response.json()
          if (typeof errorData?.error === 'string' && errorData.error.length > 0) {
            message = errorData.error
          }
        } catch {
          // Ignore JSON parse failure and use default message.
        }
        throw new Error(message)
      }

      const data = await response.json()
      if (data.sessionId) {
        router.push(`/interview/session/${data.sessionId}`)
      }
    } catch (error) {
      console.error('Error starting session:', error)
      const message = error instanceof Error ? error.message : 'Unable to start interview'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleStart} disabled={loading} className="w-full py-3 font-semibold" size="lg">
      {loading ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Initializing...
        </>
      ) : (
        <>
          <PlayCircle className="mr-2 size-5" />
          Start Interview
        </>
      )}
    </Button>
  )
}

export default StartSessionButton
