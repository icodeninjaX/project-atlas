import {
  KnowledgeWorkspace,
  type KnowledgeConcept,
  type KnowledgeReview,
} from "@/components/knowledge/knowledge-workspace";
import { PageHeading } from "@/components/shared/page-heading";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Knowledge" };

type KnowledgeSearchParams = {
  view?: string;
  highlight?: string;
  query?: string;
  category?: string;
  sort?: string;
};

export function resolveKnowledgeBrowseState(params: KnowledgeSearchParams) {
  const allowed = new Set(["library", "due", "recent", "weak", "archived"]);
  const initialView = params.highlight
    ? "all"
    : allowed.has(params.view ?? "")
      ? params.view === "archived"
        ? "archived"
        : params.view === "due"
          ? "due"
          : params.view === "weak"
            ? "weak"
            : "all"
      : "all";
  const initialSort =
    params.view === "recent"
      ? "newest"
      : params.sort === "newest" || params.sort === "title"
        ? params.sort
        : "next-review";

  return {
    initialView,
    initialSort,
    initialQuery: params.query ?? "",
    initialCategory: params.category ?? "all",
  } as const;
}

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<KnowledgeSearchParams>;
}) {
  const params = await searchParams;
  const browseState = resolveKnowledgeBrowseState(params);
  const supabase = await createClient();
  const [conceptResult, reviewResult] = supabase
    ? await Promise.all([
        supabase
          .from("knowledge_concepts")
          .select(
            "id,title,notes,category,tags,example,personal_explanation,confidence,review_count,interval_days,last_reviewed_at,next_review_at,archived_at,created_at",
          )
          .order("next_review_at", { ascending: true })
          .limit(200),
        supabase
          .from("knowledge_reviews")
          .select(
            "id,concept_id,outcome,reviewed_at,next_review_at,next_interval_days",
          )
          .order("reviewed_at", { ascending: false })
          .limit(200),
      ])
    : [{ data: [] }, { data: [] }];
  return (
    <div className="mx-auto max-w-[1280px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Learning system"
        title="Knowledge"
        description="Remember what matters, one review at a time."
      />
      <KnowledgeWorkspace
        concepts={(conceptResult.data ?? []) as KnowledgeConcept[]}
        reviews={(reviewResult.data ?? []) as KnowledgeReview[]}
        {...browseState}
        initialConceptId={params.highlight}
        nowIso={new Date().toISOString()}
      />
    </div>
  );
}
