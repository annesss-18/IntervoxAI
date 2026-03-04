"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/atoms/tabs";
import { Textarea } from "@/components/atoms/textarea";
import { Badge } from "@/components/atoms/badge";
import { validateAndSanitizeURL } from "@/lib/validation";
import { cn } from "@/lib/utils";

const INTERVIEW_TYPES = [
  {
    value: "Technical",
    label: "Technical",
    desc: "Coding & problem-solving depth",
  },
  {
    value: "System Design",
    label: "System Design",
    desc: "Architecture & tradeoff reasoning",
  },
  {
    value: "Behavioral",
    label: "Behavioral",
    desc: "Communication & team collaboration",
  },
  { value: "HR", label: "HR / Fit", desc: "Values, goals, and role fit" },
  {
    value: "Mixed",
    label: "Mixed",
    desc: "Balanced technical & behavioral rounds",
  },
];

const LEVELS = ["Junior", "Mid", "Senior", "Staff", "Executive"];
const MAX_TECH_ITEMS = 20;

type Stage = "input" | "analyzing" | "config" | "generating";
function StepIndicator({ step, done }: { step: 1 | 2; done: boolean }) {
  return (
    <div
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
        done
          ? "bg-success text-white"
          : "bg-primary/12 text-primary ring-1 ring-primary/25",
      )}
    >
      {done ? <CheckCircle2 className="size-4" /> : step}
    </div>
  );
}
export function CreateInterviewForm() {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("input");
  const [jdType, setJdType] = useState<"text" | "url" | "file">("text");
  const [jdText, setJdText] = useState("");
  const [jdUrl, setJdUrl] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);

  const [role, setRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [level, setLevel] = useState("Mid");
  const [type, setType] = useState("Technical");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [newTech, setNewTech] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const handleAnalyze = async () => {
    if (jdType === "text" && jdText.length < 20)
      return toast.error(
        "Please enter a valid job description (min 20 characters)",
      );
    if (jdType === "url" && !validateAndSanitizeURL(jdUrl))
      return toast.error("Please enter a valid URL");
    if (jdType === "file" && !jdFile)
      return toast.error("Please upload a file");

    setStage("analyzing");
    try {
      const formData = new FormData();
      formData.append("jdType", jdType);
      if (jdType === "text") formData.append("jdInput", jdText);
      if (jdType === "url") formData.append("jdInput", jdUrl);
      if (jdType === "file" && jdFile) formData.append("jdInput", jdFile);

      const res = await fetch("/api/interview/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setRole(data.role || "");
      setCompanyName(data.companyName || "Unknown Company");
      setCompanyLogoUrl(data.companyLogoUrl || "");
      setLevel(data.level || "Mid");
      setType(data.suggestedType || "Technical");
      setTechStack((data.techStack || []).slice(0, MAX_TECH_ITEMS));
      if (data.cleanedJd) {
        setJdText(data.cleanedJd);
        setJdType("text");
      }

      setStage("config");
      toast.success("Analysis complete — review the details below.");
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Could not analyse JD. Fill details manually.";
      toast.error(msg);
      setStage("config");
    }
  };
  const handleGenerate = async () => {
    if (!role.trim()) return toast.error("Role is required");
    if (!companyName.trim()) return toast.error("Company name is required");

    setStage("generating");
    try {
      const formData = new FormData();
      formData.append("role", role);
      formData.append("companyName", companyName);
      formData.append("companyLogoUrl", companyLogoUrl);
      formData.append("level", level);
      formData.append("type", type);
      formData.append("jdInput", jdText);
      formData.append("techStack", JSON.stringify(techStack));
      formData.append("isPublic", String(isPublic));

      const res = await fetch("/api/interview/generate", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.details
          ?.map(
            (d: { field: string; message: string }) =>
              `${d.field}: ${d.message}`,
          )
          .join(", ");
        throw new Error(detail || data.error || "Generation failed");
      }

      toast.success("Interview template created!");
      router.push("/dashboard");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to generate template";
      toast.error(msg);
      setStage("config");
    }
  };
  const addTech = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newTech.trim()) {
      e.preventDefault();
      if (techStack.length >= MAX_TECH_ITEMS)
        return toast.error(`Maximum ${MAX_TECH_ITEMS} skills allowed`);
      if (!techStack.includes(newTech.trim()))
        setTechStack([...techStack, newTech.trim()]);
      setNewTech("");
    }
  };
  const removeTech = (t: string) =>
    setTechStack(techStack.filter((i) => i !== t));

  const step1Done = stage !== "input" && stage !== "analyzing";

  return (
    <div className="w-full space-y-5">
      <div
        className={cn(
          "overflow-hidden rounded-2xl border bg-card transition-all duration-400",
          step1Done ? "border-success/30 opacity-70" : "border-border",
        )}
      >
        <div className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
          <StepIndicator step={1} done={step1Done} />
          <h3 className="font-semibold">Add Job Description</h3>
          {step1Done && (
            <button
              type="button"
              onClick={() => setStage("input")}
              className="ml-auto text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        <div
          className={cn(
            "p-6 space-y-5 transition-opacity duration-300",
            step1Done && "pointer-events-none opacity-60",
          )}
        >
          <Tabs
            value={jdType}
            onValueChange={(v) => setJdType(v as "text" | "url" | "file")}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="text">
                <FileText className="size-3.5" /> Paste Text
              </TabsTrigger>
              <TabsTrigger value="url">URL</TabsTrigger>
              <TabsTrigger value="file">
                <Upload className="size-3.5" /> File
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              {jdType === "text" && (
                <Textarea
                  placeholder="Paste the full job description here. The more context, the better the template."
                  className="min-h-[180px] rounded-xl resize-none"
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                />
              )}
              {jdType === "url" && (
                <Input
                  placeholder="https://linkedin.com/jobs/…"
                  value={jdUrl}
                  onChange={(e) => setJdUrl(e.target.value)}
                />
              )}
              {jdType === "file" && (
                <div className="rounded-xl border-2 border-dashed border-primary/25 bg-surface-2/50 p-8 text-center transition-colors hover:border-primary/45">
                  <input
                    type="file"
                    id="file-up"
                    className="hidden"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => setJdFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="file-up" className="block cursor-pointer">
                    <Upload className="mx-auto mb-3 size-8 text-primary" />
                    <span className="text-sm font-medium">
                      {jdFile
                        ? jdFile.name
                        : "Click to upload PDF, DOCX, or TXT"}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Max 5 MB
                    </p>
                  </label>
                </div>
              )}
            </div>
          </Tabs>

          {!step1Done && (
            <Button
              onClick={handleAnalyze}
              variant="gradient"
              size="lg"
              className="w-full"
              disabled={stage === "analyzing"}
            >
              {stage === "analyzing" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Analysing job description…
                </>
              ) : (
                <>
                  <Wand2 className="size-4" />
                  Analyse & Auto-Fill
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {(stage === "config" || stage === "generating") && (
        <div className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
            <StepIndicator step={2} done={false} />
            <h3 className="font-semibold">Configure Template</h3>
            <Badge variant="primary" className="ml-auto">
              <Sparkles className="size-3" />
              AI-filled
            </Badge>
          </div>

          <div className="p-6 space-y-6">
            {companyName && (
              <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-2/60 p-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-xl font-bold text-white shadow-sm">
                  {companyName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="label-caps mb-0.5">Detected company</p>
                  <p className="font-semibold truncate">{companyName}</p>
                  {companyLogoUrl && (
                    <p className="text-xs text-success mt-0.5">
                      Logo URL detected
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="role">Target Role</Label>
                <Input
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Google"
                  icon={<Building2 />}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Tech Stack & Skills{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  ({techStack.length}/{MAX_TECH_ITEMS})
                </span>
              </Label>
              <div className="flex min-h-[52px] flex-wrap gap-2 rounded-xl border border-border bg-surface-2/50 p-3 focus-within:border-primary transition-colors">
                {techStack.map((tech) => (
                  <Badge
                    key={tech}
                    variant="primary"
                    className="flex items-center gap-1 pr-1.5"
                  >
                    {tech}
                    <button
                      type="button"
                      onClick={() => removeTech(tech)}
                      className="ml-0.5 flex size-3.5 items-center justify-center rounded-full hover:bg-primary/20 transition-colors"
                    >
                      <X className="size-2.5" />
                    </button>
                  </Badge>
                ))}
                <input
                  className="placeholder:text-muted-foreground min-w-[120px] flex-1 bg-transparent text-sm outline-none"
                  placeholder="Type skill and press Enter…"
                  value={newTech}
                  onChange={(e) => setNewTech(e.target.value)}
                  onKeyDown={addTech}
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Experience Level</Label>
                <div className="relative">
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-border bg-input/40 px-4 pr-9 text-sm font-medium text-foreground transition-colors hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Interview Type</Label>
                <div className="relative">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-border bg-input/40 px-4 pr-9 text-sm font-medium text-foreground transition-colors hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
                  >
                    {INTERVIEW_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                {INTERVIEW_TYPES.find((t) => t.value === type)?.desc && (
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {INTERVIEW_TYPES.find((t) => t.value === type)?.desc}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Visibility</Label>
                <div className="flex h-11 items-center gap-1 rounded-xl border border-border bg-surface-2/50 p-1">
                  {[
                    { val: true, icon: Globe, label: "Public" },
                    { val: false, icon: Lock, label: "Private" },
                  ].map(({ val, icon: Icon, label }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setIsPublic(val)}
                      className={cn(
                        "flex h-full flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                        isPublic === val
                          ? "bg-card text-foreground shadow-[var(--shadow-sm)]"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              variant="gradient"
              size="lg"
              className="w-full"
              disabled={stage === "generating"}
            >
              {stage === "generating" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating & saving template…
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Create Interview Template
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
