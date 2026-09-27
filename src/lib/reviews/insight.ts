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

export const WEEKLY_INSIGHT_QUESTION =
  "What changed in my recorded activity this week so far compared with the same days last week?";

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

export async function gatherWeeklyInsightEvidence(
  now: Date,
  invoke: typeof invokeAnalystTool = invokeAnalystTool,
) {
  const windows = insightWindows(now);
  const results = await Promise.all(
    INSIGHT_METRICS.flatMap((metric) =>
      [windows.previous, windows.current].map((period) =>
        invoke("getHistoricalMetricSeries", {
          ...period,
          metric,
          grain: "week",
        }),
      ),
    ),
  );
  const evidence: ToolEvidence[] = [];
  const limitations = new Set<string>([
    `This week is compared through ${windows.current.through} with the same days last week, through ${windows.previous.through}.`,
  ]);
  let complete = true;
  for (const result of results) {
    if (result.status !== "ready") complete = false;
    evidence.push(...result.evidence);
    for (const limitation of result.limitations) limitations.add(limitation);
  }
  return { windows, evidence, limitations: [...limitations], complete };
}
