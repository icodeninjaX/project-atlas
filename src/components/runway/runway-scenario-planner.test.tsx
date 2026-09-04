import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrivacyProvider } from "@/components/privacy/privacy-provider";
import { RunwayScenarioPlanner } from "./runway-scenario-planner";
import type { RunwayAnalysis } from "@/lib/runway/engine";

afterEach(cleanup);

const analysis: RunwayAnalysis = {
  status: "ready",
  baselineSource: "historical",
  incomeSource: "historical",
  includedMonths: ["2026-08-01", "2026-07-01"],
  selectedAccounts: [],
  selectedCategories: [],
  debts: [
    {
      id: "debt-1",
      creditorName: "Card",
      currentBalanceCentavos: 100_000,
      interestRatePercent: 12,
      minimumPaymentCentavos: 10_000,
      status: "active",
    },
  ],
  netLiquidCentavos: 500_000,
  availableLiquidCentavos: 500_000,
  monthlyEssentialCentavos: 100_000,
  monthlyDebtMinimumsCentavos: 10_000,
  monthlyNeedCentavos: 110_000,
  monthlyIncomeCentavos: 150_000,
  monthlyFreeCashFlowCentavos: 40_000,
  runwayMonths: 500_000 / 110_000,
  targetMonths: 3,
  targetReserveCentavos: 330_000,
  targetGapCentavos: -170_000,
};

describe("RunwayScenarioPlanner", () => {
  it("shows an in-memory comparison and resets without mutating the baseline", async () => {
    const user = userEvent.setup();
    render(
      <PrivacyProvider userId="runway-test">
        <RunwayScenarioPlanner analysis={analysis} />
      </PrivacyProvider>,
    );

    await user.type(screen.getByLabelText("One-time purchase (PHP)"), "1000");
    await user.selectOptions(
      screen.getByLabelText("Debt for extra monthly payment"),
      "debt-1",
    );
    await user.type(
      screen.getByLabelText("Extra monthly payment (PHP)"),
      "100",
    );

    expect(screen.getByText("Scenario estimate")).toBeInTheDocument();
    expect(screen.getByText("Card payoff comparison")).toBeInTheDocument();
    expect(analysis.availableLiquidCentavos).toBe(500_000);

    await user.click(screen.getByRole("button", { name: "Reset scenario" }));
    expect(screen.getByLabelText("One-time purchase (PHP)")).toHaveValue("");
    expect(screen.getByLabelText("Extra monthly payment (PHP)")).toHaveValue(
      "",
    );
    expect(screen.getByLabelText("Debt for extra monthly payment")).toHaveValue(
      "",
    );
  });
});
