import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TimelineEvent, TimelineFilters } from "@/lib/timeline/timeline";
import { TimelineWorkspace } from "./timeline-workspace";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const noFilters: TimelineFilters = {
  query: "",
  module: null,
  from: null,
  to: null,
};

function event(overrides: Partial<TimelineEvent>): TimelineEvent {
  return {
    eventId: "00000000-0000-4000-8000-000000000000",
    occurredOn: "2026-10-02",
    occurredAt: "2026-10-02T01:00:00.000Z",
    occurredPrecision: "date",
    module: "money",
    eventType: "expense_recorded",
    title: "Event",
    description: null,
    amountCentavos: null,
    amountDirection: null,
    metricLabel: null,
    metricValue: null,
    sourceHref: null,
    sourceAvailable: true,
    ...overrides,
  };
}

const market = event({
  eventId: "00000000-0000-4000-8000-000000000001",
  occurredOn: "2026-09-05",
  occurredAt: "2026-09-05T01:00:00.000Z",
  title: "Market",
  description: "Food · Wallet",
  amountCentavos: 12550,
  amountDirection: "outflow",
  sourceHref: "/money/transactions?view=history&highlight=one",
});

const portfolio = event({
  eventId: "00000000-0000-4000-8000-000000000002",
  occurredOn: "2026-09-04",
  occurredAt: "2026-09-04T01:00:00.000Z",
  occurredPrecision: "timestamp",
  module: "tasks",
  eventType: "task_completed",
  title: "Finish portfolio",
  description: "Task completed",
  sourceAvailable: false,
});

describe("TimelineWorkspace", () => {
  it("groups meaningful events, masks amounts through the privacy boundary, and explains deleted sources", () => {
    const { container } = render(
      <TimelineWorkspace
        initialCursor={null}
        filters={noFilters}
        todayIso="2026-10-02"
        initialEvents={[market, portfolio]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "September 2026" }),
    ).toBeInTheDocument();
    const expense = screen
      .getByRole("heading", { name: "Market" })
      .closest("article")!;
    expect(
      within(expense).getByText((content) => content === "−₱125.50", {
        selector: "span",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open in Money: Market" }),
    ).toHaveAttribute("href", "/money/transactions?view=history&highlight=one");
    expect(screen.getByText("Source no longer available")).toBeInTheDocument();
    // The database's stand-in description repeats the kind, so it shows once.
    const task = screen
      .getByRole("heading", { name: "Finish portfolio" })
      .closest("article")!;
    expect(within(task).getAllByText("Task completed")).toHaveLength(1);
    // Icons only decorate.
    for (const svg of container.querySelectorAll("svg"))
      expect(svg.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(
      screen.getByText("That’s the beginning of your timeline."),
    ).toBeInTheDocument();
  });

  it("sums what is in view in the hero", () => {
    render(
      <TimelineWorkspace
        initialCursor={null}
        filters={noFilters}
        todayIso="2026-10-02"
        initialEvents={[
          event({
            eventId: "00000000-0000-4000-8000-000000000003",
            title: "Salary",
            eventType: "income_recorded",
            amountCentavos: 5_000_000,
            amountDirection: "inflow",
          }),
          market,
          portfolio,
        ]}
      />,
    );

    const hero = screen.getByRole("region", { name: "In view" });
    expect(within(hero).getByText("3")).toBeInTheDocument();
    expect(within(hero).getByText("Active today")).toBeInTheDocument();
    expect(within(hero).getByText("+₱50,000.00")).toBeInTheDocument();
    expect(within(hero).getByText("−₱125.50")).toBeInTheDocument();
    expect(within(hero).getByText("+₱49,874.50")).toBeInTheDocument();
    const mix = within(hero).getByRole("list", { name: "Moments by module" });
    expect(within(mix).getByText("Money").parentElement).toHaveTextContent(
      "Money2",
    );
    expect(within(hero).getByText(/Busiest day:/)).toHaveTextContent(
      "Busiest day: Fri, Oct 2 · 1 moment",
    );
  });

  it("names days relative to today and shows career stages as chips", () => {
    render(
      <TimelineWorkspace
        initialCursor={null}
        filters={noFilters}
        todayIso="2026-10-02"
        initialEvents={[
          event({
            eventId: "00000000-0000-4000-8000-000000000004",
            module: "career",
            eventType: "job_stage_changed",
            occurredPrecision: "timestamp",
            occurredAt: "2026-10-02T03:00:00.000Z",
            title: "Acme · Designer",
            description: "Stage: applied → final interview",
          }),
          event({
            eventId: "00000000-0000-4000-8000-000000000005",
            occurredOn: "2026-10-01",
            module: "reviews",
            eventType: "weekly_review_submitted",
            title: "Week of 2026-09-21",
            description: "Ship the portfolio",
            metricLabel: "Overall score",
            metricValue: "8",
          }),
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Today, Friday, October 2, 2026" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Yesterday, Thursday, October 1, 2026",
      }),
    ).toBeInTheDocument();
    const move = screen
      .getByRole("heading", { name: "Acme · Designer" })
      .closest("article")!;
    expect(move).toHaveTextContent("Stage: Applied to Final interview");
    expect(move).not.toHaveTextContent("final interview →");
    expect(within(move).getByText("11:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Week of Sep 21, 2026")).toBeInTheDocument();
    expect(screen.getByText("8/10")).toBeInTheDocument();
  });

  it("loads older moments into the same view and says when it has them all", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ events: [portfolio], nextCursor: null }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <TimelineWorkspace
        initialCursor="cursor-1"
        filters={{ ...noFilters, module: "money" }}
        todayIso="2026-10-02"
        initialEvents={[market]}
      />,
    );

    expect(screen.getByText("Filtered view")).toBeInTheDocument();
    expect(screen.getByText(/Counting the moments loaded/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Load older moments" }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/timeline?module=money&cursor=cursor-1",
      { cache: "no-store" },
    );
    expect(
      await screen.findByRole("heading", { name: "Finish portfolio" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Load older moments" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("That’s every moment that matches."),
    ).toBeInTheDocument();
    expect(screen.getByText("Loaded 1 older moment.")).toBeInTheDocument();
  });

  it("explains how to start an empty timeline, and offers a way out of an empty filter", () => {
    const { rerender } = render(
      <TimelineWorkspace
        initialCursor={null}
        filters={noFilters}
        todayIso="2026-10-02"
        initialEvents={[]}
        toolbar={<p>Toolbar</p>}
      />,
    );

    expect(screen.getByText("No timeline events yet")).toBeInTheDocument();
    expect(screen.queryByText("Toolbar")).not.toBeInTheDocument();
    const starts = screen.getByRole("list", {
      name: "Ways to start your timeline",
    });
    expect(within(starts).getByRole("link", { name: /Money/ })).toHaveAttribute(
      "href",
      "/money/transactions",
    );
    expect(within(starts).getAllByRole("link")).toHaveLength(7);

    rerender(
      <TimelineWorkspace
        initialCursor={null}
        filters={{ ...noFilters, query: "nothing" }}
        todayIso="2026-10-02"
        initialEvents={[]}
        toolbar={<p>Toolbar</p>}
      />,
    );
    expect(screen.getByText("Toolbar")).toBeInTheDocument();
    expect(screen.getByText("No moments match")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/timeline",
    );
  });
});
