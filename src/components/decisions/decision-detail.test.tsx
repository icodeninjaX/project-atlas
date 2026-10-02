import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  Decision,
  DecisionObservation,
  DecisionRevision,
} from "@/lib/decisions/decision";
import type { GraphEntitySummary } from "@/lib/graph/registry";
import { DecisionDetail } from "./decision-detail";
import type { DecisionRecords } from "./decision-records";

vi.mock("@/lib/decisions/actions", () => ({
  saveDecisionAction: vi.fn(),
  saveObservationAction: vi.fn(),
  deleteObservationAction: vi.fn(),
  deleteDecisionAction: vi.fn(),
}));
vi.mock("@/lib/graph/actions", () => ({
  searchGraphCandidatesAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(cleanup);

const today = "2026-10-02";
const goals = [{ id: "goal-1", title: "Find work" }];
const decision: Decision = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Apply weekly",
  decision_on: "2026-09-01",
  review_on: "2026-09-15",
  intent: "Apply selectively",
  expected_outcome: "Get interviews",
  rationale: null,
  assumptions: "The job market may change",
  goal_id: "goal-1",
  action_task_id: "00000000-0000-4000-8000-0000000000a1",
  metric_key: "task_completions",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-03T00:00:00Z",
};
const actionTask = {
  type: "task",
  id: "00000000-0000-4000-8000-0000000000a1",
  title: "Apply to roles",
  href: "/tasks?highlight=00000000-0000-4000-8000-0000000000a1",
} as GraphEntitySummary;
const application = {
  type: "job_application",
  id: "00000000-0000-4000-8000-0000000000b1",
  title: "Acme",
  href: "/career?highlight=00000000-0000-4000-8000-0000000000b1",
} as GraphEntitySummary;
const observations: DecisionObservation[] = [
  {
    id: "00000000-0000-4000-8000-0000000000c2",
    decision_id: decision.id,
    observed_on: "2026-09-20",
    note: "Two interviews booked.",
    source_task_id: null,
    source_transaction_id: null,
    source_application_id: application.id,
    created_at: "2026-09-20T00:00:00Z",
  },
  {
    id: "00000000-0000-4000-8000-0000000000c1",
    decision_id: decision.id,
    observed_on: "2026-09-05",
    note: "Slow first week.",
    source_task_id: "00000000-0000-4000-8000-0000000000ff",
    source_transaction_id: null,
    source_application_id: null,
    created_at: "2026-09-05T00:00:00Z",
  },
];
const revisions: DecisionRevision[] = [
  {
    id: "00000000-0000-4000-8000-0000000000d1",
    previous_title: "Apply weekly",
    previous_decision_on: "2026-09-01",
    previous_intent: "Apply each week",
    previous_expected_outcome: "Get interviews",
    previous_rationale: null,
    previous_assumptions: null,
    previous_review_on: "2026-09-15",
    previous_goal_id: "goal-1",
    previous_action_task_id: actionTask.id,
    previous_metric_key: "task_completions",
    changed_at: "2026-09-03T03:00:00Z",
  },
];

function renderDetail(
  overrides: Partial<Parameters<typeof DecisionDetail>[0]> = {},
) {
  const records: DecisionRecords = {
    kind: "comparison",
    comparison: {
      metric: "task_completions",
      before: 14,
      after: 28,
      beforeCount: 14,
      afterCount: 28,
      beforeFrom: "2026-08-18",
      beforeThrough: "2026-08-31",
      afterFrom: "2026-09-02",
      afterThrough: "2026-09-15",
    },
    days: {
      before: [{ on: "2026-08-18", value: 1 }],
      after: [{ on: "2026-09-15", value: 2 }],
    },
    sources: {
      before: { items: [], hasMore: false },
      after: { items: [], hasMore: false },
    },
  };
  return render(
    <DecisionDetail
      decision={decision}
      observations={observations}
      revisions={revisions}
      goal={goals[0]!}
      goals={goals}
      actionTask={actionTask}
      relatedRecords={{ [`job_application:${application.id}`]: application }}
      records={records}
      todayIso={today}
      {...overrides}
    />,
  );
}

describe("DecisionDetail", () => {
  it("leads with the decision, its review state, and the way to its review", () => {
    renderDetail();
    expect(
      screen.getByRole("heading", { level: 1, name: "Apply weekly" }),
    ).toBeVisible();
    expect(screen.getByText("Reviewed")).toBeVisible();
    expect(screen.getByText("31 days since deciding")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Action task: Apply to roles" }),
    ).toHaveAttribute("href", actionTask.href);
    expect(
      screen.getByRole("link", { name: "Related goal: Find work" }),
    ).toHaveAttribute("href", "/goals?highlight=goal-1");
  });

  it("compares the windows without calling the change a result", () => {
    renderDetail();
    const records = screen.getByRole("region", {
      name: "What the records show",
    });
    expect(
      within(records).getByText("Higher after the decision"),
    ).toBeVisible();
    expect(within(records).getByText(/· 100%/)).toBeVisible();
    expect(
      within(records).getByText(
        /does not establish that the decision caused it/,
      ),
    ).toBeVisible();
  });

  it("says when the comparison opens while it waits", () => {
    renderDetail({
      records: { kind: "before_review", opensOn: "2026-10-10" },
    });
    expect(
      screen.getByText(
        "Review date has not arrived. ATLAS will wait for follow-up records.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("The comparison opens on Oct 10, 2026."),
    ).toBeVisible();
  });

  it("shows notes on a trail with the review date between them", async () => {
    const user = userEvent.setup();
    renderDetail();
    const trail = screen.getByRole("list", {
      name: "Observations, newest first",
    });
    const items = within(trail).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Two interviews booked.");
    expect(items[0]).toHaveTextContent("Day 19");
    expect(items[0]).toHaveTextContent("Review note");
    expect(items[1]).toHaveTextContent("Review date");
    expect(items[2]).toHaveTextContent("Supporting record no longer available");
    expect(
      screen.getByRole("link", { name: /Open supporting record/ }),
    ).toHaveAttribute("href", application.href);
    // Only the composer is a form until a note is opened for editing.
    expect(screen.getAllByLabelText("What did you observe?")).toHaveLength(1);
    await user.click(
      screen.getByRole("button", { name: "Edit note from Sep 5, 2026" }),
    );
    expect(screen.getAllByLabelText("What did you observe?")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Delete note" })).toBeVisible();
  });

  it("shows what each edit changed", () => {
    renderDetail();
    const history = screen.getByRole("region", { name: "Earlier plans" });
    expect(within(history).getByText("2 changes")).toBeVisible();
    expect(within(history).getByText("Apply each week")).toBeVisible();
    expect(
      within(history).getByText(/^Unchanged: Decision, Date decided/),
    ).toBeVisible();
  });

  it("edits the plan in a sheet", async () => {
    const user = userEvent.setup();
    renderDetail();
    expect(
      screen.queryByLabelText("What will you do?"),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit decision" }));
    const sheet = screen.getByRole("dialog", { name: "Edit decision" });
    expect(within(sheet).getByLabelText("What will you do?")).toHaveValue(
      "Apply selectively",
    );
    expect(
      within(sheet).getByRole("button", { name: "Save changes" }),
    ).toBeVisible();
  });
});
