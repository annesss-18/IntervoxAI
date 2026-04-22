import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getTemplateById } from "@/lib/actions/interview.action";
import { Container } from "@/components/layout/Container";
import { EditTemplateForm } from "@/components/organisms/EditTemplateForm";

export const metadata: Metadata = {
  title: "Edit Template · IntervoxAI",
};

const EditTemplatePage = async ({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) => {
  const { templateId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  // getTemplateById already enforces the public/private visibility rule.
  // Pass user.id so private templates belonging to the creator are accessible.
  const template = await getTemplateById(templateId, user.id);

  if (!template) redirect("/dashboard");

  // Only the creator may edit a template.
  if (template.creatorId !== user.id)
    redirect(`/interview/template/${templateId}`);

  return (
    <Container size="md" className="animate-fade-up pb-16">
      {/* Back link */}
      <Link
        href={`/interview/template/${templateId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to template
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <Pencil className="size-4.5 text-primary" />
        </span>
        <div>
          <h1 className="font-serif italic font-normal text-2xl text-foreground">
            Edit template
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {template.role} · {template.companyName}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <EditTemplateForm template={template} />
      </div>
    </Container>
  );
};

export default EditTemplatePage;
