// components/InterviewTabs.tsx
'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs'
import InterviewCard from './InterviewCard'
import { Library, History } from 'lucide-react'
import Link from 'next/link'
import type { Feedback } from '@/types'

// Interface matching the data structure returned by server actions
interface CardDataBase {
  id: string
  role: string
  type: string
  techstack: string[] // Server actions return lowercase
  createdAt: string | Date
  companyName?: string
}

interface SessionData extends CardDataBase {
  feedback?: Feedback | null
}

interface InterviewTabsProps {
  userSessions: SessionData[]
  allTemplates: CardDataBase[]
  userId: string
}

export default function InterviewTabs({ userSessions, allTemplates, userId }: InterviewTabsProps) {
  const [activeTab, setActiveTab] = useState('templates')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="mb-8 flex justify-center">
        <TabsList className="bg-dark-200/50 grid h-14 w-full max-w-md grid-cols-2 rounded-2xl p-1 backdrop-blur-sm">
          <TabsTrigger
            value="templates"
            className="data-[state=active]:bg-primary-500/20 data-[state=active]:border-primary-400/50 flex items-center gap-2 rounded-xl transition-all duration-300 data-[state=active]:border"
          >
            <Library className="size-5" />
            <span className="font-semibold">All Templates</span>
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            className="data-[state=active]:bg-primary-500/20 data-[state=active]:border-primary-400/50 flex items-center gap-2 rounded-xl transition-all duration-300 data-[state=active]:border"
          >
            <History className="size-5" />
            <span className="font-semibold">My Sessions</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="templates" className="animate-fadeIn">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
                <Library className="text-primary-300 size-7" />
                Available Interview Templates
              </h2>
              <p className="text-light-300">Explore interview templates from the community</p>
            </div>
          </div>

          {allTemplates.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {allTemplates.map((template, index) => (
                <div
                  key={template.id}
                  className="animate-fadeIn"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <InterviewCard
                    id={template.id}
                    userId={userId}
                    role={template.role}
                    type={template.type}
                    techstack={template.techstack}
                    createdAt={template.createdAt}
                    companyName={template.companyName}
                    isSession={false}
                    feedback={null}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="card-border">
              {/* Empty state ... */}
              <div className="card space-y-6 !p-12 text-center">
                <div className="space-y-2">
                  <h3 className="text-light-100 text-2xl font-bold">No Templates Yet</h3>
                  <p className="text-light-300 mx-auto max-w-md">
                    Be the first to create an interview template!
                  </p>
                </div>
                <Link href="/create" className="btn-primary inline-flex items-center gap-2">
                  <span>Create First Template</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="sessions" className="animate-fadeIn">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
                <History className="text-accent-300 size-7" />
                Your Interview Sessions
              </h2>
              <p className="text-light-300">Track your progress and review past performances</p>
            </div>
          </div>

          {userSessions.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {userSessions.map((session, index) => (
                <div
                  key={session.id}
                  className="animate-fadeIn"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <InterviewCard
                    id={session.id}
                    userId={userId}
                    role={session.role}
                    type={session.type}
                    techstack={session.techstack}
                    createdAt={session.createdAt}
                    companyName={session.companyName}
                    isSession={true}
                    feedback={session.feedback}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="card-border">
              {/* Empty state ... */}
              <div className="card space-y-6 !p-12 text-center">
                <div className="space-y-2">
                  <h3 className="text-light-100 text-2xl font-bold">No Sessions Yet</h3>
                  <p className="text-light-300 mx-auto max-w-md">
                    Start your first interview session to practice!
                  </p>
                </div>
                <Link href="/create" className="btn-primary inline-flex items-center gap-2">
                  <span>Start First Session</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
