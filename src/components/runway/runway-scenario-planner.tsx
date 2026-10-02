"use client";

import {
  ArrowRight,
  FlaskConical,
  Landmark,
  RotateCcw,
  Scissors,
  Unplug,
} from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";
import {
  DashboardCardHeading,
  dashboardCardClass,
} from "@/components/dashboard/dashboard-card";
import { MoneyAmount } from "@/components/money/money-amount";
import { PesoInput } from "@/components/money/money-fields";
import { MonthStepper } from "@/components/runway/month-stepper";
import { RunwayTrack } from "@/components/runway/runway-track";
import { Button } from "@/components/ui/button";
import { formatPesoInput, parsePesoInput } from "@/lib/money/history";
import { centavosToPesoInput } from "@/lib/money/money";
import {
  calculateScenario,
  formatRunwayMonths,
  type RunwayAnalysis,
  type ScenarioInput,
} from "@/lib/runway/engine";
import {
  formatMonthCount,
  runwayFigure,
  runwayStatus,
  trackMonths,
} from "@/lib/runway/view";
import { cn } from "@/lib/utils";

const toInput = (centavos: number) =>
  formatPesoInput(centavosToPesoInput(centavos));

function Field({
  id,
  label,
  hint,
  children,
  className,
}: {
  id?: string;
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // With large text on a phone the tile steps aside so the field
        // keeps its width.
        "bg-background/55 ring-border/80 flex min-w-0 flex-col rounded-2xl p-4 ring-1 @max-[15rem]:bg-transparent @max-[15rem]:p-0 @max-[15rem]:ring-0",
        className,
      )}
    >
      {id ? (
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
      ) : (
        <p className="text-sm font-semibold">{label}</p>
      )}
      {hint ? (
        <p
          id={id ? `${id}-hint` : undefined}
          className="text-muted-foreground mt-0.5 text-xs leading-5"
        >
          {hint}
        </p>
      ) : null}
      {/* Side-by-side fields line their controls up whatever the hint. */}
      <div className="mt-auto pt-3">{children}</div>
    </div>
  );
}

