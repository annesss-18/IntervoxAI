'use client'

import Link from 'next/link'
import { Button } from '@/components/atoms/button'
import { Card, CardContent } from '@/components/atoms/card'
import { Container } from '@/components/layout/Container'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Container size="sm">
        <Card variant="gradient" className="py-12 text-center">
          <CardContent>
            <div className="bg-error-100 dark:bg-error-500/20 mx-auto mb-6 flex size-16 items-center justify-center rounded-full">
              <AlertTriangle className="text-error-500 size-8" />
            </div>

            <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground mx-auto mb-8 max-w-md">
              An unexpected error occurred. Please try again or return to the home page.
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button onClick={reset} variant="secondary">
                <RefreshCw className="size-4" />
                Try Again
              </Button>
              <Link href="/">
                <Button>
                  <Home className="size-4" />
                  Go Home
                </Button>
              </Link>
            </div>

            {error.digest && (
              <p className="text-muted-foreground mt-8 text-xs">Error ID: {error.digest}</p>
            )}
          </CardContent>
        </Card>
      </Container>
    </div>
  )
}
