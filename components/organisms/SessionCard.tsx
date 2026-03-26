import Link from "next/link";
import { Calendar, ArrowRight, Play, Clock3, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { ScoreRing } from "@/components/atoms/progress";
import DisplayTechIcons from "@/components/molecules/DisplayTechIcons";
import CompanyLogo from "@/components/molecules/CompanyLogo";
import { DeleteSessionButton } from "@/components/organisms/DeleteSessionButton";
import type { SessionCardData } from "@/types";

interface SessionCardProps {
  session: SessionCardData;
}

export function SessionCard({ session }: SessionCardProps) {
  const isCompleted = session.status === "completed";
  const isActive = session.status === "active";

  const formattedDate = new Date(session.startedAt).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );

  return (
    <Card variant="interactive" className="group flex h-full flex-col">
      <CardContent className="flex-1 space-y-4 pt-6">
        <div className="flex items-start gap-3.5">
          <div className="flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2">
            <CompanyLogo
              companyName={session.companyName || "Unknown Company"}
              logoUrl={session.companyLogoUrl}
              size={40}
              className="rounded-lg object-contain"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-foreground leading-snug">
              {session.role}
            </h3>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {session.companyName}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {session.type}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {session.level}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <DeleteSessionButton sessionId={session.id} />
            {isCompleted && session.finalScore !== undefined ? (
              <ScoreRing score={session.finalScore} size={54} />
            ) : (
              <Badge
                variant={isActive ? "warning" : "secondary"}
                dot
                className="shrink-0"
              >
                {isActive ? "In Progress" : "Ready"}
              </Badge>
            )}
          </div>
        </div>

        {session.techStack && session.techStack.length > 0 && (
          <DisplayTechIcons techStack={session.techStack} />
        )}

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {formattedDate}
          </span>
          {isCompleted && (
            <span className="flex items-center gap-1.5 text-success">
              <CheckCircle2 className="size-3.5" />
              Completed
            </span>
          )}
          {!isCompleted && (
            <span className="flex items-center gap-1.5">
              <Clock3 className="size-3.5" />
              Session ready
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        {isCompleted ? (
          <Button
            asChild
            variant="outline"
            className="w-full transition-colors group-hover:border-primary/40 group-hover:bg-primary/5 group-hover:text-primary"
          >
            <Link href={`/interview/session/${session.id}/feedback`}>
              View Feedback
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button asChild variant="gradient" className="w-full">
            <Link href={`/interview/session/${session.id}`}>
              <Play className="size-4" />
              {isActive ? "Continue Interview" : "Start Interview"}
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
