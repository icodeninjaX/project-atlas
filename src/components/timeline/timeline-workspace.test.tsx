import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TimelineWorkspace } from "./timeline-workspace";

afterEach(cleanup);

describe("TimelineWorkspace", () => {
  it("groups meaningful events, masks amounts through the privacy boundary, and explains deleted sources", () => {
    render(
      <TimelineWorkspace
        initialCursor={null}
        filters={{ query: "", module: null, from: null, to: null }}
        initialEvents={[
          {
            eventId: "00000000-0000-4000-8000-000000000001",
            occurredOn: "2026-09-05",
            occurredAt: "2026-09-05T01:00:00.000Z",
            occurredPrecision: "date",
            module: "money",
            eventType: "expense_recorded",
            title: "Market",
            description: "Food · Wallet",
            amountCentavos: 12550,
            amountDirection: "outflow",
            metricLabel: null,
            metricValue: null,
            sourceHref: "/money/transactions?view=history&highlight=one",
            sourceAvailable: true,
          },
          {
            eventId: "00000000-0000-4000-8000-000000000002",
            occurredOn: "2026-09-04",
            occurredAt: "2026-09-04T01:00:00.000Z",
            occurredPrecision: "timestamp",
            module: "tasks",
            eventType: "task_completed",
            title: "Finish portfolio",
            description: null,
            amountCentavos: null,
            amountDirection: null,
            metricLabel: null,
            metricValue: null,
            sourceHref: null,
            sourceAvailable: false,
          },
        ]}
      />,
    );

    expect(screen.getByText("Market")).toBeInTheDocument();
    expect(
      screen.getByText((content) => content === "−₱125.50", {
        selector: "span",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open source" })).toHaveAttribute(
      "href",
      "/money/transactions?view=history&highlight=one",
    );
    expect(screen.getByText("Source no longer available")).toBeInTheDocument();
  });
});
