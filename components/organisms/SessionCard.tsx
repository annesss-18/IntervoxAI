import Link from 'next/link'
import { Calendar, ArrowRight, Play, Clock3 } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/atoms/card'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { ScoreRing } from '@/components/atoms/progress'
import DisplayTechIcons from '@/components/molecules/DisplayTechIcons'
import CompanyLogo from '@/components/molecules/CompanyLogo'
import type { SessionCardData } from '@/types'

interface SessionCardProps {
  session: SessionCardData
}

export function SessionCard({ session }: SessionCardProps) {
  const isCompleted = session.status === 'completed'
  const isActive = session.status === 'active'

  const formattedDate = new Date(session.startedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Card variant="interactive" className="group flex h-full flex-col">
      <CardContent className="flex-1 space-y-4 pt-6">
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/50">
            <CompanyLogo
              companyName={session.companyName || 'Unknown Company'}
              logoUrl={session.companyLogoUrl}
              size={48}
              className="rounded-lg object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground truncate text-base font-semibold">{session.role}</h3>
            <p className="text-muted-foreground truncate text-sm">{session.companyName}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-[10px]">
                {session.type}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {session.level}
              </Badge>
            </div>
          </div>

          {isCompleted && session.finalScore !== undefined ? (
            <ScoreRing score={session.finalScore} size={50} />
          ) : (
            <Badge variant={isActive ? 'warning' : 'info'} dot>
              {isActive ? 'In Progress' : 'Setup'}
            </Badge>
          )}
        </div>

        {session.techStack && session.techStack.length > 0 && (
          <div>
            <DisplayTechIcons techStack={session.techStack} />
          </div>
        )}

        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {formattedDate}
          </div>
          {!isCompleted && (
            <div className="flex items-center gap-1.5">
              <Clock3 className="size-3.5" />
              Session ready
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        {isCompleted ? (
          <Button asChild variant="secondary" className="group-hover:bg-primary/10 group-hover:text-primary w-full">
            <Link href={`/interview/session/${session.id}/feedback`}>
              View Feedback
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button asChild className="w-full">
            <Link href={`/interview/session/${session.id}`}>
              <Play className="size-4" />
              {isActive ? 'Continue Interview' : 'Start Interview'}
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
