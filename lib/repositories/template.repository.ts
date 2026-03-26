import { db } from "@/firebase/admin";
import { InterviewTemplate } from "@/types";
import { logger } from "@/lib/logger";
import { unstable_cache, revalidateTag } from "next/cache";
import { FieldPath } from "firebase-admin/firestore";

const CACHE_REVALIDATE_SECONDS = 300;

// Keep cached helpers at module scope so unstable_cache preserves a stable identity.
const getCachedTemplateById = (id: string) =>
  unstable_cache(
    async () => {
      const doc = await db.collection("interview_templates").doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as InterviewTemplate;
    },
    [`template:${id}`],
    {
      revalidate: CACHE_REVALIDATE_SECONDS,
      tags: ["template", `template:${id}`],
    },
  );

// Cache public templates by limit; invalidate via the "templates-public" tag.
const getCachedPublicTemplates = (limit: number) =>
  unstable_cache(
    async () => {
      const snapshot = await db
        .collection("interview_templates")
        .where("isPublic", "==", true)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as InterviewTemplate,
      );
    },
    [`templates-public:${limit}`],
    {
      revalidate: CACHE_REVALIDATE_SECONDS,
      tags: ["templates-public"],
    },
  );

export const TemplateRepository = {
  async findById(id: string): Promise<InterviewTemplate | null> {
    return getCachedTemplateById(id)();
  },

  async findManyByIds(ids: string[]): Promise<Map<string, InterviewTemplate>> {
    if (ids.length === 0) return new Map();

    const templateMap = new Map<string, InterviewTemplate>();

    // Firestore `in` queries accept up to 10 document IDs per request.
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

  async findPublic(limit: number = 20): Promise<InterviewTemplate[]> {
    try {
      return await getCachedPublicTemplates(limit)();
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

  // R-11: Atomically update the running average score for a template.
  // Uses a transaction to maintain scoreSum/scoreCount and derive avgScore.
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
      // Mark cached template data stale while letting the next request refresh
      // it in the background with the Next.js 16 "max" profile.
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
