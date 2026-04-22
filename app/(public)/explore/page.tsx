import { Metadata } from "next";
import { getPublicTemplates } from "@/lib/actions/interview.action";
import type { PublicTemplateSort } from "@/lib/repositories/template.repository";
import ExploreClient from "./ExploreClient";

export const metadata: Metadata = {
  title: "Explore Interviews",
  description:
    "Discover and practice with community interview templates for various roles and companies.",
};

const VALID_SORTS = new Set<PublicTemplateSort>([
  "newest",
  "popular",
  "top-rated",
]);

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const rawSort = params.sort;
  const sort: PublicTemplateSort =
    rawSort && VALID_SORTS.has(rawSort as PublicTemplateSort)
      ? (rawSort as PublicTemplateSort)
      : "newest";

  const templates = await getPublicTemplates(100, sort);

  return <ExploreClient templates={templates} initialSort={sort} />;
}
