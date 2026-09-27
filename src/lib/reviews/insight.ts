import "server-only";
import { manilaToday } from "@/lib/analyst/evidence";
import { invokeAnalystTool } from "@/lib/analyst/tools/server";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";
import { mondayWeekStart } from "@/lib/dates/dates";

/** Whole-domain metrics compared in the weekly insight. */
export const INSIGHT_METRICS = [
  "expense_centavos",
  "income_centavos",
  "debt_payments_centavos",
  "task_completions",
] as const;

export type InsightMode = "current" | "previous";

export const WEEKLY_INSIGHT_QUESTIONS: Record<InsightMode, string> = {
  current:
    "What changed in my recorded activity this week so far compared with the same days last week?",
  previous:
    "What changed in my recorded activity last week compared with the week before?",
};

const shiftDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

/**
 * This week so far against the same weekdays last week, so a week in
 * progress is never compared with a full one.
 */
export function insightWindows(now: Date) {
  const today = manilaToday(now);
  const thisWeekFrom = mondayWeekStart(now);
  return {
    current: { from: thisWeekFrom, through: today },
    previous: {
      from: shiftDays(thisWeekFrom, -7),
      through: shiftDays(today, -7),
    },
  };
}

/** Last full Monday–Sunday week against the full week before it. */
export function previousWeekWindows(now: Date) {
  const thisWeekFrom = mondayWeekStart(now);
  const lastWeekFrom = shiftDays(thisWeekFrom, -7);
  return {
    current: { from: lastWeekFrom, through: shiftDays(thisWeekFrom, -1) },
    previous: {
      from: shiftDays(lastWeekFrom, -7),
      through: shiftDays(lastWeekFrom, -1),
    },
  };
}

export async function gatherWeeklyInsightEvidence(
  now: Date,
  invoke: typeof invokeAnalystTool = invokeAnalystTool,
  mode: InsightMode = "current",
) {
  const windows =
    mode === "current" ? insightWindows(now) : previousWeekWindows(now);
  const requests = INSIGHT_METRICS.flatMap((metric) =>
    [windows.previous, windows.current].map((period) => ({ metric, period })),
  );
  const results = await Promise.all(
    requests.map(({ metric, period }) =>
      invoke("getHistoricalMetricSeries", {
        ...period,
        metric,
        grain: "week",
      }),
    ),
  );
  const evidence: ToolEvidence[] = [];
  const limitations = new Set<string>([
    mode === "current"
      ? `This week is compared through ${windows.current.through} with the same days last week, through ${windows.previous.through}.`
      : `The week of ${windows.current.from} is compared with the week of ${windows.previous.from}.`,
  ]);
  let complete = true;
  results.forEach((result, index) => {
    const { period } = requests[index]!;
    const [item] = result.evidence;
    // "ready" can still carry a period clipped to the first recorded day, so
    // each window must be covered in full or the weeks are not comparable.
    if (
      result.status !== "ready" ||
      result.evidence.length !== 1 ||
      item!.completeness !== "complete" ||
      item!.period.from !== period.from ||
      item!.period.through !== period.through
    )
      complete = false;
    evidence.push(...result.evidence);
    for (const limitation of result.limitations) limitations.add(limitation);
  });
  return { windows, evidence, limitations: [...limitations], complete };
}
