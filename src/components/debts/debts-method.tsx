import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import Link from "next/link";
import {
  DashboardCardHeading,
  dashboardCardClass,
} from "@/components/dashboard/dashboard-card";
import type { DebtStrategy } from "@/lib/debts/debt";
import { STRATEGY_DETAILS } from "@/lib/debts/plan";
import { cn } from "@/lib/utils";

const RULES = [
  "Each month pays every active debt its minimum; any extra goes to the focus debt.",
  "When a debt is cleared, its payment moves on to the next, so the monthly total holds steady.",
  "Interest compounds monthly at today's rates, with no new borrowing.",
  "Paused and defaulted debts get no minimum, only money the plan frees up.",
];

/** How the payoff plan is worked out, and where its default comes from. */
export function DebtsMethod({ saved }: { saved: DebtStrategy }) {
  return (
    <section
      aria-labelledby="debts-method"
      data-spotlight
      className={cn(dashboardCardClass, "mt-8 sm:mt-10")}
    >
      <DashboardCardHeading
        id="debts-method"
        icon={ShieldCheck}
        title="How the plan is worked out"
        description="Projections are estimates from the facts you entered, not guarantees."
      />
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
        This page opens in {STRATEGY_DETAILS[saved].label.toLowerCase()} order.
        <Link
          href="/settings"
          className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center gap-1 rounded-md font-semibold focus-visible:ring-2 focus-visible:outline-none sm:min-h-0"
        >
          Change the default in Settings
          <ArrowRight aria-hidden="true" className="size-3" />
        </Link>
      </p>
    </section>
  );
}
