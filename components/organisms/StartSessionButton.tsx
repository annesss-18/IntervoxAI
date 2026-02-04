'use client'

import React, { useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Loader2, PlayCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
        throw new Error('Failed to create session')
      }

      const data = await response.json()
      if (data.sessionId) {
        router.push(`/interview/session/${data.sessionId}`)
      }
    } catch (error) {
      console.error('Error starting session:', error)
      // Ideally show toast error
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleStart}
      disabled={loading}
      className="bg-primary-500 hover:bg-primary-600 w-full py-3 font-bold text-white"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Initializing...
        </>
      ) : (
        <>
          <PlayCircle className="mr-2 h-5 w-5" />
          Start Interview
        </>
      )}
    </Button>
  )
}

export default StartSessionButton
