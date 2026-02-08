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
          <CardContent className="space-y-6">
            <div className="bg-error/10 border-error/30 mx-auto flex size-16 items-center justify-center rounded-full border">
              <AlertTriangle className="text-error size-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Something went wrong</h1>
              <p className="text-muted-foreground mx-auto max-w-md">
                An unexpected error occurred. Please try again or return to the home page.
              </p>
            </div>

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
              <p className="text-muted-foreground text-xs">Error ID: {error.digest}</p>
            )}
          </CardContent>
        </Card>
      </Container>
    </div>
  )
}
