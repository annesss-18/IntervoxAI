import Link from "next/link";
import { Users, Star, ArrowRight, Sparkles, Play } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import DisplayTechIcons from "@/components/molecules/DisplayTechIcons";
import CompanyLogo from "@/components/molecules/CompanyLogo";
import type { TemplateCardData } from "@/types";

interface TemplateCardProps {
  template: TemplateCardData;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const avgScore = template.avgScore ?? 0;

  return (
    <Card variant="interactive" className="group flex h-full flex-col">
      <CardContent className="flex-1 space-y-4 pt-6">
        <div className="flex items-start gap-3.5">
          <div className="flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2">
            <CompanyLogo
              companyName={template.companyName || "Unknown Company"}
              logoUrl={template.companyLogoUrl}
              size={40}
              className="rounded-lg object-contain"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-foreground leading-snug">
              {template.role}
            </h3>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {template.companyName}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="primary" className="text-[10px]">
                {template.type}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {template.level}
              </Badge>
            </div>
          </div>
        </div>

        {template.techStack && template.techStack.length > 0 && (
          <DisplayTechIcons techStack={template.techStack} />
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            {template.usageCount || 0} sessions
          </span>
          {avgScore > 0 ? (
            <span className="flex items-center gap-1.5 text-warning font-medium">
              <Star className="size-3.5 fill-current" />
              {avgScore.toFixed(1)}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs">
              <Sparkles className="size-3.5 text-primary" />
              New template
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          asChild
          variant="outline"
          className="w-full transition-all group-hover:border-primary/40 group-hover:bg-primary/5 group-hover:text-primary"
        >
          <Link href={`/interview/template/${template.id}`}>
            <Play className="size-3.5" />
            Start Interview
            <ArrowRight className="ml-auto size-4 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
