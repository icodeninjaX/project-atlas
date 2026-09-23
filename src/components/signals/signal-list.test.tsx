import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SignalList } from "./signal-list";
import { SignalsPanel } from "./signals-panel";
import type { Signal } from "@/lib/signals/engine";

function signal(
  index = 1,
  severity: Signal["severity"] = index === 1 ? "critical" : "info",
): Signal {
  return {
    id: `signal-${index}`,
    type: "money.budget-threshold",
    category: "Money",
    severity,
    title: `Budget signal ${index}`,
    message: "You've used 100% of your monthly budget.",
    reason: "Expenses are ₱10,000.00 against a ₱10,000.00 plan.",
    metric: { label: "Budget used", value: "100%" },
    comparison: { label: "Monthly plan", value: "₱10,000.00" },
    href: "/money/budget",
    generatedAt: "2026-08-26T04:00:00.000Z",
    sensitive: false,
  };
}

afterEach(cleanup);

describe("SignalList", () => {
  it("communicates severity in text and exposes its factual explanation", () => {
    render(<SignalList signals={[signal()]} />);

    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("Budget used")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("Why am I seeing this?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View money" })).toHaveAttribute(
      "href",
      "/money/budget",
    );
  });
});

describe("SignalsPanel", () => {
  it("keeps the dashboard preview to three signals", () => {
    render(
      <SignalsPanel
        signals={Array.from({ length: 6 }, (_, index) => signal(index + 1))}
      />,
    );

    expect(screen.getByText("1 need attention")).toBeInTheDocument();
    expect(screen.getByText("Budget signal 3")).toBeInTheDocument();
    expect(screen.queryByText("Budget signal 4")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute(
      "href",
      "/signals",
    );
    expect(screen.queryByText("Why this is here")).not.toBeInTheDocument();
    expect(screen.queryByText(signal().reason)).not.toBeInTheDocument();
  });

  it("separates attention signals from quieter progress", () => {
    render(
      <SignalsPanel
        signals={[
          signal(1, "critical"),
          signal(2, "warning"),
          signal(3, "positive"),
        ]}
      />,
    );

    expect(screen.getByText("2 need attention")).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Needs attention" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Progress" })).toBeInTheDocument();
    expect(screen.queryByText("Critical")).not.toBeInTheDocument();
    expect(screen.queryByText("Attention")).not.toBeInTheDocument();
    expect(screen.queryByText("Positive")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Critical" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Warning" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Positive" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /View money/ })).toHaveLength(3);
  });

  it("explains an empty result without manufacturing a signal", () => {
    render(<SignalsPanel signals={[]} />);
    expect(screen.getByText("Nothing needs attention.")).toBeInTheDocument();
  });
});
