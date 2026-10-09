import type { Route } from "next";
import { Goal } from "lucide-react";
import { notFound } from "next/navigation";
import { GoalRelatedDetails } from "@/components/graph/goal-related-details";
import { BackLink, PageHeading } from "@/components/shared/page-heading";
import { getRelatedEntities } from "@/lib/graph/server";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/shared/page-shell";

export const metadata = { title: "Milestone relationships" };

export default async function MilestoneRelationshipsPage({
  params,
}: {
  params: Promise<{ id: string; milestoneId: string }>;
}) {
  const { id, milestoneId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(milestoneId))
    notFound();
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: milestone, error } = await supabase
    .from("goal_milestones")
    .select("id,title,goal_id")
    .eq("id", milestoneId)
    .eq("goal_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Milestone could not be loaded.");
  if (!milestone) notFound();
  const related = await getRelatedEntities({
    entityType: "goal_milestone",
    entityId: milestoneId,
    limit: 100,
  });
  return (
    <PageShell>
      <BackLink href={`/goals/${id}` as Route}>Goal relationships</BackLink>
      <PageHeading
        icon={Goal}
        eyebrow="ATLAS Graph"
        title={milestone.title}
        description="Knowledge linked to this milestone."
      />
      <GoalRelatedDetails
        goalId={id}
        milestoneId={milestoneId}
        items={related.items}
      />
    </PageShell>
  );
}
