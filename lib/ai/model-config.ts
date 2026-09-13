import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";

export type AiRole = "extraction" | "generation" | "feedback";
export type ThinkingLevel = "minimal" | "low" | "medium" | "high";

interface AiRoleConfig {
  envVar: string;
  /** Falls back to this env var's model if envVar isn't set. */
  fallbackEnvVar?: string;
  thinkingLevel: ThinkingLevel;
}

const AI_ROLE_CONFIG: Record<AiRole, AiRoleConfig> = {
  extraction: {
    envVar: "JD_ANALYSIS_MODEL",
    fallbackEnvVar: "TEMPLATE_GENERATION_MODEL",
    thinkingLevel: "low",
  },
  generation: {
    envVar: "TEMPLATE_GENERATION_MODEL",
    thinkingLevel: "medium",
  },
  feedback: {
    envVar: "FEEDBACK_MODEL",
    thinkingLevel: "high",
  },
};

export function getAiModel(role: AiRole): string {
  const config = AI_ROLE_CONFIG[role];
  const model =
    process.env[config.envVar] ||
    (config.fallbackEnvVar ? process.env[config.fallbackEnvVar] : undefined);

  if (!model) {
    const varNames = [config.envVar, config.fallbackEnvVar]
      .filter(Boolean)
      .join(" or ");
    throw new Error(`${varNames} must be set for the "${role}" AI role`);
  }

  return model;
}

export function getThinkingLevel(role: AiRole): ThinkingLevel {
  return AI_ROLE_CONFIG[role].thinkingLevel;
}

/**
 * thinkingLevel is a Gemini 3-only parameter — Gemini 2.5 models use a
 * numeric thinkingBudget and reject an unrecognized thinkingLevel. If a
 * deployment still points a role at a 2.5-family model, skip thinking
 * config entirely rather than risk a 400 on every call.
 */
function isGemini3Family(model: string): boolean {
  return /^gemini-3(\.\d+)?-/.test(model);
}

export function thinkingProviderOptions(
  role: AiRole,
  model: string,
): { google: GoogleGenerativeAIProviderOptions } | Record<string, never> {
  if (!isGemini3Family(model)) {
    return {};
  }

  return {
    google: {
      thinkingConfig: {
        thinkingLevel: getThinkingLevel(role),
      },
    },
  };
}
