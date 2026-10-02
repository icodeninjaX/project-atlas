"use client";

import { ArrowRight, Check } from "lucide-react";
import {
  useActionState,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { AccountLogo } from "@/components/money/account-visuals";
import { CategoryBadge } from "@/components/money/category-icon";
import { MoneyAmount } from "@/components/money/money-amount";
import { MoneySheet } from "@/components/money/money-sheet";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { MonthStepper } from "@/components/runway/month-stepper";
import { Button } from "@/components/ui/button";
import { accountTypeDetails } from "@/lib/money/account-types";
import type { RunwayActionState } from "@/lib/runway/actions";
import {
  applyRunwayChoices,
  calculateRunway,
  isDebtPayment,
  monthlyCategoryAmounts,
  type RunwayAnalysis,
  type RunwayBudget,
  type RunwaySource,
} from "@/lib/runway/engine";
import { runwayFigure } from "@/lib/runway/view";
import { cn } from "@/lib/utils";

const initial: RunwayActionState = { success: false, message: "" };

function CheckMark({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full ring-1 transition-colors",
        checked
          ? "bg-primary-solid text-primary-solid-foreground ring-primary-solid"
          : "ring-border bg-background/60 text-transparent",
      )}
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  );
}

/** A checkbox as a whole tappable row, tinted while it is on. */
function ChoiceRow({
  name,
  value,
  checked,
  onToggle,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "has-[:focus-visible]:ring-ring flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl p-3 ring-1 transition-colors has-[:focus-visible]:ring-2",
        checked
          ? "bg-primary/[0.05] ring-primary/35"
          : "ring-border hover:bg-muted/40",
      )}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        onChange={onToggle}
        className="sr-only"
      />
      {children}
      <CheckMark checked={checked} />
    </label>
  );
}

function toggle(set: ReadonlySet<string>, id: string) {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>) {
  return a.size === b.size && [...a].every((id) => b.has(id));
}

const previewProblem: Record<
  Exclude<RunwayAnalysis["status"], "ready">,
  string
> = {
  missing_liquid_accounts: "Choose at least one account to count.",
  missing_essential_categories: "Choose at least one essential expense.",
  insufficient_data:
    "These essentials have no history or budget yet, so there is no estimate.",
  zero_monthly_need:
    "These essentials cost nothing yet, so there is no estimate.",
};

