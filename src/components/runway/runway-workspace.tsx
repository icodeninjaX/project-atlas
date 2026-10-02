"use client";

import { useMemo, useState } from "react";
import { SpotlightArea } from "@/components/dashboard/spotlight-area";
import { RunwayAssumptionsSheet } from "@/components/runway/runway-assumptions-sheet";
import {
  MonthlyNeedCard,
  RunwayFundsCard,
} from "@/components/runway/runway-breakdown";
import { RunwayHero, RunwaySetupHero } from "@/components/runway/runway-hero";
import { RunwayMethod } from "@/components/runway/runway-method";
import { RunwayScenarioPlanner } from "@/components/runway/runway-scenario-planner";
import {
  essentialBreakdown,
  type RunwayAnalysis,
  type RunwayBudget,
  type RunwaySource,
} from "@/lib/runway/engine";

/**
 * The runway page body: the estimate, what it is made of, a place to try
 * changes, and the sheet that edits what it counts.
 */
export function RunwayWorkspace({
  source,
  analysis,
  budgets,
  now,
  today,
}: {
  source: RunwaySource;
  analysis: RunwayAnalysis;
  budgets: RunwayBudget[];
  /** When the page was loaded, as an ISO timestamp. */
  now: string;
  /** YYYY-MM-DD in Manila. */
  today: string;
}) {
  const [editing, setEditing] = useState(false);
  const essentials = useMemo(
    () => essentialBreakdown(source, analysis),
    [source, analysis],
  );
  const edit = () => setEditing(true);

  return (
    <SpotlightArea>
      {analysis.status === "ready" ? (
        <>
          <RunwayHero
            analysis={analysis}
            today={today}
            onEditAssumptions={edit}
          />
          <div className="mt-4 grid gap-4 sm:mt-5 sm:gap-5 lg:grid-cols-2 lg:items-start">
            <MonthlyNeedCard analysis={analysis} essentials={essentials} />
            <RunwayFundsCard
              analysis={analysis}
              accounts={source.accounts}
              onEdit={edit}
            />
          </div>
          <RunwayScenarioPlanner analysis={analysis} />
        </>
      ) : (
        <RunwaySetupHero
          status={analysis.status}
          hasAccounts={source.accounts.length > 0}
          onEditAssumptions={edit}
        />
      )}
      <RunwayMethod analysis={analysis} />
      <RunwayAssumptionsSheet
        open={editing}
        onOpenChange={setEditing}
        source={source}
        budgets={budgets}
        analysis={analysis}
        now={now}
      />
    </SpotlightArea>
  );
}
