'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  FileText,
  Upload,
  Loader2,
  Sparkles,
  X,
  CheckCircle2,
  Wand2,
  Globe,
  Lock,
  Building2,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Label } from '@/components/atoms/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/atoms/tabs'
import { Textarea } from '@/components/atoms/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card'
import { Badge } from '@/components/atoms/badge'
import { validateAndSanitizeURL } from '@/lib/validation'
import { cn } from '@/lib/utils'

interface CreateInterviewFormProps {
  userId: string
}

const INTERVIEW_TYPES = [
  { value: 'Technical', label: 'Technical', desc: 'Coding and problem solving depth' },
  { value: 'System Design', label: 'System Design', desc: 'Architecture and tradeoff reasoning' },
  { value: 'Behavioral', label: 'Behavioral', desc: 'Communication and team collaboration' },
  { value: 'HR', label: 'HR / Fit', desc: 'Values, goals, and role fit' },
  { value: 'Mixed', label: 'Mixed', desc: 'Balanced technical and behavioral rounds' },
]

const LEVELS = ['Junior', 'Mid', 'Senior', 'Staff', 'Executive']

type Stage = 'input' | 'analyzing' | 'config' | 'generating'

export function CreateInterviewForm({ userId }: CreateInterviewFormProps) {
  const router = useRouter()

  const [stage, setStage] = useState<Stage>('input')

  const [jdType, setJdType] = useState<'text' | 'url' | 'file'>('text')
  const [jdText, setJdText] = useState('')
  const [jdUrl, setJdUrl] = useState('')
  const [jdFile, setJdFile] = useState<File | null>(null)

  const [role, setRole] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyLogoUrl, setCompanyLogoUrl] = useState('')
  const [level, setLevel] = useState('Mid')
  const [type, setType] = useState('Technical')
  const [techStack, setTechStack] = useState<string[]>([])
  const [newTech, setNewTech] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  const handleAnalyze = async () => {
    if (jdType === 'text' && jdText.length < 20)
      return toast.error('Please enter a valid job description')
    if (jdType === 'url' && !validateAndSanitizeURL(jdUrl)) return toast.error('Invalid URL')
    if (jdType === 'file' && !jdFile) return toast.error('Please upload a file')

    setStage('analyzing')

    try {
      const formData = new FormData()
      formData.append('jdType', jdType)
      if (jdType === 'text') formData.append('jdInput', jdText)
      if (jdType === 'url') formData.append('jdInput', jdUrl)
      if (jdType === 'file' && jdFile) formData.append('jdInput', jdFile)

      const res = await fetch('/api/interview/analyze', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Analysis failed')

      setRole(data.role || '')
      setCompanyName(data.companyName || 'Unknown Company')
      setCompanyLogoUrl(data.companyLogoUrl || '')
      setLevel(data.level || 'Mid')
      setType(data.suggestedType || 'Technical')
      setTechStack(data.techStack || [])

      if (data.cleanedJd) {
        setJdText(data.cleanedJd)
        setJdType('text')
      }

      setStage('config')
      toast.success('Analysis complete. Review and confirm before creating template.')
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Could not analyze JD. Please fill details manually.'
      toast.error(message)
      setStage('config')
    }
  }

  const handleGenerate = async () => {
    if (!role.trim()) return toast.error('Role is required')
    if (!companyName.trim()) return toast.error('Company name is required')

    setStage('generating')
    try {
      const formData = new FormData()
      formData.append('userId', userId)
      formData.append('role', role)
      formData.append('companyName', companyName)
      formData.append('companyLogoUrl', companyLogoUrl)
      formData.append('level', level)
      formData.append('type', type)
      formData.append('jdInput', jdText)
      formData.append('techStack', JSON.stringify(techStack))
      formData.append('isPublic', String(isPublic))

      const res = await fetch('/api/interview/generate', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Generation failed')

      toast.success('Interview template created successfully.')
      router.push('/dashboard')
    } catch (error) {
      console.error(error)
      const message =
        error instanceof Error && error.message ? error.message : 'Failed to generate template'
      toast.error(message)
      setStage('config')
    }
  }

  const addTech = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && newTech.trim()) {
      event.preventDefault()
      if (!techStack.includes(newTech.trim())) setTechStack([...techStack, newTech.trim()])
      setNewTech('')
    }
  }

  const removeTech = (tech: string) => setTechStack(techStack.filter((item) => item !== tech))

  return (
    <div className="animate-fadeIn mx-auto w-full max-w-4xl">
      <Card
        variant="gradient"
        className={cn('transition-all duration-500', stage !== 'input' && 'pointer-events-none opacity-55')}
      >
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="text-primary size-5" />
              Step 1: Add Job Description
            </CardTitle>
            {stage !== 'input' && <CheckCircle2 className="text-success size-5" />}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <Tabs
            defaultValue="text"
            value={jdType}
            onValueChange={(value) => setJdType(value as 'text' | 'url' | 'file')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="text">Paste Text</TabsTrigger>
              <TabsTrigger value="url">URL</TabsTrigger>
              <TabsTrigger value="file">Upload File</TabsTrigger>
            </TabsList>

            <div className="mt-4">
              {jdType === 'text' && (
                <Textarea
                  placeholder="Paste job description here..."
                  className="min-h-[170px]"
                  value={jdText}
                  onChange={(event) => setJdText(event.target.value)}
                />
              )}

              {jdType === 'url' && (
                <Input
                  placeholder="https://linkedin.com/jobs/..."
                  value={jdUrl}
                  onChange={(event) => setJdUrl(event.target.value)}
                />
              )}

              {jdType === 'file' && (
                <div className="rounded-2xl border-2 border-dashed border-primary/25 bg-muted/50 p-8 text-center transition-colors hover:border-primary/45">
                  <input
                    type="file"
                    id="file-up"
                    className="hidden"
                    accept=".pdf,.docx,.txt"
                    onChange={(event) => setJdFile(event.target.files?.[0] || null)}
                  />
                  <label htmlFor="file-up" className="block cursor-pointer">
                    <Upload className="text-primary mx-auto mb-2 size-8" />
                    <span className="text-sm font-medium">
                      {jdFile ? jdFile.name : 'Click to upload PDF or DOCX'}
                    </span>
                  </label>
                </div>
              )}
            </div>
          </Tabs>

          {(stage === 'input' || stage === 'analyzing') && (
            <Button
              onClick={handleAnalyze}
              className="w-full"
              size="lg"
              disabled={stage === 'analyzing'}
            >
              {stage === 'analyzing' ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Analyzing Job Description...
                </>
              ) : (
                <>
                  <Wand2 className="size-4" />
                  Analyze and Auto-Fill
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {(stage === 'config' || stage === 'generating') && (
        <div className="animate-fadeInUp mt-8">
          <Card variant="gradient">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-accent-foreground size-5" />
                Step 2: Configure Template
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {companyName && (
                <div className="flex items-center gap-4 rounded-2xl border border-border bg-muted/50 p-4">
                  <div className="from-primary to-accent flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-bold text-white">
                    {companyName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-muted-foreground text-xs tracking-wide uppercase">Company Preview</p>
                    <p className="text-lg font-bold">{companyName}</p>
                    {companyLogoUrl && <p className="text-muted-foreground mt-1 text-xs">Logo URL detected</p>}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Target Role</Label>
                  <Input
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    placeholder="e.g. Senior Backend Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="e.g. Google"
                    icon={<Building2 className="size-4" />}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tech Stack and Skills</Label>
                <div className="flex min-h-13 flex-wrap gap-2 rounded-xl border border-border bg-muted/50 p-3">
                  {techStack.map((tech) => (
                    <Badge key={tech} variant="primary" className="flex items-center gap-1">
                      {tech}
                      <button onClick={() => removeTech(tech)} className="ml-1 hover:text-white" type="button">
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    className="placeholder:text-muted-foreground min-w-[120px] flex-1 bg-transparent text-sm outline-none"
                    placeholder="Type and press Enter to add..."
                    value={newTech}
                    onChange={(event) => setNewTech(event.target.value)}
                    onKeyDown={addTech}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Experience Level</Label>
                  <div className="relative">
                    <select
                      value={level}
                      onChange={(event) => setLevel(event.target.value)}
                      className="h-12 w-full cursor-pointer appearance-none rounded-xl border-2 border-border bg-card px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
                    >
                      {LEVELS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Interview Type</Label>
                  <div className="relative">
                    <select
                      value={type}
                      onChange={(event) => setType(event.target.value)}
                      className="h-12 w-full cursor-pointer appearance-none rounded-xl border-2 border-border bg-card px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
                    >
                      {INTERVIEW_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <div className="flex h-12 items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
                    <button
                      type="button"
                      onClick={() => setIsPublic(true)}
                      className={cn(
                        'flex h-full flex-1 items-center justify-center gap-1.5 rounded text-xs font-medium transition-all',
                        isPublic ? 'bg-primary/16 text-primary' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Globe className="size-3.5" /> Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={cn(
                        'flex h-full flex-1 items-center justify-center gap-1.5 rounded text-xs font-medium transition-all',
                        !isPublic
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Lock className="size-3.5" /> Private
                    </button>
                  </div>
                </div>
              </div>

              {INTERVIEW_TYPES.find((item) => item.value === type)?.desc && (
                <p className="text-muted-foreground text-xs">
                  {INTERVIEW_TYPES.find((item) => item.value === type)?.desc}
                </p>
              )}

              <Button
                onClick={handleGenerate}
                disabled={stage === 'generating'}
                className="w-full"
                size="lg"
              >
                {stage === 'generating' ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating and Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    Create Interview Template
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
