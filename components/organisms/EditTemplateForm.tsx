"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  X,
  ChevronDown,
  Globe,
  Lock,
  Building2,
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { Textarea } from "@/components/atoms/textarea";
import { Badge } from "@/components/atoms/badge";
import { cn } from "@/lib/utils";
import type { InterviewTemplate } from "@/types";

const INTERVIEW_TYPES = [
  "Technical",
  "System Design",
  "Behavioral",
  "HR",
  "Mixed",
] as const;

const LEVELS = ["Junior", "Mid", "Senior", "Staff", "Executive"] as const;

const MAX_TECH_ITEMS = 20;

interface EditTemplateFormProps {
  template: InterviewTemplate;
}

export function EditTemplateForm({ template }: EditTemplateFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Editable field state — pre-filled from the template prop.
  const [role, setRole] = useState(template.role);
  const [companyName, setCompanyName] = useState(template.companyName);
  const [level, setLevel] = useState<(typeof LEVELS)[number]>(template.level);
  const [type, setType] = useState<(typeof INTERVIEW_TYPES)[number]>(
    template.type,
  );
  const [techStack, setTechStack] = useState<string[]>(
    template.techStack ?? [],
  );
  const [newTech, setNewTech] = useState("");
  const [isPublic, setIsPublic] = useState(template.isPublic);
  const [jobDescription, setJobDescription] = useState(
    template.jobDescription ?? "",
  );

  const addTech = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = newTech.trim();
    if (!trimmed) return;
    if (techStack.length >= MAX_TECH_ITEMS) {
      toast.error(`Maximum ${MAX_TECH_ITEMS} skills allowed`);
      return;
    }
    if (!techStack.includes(trimmed)) {
      setTechStack([...techStack, trimmed]);
    }
    setNewTech("");
  };

  const removeTech = (t: string) =>
    setTechStack(techStack.filter((s) => s !== t));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim()) return toast.error("Role is required");
    if (!companyName.trim()) return toast.error("Company name is required");

    setSaving(true);
    try {
      const res = await fetch(`/api/interview/template/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: role.trim(),
          companyName: companyName.trim(),
          level,
          type,
          techStack,
          isPublic,
          ...(jobDescription.trim().length >= 50
            ? { jobDescription: jobDescription.trim() }
            : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const detail = data.details
          ?.map((d: { field: string; message: string }) => d.message)
          .join(", ");
        throw new Error(detail || data.error || "Failed to save");
      }

      toast.success("Template updated");
      router.push(`/interview/template/${template.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update template",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Role + Company */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="role">Target role</Label>
          <Input
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Senior Backend Engineer"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company">Company name</Label>
          <Input
            id="company"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Google"
            icon={<Building2 />}
          />
        </div>
      </div>

      {/* Tech stack */}
      <div className="space-y-1.5">
        <Label>
          Tech stack &amp; skills{" "}
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

      {/* Level + Type + Visibility */}
      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Experience level</Label>
          <div className="relative">
            <select
              value={level}
              onChange={(e) =>
                setLevel(e.target.value as (typeof LEVELS)[number])
              }
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
          <Label>Interview type</Label>
          <div className="relative">
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as (typeof INTERVIEW_TYPES)[number])
              }
              className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-border bg-input/40 px-4 pr-9 text-sm font-medium text-foreground transition-colors hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              {INTERVIEW_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
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

      {/* Job description */}
      <div className="space-y-1.5">
        <Label htmlFor="jd">Job description</Label>
        <Textarea
          id="jd"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste or edit the job description…"
          className="min-h-[200px] resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Minimum 50 characters. Displayed on the template detail page.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" variant="gradient" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