function Preset({
  icon,
  onClick,
  children,
}: {
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-background/60 ring-border text-foreground hover:bg-muted focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-full px-3.5 text-xs font-semibold ring-1 transition-colors [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:outline-none sm:min-h-9"
    >
      <span aria-hidden="true" className="text-primary">
        {icon}
      </span>
      {children}
    </button>
  );
}

function DirectionToggle({
  name,
  value,
  onValueChange,
}: {
  name: string;
  value: "less" | "more";
  onValueChange: (value: "less" | "more") => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Change direction"
      className="bg-muted/70 grid grid-cols-2 gap-1 rounded-xl p-1"
    >
      {(
        [
          { value: "less", label: "Spend less" },
          { value: "more", label: "Spend more" },
        ] as const
      ).map((option) => (
        <label key={option.value} className="min-w-0">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onValueChange(option.value)}
            className="peer sr-only"
          />
          <span className="text-muted-foreground peer-checked:bg-card peer-checked:text-foreground peer-focus-visible:ring-ring flex min-h-10 cursor-pointer items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors peer-checked:shadow-[0_1px_2px_rgb(7_10_15/0.12)] peer-focus-visible:ring-2 sm:min-h-9">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}

function Compare({
  label,
  before,
  after,
  changed,
  tone,
}: {
  label: string;
  before: ReactNode;
  after: ReactNode;
  changed: boolean;
  tone?: "positive" | "destructive";
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b py-2.5 last:border-b-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="flex flex-wrap items-baseline justify-end gap-x-1.5 font-mono text-sm">
        {changed ? (
          <>
            <span className="text-muted-foreground text-xs">{before}</span>
            <ArrowRight
              aria-hidden="true"
              className="text-muted-foreground size-3 self-center"
            />
            <span className="sr-only">becomes</span>
          </>
        ) : null}
        <span
          className={cn(
            "font-semibold",
            changed && tone === "positive" && "text-positive",
            changed && tone === "destructive" && "text-destructive",
          )}
        >
          {after}
        </span>
      </dd>
    </div>
  );
}

function DeltaChip({
  delta,
  hasScenario,
}: {
  delta: number;
  hasScenario: boolean;
}) {
  const same = Math.abs(delta) < 0.05;
  return (
    <span
      className={cn(
        "inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        !hasScenario || same
          ? "bg-background/60 text-muted-foreground ring-border"
          : delta > 0
            ? "bg-positive/10 text-positive ring-positive/25"
            : "bg-destructive/10 text-destructive ring-destructive/25",
      )}
    >
      {!hasScenario
        ? "Change anything to compare"
        : same
          ? "Runway unchanged"
          : `${delta > 0 ? "+" : "−"}${formatMonthCount(Math.abs(delta))}`}
    </span>
  );
}

function reserveText(gapCentavos: number) {
  return gapCentavos > 0 ? (
    <>
      <MoneyAmount centavos={gapCentavos} /> short
    </>
  ) : (
    "Covered"
  );
}

/** Tries a change against the saved estimate, in this tab only. */
export function RunwayScenarioPlanner({
  analysis,
}: {
  analysis: RunwayAnalysis;
}) {
  const ids = {
    purchase: useId(),
    income: useId(),
    essentials: useId(),
    debt: useId(),
    extra: useId(),
    target: useId(),
  };
  const [purchase, setPurchase] = useState("");
  const [income, setIncome] = useState("");
  const [direction, setDirection] = useState<"less" | "more">("less");
  const [essentials, setEssentials] = useState("");
  const [debtId, setDebtId] = useState("");
  const [extraPayment, setExtraPayment] = useState("");
  const [targetMonths, setTargetMonths] = useState(analysis.targetMonths);

  const input = useMemo<ScenarioInput>(() => {
    const extra = parsePesoInput(extraPayment) ?? 0;
    const change = parsePesoInput(essentials) ?? 0;
    return {
      monthlyIncomeCentavos: income.trim() ? parsePesoInput(income) : null,
      monthlyExpenseChangeCentavos: direction === "less" ? -change : change,
      oneTimePurchaseCentavos: parsePesoInput(purchase) ?? 0,
      extraDebtPayment:
        debtId && extra > 0 ? { debtId, amountCentavos: extra } : null,
      targetMonths,
    };
  }, [
    debtId,
    direction,
    essentials,
    extraPayment,
    income,
    purchase,
    targetMonths,
  ]);
  const scenario = useMemo(
    () => calculateScenario(analysis, input),
    [analysis, input],
  );
  const hasScenario = Boolean(
    purchase.trim() ||
    income.trim() ||
    essentials.trim() ||
    (debtId && extraPayment.trim()) ||
    targetMonths !== analysis.targetMonths,
  );

  const reset = () => {
    setPurchase("");
    setIncome("");
    setDirection("less");
    setEssentials("");
    setDebtId("");
    setExtraPayment("");
    setTargetMonths(analysis.targetMonths);
  };

  const baseMonths = analysis.runwayMonths ?? 0;
  const scenarioMonths = scenario.runwayMonths ?? 0;
  const delta = scenarioMonths - baseMonths;
  const months = trackMonths(
    Math.max(baseMonths, scenarioMonths),
    Math.max(analysis.targetMonths, scenario.targetMonths),
  );
  const firstDebt = analysis.debts[0];
  const figure = runwayFigure(scenario.runwayMonths);
  const flowTone = (value: number, base: number) =>
    value > base ? "positive" : value < base ? "destructive" : undefined;

  return (
    <section
      id="scenario"
      aria-labelledby="scenario-title"
      data-spotlight
      className={cn(dashboardCardClass, "mt-4 scroll-mt-24 sm:mt-5")}
    >
      <DashboardCardHeading
        id="scenario-title"
        icon={FlaskConical}
        title="Try a scenario"
        description="Changes stay in this tab. Nothing is saved, recorded, or paid."
      />

      <div className="mt-5 flex flex-wrap gap-2">
        <Preset
          icon={<Unplug className="size-3.5" />}
          onClick={() => setIncome("0.00")}
        >
          Income stops
        </Preset>
        {analysis.monthlyEssentialCentavos > 0 ? (
          <Preset
            icon={<Scissors className="size-3.5" />}
            onClick={() => {
              setDirection("less");
              setEssentials(
                toInput(Math.round(analysis.monthlyEssentialCentavos / 10)),
              );
            }}
          >
            Trim essentials 10%
          </Preset>
        ) : null}
        {firstDebt ? (
          <Preset
            icon={<Landmark className="size-3.5" />}
            onClick={() => {
              setDebtId(firstDebt.id);
              setExtraPayment(toInput(firstDebt.minimumPaymentCentavos));
            }}
          >
            Double the {firstDebt.creditorName} payment
          </Preset>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.8fr)] lg:items-start">
        <div className="min-w-0">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <Field
              id={ids.purchase}
              label="One-time purchase"
              hint="Comes straight out of runway funds."
            >
              <PesoInput
                id={ids.purchase}
                value={purchase}
                onValueChange={setPurchase}
                describedBy={`${ids.purchase}-hint`}
              />
            </Field>
            <Field
              id={ids.income}
              label="Monthly income"
              hint="Changes free cash flow only. Runway never counts income."
            >
              <PesoInput
                id={ids.income}
                value={income}
                onValueChange={setIncome}
                placeholder={toInput(analysis.monthlyIncomeCentavos)}
                describedBy={`${ids.income}-hint`}
              />
            </Field>
            <Field
              id={ids.essentials}
              label="Essential spending each month"
              hint={
                <>
                  Now{" "}
                  <MoneyAmount
                    centavos={analysis.monthlyEssentialCentavos}
                    className="font-mono"
                  />{" "}
                  a month.
                </>
              }
              className="sm:col-span-2"
            >
              <div className="grid gap-2 min-[420px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <DirectionToggle
                  name={`${ids.essentials}-direction`}
                  value={direction}
                  onValueChange={setDirection}
                />
                <PesoInput
                  id={ids.essentials}
                  value={essentials}
                  onValueChange={setEssentials}
                  describedBy={`${ids.essentials}-hint`}
                />
              </div>
            </Field>
            {analysis.debts.length > 0 ? (
              <Field
                label="Extra debt payment"
                hint="Paid on top of the minimum every month."
                className="sm:col-span-2"
              >
                <div className="grid gap-2 min-[420px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="min-w-0">
                    <label htmlFor={ids.debt} className="sr-only">
                      Debt for extra monthly payment
                    </label>
                    <select
                      id={ids.debt}
                      value={debtId}
                      onChange={(event) => setDebtId(event.target.value)}
                      className="border-border bg-background/60 focus-visible:ring-ring h-11 w-full min-w-0 rounded-xl border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <option value="">No extra payment</option>
                      {analysis.debts.map((debt) => (
                        <option key={debt.id} value={debt.id}>
                          {debt.creditorName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={ids.extra} className="sr-only">
                      Extra monthly payment
                    </label>
                    <PesoInput
                      id={ids.extra}
                      value={extraPayment}
                      onValueChange={setExtraPayment}
                      disabled={!debtId}
                    />
                  </div>
                </div>
              </Field>
            ) : null}
            <Field
              label={<span id={ids.target}>Reserve target</span>}
              hint="Months of need you want set aside."
              className="sm:col-span-2"
            >
              <MonthStepper
                value={targetMonths}
                onValueChange={setTargetMonths}
                labelledBy={ids.target}
                className="w-full sm:w-auto"
              />
            </Field>
          </div>
          {hasScenario ? (
            // Phones keep the answer in view while they type; the full
            // comparison follows the fields. It repeats the panel, so
            // assistive tech reads the panel alone.
            <div
              aria-hidden="true"
              className="bg-card/90 max-lg:animate-analyst-rise ring-border sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-10 mt-3 flex items-center justify-between gap-3 rounded-[1.25rem] px-4 py-3 shadow-[0_12px_32px_-12px_rgb(7_10_15/0.45)] ring-1 backdrop-blur-md group-data-[keyboard=open]/shell:bottom-2 lg:hidden"
            >
              <p className="flex min-w-0 items-baseline gap-1.5">
                <span className="text-primary text-xs font-semibold">
                  Scenario
                </span>
                <span className="font-mono text-xl font-semibold tracking-[-0.04em]">
                  {figure.value}
                </span>
                <span className="text-muted-foreground text-xs">
                  {figure.unit}
                </span>
              </p>
              <DeltaChip delta={delta} hasScenario />
            </div>
          ) : null}
        </div>

        <div
          role="group"
          aria-label="Scenario result"
          className="bg-background/55 ring-border/80 min-w-0 rounded-[1.25rem] p-4 ring-1 min-[360px]:p-5 lg:sticky lg:top-24"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs font-medium">Now</p>
              <p className="text-muted-foreground mt-1.5 font-mono text-xl leading-none font-semibold tracking-[-0.03em]">
                {formatRunwayMonths(analysis.runwayMonths)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-primary text-xs font-semibold">
                Scenario estimate
              </p>
              <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 font-mono leading-none">
                <span className="text-[2rem] font-semibold tracking-[-0.05em]">
                  {figure.value}
                </span>
                <span className="text-muted-foreground text-sm">
                  {figure.unit}
                </span>
              </p>
            </div>
          </div>
          <p role="status" className="mt-3">
            <DeltaChip delta={delta} hasScenario={hasScenario} />
          </p>

          <div className="mt-5 grid gap-2.5">
            {[
              {
                label: "Now",
                value: baseMonths,
                target: analysis.targetMonths,
              },
              {
                label: "Scenario",
                value: scenarioMonths,
                target: scenario.targetMonths,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3"
              >
                <span className="text-muted-foreground text-xs">
                  {row.label}
                </span>
                <RunwayTrack
                  compact
                  runwayMonths={row.value}
                  targetMonths={row.target}
                  months={months}
                  tone={runwayStatus(row.value, row.target).tone}
                />
              </div>
            ))}
          </div>

          <dl className="mt-4">
            <Compare
              label="Runway funds"
              before={
                <MoneyAmount centavos={analysis.availableLiquidCentavos} />
              }
              after={
                <MoneyAmount centavos={scenario.availableLiquidCentavos} />
              }
              changed={
                scenario.availableLiquidCentavos !==
                analysis.availableLiquidCentavos
              }
              tone={flowTone(
                scenario.availableLiquidCentavos,
                analysis.availableLiquidCentavos,
              )}
            />
            <Compare
              label="Monthly need"
              before={<MoneyAmount centavos={analysis.monthlyNeedCentavos} />}
              after={<MoneyAmount centavos={scenario.monthlyNeedCentavos} />}
              changed={
                scenario.monthlyNeedCentavos !== analysis.monthlyNeedCentavos
              }
              tone={flowTone(
                analysis.monthlyNeedCentavos,
                scenario.monthlyNeedCentavos,
              )}
            />
            <Compare
              label="Free cash flow"
              before={
                <MoneyAmount
                  centavos={analysis.monthlyFreeCashFlowCentavos}
                  sign="always"
                />
              }
              after={
                <MoneyAmount
                  centavos={scenario.monthlyFreeCashFlowCentavos}
                  sign="always"
                />
              }
              changed={
                scenario.monthlyFreeCashFlowCentavos !==
                analysis.monthlyFreeCashFlowCentavos
              }
              tone={flowTone(
                scenario.monthlyFreeCashFlowCentavos,
                analysis.monthlyFreeCashFlowCentavos,
              )}
            />
            <Compare
              label={`${scenario.targetMonths}-month reserve`}
              before={reserveText(analysis.targetGapCentavos)}
              after={reserveText(scenario.targetGapCentavos)}
              changed={
                scenario.targetGapCentavos !== analysis.targetGapCentavos
              }
              tone={flowTone(
                analysis.targetGapCentavos,
                scenario.targetGapCentavos,
              )}
            />
          </dl>

          {scenario.debtProjection ? (
            <div className="bg-primary/[0.06] ring-primary/20 mt-4 rounded-2xl p-3.5 text-xs leading-5 ring-1">
              <p className="font-semibold">
                {scenario.debtProjection.creditorName} payoff comparison
              </p>
              <p className="text-muted-foreground mt-1">
                {scenario.debtProjection.paidOff ? (
                  <>
                    Paid off in{" "}
                    <span className="text-foreground font-semibold">
                      {scenario.debtProjection.scenarioMonths} months
                    </span>{" "}
                    instead of {scenario.debtProjection.baseMonths}, with{" "}
                    <MoneyAmount
                      centavos={
                        scenario.debtProjection.scenarioInterestCentavos
                      }
                      className="text-foreground font-mono font-semibold"
                    />{" "}
                    in interest instead of{" "}
                    <MoneyAmount
                      centavos={scenario.debtProjection.baseInterestCentavos}
                      className="font-mono"
                    />
                    .
                  </>
                ) : (
                  "That payment is too low to pay this debt down at its current interest rate."
                )}
              </p>
            </div>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            onClick={reset}
            disabled={!hasScenario}
            className="mt-4 w-full"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset scenario
          </Button>
        </div>
      </div>
    </section>
  );
}
