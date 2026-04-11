import { db } from "@/firebase/admin";
import { InterviewTemplate } from "@/types";
import { logger } from "@/lib/logger";
import { unstable_cache, revalidateTag } from "next/cache";
import { FieldPath } from "firebase-admin/firestore";

const CACHE_REVALIDATE_SECONDS = 300;

// ---------------------------------------------------------------------------
// Per-template stable cache wrappers (bounded)
//
// Stable Map ensures unstable_cache reuses the same wrapper function reference
// for a given template ID, enabling Next.js to correctly hit the data cache on
// subsequent requests rather than creating a new cache entry on every call.
//
// The map is bounded to prevent unbounded memory growth from arbitrary URL
// params. When the cap is exceeded, the oldest entries are evicted.
// ---------------------------------------------------------------------------
const MAX_TEMPLATE_CACHE_SIZE = 500;

const _templateByIdCacheMap = new Map<
  string,
  () => Promise<InterviewTemplate | null>
>();

function getOrCreateTemplateCacheFn(
  id: string,
): () => Promise<InterviewTemplate | null> {
  const existing = _templateByIdCacheMap.get(id);
  if (existing) {
    // Move to end (most-recently-used) so LRU eviction works correctly.
    _templateByIdCacheMap.delete(id);
    _templateByIdCacheMap.set(id, existing);
    return existing;
  }

  // Evict oldest entries if at capacity.
  while (_templateByIdCacheMap.size >= MAX_TEMPLATE_CACHE_SIZE) {
    const oldestKey = _templateByIdCacheMap.keys().next().value;
    if (oldestKey !== undefined) _templateByIdCacheMap.delete(oldestKey);
    else break;
  }

  const fn = unstable_cache(
    async () => {
      const doc = await db
        .collection("interview_templates")
        .doc(id)
        .get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as InterviewTemplate;
    },
    [`template:${id}`],
    {
      revalidate: CACHE_REVALIDATE_SECONDS,
      tags: ["template", `template:${id}`],
    },
  );

  _templateByIdCacheMap.set(id, fn);
  return fn;
}

/**
 * Remove a template from the in-memory cache wrapper map.
 * Called during account deletion to prevent stale closures from lingering
 * after the underlying Firestore document has been removed.
 */
export function evictTemplateFromCache(id: string): void {
  _templateByIdCacheMap.delete(id);
}

// ---------------------------------------------------------------------------
// Per-sort-mode stable public-template caches
//
// One cache per sort mode so each mode gets its own data-cache key.
// All three share the "templates-public" tag for invalidation.
// ---------------------------------------------------------------------------
const MAX_PUBLIC_LIMIT = 100;

export type PublicTemplateSort = "newest" | "popular" | "top-rated";

const _publicCaches: Record<
  PublicTemplateSort,
  () => Promise<InterviewTemplate[]>
> = {
  newest: unstable_cache(
    async () => {
      const snapshot = await db
        .collection("interview_templates")
        .where("isPublic", "==", true)
        .orderBy("createdAt", "desc")
        .limit(MAX_PUBLIC_LIMIT)
        .get();

      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as InterviewTemplate,
      );
    },
    ["templates-public:newest"],
    {
      revalidate: CACHE_REVALIDATE_SECONDS,
      tags: ["templates-public"],
    },
  ),
  popular: unstable_cache(
    async () => {
      const snapshot = await db
        .collection("interview_templates")
        .where("isPublic", "==", true)
        .orderBy("usageCount", "desc")
        .limit(MAX_PUBLIC_LIMIT)
        .get();

      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as InterviewTemplate,
      );
    },
    ["templates-public:popular"],
    {
      revalidate: CACHE_REVALIDATE_SECONDS,
      tags: ["templates-public"],
    },
  ),
  "top-rated": unstable_cache(
    async () => {
      const snapshot = await db
        .collection("interview_templates")
        .where("isPublic", "==", true)
        .orderBy("avgScore", "desc")
        .limit(MAX_PUBLIC_LIMIT)
        .get();

      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as InterviewTemplate,
      );
    },
    ["templates-public:top-rated"],
    {
      revalidate: CACHE_REVALIDATE_SECONDS,
      tags: ["templates-public"],
    },
  ),
};

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

