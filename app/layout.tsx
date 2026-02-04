import type { Metadata, Viewport } from 'next'
import { Inter, Quantico } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/components/providers/AuthProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const quantico = Quantico({
  weight: ['400', '700'],
  variable: '--font-quantico',
  subsets: ['latin'],
  display: 'swap',
})

// Base URL for metadata
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://intervoxai.com'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'IntervoxAI - AI-Powered Mock Interview Platform',
    template: '%s | IntervoxAI',
  },
  description:
    'Practice. Speak. Improve. Master your technical interviews with AI-powered mock interviews. Real interviews. Real feedback. Faster growth.',
  keywords: [
    'mock interview',
    'AI interview',
    'technical interview',
    'coding interview',
    'interview practice',
    'Gemini AI',
    'job preparation',
    'software engineer interview',
    'IntervoxAI',
  ],
  authors: [{ name: 'IntervoxAI Team' }],
  creator: 'IntervoxAI',
  publisher: 'IntervoxAI',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'IntervoxAI',
    title: 'IntervoxAI - AI-Powered Mock Interview Platform',
    description:
      'Practice. Speak. Improve. Master your technical interviews with AI-powered mock interviews.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'IntervoxAI - AI Mock Interviews',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IntervoxAI - AI-Powered Mock Interview Platform',
    description:
      'Practice. Speak. Improve. Master your technical interviews with AI-powered mock interviews.',
    images: ['/og-image.png'],
    creator: '@intervoxai',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#6366f1',
      },
    ],
  },
  manifest: '/site.webmanifest',
  other: {
    'msapplication-TileColor': '#0a0a0f',
    'msapplication-TileImage': '/mstile-150x150.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${quantico.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>{children}</AuthProvider>
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
