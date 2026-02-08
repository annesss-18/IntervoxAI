import Link from 'next/link'
import { Users, Star, ArrowRight, Sparkles } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/atoms/card'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import DisplayTechIcons from '@/components/molecules/DisplayTechIcons'
import CompanyLogo from '@/components/molecules/CompanyLogo'
import type { TemplateCardData } from '@/types'

interface TemplateCardProps {
  template: TemplateCardData
}

export function TemplateCard({ template }: TemplateCardProps) {
  const averageScore = template.avgScore ?? 0

  return (
    <Card variant="interactive" className="group flex h-full flex-col">
      <CardContent className="flex-1 space-y-4 pt-6">
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/50">
            <CompanyLogo
              companyName={template.companyName || 'Unknown Company'}
              logoUrl={template.companyLogoUrl}
              size={48}
              className="rounded-lg object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground truncate text-base font-semibold">{template.role}</h3>
            <p className="text-muted-foreground truncate text-sm">{template.companyName}</p>
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
          <div>
            <DisplayTechIcons techStack={template.techStack} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="text-muted-foreground flex items-center gap-1.5">
            <Users className="size-4" />
            <span>{template.usageCount || 0} sessions</span>
          </div>
          {averageScore > 0 ? (
            <div className="text-warning flex items-center gap-1.5">
              <Star className="size-4 fill-current" />
              <span>{averageScore.toFixed(1)}</span>
            </div>
          ) : (
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Sparkles className="size-3.5" />
              New template
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          asChild
          variant="secondary"
          className="group-hover:bg-primary/10 group-hover:text-primary w-full"
        >
          <Link href={`/interview/template/${template.id}`}>
            Start Interview
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
