import Link from 'next/link'
import Image from 'next/image'
import { Github, Twitter, Linkedin } from 'lucide-react'
import { Separator } from '@/components/atoms/separator'

const footerLinks = {
  product: [
    { label: 'Features', href: '/#features' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Pricing', href: '/pricing' },
  ],
  resources: [
    { label: 'Blog', href: '/blog' },
    { label: 'Documentation', href: '/docs' },
    { label: 'Support', href: '/support' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
}

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com/intervoxai', label: 'Twitter' },
  { icon: Github, href: 'https://github.com/intervoxai', label: 'GitHub' },
  { icon: Linkedin, href: 'https://linkedin.com/company/intervoxai', label: 'LinkedIn' },
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-border bg-surface-1 border-t">
      <div className="container-app py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-3">
              <Image src="/icon.png" alt="IntervoxAI" width={36} height={36} />
              <Image
                src="/wordmark.png"
                alt="IntervoxAI"
                width={120}
                height={30}
                className="dark:brightness-0 dark:invert"
              />
            </Link>
            <p className="text-muted-foreground mb-4 max-w-xs text-sm">
              Practice. Speak. Improve. Master your technical interviews with AI-powered mock
              interviews.
            </p>
            {/* Social links */}
            <div className="flex gap-3">
              {socialLinks.map((link) => {
                const Icon = link.icon
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground hover:bg-surface-2 rounded-lg p-2 transition-colors"
                    aria-label={link.label}
                  >
                    <Icon className="size-5" />
                  </a>
                )
              })}
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-foreground mb-4 font-semibold">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources links */}
          <div>
            <h4 className="text-foreground mb-4 font-semibold">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="text-foreground mb-4 font-semibold">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Copyright */}
        <div className="text-muted-foreground flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
          <p>© {currentYear} IntervoxAI. All rights reserved.</p>
          <p>Built with ❤️ for job seekers everywhere</p>
        </div>
      </div>
    </footer>
  )
}

// Compact footer for authenticated pages
export function FooterCompact() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-border border-t py-6">
      <div className="container-app text-muted-foreground flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
        <div className="flex items-center gap-2">
          <Image src="/icon.png" alt="IntervoxAI" width={20} height={20} />
          <span>© {currentYear} IntervoxAI</span>
        </div>
        <div className="flex gap-6">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <Link href="/support" className="hover:text-foreground transition-colors">
            Support
          </Link>
        </div>
      </div>
    </footer>
  )
}

export default Footer
