import Image from 'next/image'
import Link from 'next/link'
import { ThemeToggleSimple } from '@/components/molecules/ThemeToggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header with logo and theme toggle */}
      <header className="absolute top-0 right-0 left-0 z-10 p-4 sm:p-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="group flex items-center gap-3">
            <Image
              src="/logo-full.png"
              alt="IntervoxAI"
              width={180}
              height={45}
              className="transition-transform group-hover:scale-105 dark:brightness-0 dark:invert"
              priority
            />
          </Link>
          <ThemeToggleSimple />
        </div>
      </header>

      {/* Main content - centered */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Decorative background elements */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="bg-primary/10 absolute -top-40 -right-40 h-80 w-80 rounded-full blur-3xl" />
        <div className="bg-accent/10 absolute -bottom-40 -left-40 h-80 w-80 rounded-full blur-3xl" />
        <div className="bg-stellar/5 absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
      </div>
    </div>
  )
}
