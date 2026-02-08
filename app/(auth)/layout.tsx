import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { ThemeToggleSimple } from '@/components/molecules/ThemeToggle'

const features = [
  'Voice-first mock sessions',
  'Guided role and company context',
  'Clear strengths and growth areas',
]

const stats = [
  { label: 'Sessions', value: '10k+' },
  { label: 'Improvement', value: '+85%' },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* Main Grid */}
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left Panel - Subtle Background */}
        <section className="relative hidden items-center justify-center border-r border-border bg-muted/30 p-12 lg:flex">
          {/* Header */}
          <header className="absolute top-0 right-0 left-0 p-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image src="/icon.png" alt="IntervoxAI" width={24} height={24} priority />
              <span className="font-semibold">IntervoxAI</span>
            </Link>
          </header>

          <div className="max-w-sm space-y-8">
            <div className="space-y-4">
              <h1 className="text-2xl font-medium tracking-tight xl:text-3xl">
                <span className="font-serif italic">Structured practice</span>
                <br />
                <span className="font-serif italic">for interviews.</span>
              </h1>
              <p className="text-muted-foreground">
                Build confidence with role-specific sessions and measurable feedback.
              </p>
            </div>

            {/* Feature List */}
            <div className="space-y-3">
              {features.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="flex gap-8">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Panel - Form Area */}
        <main className="relative flex items-center justify-center bg-background p-6 sm:p-12">
          {/* Theme Toggle */}
          <div className="absolute right-6 top-6">
            <ThemeToggleSimple />
          </div>

          <div className="w-full max-w-sm">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
