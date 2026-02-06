'use client'

import { useState, useMemo } from 'react'
import { Container, PageHeader } from '@/components/layout/Container'
import { TemplateCard } from '@/components/organisms/TemplateCard'
import { Card, CardContent } from '@/components/atoms/card'
import { Input } from '@/components/atoms/input'
import { Search, Compass } from 'lucide-react'
import { TemplateCardData } from '@/types'

interface ExploreClientProps {
  templates: TemplateCardData[]
}

export default function ExploreClient({ templates }: ExploreClientProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter templates based on search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) {
      return templates
    }

    const query = searchQuery.toLowerCase().trim()

    return templates.filter((template) => {
      // Search in role
      if (template.role?.toLowerCase().includes(query)) return true

      // Search in company name
      if (template.companyName?.toLowerCase().includes(query)) return true

      // Search in tech stack
      if (template.techStack?.some((tech) => tech.toLowerCase().includes(query))) return true

      // Search in type
      if (template.type?.toLowerCase().includes(query)) return true

      // Search in level
      if (template.level?.toLowerCase().includes(query)) return true

      return false
    })
  }, [templates, searchQuery])

  return (
    <Container>
      <PageHeader
        title="Explore Interviews"
        description="Discover interview templates created by the community."
      />

      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by role, company, or tech stack..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {searchQuery && (
          <p className="text-muted-foreground mt-2 text-sm">
            Showing {filteredTemplates.length} of {templates.length} templates
          </p>
        )}
      </div>

      {filteredTemplates.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                <h3 className="mb-2 text-lg font-semibold">No Matches Found</h3>
                <p className="text-muted-foreground mx-auto max-w-md">
                  No templates match &quot;{searchQuery}&quot;. Try a different search term.
                </p>
              </>
            ) : (
              <>
                <h3 className="mb-2 text-lg font-semibold">No Templates Yet</h3>
                <p className="text-muted-foreground mx-auto max-w-md">
                  Be the first to create and share an interview template with the community.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  )
}
