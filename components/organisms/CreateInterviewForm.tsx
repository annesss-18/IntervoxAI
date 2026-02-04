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
  { value: 'Technical', label: 'Technical', desc: 'Coding & Problem Solving' },
  { value: 'System Design', label: 'System Design', desc: 'Architecture & Scalability' },
  { value: 'Behavioral', label: 'Behavioral', desc: 'Soft Skills & Culture' },
  { value: 'HR', label: 'HR / Fit', desc: 'Career Goals & Values' },
  { value: 'Mixed', label: 'Mixed', desc: 'Holistic Assessment' },
]

const LEVELS = ['Junior', 'Mid', 'Senior', 'Staff', 'Executive']

type Stage = 'input' | 'analyzing' | 'config' | 'generating'

export function CreateInterviewForm({ userId }: CreateInterviewFormProps) {
  const router = useRouter()

  const [stage, setStage] = useState<Stage>('input')

  // JD State
  const [jdType, setJdType] = useState<'text' | 'url' | 'file'>('text')
  const [jdText, setJdText] = useState('')
  const [jdUrl, setJdUrl] = useState('')
  const [jdFile, setJdFile] = useState<File | null>(null)

  // Config State
  const [role, setRole] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyLogoUrl, setCompanyLogoUrl] = useState('')
  const [level, setLevel] = useState('Mid')
  const [type, setType] = useState('Technical')
  const [techStack, setTechStack] = useState<string[]>([])
  const [newTech, setNewTech] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  // 1. ANALYZE JD
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

      // Auto-fill ALL fields including company logo
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
      toast.success('Analysis complete! Review the details below.')
    } catch {
      toast.error('Could not analyze JD. Please fill details manually.')
      setStage('config')
    }
  }

  // 2. GENERATE & SAVE
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

      toast.success('Interview Template Created Successfully!')
      router.push('/dashboard')
    } catch (error) {
      console.error(error)
      toast.error('Failed to generate template')
      setStage('config')
    }
  }

  const addTech = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTech.trim()) {
      e.preventDefault()
      if (!techStack.includes(newTech.trim())) setTechStack([...techStack, newTech.trim()])
      setNewTech('')
    }
  }

  const removeTech = (t: string) => setTechStack(techStack.filter((i) => i !== t))

  return (
    <div className="animate-fadeIn mx-auto w-full max-w-4xl">
      {/* STEP 1: JD INPUT */}
      <Card
        variant="gradient"
        className={cn(
          'transition-all duration-500',
          stage !== 'input' && 'pointer-events-none opacity-50'
        )}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="text-primary size-5" />
              Step 1: Job Description
            </CardTitle>
            {stage !== 'input' && <CheckCircle2 className="text-success-500 size-5" />}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            defaultValue="text"
            value={jdType}
            onValueChange={(v) => setJdType(v as 'text' | 'url' | 'file')}
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
                  className="min-h-[150px]"
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                />
              )}
              {jdType === 'url' && (
                <Input
                  placeholder="https://linkedin.com/jobs/..."
                  value={jdUrl}
                  onChange={(e) => setJdUrl(e.target.value)}
                />
              )}
              {jdType === 'file' && (
                <div className="border-primary/20 bg-surface-2/50 hover:border-primary/40 rounded-xl border-2 border-dashed p-8 text-center transition-colors">
                  <input
                    type="file"
                    id="file-up"
                    className="hidden"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => setJdFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="file-up" className="block cursor-pointer">
                    <Upload className="text-primary mx-auto mb-2 size-8" />
                    <span className="text-sm font-medium">
                      {jdFile ? jdFile.name : 'Click to Upload PDF/DOCX'}
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
                  Analyzing...
                </>
              ) : (
                <>
                  <Wand2 className="size-4" />
                  Analyze & Auto-Fill
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* STEP 2: CONFIGURATION */}
      {(stage === 'config' || stage === 'generating') && (
        <div className="animate-fadeInUp mt-8">
          <Card variant="gradient">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-accent size-5" />
                Step 2: Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Preview */}
              {companyName && (
                <div className="bg-surface-2 border-border flex items-center gap-4 rounded-xl border p-4">
                  <div className="from-primary to-accent flex size-14 items-center justify-center rounded-full bg-gradient-to-br text-xl font-bold text-white">
                    {companyName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-muted-foreground text-xs tracking-wide uppercase">
                      Company Preview
                    </p>
                    <p className="text-lg font-bold">{companyName}</p>
                  </div>
                </div>
              )}

              {/* ROW 1: Role & Company */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Target Role</Label>
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Senior Backend Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Google"
                    icon={<Building2 className="size-4" />}
                  />
                </div>
              </div>

              {/* ROW 2: Tech Stack */}
              <div className="space-y-2">
                <Label>Tech Stack & Skills</Label>
                <div className="bg-surface-2 border-border flex min-h-12 flex-wrap gap-2 rounded-lg border p-3">
                  {techStack.map((t) => (
                    <Badge key={t} variant="primary" className="flex items-center gap-1">
                      {t}
                      <button onClick={() => removeTech(t)} className="ml-1 hover:text-white">
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    className="placeholder:text-muted-foreground min-w-[120px] flex-1 bg-transparent text-sm outline-none"
                    placeholder="Type & Enter to add..."
                    value={newTech}
                    onChange={(e) => setNewTech(e.target.value)}
                    onKeyDown={addTech}
                  />
                </div>
              </div>

              {/* ROW 3: Level, Type, Visibility */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Experience Level */}
                <div className="space-y-2">
                  <Label>Experience Level</Label>
                  <div className="relative">
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="bg-surface-1 border-border focus:ring-primary/50 h-10 w-full cursor-pointer appearance-none rounded-md border px-3 pr-10 text-sm focus:ring-2 focus:outline-none"
                    >
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
                  </div>
                </div>

                {/* Interview Type */}
                <div className="space-y-2">
                  <Label>Interview Type</Label>
                  <div className="relative">
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="bg-surface-1 border-border focus:ring-primary/50 h-10 w-full cursor-pointer appearance-none rounded-md border px-3 pr-10 text-sm focus:ring-2 focus:outline-none"
                    >
                      {INTERVIEW_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
                  </div>
                </div>

                {/* Visibility */}
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <div className="bg-surface-2 border-border flex h-10 items-center gap-1 rounded-lg border p-1">
                    <button
                      type="button"
                      onClick={() => setIsPublic(true)}
                      className={cn(
                        'flex h-full flex-1 items-center justify-center gap-1.5 rounded text-xs font-medium transition-all',
                        isPublic
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground hover:text-foreground'
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
                          ? 'bg-surface-1 text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Lock className="size-3.5" /> Private
                    </button>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={stage === 'generating'}
                className="w-full"
                size="lg"
              >
                {stage === 'generating' ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating & Saving...
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
