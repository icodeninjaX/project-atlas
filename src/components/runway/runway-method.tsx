import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import Link from "next/link";
import {
  DashboardCardHeading,
  dashboardCardClass,
  dashboardTileClass,
} from "@/components/dashboard/dashboard-card";
import type { RunwayAnalysis } from "@/lib/runway/engine";
import { baselineDescription } from "@/lib/runway/view";
import { cn } from "@/lib/utils";

const RULES = [
  "Only the three fully completed Manila months count; the current partial month is left out.",
  "Two or more usable months use recorded averages; otherwise the latest budget with selected essentials is used.",
  "Debt Payment transactions are left out because active debt minimums are added separately.",
  "Future income informs free cash flow only, never the runway headline.",
];

function sourceLabel(analysis: RunwayAnalysis) {
  if (analysis.baselineSource === "historical") return "Recorded history";
  if (analysis.baselineSource === "budget") return "Latest applicable budget";
  return "Not available yet";
}

function incomeLabel(analysis: RunwayAnalysis) {
  switch (analysis.incomeSource) {
    case "historical":
      return "Recorded income average";
    case "budget":
      return "Budget expected income";
    case "profile":
      return "Monthly income saved in your profile";
    case "none":
      return "No income source";
  }
}

/** Where the estimate's numbers come from, and the rules that keep it low. */
export function RunwayMethod({ analysis }: { analysis: RunwayAnalysis }) {
  const baseline = baselineDescription(analysis);

  return (
    <section
      aria-labelledby="runway-method"
      data-spotlight
      className={cn(dashboardCardClass, "mt-4 sm:mt-5")}
    >
      <DashboardCardHeading
        id="runway-method"
        icon={ShieldCheck}
        title="How the estimate stays conservative"
        description="It counts only money you have and costs you must keep paying."
      />
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className={dashboardTileClass}>
          <dt className="text-muted-foreground text-xs">Spending baseline</dt>
          <dd className="mt-1 text-sm font-semibold break-words">
            {sourceLabel(analysis)}
          </dd>
          {analysis.baselineSource !== "none" ? (
            <dd className="text-muted-foreground mt-0.5 text-xs">{baseline}</dd>
          ) : null}
        </div>
        <div className={dashboardTileClass}>
          <dt className="text-muted-foreground text-xs">
            Income for cash flow
          </dt>
          <dd className="mt-1 text-sm font-semibold break-words">
            {incomeLabel(analysis)}
          </dd>
          <dd className="text-muted-foreground mt-0.5 text-xs">
            Never extends the runway
          </dd>
        </div>
      </dl>
      <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {RULES.map((rule) => (
          <li
            key={rule}
            className="text-muted-foreground flex gap-2.5 text-xs leading-5"
          >
            <span
              aria-hidden="true"
              className="bg-positive/12 text-positive mt-0.5 grid size-4 shrink-0 place-items-center rounded-full"
            >
              <Check className="size-2.5" strokeWidth={3} />
            </span>
            {rule}
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground mt-5 flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t pt-4 text-xs">
        Something off?
        <Link
          href="/money/transactions"
          className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center gap-1 rounded-md font-semibold focus-visible:ring-2 focus-visible:outline-none sm:min-h-0"
        >
          Review recorded transactions
          <ArrowRight aria-hidden="true" className="size-3" />
        </Link>
      </p>
    </section>
  );
}
