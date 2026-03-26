import Link from "next/link";
import { Github, Linkedin, Twitter } from "lucide-react";
import { BrandIcon, BrandWordmark } from "@/components/molecules/BrandLogo";

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
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-border/50 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute bottom-0 left-1/4 h-56 w-80 rounded-full bg-primary/4 blur-[110px]" />
        <div className="absolute bottom-0 right-1/4 h-40 w-64 rounded-full bg-accent/3 blur-[90px]" />
      </div>

      <div className="container-app">
        <div className="grid gap-12 md:grid-cols-[1.8fr_1fr_1fr_1fr]">
          <div className="space-y-5">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="IntervoxAI home"
            >
              <span className="transition-transform duration-200 group-hover:scale-105">
                <BrandIcon size={28} />
              </span>
              <span className="transition-opacity duration-200 group-hover:opacity-70">
                <BrandWordmark height={20} />
              </span>
            </Link>

            <p className="max-w-[17rem] text-sm leading-relaxed text-muted-foreground">
              Structured interview practice powered by AI voice simulation.
              Practice, speak, improve.
            </p>

            <div className="flex items-center gap-1">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-all duration-200 hover:bg-surface-2 hover:text-foreground hover:ring-1 hover:ring-border"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title="Product" links={footerLinks.product} />
          <FooterColumn title="Resources" links={footerLinks.resources} />
          <FooterColumn title="Legal" links={footerLinks.legal} />
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-border/40 pt-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <BrandIcon size={18} />
            <span className="text-sm text-muted-foreground">
              Copyright {year} IntervoxAI. All rights reserved.
            </span>
          </div>
          <p className="text-xs text-muted-foreground/60">
            Built with AI. Powered by Gemini
          </p>
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
      <p className="label-caps mb-4">{title}</p>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group relative inline-flex text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              <span className="relative">
                {link.label}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover:w-full" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FooterCompact() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 py-4">
      <div className="container-app flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <BrandIcon size={16} />
          <span>Copyright {year} IntervoxAI</span>
        </div>
        <div className="flex gap-5">
          {[
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
            { href: "/support", label: "Support" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
