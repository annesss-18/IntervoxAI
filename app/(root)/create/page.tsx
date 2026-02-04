import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/actions/auth.action'
import { Container, PageHeader } from '@/components/layout/Container'
import { CreateInterviewForm } from '@/components/organisms/CreateInterviewForm'

export const metadata: Metadata = {
  title: 'Create Interview',
  description: 'Create a new custom interview template tailored to your target role and company.',
}

export default async function CreatePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  return (
    <Container size="md">
      <PageHeader
        title="Create New Interview"
        description="Set up a custom interview tailored to your target role and company."
      />
      <CreateInterviewForm userId={user.id} />
    </Container>
  )
}
