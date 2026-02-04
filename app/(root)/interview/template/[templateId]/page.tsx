import { getTemplateById } from '@/lib/actions/interview.action'
import { getCurrentUser } from '@/lib/actions/auth.action'
import { redirect } from 'next/navigation'
import DisplayTechIcons from '@/components/molecules/DisplayTechIcons'
import CompanyLogo from '@/components/molecules/CompanyLogo'
import StartSessionButton from '@/components/organisms/StartSessionButton'
import { Briefcase, Target, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const TemplatePage = async ({ params }: { params: Promise<{ templateId: string }> }) => {
  const { templateId } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const template = await getTemplateById(templateId)

  if (!template) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
        <h1 className="text-light-100 text-2xl font-bold">Template Not Found</h1>
        <Link href="/interview" className="btn-primary">
          Go Back
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn mx-auto max-w-4xl space-y-8 px-6 py-10">
      <Link
        href="/interview"
        className="text-primary-300 hover:text-primary-200 mb-6 flex items-center gap-2 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </Link>

      {/* Template Header Card */}
      <div className="card-border animate-slideInLeft">
        <div className="card !p-8">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            <div className="group relative shrink-0">
              <div className="from-primary-500/30 to-accent-300/30 absolute inset-0 rounded-full bg-gradient-to-r opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
              <CompanyLogo
                companyName={template.companyName || 'Unknown Company'}
                size={80}
                className="ring-primary-400/30 relative size-20 rounded-full shadow-2xl ring-4"
              />
            </div>
            <div className="flex-1 space-y-2">
              <h1 className="text-3xl font-bold text-white">{template.role} Interview</h1>
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-dark-200/60 border-primary-400/20 flex items-center gap-2 rounded-full border px-3 py-1">
                  <Briefcase className="text-primary-300 size-3" />
                  <span className="text-light-200 text-xs font-medium capitalize">
                    {template.level}
                  </span>
                </div>
                <div className="bg-dark-200/60 border-primary-400/20 flex items-center gap-2 rounded-full border px-3 py-1">
                  <Target className="text-accent-300 size-3" />
                  <span className="text-light-200 text-xs font-medium capitalize">
                    {template.type}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details & Tech Stack */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <div className="card-border animate-slideInUp" style={{ animationDelay: '0.1s' }}>
            <div className="card space-y-4 !p-6">
              <h2 className="text-light-100 text-xl font-semibold">Job Description</h2>
              <div className="prose prose-invert text-light-300 custom-scrollbar max-h-60 max-w-none overflow-y-auto text-sm leading-relaxed">
                {template.jobDescription}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-border animate-slideInUp" style={{ animationDelay: '0.2s' }}>
            <div className="card space-y-4 !p-6">
              <h2 className="text-light-100 text-xl font-semibold">Tech Stack</h2>
              <DisplayTechIcons techStack={template.techStack || []} />
            </div>
          </div>

          <div className="card-border animate-slideInUp" style={{ animationDelay: '0.3s' }}>
            <div className="card space-y-4 !p-6">
              <h2 className="text-light-100 text-xl font-semibold">Ready?</h2>
              <p className="text-light-300 text-sm">
                Start your AI-powered mock interview session now. Ensure your microphone is ready.
              </p>
              <StartSessionButton templateId={template.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TemplatePage
