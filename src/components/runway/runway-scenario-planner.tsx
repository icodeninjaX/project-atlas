"use client";

import { useMemo, useState } from "react";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  centavosToPesoInput,
  formatCentavos,
  signedPesoInputToCentavos,
} from "@/lib/money/money";
import {
  calculateScenario,
  formatRunwayMonths,
  type RunwayAnalysis,
  type ScenarioInput,
} from "@/lib/runway/engine";

function parsePeso(value: string): number {
  if (!value.trim()) return 0;
  try {
    return signedPesoInputToCentavos(value);
  } catch {
    return 0;
  }
}

function MoneyValue({ value }: { value: number }) {
  return <SensitiveValue>{formatCentavos(value)}</SensitiveValue>;
}

export function RunwayScenarioPlanner({
  analysis,
}: {
  analysis: RunwayAnalysis;
}) {
  const [income, setIncome] = useState("");
  const [expenseChange, setExpenseChange] = useState("");
  const [purchase, setPurchase] = useState("");
  const [debtId, setDebtId] = useState("");
  const [extraPayment, setExtraPayment] = useState("");
  const [targetMonths, setTargetMonths] = useState(
    String(analysis.targetMonths),
  );

  const input = useMemo<ScenarioInput>(
    () => ({
      monthlyIncomeCentavos: income.trim() ? parsePeso(income) : null,
      monthlyExpenseChangeCentavos: parsePeso(expenseChange),
      oneTimePurchaseCentavos: Math.max(0, parsePeso(purchase)),
      extraDebtPayment:
        debtId && parsePeso(extraPayment) > 0
          ? { debtId, amountCentavos: Math.max(0, parsePeso(extraPayment)) }
          : null,
      targetMonths: Number(targetMonths),
    }),
    [debtId, expenseChange, extraPayment, income, purchase, targetMonths],
  );
  const scenario = useMemo(
    () => calculateScenario(analysis, input),
    [analysis, input],
  );
  const hasScenario = Boolean(
    income.trim() ||
    expenseChange.trim() ||
    purchase.trim() ||
    (debtId && extraPayment.trim()) ||
    Number(targetMonths) !== analysis.targetMonths,
  );
  const reset = () => {
    setIncome("");
    setExpenseChange("");
    setPurchase("");
    setDebtId("");
    setExtraPayment("");
    setTargetMonths(String(analysis.targetMonths));
  };

  return (
    <section aria-labelledby="scenario-title" className="grid gap-5">
      <div>
        <h2 id="scenario-title" className="text-lg font-semibold">
          Try a scenario
        </h2>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          These changes stay only in this browser tab. They never create a
          transaction, budget, payment, or account adjustment.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-muted-foreground text-xs">
          Replacement monthly income (PHP)
          <Input
            value={income}
            onChange={(event) => setIncome(event.target.value)}
            inputMode="decimal"
            placeholder={centavosToPesoInput(analysis.monthlyIncomeCentavos)}
            className="mt-1.5 font-mono"
          />
        </label>
        <label className="text-muted-foreground text-xs">
          Essential expense change (PHP)
          <Input
            value={expenseChange}
            onChange={(event) => setExpenseChange(event.target.value)}
            inputMode="decimal"
            placeholder="-500.00 or 500.00"
            className="mt-1.5 font-mono"
          />
        </label>
        <label className="text-muted-foreground text-xs">
          One-time purchase (PHP)
          <Input
            value={purchase}
            onChange={(event) => setPurchase(event.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="mt-1.5 font-mono"
          />
        </label>
        <label className="text-muted-foreground text-xs">
          Target runway
          <select
            value={targetMonths}
            onChange={(event) => setTargetMonths(event.target.value)}
            className="border-border bg-background focus-visible:ring-ring mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            {Array.from({ length: 24 }, (_, index) => index + 1).map(
              (months) => (
                <option key={months} value={months}>
                  {months} {months === 1 ? "month" : "months"}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      {analysis.debts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-muted-foreground text-xs">
            Debt for extra monthly payment
            <select
              value={debtId}
              onChange={(event) => setDebtId(event.target.value)}
              className="border-border bg-background focus-visible:ring-ring mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="">No extra debt payment</option>
              {analysis.debts.map((debt) => (
                <option key={debt.id} value={debt.id}>
                  {debt.creditorName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-muted-foreground text-xs">
            Extra monthly payment (PHP)
            <Input
              value={extraPayment}
              onChange={(event) => setExtraPayment(event.target.value)}
              disabled={!debtId}
              inputMode="decimal"
              placeholder="0.00"
              className="mt-1.5 font-mono"
            />
          </label>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border-border bg-background rounded-xl border p-4">
          <p className="text-muted-foreground text-xs">Current estimate</p>
          <p className="mt-2 font-mono text-xl font-semibold">
            {formatRunwayMonths(analysis.runwayMonths)}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            Free cash flow{" "}
            <MoneyValue value={analysis.monthlyFreeCashFlowCentavos} />
          </p>
        </div>
        <div className="border-primary/30 bg-primary/5 rounded-xl border p-4">
          <p className="text-muted-foreground text-xs">Scenario estimate</p>
          <p className="mt-2 font-mono text-xl font-semibold">
            {formatRunwayMonths(scenario.runwayMonths)}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            Free cash flow{" "}
            <MoneyValue value={scenario.monthlyFreeCashFlowCentavos} />
          </p>
        </div>
      </div>
      {hasScenario && (
        <div className="border-border grid gap-2 rounded-xl border p-4 text-xs sm:grid-cols-3">
          <p>
            Scenario need{" "}
            <span className="font-mono font-semibold">
              <MoneyValue value={scenario.monthlyNeedCentavos} />
            </span>
          </p>
          <p>
            Scenario reserve{" "}
            <span className="font-mono font-semibold">
              <MoneyValue value={scenario.targetReserveCentavos} />
            </span>
          </p>
          <p>
            Reserve gap{" "}
            <span className="font-mono font-semibold">
              <MoneyValue value={scenario.targetGapCentavos} />
            </span>
          </p>
        </div>
      )}
      {scenario.debtProjection && (
        <div className="border-primary/25 bg-primary/5 rounded-xl border p-4 text-xs leading-5">
          <p className="font-semibold">
            {scenario.debtProjection.creditorName} payoff comparison
          </p>
          <p className="text-muted-foreground mt-1">
            {scenario.debtProjection.paidOff ? (
              <>
                <span>
                  {scenario.debtProjection.baseMonths} →{" "}
                  {scenario.debtProjection.scenarioMonths} months; interest
                  changes from{" "}
                </span>
                <MoneyValue
                  value={scenario.debtProjection.baseInterestCentavos}
                />
                <span> to </span>
                <MoneyValue
                  value={scenario.debtProjection.scenarioInterestCentavos}
                />
                <span>.</span>
              </>
            ) : (
              "That payment is too low to amortize this debt under the current interest rate."
            )}
          </p>
        </div>
      )}
      <Button
        type="button"
        variant="secondary"
        onClick={reset}
        className="w-full sm:w-auto"
      >
        Reset scenario
      </Button>
    </section>
  );
}
