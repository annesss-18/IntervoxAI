import Link from "next/link";
import { BrandLogo } from "@/components/molecules/BrandLogo";
import { Mic, BarChart3, Brain } from "lucide-react";
import { ThemeToggle } from "@/components/molecules/ThemeToggle";

const features = [
  { icon: Mic, label: "Voice-first mock interviews" },
  { icon: Brain, label: "Role and company context awareness" },
  { icon: BarChart3, label: "Scored feedback across 5 dimensions" },
];

const stats = [
  { value: "16K+", label: "Sessions" },
  { value: "90%", label: "Improve" },
  { value: "4.6★", label: "Rating" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border/50 bg-surface-1 p-12 lg:flex">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div
              className="absolute -top-16 -left-16 h-[420px] w-[420px] rounded-full opacity-20 blur-[120px]"
              style={{
                background:
                  "radial-gradient(ellipse, #7050b0, transparent 70%)",
              }}
            />
            <div
              className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full opacity-15 blur-[100px]"
              style={{
                background:
                  "radial-gradient(ellipse, #48a8b8, transparent 70%)",
              }}
            />
          </div>

          <header>
            <Link
              href="/"
              className="group inline-flex outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
            >
              <BrandLogo size="sm" />
            </Link>
          </header>

          <div className="max-w-sm space-y-10">
            <div className="space-y-4">
              <p className="label-caps">Interview Coaching</p>
              <h1 className="font-serif italic font-normal text-3xl leading-[1.2] xl:text-4xl">
                Structured practice
                <br />
                <span className="text-gradient-brand">
                  for real interviews.
                </span>
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Build confidence through voice-first sessions, specific
                feedback, and measurable improvement.
              </p>
            </div>

            <ul className="space-y-3">
              {features.map(({ icon: Icon, label }, i) => (
                <li
                  key={label}
                  className={`animate-slide-left fill-both flex items-center gap-3 delay-${(i + 1) * 100}`}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/12 ring-1 ring-primary/20">
                    <Icon className="size-3.5 text-primary" />
                  </span>
                  <span className="text-sm text-foreground/80">{label}</span>
                </li>
              ))}
            </ul>

            <div className="flex gap-8 border-t border-border/50 pt-8">
              {stats.map((stat) => (
                <div key={stat.label} className="space-y-0.5">
                  <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <blockquote className="max-w-xs space-y-3">
            <p className="text-sm text-muted-foreground italic leading-relaxed">
              "The voice-first format makes it feel like a real interview. I got
              the job after just two weeks of practice."
            </p>
            <footer className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-brand-gradient text-[10px] font-bold text-white">
                P
              </div>
              <span className="text-xs text-muted-foreground">
                Priya M. · Software Engineer
              </span>
            </footer>
          </blockquote>
        </aside>

        <main className="relative flex flex-col items-center justify-center bg-background px-6 py-16 sm:px-12">
          <div className="absolute top-5 right-5">
            <ThemeToggle />
          </div>

          <div className="mb-10 lg:hidden">
            <Link href="/">
              <BrandLogo size="sm" />
            </Link>
          </div>

          <div className="w-full max-w-[360px] animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
