import {
  KnowledgeWorkspace,
  type KnowledgeConcept,
  type KnowledgeReview,
} from "@/components/knowledge/knowledge-workspace";
import { PageHeading } from "@/components/shared/page-heading";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Knowledge" };

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; highlight?: string }>;
}) {
  const params = await searchParams;
  const allowed = new Set(["library", "due", "recent", "weak", "archived"]);
  const initialView = params.highlight
    ? "library"
    : allowed.has(params.view ?? "")
      ? (params.view as "library" | "due" | "recent" | "weak" | "archived")
      : "due";
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
        initialView={initialView}
        initialConceptId={params.highlight}
        nowIso={new Date().toISOString()}
      />
    </div>
  );
}
