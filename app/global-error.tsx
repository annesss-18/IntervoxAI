"use client";

import { Card, CardContent } from "@/components/atoms/card";
import { Button } from "@/components/atoms/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground flex min-h-screen items-center justify-center p-4">
        <Card variant="gradient" className="w-full max-w-md py-4 text-center">
          <CardContent className="space-y-6">
            <div className="bg-error/10 border-error/30 mx-auto flex size-16 items-center justify-center rounded-full border">
              <AlertTriangle className="text-error size-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Something went wrong</h1>
              <p className="text-muted-foreground">
                A critical error occurred. Please try refreshing the page.
              </p>
            </div>

            <Button onClick={reset}>
              <RefreshCw className="mr-2 size-4" />
              Try Again
            </Button>

            {error.digest && (
              <p className="text-muted-foreground text-xs">
                Error ID: {error.digest}
              </p>
            )}
          </CardContent>
        </Card>
      </body>
    </html>
  );
}
