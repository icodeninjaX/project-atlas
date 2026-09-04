import { ArrowRight, CircleAlert, WalletCards } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { RunwayPreferencesForm } from "@/components/runway/runway-preferences-form";
import { RunwayScenarioPlanner } from "@/components/runway/runway-scenario-planner";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCentavos } from "@/lib/money/money";
import { formatRunwayMonths, type RunwayAnalysis } from "@/lib/runway/engine";
import { loadRunwayWorkspace } from "@/lib/runway/server";

export const metadata = { title: "Runway" };

function formatMonth(monthStart: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    year: "numeric",
  }).format(new Date(`${monthStart}T00:00:00+08:00`));
}

function Money({ value }: { value: number }) {
  return <SensitiveValue>{formatCentavos(value)}</SensitiveValue>;
}

function EmptyRunwayState({ analysis }: { analysis: RunwayAnalysis }) {
  const guidance: Record<
    Exclude<RunwayAnalysis["status"], "ready">,
    { title: string; body: string; href: string; label: string }
  > = {
    missing_liquid_accounts: {
      title: "Choose a liquid account",
      body: "Runway needs at least one active cash, bank, e-wallet, or savings account to start from.",
      href: "/money/accounts",
      label: "Open accounts",
    },
    missing_essential_categories: {
      title: "Choose essential expenses",
      body: "Select the expense categories that represent the costs you must keep paying.",
      href: "#assumptions",
      label: "Edit assumptions",
    },
    insufficient_data: {
      title: "Add history or a budget",
      body: "Record income or expenses in at least two completed Manila months, or add a budget with selected essential items.",
      href: "/money/budget",
      label: "Open budget",
    },
    zero_monthly_need: {
      title: "Monthly need is zero",
      body: "Runway is unavailable instead of infinite. Add essential costs or review the active debt minimums used here.",
      href: "#assumptions",
      label: "Review assumptions",
    },
  };
  const state =
    guidance[analysis.status as Exclude<RunwayAnalysis["status"], "ready">];
  return (
    <Card className="border-dashed">
      <CardContent className="grid min-h-52 place-items-center p-6 text-center">
        <div className="max-w-md">
          <CircleAlert
            className="text-primary mx-auto size-6"
            aria-hidden="true"
          />
          <h2 className="mt-4 text-lg font-semibold">{state.title}</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {state.body}
          </p>
          <Button asChild className="mt-5">
            <Link href={state.href as Route}>{state.label}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function RunwayPage() {
  let workspace: Awaited<ReturnType<typeof loadRunwayWorkspace>>;
  try {
    workspace = await loadRunwayWorkspace();
  } catch {
    workspace = null;
  }

  if (!workspace) {
    return (
      <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
        <PageHeading
          eyebrow="Money / Runway"
          title="Personal runway"
          description="A conservative estimate based on funds already recorded in ATLAS."
        />
        <Card className="mt-8 border-dashed">
          <CardContent className="p-6 text-center">
            <WalletCards className="text-primary mx-auto size-6" />
            <p className="mt-4 text-sm font-semibold">
              Runway is not available yet.
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
              Check your connection and make sure the financial workspace is set
              up.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { analysis, source } = workspace;
  const isReady = analysis.status === "ready";
  const sourceLabel =
    analysis.baselineSource === "historical"
      ? "Recorded history"
      : analysis.baselineSource === "budget"
        ? "Latest applicable budget"
        : "Not available";
  const incomeLabel =
    analysis.incomeSource === "profile"
      ? "Saved profile monthly income fallback"
      : analysis.incomeSource === "historical"
        ? "Recorded income average"
        : analysis.incomeSource === "budget"
          ? "Budget expected income"
          : "No income source";

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Money / Runway"
        title="Personal runway"
        description="A planning estimate from liquid funds and essential monthly need. Future income never extends this headline."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/money/accounts">Accounts</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/money/budget">Budget</Link>
            </Button>
          </>
        }
      />

      {isReady ? (
        <>
          <section
            aria-label="Runway estimate"
            className="mt-8 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]"
          >
            <Card className="border-primary/25 bg-primary/5">
              <CardContent className="p-5 sm:p-6">
                <p className="text-primary font-mono text-[11px] font-semibold tracking-widest uppercase">
                  Estimated runway
                </p>
                <p className="mt-3 font-mono text-4xl font-semibold tracking-tight sm:text-5xl">
                  {formatRunwayMonths(analysis.runwayMonths)}
                </p>
                <p className="text-muted-foreground mt-3 max-w-xl text-xs leading-5">
                  Funds currently selected can cover the recorded or budgeted
                  monthly need. This is a planning estimate, not a guarantee.
                </p>
              </CardContent>
            </Card>
            <div className="grid gap-3 min-[360px]:grid-cols-2 lg:grid-cols-1">
              <Card className="min-w-0">
                <CardContent>
                  <p className="text-muted-foreground text-xs">
                    Available runway funds
                  </p>
                  <p className="mt-2 font-mono text-xl font-semibold">
                    <Money value={analysis.availableLiquidCentavos} />
                  </p>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Net selected balance{" "}
                    <Money value={analysis.netLiquidCentavos} />
                  </p>
                </CardContent>
              </Card>
              <Card className="min-w-0">
                <CardContent>
                  <p className="text-muted-foreground text-xs">Monthly need</p>
                  <p className="mt-2 font-mono text-xl font-semibold">
                    <Money value={analysis.monthlyNeedCentavos} />
                  </p>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Essentials + debt minimums
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
          <section className="mt-3 grid gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Essential spending",
                value: analysis.monthlyEssentialCentavos,
              },
              {
                label: "Debt minimums",
                value: analysis.monthlyDebtMinimumsCentavos,
              },
              {
                label: "Monthly free cash flow",
                value: analysis.monthlyFreeCashFlowCentavos,
              },
              {
                label: `${analysis.targetMonths}-month reserve gap`,
                value: analysis.targetGapCentavos,
              },
            ].map((metric) => (
              <Card key={metric.label} className="min-w-0">
                <CardContent>
                  <p className="text-muted-foreground text-xs">
                    {metric.label}
                  </p>
                  <p className="mt-2 font-mono text-lg font-semibold">
                    <Money value={metric.value} />
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>
        </>
      ) : (
        <div className="mt-8">
          <EmptyRunwayState analysis={analysis} />
        </div>
      )}

      <section
        id="assumptions"
        className="mt-6 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]"
      >
        <Card>
          <CardHeader>
            <CardTitle>Saved assumptions</CardTitle>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              These choices sync when you are online and become the basis for
              every new estimate.
            </p>
          </CardHeader>
          <CardContent>
            <RunwayPreferencesForm
              accounts={source.accounts}
              categories={source.categories}
              targetMonths={analysis.targetMonths}
            />
          </CardContent>
        </Card>
        <div className="grid gap-3">
          <Card>
            <CardHeader>
              <CardTitle>What this estimate uses</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid min-w-0 gap-3 text-xs leading-5 [&_dd]:min-w-0 [&_dd]:break-words">
                <div>
                  <dt className="text-muted-foreground">Spending baseline</dt>
                  <dd className="font-semibold">
                    {sourceLabel}
                    {analysis.includedMonths.length
                      ? ` · ${analysis.includedMonths.map(formatMonth).join(", ")}`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    Income for cash-flow comparison
                  </dt>
                  <dd className="font-semibold">{incomeLabel}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Accounts</dt>
                  <dd>
                    {analysis.selectedAccounts
                      .map((account) => account.name)
                      .join(", ") || "None selected"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    Essential categories
                  </dt>
                  <dd>
                    {analysis.selectedCategories
                      .map((category) => category.name)
                      .join(", ") || "None selected"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    Active debt obligations
                  </dt>
                  <dd>
                    {analysis.debts.length ? (
                      <>
                        {analysis.debts
                          .map((debt) => debt.creditorName)
                          .join(", ")}{" "}
                        · <Money value={analysis.monthlyDebtMinimumsCentavos} />{" "}
                        monthly minimums
                      </>
                    ) : (
                      "No active debts"
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <details className="border-border bg-card rounded-2xl border p-4 sm:p-5">
            <summary className="cursor-pointer text-sm font-semibold">
              How the calculation stays conservative
            </summary>
            <ul className="text-muted-foreground mt-3 grid gap-2 pl-4 text-xs leading-5">
              <li>
                Only the three fully completed Asia/Manila months are
                considered; the current partial month is excluded.
              </li>
              <li>
                Two or more usable months use recorded averages; otherwise the
                latest budget with selected essentials is used.
              </li>
              <li>
                Debt Payment transactions are excluded because active debt
                minimums are added separately.
              </li>
              <li>
                Future income informs free cash flow only, never the runway
                headline.
              </li>
            </ul>
          </details>
        </div>
      </section>

      {isReady && (
        <Card className="mt-6">
          <CardContent className="p-5 sm:p-6">
            <RunwayScenarioPlanner analysis={analysis} />
          </CardContent>
        </Card>
      )}
      <p className="text-muted-foreground mt-6 flex flex-wrap items-center gap-1 text-xs">
        <Link className="text-primary font-semibold" href="/money/transactions">
          Review recorded transactions
        </Link>
        <ArrowRight className="size-3" /> Use the links above to correct
        accounts, budget, or debt records.
      </p>
    </div>
  );
}
