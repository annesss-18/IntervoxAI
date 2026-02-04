import { Metadata } from 'next'
import { getPublicTemplates } from '@/lib/actions/interview.action'
import ExploreClient from './ExploreClient'

export const metadata: Metadata = {
  title: 'Explore Interviews',
  description:
    'Discover and practice with community interview templates for various roles and companies.',
}

export default async function ExplorePage() {
  const templates = await getPublicTemplates(50)

  return <ExploreClient templates={templates} />
}
