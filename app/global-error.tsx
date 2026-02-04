'use client'

import { Button } from '@/components/atoms/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-4 text-white">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-red-500/20">
            <AlertTriangle className="size-8 text-red-400" />
          </div>

          <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
          <p className="mb-8 text-gray-400">
            A critical error occurred. Please try refreshing the page.
          </p>

          <Button onClick={reset} className="bg-white text-black hover:bg-gray-200">
            <RefreshCw className="mr-2 size-4" />
            Try Again
          </Button>

          {error.digest && <p className="mt-8 text-xs text-gray-500">Error ID: {error.digest}</p>}
        </div>
      </body>
    </html>
  )
}