/**
 * Fields the template creator is allowed to mutate.
 * AI-generated fields (systemInstruction, interviewerPersona,
 * companyCultureInsights, baseQuestions, focusArea) are intentionally
 * excluded — they should be regenerated, not hand-edited.
 */
export type TemplateUpdatePayload = Partial<
  Pick<
    InterviewTemplate,
    | "role"
    | "companyName"
    | "companyLogoUrl"
    | "level"
    | "type"
    | "techStack"
    | "jobDescription"
    | "isPublic"
  >
>;

export const TemplateRepository = {
  async findById(id: string): Promise<InterviewTemplate | null> {
    return getOrCreateTemplateCacheFn(id)();
  },

  async findManyByIds(ids: string[]): Promise<Map<string, InterviewTemplate>> {
    if (ids.length === 0) return new Map();

    const templateMap = new Map<string, InterviewTemplate>();
    const uniqueIds = Array.from(new Set(ids));

    for (let i = 0; i < uniqueIds.length; i += 10) {
      const batch = uniqueIds.slice(i, i + 10);
      try {
        const snapshot = await db
          .collection("interview_templates")
          .where(FieldPath.documentId(), "in", batch)
          .get();

        snapshot.docs.forEach((doc) => {
          templateMap.set(doc.id, {
            id: doc.id,
            ...doc.data(),
          } as InterviewTemplate);
        });
      } catch (error) {
        logger.error("Error batch fetching templates:", error);
      }
    }

    return templateMap;
  },

  async findPublic(
    limit: number = 20,
    sort: PublicTemplateSort = "newest",
  ): Promise<InterviewTemplate[]> {
    try {
      const templates = await _publicCaches[sort]();
      return templates.slice(0, Math.min(limit, MAX_PUBLIC_LIMIT));
    } catch (error) {
      logger.error("Error fetching public templates:", error);
      throw error;
    }
  },

  async findByCreatorId(userId: string): Promise<InterviewTemplate[]> {
    try {
      const snapshot = await db
        .collection("interview_templates")
        .where("creatorId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as InterviewTemplate,
      );
    } catch (error) {
      logger.error("Error fetching user templates:", error);
      return [];
    }
  },

  async create(data: Omit<InterviewTemplate, "id">): Promise<string> {
    const docRef = await db.collection("interview_templates").add(data);
    return docRef.id;
  },

  /**
   * Update user-editable fields on an existing template.
   *
   * The caller must have already verified ownership (creatorId === userId)
   * before invoking this method. The method does NOT perform its own auth
   * check — that responsibility belongs to the API route layer.
   *
   * After writing to Firestore, the template-specific and public-list cache
   * tags are invalidated so the next request fetches fresh data.
   */
  async update(id: string, data: TemplateUpdatePayload): Promise<void> {
    if (Object.keys(data).length === 0) return;

    try {
      await db
        .collection("interview_templates")
        .doc(id)
        .update({
          ...data,
          updatedAt: new Date().toISOString(),
        });

      // Evict cached data for this template and the public list.
      // Using "max" profile: stale data is served immediately while Next.js
      // revalidates in the background (consistent with the existing pattern).
      revalidateTag(`template:${id}`, "max");
      revalidateTag("templates-public", "max");

      logger.info(`Template ${id} updated (fields: ${Object.keys(data).join(", ")})`);
    } catch (error) {
      logger.error(`Error updating template ${id}:`, error);
      throw new Error("Failed to update template");
    }
  },

  // R-11: Atomically update the running average score for a template.
  async updateAvgScore(templateId: string, newScore: number): Promise<void> {
    const ref = db.collection("interview_templates").doc(templateId);
    try {
      await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        if (!doc.exists) return;
        const data = doc.data()!;
        const newSum = (data.scoreSum ?? 0) + newScore;
        const newCount = (data.scoreCount ?? 0) + 1;
        t.update(ref, {
          scoreSum: newSum,
          scoreCount: newCount,
          avgScore: Math.round((newSum / newCount) * 10) / 10,
        });
      });
      revalidateTag(`template:${templateId}`, "max");
      revalidateTag("templates-public", "max");
    } catch (error) {
      logger.error(
        `Error updating avgScore for template ${templateId}:`,
        error,
      );
      throw error;
    }
  },
};