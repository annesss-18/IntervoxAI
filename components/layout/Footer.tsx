import Link from "next/link";
import Image from "next/image";
import { Github, Twitter, Linkedin } from "lucide-react";

const footerLinks = {
  product: [
    { label: "Features", href: "/#features" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Pricing", href: "/pricing" },
  ],
  resources: [
    { label: "Blog", href: "/blog" },
    { label: "Documentation", href: "/docs" },
    { label: "Support", href: "/support" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

const socialLinks = [
  { icon: Twitter, href: "https://twitter.com/intervoxai", label: "Twitter" },
  { icon: Github, href: "https://github.com/intervoxai", label: "GitHub" },
  {
    icon: Linkedin,
    href: "https://linkedin.com/company/intervoxai",
    label: "LinkedIn",
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border py-12">
      <div className="container-app">
        <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand Column */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image src="/icon.png" alt="IntervoxAI" width={24} height={24} />
              <span className="font-semibold">IntervoxAI</span>
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">
              Structured interview practice with AI-led simulation.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={link.label}
                  >
                    <Icon className="size-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link Columns */}
          <FooterColumn title="Product" links={footerLinks.product} />
          <FooterColumn title="Resources" links={footerLinks.resources} />
          <FooterColumn title="Legal" links={footerLinks.legal} />
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
          <p>© {currentYear} IntervoxAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Compact footer for authenticated pages
export function FooterCompact() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border py-4">
      <div className="container-app flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <Image src="/icon.png" alt="IntervoxAI" width={16} height={16} />
          <span>© {currentYear} IntervoxAI</span>
        </div>
        <div className="flex gap-4">
          <Link
            href="/privacy"
            className="transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="transition-colors hover:text-foreground"
          >
            Terms
          </Link>
          <Link
            href="/support"
            className="transition-colors hover:text-foreground"
          >
            Support
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
