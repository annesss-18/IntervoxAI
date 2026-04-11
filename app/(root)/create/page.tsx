import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sparkles, Wand2, ShieldCheck, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getTemplateById } from "@/lib/actions/interview.action";
import { Container, PageHeader } from "@/components/layout/Container";
import { CreateInterviewForm } from "@/components/organisms/CreateInterviewForm";

export const metadata: Metadata = {
  title: "Create Interview · IntervoxAI",
  description:
    "Create a new custom interview template tailored to your target role and company.",
};

const highlights = [
  {
    icon: Wand2,
    title: "Auto-extract from JD",
    description:
      "Role, level, company, and tech stack detected automatically from any job description.",
  },
  {
    icon: Sparkles,
    title: "Stack-aware questions",
    description:
      "Questions are contextualised to the actual tools and frameworks in the role.",
  },
  {
    icon: ShieldCheck,
    title: "Public or private",
    description:
      "Share your template with the community or keep it private for personal use.",
  },
  {
    icon: Zap,
    title: "Instant generation",
    description:
      "Full interview template generated in seconds, ready to run immediately.",
  },
];

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  // Support forking: /create?forkFrom=<templateId>
  const sp = await searchParams;
  const forkFromId = typeof sp.forkFrom === "string" ? sp.forkFrom : undefined;
  const forkTemplate = forkFromId
    ? await getTemplateById(forkFromId, user.id)
    : null;

  return (
    <Container size="xl">
      <PageHeader
        title={forkTemplate ? "Fork Interview Template" : "Create New Interview"}
        description={
          forkTemplate
            ? `Forking "${forkTemplate.role}" at ${forkTemplate.companyName || "Unknown Company"}. Customize the details below and generate your own version.`
            : "Paste a job description and let IntervoxAI generate a polished interview template in seconds."
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
        <div className="hidden space-y-5 lg:block">
          <div className="gradient-border relative overflow-hidden rounded-2xl p-px">
            <div className="relative overflow-hidden rounded-2xl bg-card p-6">
              <div
                className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full opacity-20 blur-[50px]"
                style={{
                  background:
                    "radial-gradient(ellipse, #7050b0, transparent 70%)",
                }}
              />
              <div className="relative">
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-brand-gradient shadow-[0_4px_16px_-4px_color-mix(in_srgb,var(--primary)_50%,var(--accent)_50%)]">
                  <Sparkles className="size-5 text-white" />
                </div>
                <h2 className="mb-1.5 text-lg font-semibold">
                  Template Studio
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Two steps from job description to a fully configured interview
                  template, ready to practice with.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {highlights.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-3.5 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/25"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                  <Icon className="size-3.5 text-primary" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <CreateInterviewForm forkTemplate={forkTemplate ?? undefined} />
      </div>
    </Container>
  );
}

