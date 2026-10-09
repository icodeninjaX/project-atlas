import { Goal } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GoalRelatedDetails } from "@/components/graph/goal-related-details";
import { BackLink, PageHeading } from "@/components/shared/page-heading";
import { getGoalLinkSuggestions, getRelatedEntities } from "@/lib/graph/server";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/shared/page-shell";

export const metadata = { title: "Goal relationships" };

export default async function GoalRelationshipsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ limit?: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: goal, error } = await supabase
    .from("goals")
    .select("id,title,description,status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Goal could not be loaded.");
  if (!goal) notFound();
  const requestedLimit = Number((await searchParams).limit);
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 40 ? 100 : 40;
  const [relationships, suggestions] = await Promise.all([
    getRelatedEntities({ entityType: "goal", entityId: id, limit }),
    // Suggestions are a convenience; the page still works without them.
    getGoalLinkSuggestions(id).catch(() => []),
  ]);

  return (
    <PageShell>
      <BackLink href="/goals">All goals</BackLink>
      <PageHeading
        icon={Goal}
        eyebrow="ATLAS Graph"
        title={goal.title}
        description="Direct relationships connected to this goal."
      />
      <GoalRelatedDetails
        goalId={id}
        items={relationships.items}
        suggestions={suggestions}
      />
      {relationships.hasMore && limit < 100 ? (
        <Link
          href={`/goals/${id}?limit=100`}
          className="text-primary mt-5 inline-flex min-h-11 items-center text-sm font-semibold hover:underline"
        >
          View more related items
        </Link>
      ) : null}
    </PageShell>
  );
}
