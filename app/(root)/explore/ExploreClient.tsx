'use client'

import { useMemo, useState } from 'react'
import { Container, PageHeader } from '@/components/layout/Container'
import { TemplateCard } from '@/components/organisms/TemplateCard'
import { Card, CardContent } from '@/components/atoms/card'
import { Input } from '@/components/atoms/input'
import { Badge } from '@/components/atoms/badge'
import { Search, Compass, Sparkles, Filter } from 'lucide-react'
import { TemplateCardData } from '@/types'

interface ExploreClientProps {
  templates: TemplateCardData[]
}

const quickFilters = ['Frontend', 'Backend', 'System Design', 'Behavioral']

export default function ExploreClient({ templates }: ExploreClientProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) {
      return templates
    }

    const query = searchQuery.toLowerCase().trim()

    return templates.filter((template) => {
      if (template.role?.toLowerCase().includes(query)) return true
      if (template.companyName?.toLowerCase().includes(query)) return true
      if (template.techStack?.some((tech) => tech.toLowerCase().includes(query))) return true
      if (template.type?.toLowerCase().includes(query)) return true
      if (template.level?.toLowerCase().includes(query)) return true

      return false
    })
  }, [templates, searchQuery])

  return (
    <Container>
      <PageHeader
        title="Explore Interviews"
        description="Find ready-to-run interview templates by role, stack, company context, and difficulty."
      />

      <Card variant="gradient" className="mb-8">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xl">
              <Search className="text-muted-foreground absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search by role, company, type, level, or tech stack..."
                className="pl-11"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <Filter className="size-3.5" />
                {filteredTemplates.length} matched
              </Badge>
              <Badge variant="info" className="text-xs">
                <Sparkles className="size-3.5" />
                {templates.length} total templates
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/35 hover:bg-primary/5 hover:text-foreground"
                onClick={() => setSearchQuery(filter)}
              >
                {filter}
              </button>
            ))}
            {searchQuery && (
              <button
                type="button"
                className="text-primary hover:text-primary/80 text-xs font-medium"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {filteredTemplates.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      ) : (
        <Card variant="gradient" className="py-12 text-center">
          <CardContent>
            <div className="bg-surface-2 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
              <Compass className="text-muted-foreground size-8" />
            </div>
            {searchQuery ? (
              <>
                <h3 className="mb-2 text-lg font-semibold">No matching templates</h3>
                <p className="text-muted-foreground mx-auto max-w-md">
                  No templates matched &quot;{searchQuery}&quot;. Try broader keywords such as role type,
                  stack name, or interview level.
                </p>
              </>
            ) : (
              <>
                <h3 className="mb-2 text-lg font-semibold">No templates published yet</h3>
                <p className="text-muted-foreground mx-auto max-w-md">
                  Create and publish the first template to start a collaborative interview library.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  )
}
