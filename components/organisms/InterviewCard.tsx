// components/InterviewCard.tsx
import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/atoms/button'
import DisplayTechIcons from '@/components/molecules/DisplayTechIcons'
import CompanyLogo from '@/components/molecules/CompanyLogo'
import { Calendar, Star, ArrowRight, TrendingUp } from 'lucide-react'

// Define Interface for Feedback if not imported
interface FeedbackData {
  createdAt?: string | Date
  totalScore: number
  finalAssessment?: string
}

interface InterviewCardProps {
  id: string
  userId: string
  role: string
  type: string
  techstack: string[]
  createdAt: string | Date
  companyName?: string
  isSession?: boolean
  feedback?: FeedbackData | null
}

const InterviewCard = ({
  id,
  role,
  type,
  techstack,
  createdAt,
  companyName,
  isSession,
  feedback,
}: InterviewCardProps) => {
  // Removed async data fetching from here. Data is now passed via props.

  const normalisedType = /mix/gi.test(type) ? 'Mixed' : type

  // Format date using native Intl.DateTimeFormat
  const dateToFormat = new Date(feedback?.createdAt || createdAt || Date.now())
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(dateToFormat)

  const hasScore = feedback?.totalScore !== undefined

  const scoreColor = !hasScore
    ? 'text-light-400'
    : feedback!.totalScore >= 80
      ? 'text-success-100'
      : feedback!.totalScore >= 60
        ? 'text-warning-200'
        : 'text-destructive-100'

  const linkHref = feedback
    ? `/interview/session/${id}/feedback`
    : isSession
      ? `/interview/session/${id}`
      : `/interview/template/${id}`

  const buttonText = feedback
    ? 'View Feedback'
    : isSession
      ? 'Continue Interview'
      : 'Start Interview'

  return (
    <div className="card-border animate-fadeIn min-h-[450px] w-[380px] max-sm:w-full">
      <div className="card-interview">
        <div className="absolute top-0 right-0 w-fit">
          <div className="badge-text !rounded-tl-none !rounded-br-3xl backdrop-blur-md">
            {normalisedType}
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="group relative">
            <div className="from-primary-500/20 to-accent-300/20 absolute inset-0 rounded-full bg-gradient-to-r opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
            <CompanyLogo
              companyName={companyName || 'Unknown Company'}
              size={100}
              className="ring-primary-400/30 group-hover:ring-primary-400/50 relative size-[100px] rounded-full shadow-2xl ring-4 transition-all duration-300 group-hover:scale-110"
            />
          </div>

          <div className="space-y-2">
            <h3 className="from-primary-200 to-accent-300 bg-gradient-to-r bg-clip-text font-bold text-transparent capitalize">
              {role} Interview
            </h3>

            <div className="flex flex-row items-center gap-4 text-sm">
              <div className="bg-dark-200/60 border-primary-400/20 flex items-center gap-3 rounded-full border px-3 py-1.5 backdrop-blur-sm">
                <Calendar className="text-primary-300 size-4" />
                <span className="text-light-200 font-medium">{formattedDate}</span>
              </div>

              <div
                className={`bg-dark-200/60 border-primary-400/20 flex items-center gap-3 rounded-full border px-3 py-1.5 backdrop-blur-sm ${scoreColor}`}
              >
                {hasScore && feedback ? (
                  <>
                    <Star className="size-4 fill-current" />
                    <span className="font-bold">{feedback.totalScore}</span>
                    <span className="text-light-400 font-medium">/100</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="size-4" />
                    <span className="font-medium">--</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex-1">
          <p className="text-light-200 line-clamp-3 leading-relaxed">
            {feedback
              ? feedback.finalAssessment
              : 'Ready to showcase your skills? Complete this interview to receive detailed feedback and improve your performance.'}
          </p>
        </div>

        <div className="border-primary-400/10 relative z-10 flex flex-row items-center justify-between border-t pt-4">
          <div className="flex-1">
            <DisplayTechIcons techStack={techstack} />
          </div>

          <Button className="btn-primary group !min-h-[48px] !px-6 !py-3.5">
            <Link href={linkHref} className="flex items-center gap-3">
              <span>{buttonText}</span>
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default InterviewCard
