import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PrivacyProvider } from "@/components/privacy/privacy-provider";
import type { Signal } from "@/lib/signals/engine";
import { SignalCard } from "./signal-card";
import { SignalsScreen } from "./signals-screen";

const checkedAt = "2026-10-02T11:00:00.000Z";
const noFilters = { category: null, severity: null };

function signal(overrides: Partial<Signal> = {}): Signal {
  return {
    id: "money-budget-2026-10-01",
    type: "money.budget-threshold",
    category: "Money",
    severity: "critical",
    title: "Monthly budget reached",
    message: "You've used 104% of your monthly budget.",
    reason: "You recorded ₱10,400.00 in expenses against a ₱10,000.00 plan.",
    metric: { label: "Budget used", value: "104%" },
    comparison: { label: "Monthly plan", value: "₱10,000.00" },
    href: "/money/budget",
    generatedAt: checkedAt,
    sensitive: true,
    ...overrides,
  };
}

const spending = signal({
  id: "money-spending-2026-10-01",
  type: "money.spending-increase",
  severity: "warning",
  title: "Spending increased",
  message: "Expenses this month are 46% above your recent monthly average.",
  metric: { label: "This month", value: "₱14,600.00" },
  comparison: { label: "Recent monthly average", value: "₱10,000.00" },
  href: "/money/transactions",
});

const execution = signal({
  id: "tasks-execution-2026-09-28",
  type: "tasks.strong-execution",
  category: "Tasks",
  severity: "positive",
  title: "Strong task execution",
  message: "You completed 12 tasks this week.",
  metric: { label: "Completed this week", value: "12" },
  comparison: { label: "Previous best", value: "9" },
  href: "/tasks?view=completed",
  sensitive: false,
});

const quietGoal = signal({
  id: "goal-stalled-g1",
  type: "goals.stalled",
  category: "Goals",
  severity: "info",
  title: "“Learn Spanish” has gone quiet",
  message: "This goal has had no recorded change for 21 days.",
  metric: { label: "Days without change", value: "21" },
  comparison: undefined,
  href: "/goals?highlight=g1",
  sensitive: false,
});

const all = [signal(), spending, execution, quietGoal];

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("SignalCard", () => {
  it("states severity in words and keeps the facts and reason", () => {
    render(<SignalCard signal={signal()} />);

    const card = screen.getByRole("article", {
      name: "Monthly budget reached",
    });
    expect(card).toHaveAttribute("id", "signal-money-budget-2026-10-01");
    expect(within(card).getByText("Critical")).toBeInTheDocument();
    expect(within(card).getByText("Budget used")).toBeInTheDocument();
    expect(within(card).getByText("104%")).toBeInTheDocument();
    expect(within(card).getByText("Why am I seeing this?")).toBeInTheDocument();
    expect(
      within(card).getByText(
        "You recorded ₱10,400.00 in expenses against a ₱10,000.00 plan.",
      ),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("link", {
        name: "Open budget: Monthly budget reached",
      }),
    ).toHaveAttribute("href", "/money/budget");
  });

  it("shows the change between now and the baseline", () => {
    render(<SignalCard signal={spending} />);
    expect(screen.getByText("+46%")).toBeInTheDocument();
    expect(screen.getByText("₱14,600.00")).toBeInTheDocument();
    expect(screen.getByText("Recent monthly average")).toBeInTheDocument();
  });

  it("hides sensitive figures and their charts in privacy mode", async () => {
    window.localStorage.setItem("atlas:privacy-mode:user-1", "hidden");
    render(
      <PrivacyProvider userId="user-1">
        <SignalCard signal={spending} />
      </PrivacyProvider>,
    );

    await waitFor(() =>
      expect(screen.queryByText("₱14,600.00")).not.toBeInTheDocument(),
    );
    expect(screen.queryByText("+46%")).not.toBeInTheDocument();
    expect(
      screen.getAllByLabelText("Hidden sensitive value").length,
    ).toBeGreaterThan(0);
  });
});

describe("SignalsScreen", () => {
  it("leads with what needs attention and where to start", () => {
    render(
      <SignalsScreen signals={all} filters={noFilters} checkedAt={checkedAt} />,
    );

    const hero = screen.getByRole("region", { name: "Pulse" });
    expect(within(hero).getByText("2")).toBeInTheDocument();
    expect(within(hero).getByText("need attention")).toBeInTheDocument();
    expect(within(hero).getByText("Act now")).toBeInTheDocument();
    expect(
      within(hero).getByText(
        "1 critical and 1 warning in Money, plus 1 sign of progress and 1 update.",
      ),
    ).toBeInTheDocument();
    expect(
      within(hero).getByRole("link", {
        name: "Open budget: Monthly budget reached",
      }),
    ).toHaveAttribute("href", "/money/budget");
    expect(screen.getByText("7:00 PM")).toBeInTheDocument();
  });

  it("sorts the feed into sections by what each signal asks of you", () => {
    render(
      <SignalsScreen signals={all} filters={noFilters} checkedAt={checkedAt} />,
    );

    const attention = screen.getByRole("list", { name: "Needs attention" });
    expect(within(attention).getAllByRole("article")).toHaveLength(2);
    expect(
      within(screen.getByRole("list", { name: "Progress" })).getByRole(
        "article",
        { name: "Strong task execution" },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Worth knowing" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("That’s everything ATLAS found"),
    ).toBeInTheDocument();
  });

  it("filters with links that carry counts and keep the other filter", () => {
    render(
      <SignalsScreen
        signals={all}
        filters={{ category: "Money", severity: null }}
        checkedAt={checkedAt}
      />,
    );

    const areas = screen.getByRole("navigation", { name: "Filter by area" });
    expect(
      within(areas).getByRole("link", { name: "Money, 2 signals" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(areas).getByRole("link", { name: "Tasks, 1 signal" }),
    ).toHaveAttribute("href", "/signals?category=tasks");

    const severities = screen.getByRole("navigation", {
      name: "Filter by severity",
    });
    expect(
      within(severities).getByRole("link", { name: "Warning, 1 signal" }),
    ).toHaveAttribute("href", "/signals?category=money&severity=warning");
    expect(
      within(severities).getByRole("link", { name: "Positive, 0 signals" }),
    ).toBeInTheDocument();

    expect(screen.queryByText("Strong task execution")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Remove filter: Money" }),
    ).toHaveAttribute("href", "/signals");
    expect(
      screen.getByText("That’s every signal in this view"),
    ).toBeInTheDocument();
  });

  it("offers a way out of a filter with no matches", () => {
    render(
      <SignalsScreen
        signals={all}
        filters={{ category: "Career", severity: null }}
        checkedAt={checkedAt}
      />,
    );
    expect(screen.getByText("No signals match this view.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/signals",
    );
  });

  it("explains an all-clear without filters or a manufactured signal", () => {
    render(
      <SignalsScreen signals={[]} filters={noFilters} checkedAt={checkedAt} />,
    );
    expect(screen.getByText("Nothing needs attention")).toBeInTheDocument();
    expect(screen.getByText("All clear")).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("list", { name: "What ATLAS watches" }),
      ).getAllByRole("link"),
    ).toHaveLength(5);
    expect(
      screen.queryByRole("navigation", { name: "Filter by area" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("says when signals could not be calculated", () => {
    render(
      <SignalsScreen
        signals={null}
        filters={noFilters}
        checkedAt={checkedAt}
      />,
    );
    expect(screen.getByText("Signals are unavailable.")).toBeInTheDocument();
    expect(screen.queryByText(/Checked/)).not.toBeInTheDocument();
  });
});
