import Link from 'next/link'
import Image from 'next/image'
import { Building2, Calendar, ArrowRight, Play } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/atoms/card'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { ScoreRing } from '@/components/atoms/progress'
import DisplayTechIcons from '@/components/molecules/DisplayTechIcons'
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
      <CardContent className="flex-1 pt-6">
        {/* Header with company logo */}
        <div className="mb-4 flex items-start gap-4">
          <div className="bg-surface-2 flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl">
            {session.companyLogoUrl ? (
              <Image
                src={session.companyLogoUrl}
                alt={session.companyName}
                width={48}
                height={48}
                className="object-cover"
              />
            ) : (
              <Building2 className="text-muted-foreground size-6" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground truncate font-semibold">{session.role}</h3>
            <p className="text-muted-foreground truncate text-sm">{session.companyName}</p>
          </div>

          {/* Score or Status Badge */}
          {isCompleted && session.finalScore !== undefined ? (
            <ScoreRing score={session.finalScore} size={48} />
          ) : (
            <Badge variant={isActive ? 'warning' : 'info'} dot>
              {isActive ? 'In Progress' : 'Setup'}
            </Badge>
          )}
        </div>

        {/* Tech Stack */}
        {session.techStack && session.techStack.length > 0 && (
          <div className="mb-4">
            <DisplayTechIcons techStack={session.techStack} />
          </div>
        )}

        {/* Metadata */}
        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {formattedDate}
          </div>
          <Badge variant="secondary" className="text-xs">
            {session.type}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {session.level}
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        {isCompleted ? (
          <Link href={`/interview/session/${session.id}/feedback`} className="w-full">
            <Button
              variant="secondary"
              className="group-hover:bg-primary/10 group-hover:text-primary w-full"
            >
              View Feedback
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        ) : (
          <Link href={`/interview/session/${session.id}`} className="w-full">
            <Button className="w-full">
              <Play className="size-4" />
              {isActive ? 'Continue Interview' : 'Start Interview'}
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  )
}
