import type { Dayline } from "@/lib/dayline/engine";

export type FollowupSource = {
  id: string;
  companyName: string;
  nextActionAt: string | null;
  nextAction: string | null;
  stage: string;
  updatedAt: string;
};

export type NextBestAction = {
  id: string;
  title: string;
  taskTitle: string;
  sourceHref: string;
  sourceLabel: string;
  expectedAt: string;
  expectedUpdatedAt: string;
  reason: string;
  urgency: string;
  uncertainty: string;
  relatedGoals: Array<{ id: string; title: string; href: string }>;
};

const terminalStages = new Set(["rejected", "withdrawn", "accepted"]);

export function proposeCareerFollowups(
  dayline: Dayline,
  applications: FollowupSource[],
  chosen: Array<{ applicationId: string; expectedAt: string }>,
  goalLinks: Array<{
    applicationId: string;
    goalId: string;
    goalTitle: string;
  }> = [],
): NextBestAction[] {
  const byId = new Map(
    applications.map((application) => [application.id, application]),
  );
  const chosenKeys = new Set(
    chosen.map((choice) => `${choice.applicationId}:${choice.expectedAt}`),
  );

  return dayline.items
    .filter((item) => item.kind === "career")
    .flatMap((item) => {
      const source = byId.get(item.id);
      if (!source?.nextActionAt || terminalStages.has(source.stage)) return [];
      if (chosenKeys.has(`${source.id}:${source.nextActionAt}`)) return [];
      const taskTitle =
        source.nextAction?.trim() || `Follow up with ${source.companyName}`;
      return [
        {
          id: source.id,
          title: item.title,
          taskTitle: taskTitle.slice(0, 160),
          sourceHref: item.href,
          sourceLabel: source.companyName,
          expectedAt: source.nextActionAt,
          expectedUpdatedAt: source.updatedAt,
          reason: item.reason,
          urgency: item.reason.split(" · ")[0] ?? "Upcoming follow-up",
          uncertainty:
            "Based on the follow-up date and details recorded in this application. Plans may have changed outside ATLAS.",
          relatedGoals: goalLinks
            .filter((link) => link.applicationId === source.id)
            .map((link) => ({
              id: link.goalId,
              title: link.goalTitle,
              href: `/goals?highlight=${link.goalId}`,
            })),
        },
      ];
    })
    .slice(0, 2);
}
