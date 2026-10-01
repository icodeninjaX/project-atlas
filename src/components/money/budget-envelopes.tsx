import { ChevronRight, Plus } from "lucide-react";
import { CategoryBadge } from "@/components/money/category-icon";
import { MoneyAmount } from "@/components/money/money-amount";
import { Button } from "@/components/ui/button";
import type {
  BudgetEnvelope,
  BudgetPlan,
  UnplannedSpend,
} from "@/lib/budgets/plan";
import { cn } from "@/lib/utils";

function percentLabel(envelope: BudgetEnvelope) {
  if (!Number.isFinite(envelope.usedRatio)) return "Unplanned";
  return `${Math.round(envelope.usedRatio * 100)}%`;
}

function EnvelopeRow({
  envelope,
  onEdit,
}: {
  envelope: BudgetEnvelope;
  onEdit: (categoryId: string) => void;
}) {
  const { category, plannedCentavos, spentCentavos, leftCentavos, status } =
    envelope;
  const over = status === "over";
  const fill = Math.min(
    Number.isFinite(envelope.usedRatio) ? envelope.usedRatio : 1,
    1,
  );

  return (
    <li className="group border-border bg-card hover:bg-muted/40 has-[:focus-visible]:ring-ring relative min-w-0 rounded-2xl border p-4 transition-colors has-[:focus-visible]:ring-2">
      <div className="flex items-start gap-3">
        <CategoryBadge
          icon={category.icon}
          name={category.name}
          direction="out"
          className={cn(over && "bg-destructive/10 text-destructive")}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="min-w-0 font-semibold break-words">{category.name}</p>
            <p
              className={cn(
                "font-mono text-sm font-semibold",
                over && "text-destructive",
              )}
            >
              {over ? (
                <>
                  <MoneyAmount centavos={-leftCentavos} /> over
                </>
              ) : leftCentavos === 0 ? (
                plannedCentavos === 0 ? (
                  "Nothing planned"
                ) : (
                  "All used"
                )
              ) : (
                <>
                  <MoneyAmount centavos={leftCentavos} /> left
                </>
              )}
            </p>
          </div>
          {/* The figures beside it say the same; the bar is for scanning. */}
          <div
            aria-hidden="true"
            className={cn(
              "mt-2.5 h-1.5 overflow-hidden rounded-full",
              over ? "bg-destructive/15" : "bg-primary/12",
            )}
          >
            <div
              className={cn(
                "h-full rounded-full",
                over ? "bg-destructive" : "bg-primary",
              )}
              style={{ width: `${fill * 100}%` }}
            />
          </div>
          <div className="text-muted-foreground mt-2 flex flex-wrap justify-between gap-x-3 font-mono text-xs">
            <span>
              <MoneyAmount centavos={spentCentavos} /> of{" "}
              <MoneyAmount centavos={plannedCentavos} />
            </span>
            <span
              className={cn(
                status === "near" && "text-foreground font-semibold",
                over && "text-destructive font-semibold",
              )}
            >
              {percentLabel(envelope)}
            </span>
          </div>
        </div>
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground/60 group-hover:text-muted-foreground mt-3 size-4 shrink-0 transition-colors"
        />
      </div>
      {/* Covers the card so the whole row opens its amount for editing. */}
      <button
        type="button"
        onClick={() => onEdit(category.id)}
        aria-label={`Edit ${category.name} plan`}
        className="absolute inset-0 rounded-2xl outline-none [-webkit-tap-highlight-color:transparent]"
      />
    </li>
  );
}

/** Each planned category as an envelope: what is spent and what is left. */
export function BudgetEnvelopes({
  plan,
  onEdit,
}: {
  plan: BudgetPlan;
  onEdit: (categoryId: string) => void;
}) {
  if (plan.envelopes.length === 0) return null;

  return (
    <section aria-labelledby="budget-categories" className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="budget-categories"
          className="text-lg font-semibold tracking-[-0.02em]"
        >
          By category
        </h2>
        <p className="text-muted-foreground text-xs">
          {plan.envelopes.length} planned
          {plan.overCount > 0 ? (
            <span className="text-destructive font-semibold">
              {" "}
              · {plan.overCount} over
            </span>
          ) : null}
        </p>
      </div>
      <ul className="mt-4 grid gap-2.5 lg:grid-cols-2">
        {plan.envelopes.map((envelope) => (
          <EnvelopeRow
            key={envelope.category.id}
            envelope={envelope}
            onEdit={onEdit}
          />
        ))}
      </ul>
    </section>
  );
}

/**
 * Spending in categories with no planned amount. It still counts against
 * what is left, so it is never hidden.
 */
export function UnplannedSpending({
  items,
  hasPlan,
  canPlan,
  onPlan,
}: {
  items: readonly UnplannedSpend[];
  hasPlan: boolean;
  canPlan: (categoryId: string) => boolean;
  onPlan: (categoryId: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="budget-unplanned" className="mt-10">
      <h2
        id="budget-unplanned"
        className="text-lg font-semibold tracking-[-0.02em]"
      >
        {hasPlan ? "Outside the plan" : "Spent this month"}
      </h2>
      <p className="text-muted-foreground mt-1 text-sm leading-6">
        {hasPlan
          ? "These categories have spending but no planned amount. It still counts against what is left."
          : "By category, so you can plan from what really goes out."}
      </p>
      <ul className="border-border bg-card divide-border mt-4 divide-y overflow-hidden rounded-2xl border">
        {items.map((item) => (
          <li
            key={item.category.id}
            className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
          >
            <CategoryBadge
              icon={item.category.icon}
              name={item.category.name}
              direction="out"
              size="sm"
            />
            <span className="min-w-0 flex-1 text-sm font-semibold break-words">
              {item.category.name}
            </span>
            <MoneyAmount
              centavos={item.spentCentavos}
              className="font-mono text-sm font-semibold"
            />
            {canPlan(item.category.id) ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onPlan(item.category.id)}
                aria-label={`Plan ${item.category.name}`}
                className="text-primary -mr-2"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Plan
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