function AssumptionsForm({
  source,
  budgets,
  analysis,
  now,
  onSaved,
}: {
  source: RunwaySource;
  budgets: readonly RunwayBudget[];
  analysis: RunwayAnalysis;
  now: string;
  onSaved: () => void;
}) {
  const { submit } = useOfflineSync();
  const targetLabelId = useId();
  const categories = source.categories.filter(
    (category) => !isDebtPayment(category),
  );
  const [savedAccounts] = useState(
    () =>
      new Set(
        source.accounts
          .filter((account) => account.includeInRunway)
          .map((account) => account.id),
      ),
  );
  const [savedCategories] = useState(
    () =>
      new Set(
        categories
          .filter((category) => category.isEssential)
          .map((category) => category.id),
      ),
  );
  const [accountIds, setAccountIds] = useState(savedAccounts);
  const [categoryIds, setCategoryIds] = useState(savedCategories);
  const [targetMonths, setTargetMonths] = useState(analysis.targetMonths);

  const preview = useMemo(() => {
    const choices = applyRunwayChoices(source, budgets, {
      accountIds: [...accountIds],
      categoryIds: [...categoryIds],
      targetMonths,
    });
    const result = calculateRunway(choices, new Date(now));
    const amounts = monthlyCategoryAmounts(choices, result);
    return {
      analysis: result,
      // With nothing chosen there is no baseline; keep showing the saved
      // one's amounts rather than blanking every hint.
      amounts:
        amounts.size > 0 ? amounts : monthlyCategoryAmounts(source, analysis),
    };
  }, [accountIds, analysis, budgets, categoryIds, now, source, targetMonths]);

  const changed =
    !sameSet(accountIds, savedAccounts) ||
    !sameSet(categoryIds, savedCategories) ||
    targetMonths !== analysis.targetMonths;
  const before = runwayFigure(
    analysis.status === "ready" ? analysis.runwayMonths : null,
  );
  const after = preview.analysis;
  const afterFigure = runwayFigure(
    after.status === "ready" ? after.runwayMonths : null,
  );

  const [, action, pending] = useActionState(
    async (_state: RunwayActionState, formData: FormData) => {
      const result = await submit("runway.savePreferences", formData);
      if (result.success) {
        toast.success(result.message);
        onSaved();
      } else {
        toast.error(result.message);
      }
      return result;
    },
    initial,
  );

  return (
    <form action={action} className="@container min-w-0">
      <fieldset className="min-w-0">
        <legend className="text-sm font-semibold">Liquid accounts</legend>
        <p className="text-muted-foreground mt-0.5 text-xs leading-5">
          Money you could use for essentials. Archived accounts never count.
        </p>
        {source.accounts.length ? (
          <div className="mt-3 grid gap-2">
            {source.accounts.map((account) => {
              const balance = account.currentBalanceCentavos;
              return (
                <ChoiceRow
                  key={account.id}
                  name="accountId"
                  value={account.id}
                  checked={accountIds.has(account.id)}
                  onToggle={() =>
                    setAccountIds((ids) => toggle(ids, account.id))
                  }
                >
                  <AccountLogo
                    account={{
                      name: account.name,
                      account_type: account.accountType,
                      provider_id: account.providerId,
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold break-words">
                      {account.name}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {accountTypeDetails(account.accountType).label}
                    </span>
                  </span>
                  <MoneyAmount
                    centavos={balance}
                    className={cn(
                      "shrink-0 font-mono text-sm font-semibold",
                      balance < 0 && "text-destructive",
                    )}
                  />
                </ChoiceRow>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground mt-3 rounded-2xl border border-dashed p-3 text-xs">
            Add a cash, bank, e-wallet, or savings account first.
          </p>
        )}
      </fieldset>

      <fieldset className="mt-6 min-w-0">
        <legend className="text-sm font-semibold">Essential expenses</legend>
        <p className="text-muted-foreground mt-0.5 text-xs leading-5">
          Costs you must keep paying, each with what it costs a month. Debt
          Payment stays out, so active minimums are never counted twice.
        </p>
        <div className="mt-3 grid gap-2 @[26rem]:grid-cols-2">
          {categories.map((category) => {
            const monthly = preview.amounts.get(category.id) ?? 0;
            return (
              <ChoiceRow
                key={category.id}
                name="categoryId"
                value={category.id}
                checked={categoryIds.has(category.id)}
                onToggle={() =>
                  setCategoryIds((ids) => toggle(ids, category.id))
                }
              >
                <CategoryBadge
                  icon={category.icon}
                  name={category.name}
                  direction="out"
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold break-words">
                    {category.name}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {monthly > 0 ? (
                      <MoneyAmount centavos={monthly} className="font-mono" />
                    ) : (
                      "Nothing recorded"
                    )}
                  </span>
                </span>
              </ChoiceRow>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p id={targetLabelId} className="text-sm font-semibold">
            Reserve target
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-5">
            How many months of need you want set aside.
          </p>
        </div>
        <MonthStepper
          name="targetMonths"
          value={targetMonths}
          onValueChange={setTargetMonths}
          labelledBy={targetLabelId}
        />
      </div>

      {/* The preview stays in view while the lists scroll. The sheet pads
          its bottom for the safe area; the bar takes that padding over so it
          meets the edge. */}
      <div className="border-border bg-background sticky -bottom-[calc(1.5rem+env(safe-area-inset-bottom))] -mx-5 mt-6 -mb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:-mx-6 sm:rounded-b-[calc(1.75rem-1px)] sm:px-6">
        <div role="status" className="min-h-10 text-xs">
          {after.status === "ready" ? (
            <>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-muted-foreground">Runway</span>
                {changed && analysis.status === "ready" ? (
                  <>
                    <span className="text-muted-foreground font-mono">
                      {before.value}
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="text-muted-foreground size-3.5"
                    />
                    <span className="sr-only">becomes</span>
                  </>
                ) : null}
                <span className="font-mono text-base font-semibold tracking-[-0.02em]">
                  {afterFigure.value} {afterFigure.unit}
                </span>
              </p>
              <p className="text-muted-foreground mt-1">
                <MoneyAmount
                  centavos={after.availableLiquidCentavos}
                  className="text-foreground font-mono font-semibold"
                />{" "}
                to draw on ·{" "}
                <MoneyAmount
                  centavos={after.monthlyNeedCentavos}
                  className="text-foreground font-mono font-semibold"
                />{" "}
                a month
              </p>
            </>
          ) : (
            <p className="text-muted-foreground leading-5">
              {
                previewProblem[
                  after.status as Exclude<RunwayAnalysis["status"], "ready">
                ]
              }
            </p>
          )}
        </div>
        <Button
          type="submit"
          pending={pending}
          pendingLabel="Saving…"
          className="mt-3 w-full"
        >
          Save assumptions
        </Button>
      </div>
    </form>
  );
}

/** The runway's saved choices in a sheet, previewed before they are saved. */
export function RunwayAssumptionsSheet({
  open,
  onOpenChange,
  source,
  budgets,
  analysis,
  now,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: RunwaySource;
  budgets: readonly RunwayBudget[];
  analysis: RunwayAnalysis;
  /** When the page was loaded, as an ISO timestamp. */
  now: string;
}) {
  return (
    <MoneySheet
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Runway"
      title="Assumptions"
      description="Choose what counts. The estimate below updates as you go."
      closeLabel="Close assumptions"
    >
      <AssumptionsForm
        source={source}
        budgets={budgets}
        analysis={analysis}
        now={now}
        onSaved={() => onOpenChange(false)}
      />
    </MoneySheet>
  );
}
