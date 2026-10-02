import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrivacyProvider } from "@/components/privacy/privacy-provider";
import { RunwayScenarioPlanner } from "./runway-scenario-planner";
import type { RunwayAnalysis } from "@/lib/runway/engine";

afterEach(cleanup);

/** The comparison panel; phones also dock a copy of its headline. */
const result = () =>
  within(screen.getByRole("group", { name: "Scenario result" }));

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

function renderPlanner() {
  return render(
    <PrivacyProvider userId="runway-test">
      <RunwayScenarioPlanner analysis={analysis} />
    </PrivacyProvider>,
  );
}

describe("RunwayScenarioPlanner", () => {
  it("shows an in-memory comparison and resets without mutating the baseline", async () => {
    const user = userEvent.setup();
    renderPlanner();

    expect(
      result().getByText("Change anything to compare"),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("One-time purchase"), "1000");
    await user.selectOptions(
      screen.getByLabelText("Debt for extra monthly payment"),
      "debt-1",
    );
    await user.type(screen.getByLabelText("Extra monthly payment"), "100");

    // ₱4,000 over ₱1,200 a month, down from ₱5,000 over ₱1,100.
    expect(result().getByText("Scenario estimate")).toBeInTheDocument();
    expect(result().getByText("−1.2 months")).toBeInTheDocument();
    expect(result().getByText("Card payoff comparison")).toBeInTheDocument();
    expect(analysis.availableLiquidCentavos).toBe(500_000);

    await user.click(screen.getByRole("button", { name: "Reset scenario" }));
    expect(screen.getByLabelText("One-time purchase")).toHaveValue("");
    expect(screen.getByLabelText("Extra monthly payment")).toHaveValue("");
    expect(screen.getByLabelText("Debt for extra monthly payment")).toHaveValue(
      "",
    );
    expect(
      screen.getByRole("button", { name: "Reset scenario" }),
    ).toBeDisabled();
  });

  it("fills a preset and says when income alone leaves runway unchanged", async () => {
    const user = userEvent.setup();
    renderPlanner();

    await user.click(screen.getByRole("button", { name: "Income stops" }));
    expect(screen.getByLabelText("Monthly income")).toHaveValue("0.00");
    expect(result().getByText("Runway unchanged")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Trim essentials 10%" }),
    );
    expect(screen.getByLabelText("Essential spending each month")).toHaveValue(
      "100.00",
    );
    expect(screen.getByRole("radio", { name: "Spend less" })).toBeChecked();
    // ₱5,000 over ₱1,000 a month: 5.0 months, up from 4.5.
    expect(result().getByText("+0.5 months")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Spend more" }));
    expect(result().getByText("−0.4 months")).toBeInTheDocument();
  });

  it("steps the reserve target between one and 24 months", async () => {
    const user = userEvent.setup();
    renderPlanner();

    const less = screen.getByRole("button", { name: "One month less" });
    await user.click(less);
    await user.click(less);
    expect(
      screen.getByRole("group", { name: "Reserve target" }),
    ).toHaveTextContent("1 month");
    expect(less).toBeDisabled();
    expect(result().getByText("1-month reserve")).toBeInTheDocument();
  });
});
