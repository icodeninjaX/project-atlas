import Link from "next/link";
import { notFound } from "next/navigation";
import { GoalRelatedDetails } from "@/components/graph/goal-related-details";
import { PageHeading } from "@/components/shared/page-heading";
import { getRelatedEntities } from "@/lib/graph/server";
import { createClient } from "@/lib/supabase/server";

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
  const relationships = await getRelatedEntities({
    entityType: "goal",
    entityId: id,
    limit,
  });

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <Link
        href={`/goals?highlight=${id}`}
        className="text-primary inline-flex min-h-11 items-center text-sm font-semibold hover:underline"
      >
        ← Back to goals
      </Link>
      <PageHeading
        eyebrow="ATLAS Graph"
        title={goal.title}
        description="Direct relationships connected to this goal."
      />
      <GoalRelatedDetails goalId={id} items={relationships.items} />
      {relationships.hasMore && limit < 100 ? (
        <Link
          href={`/goals/${id}?limit=100`}
          className="text-primary mt-5 inline-flex min-h-11 items-center text-sm font-semibold hover:underline"
        >
          View more related items
        </Link>
      ) : null}
    </div>
  );
}
