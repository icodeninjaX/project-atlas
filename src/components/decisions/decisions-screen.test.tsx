import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Decision } from "@/lib/decisions/decision";
import { DecisionsScreen } from "./decisions-screen";

vi.mock("@/lib/decisions/actions", () => ({ saveDecisionAction: vi.fn() }));
vi.mock("@/lib/graph/actions", () => ({
  searchGraphCandidatesAction: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(cleanup);

const today = "2026-10-02";
const goals = [{ id: "goal-1", title: "Find work" }];

let id = 0;
function decision(
  title: string,
  decisionOn: string,
  reviewOn: string,
  extra: Partial<Decision> = {},
): Decision {
  id += 1;
  return {
    id: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    title,
    decision_on: decisionOn,
    review_on: reviewOn,
    intent: "Do it",
    expected_outcome: `Outcome of ${title}`,
    rationale: null,
    assumptions: null,
    goal_id: null,
    action_task_id: null,
    metric_key: null,
    created_at: `${decisionOn}T00:00:00Z`,
    updated_at: `${decisionOn}T00:00:00Z`,
    ...extra,
  };
}

const waiting = decision("Study daily", "2026-09-28", "2026-10-05", {
  metric_key: "knowledge_reviews",
});
const ready = decision("Apply weekly", "2026-09-10", "2026-09-24", {
  goal_id: "goal-1",
});
const reviewed = decision("Cook at home", "2026-08-01", "2026-09-01");
const decisions = [waiting, ready, reviewed];
const notes = [
  { decision_id: reviewed.id, observed_on: "2026-09-02" },
  { decision_id: reviewed.id, observed_on: "2026-08-15" },
  { decision_id: ready.id, observed_on: "2026-09-12" },
];
const journal = {
  decisions: decisions.map(
    ({ id, title, decision_on, review_on, metric_key }) => ({
      id,
      title,
      decision_on,
      review_on,
      metric_key,
    }),
  ),
  total: 3,
  notes,
  noteTotal: 3,
};

function renderScreen(
  overrides: Partial<Parameters<typeof DecisionsScreen>[0]> = {},
) {
  return render(
    <DecisionsScreen
      page={1}
      decisions={decisions}
      hasMore={false}
      journal={journal}
      pageNotes={notes}
      goals={goals}
      todayIso={today}
      {...overrides}
    />,
  );
}

describe("DecisionsScreen", () => {
  it("leads with the review loop and what to return to first", () => {
    renderScreen();
    expect(
      screen.getByRole("heading", { level: 1, name: "Decision journal" }),
    ).toBeVisible();
    const hero = screen.getByRole("region", { name: "Review loop" });
    expect(within(hero).getByText("1 ready to review")).toBeVisible();
    expect(
      within(hero).getByText(
        "1 ready to review, 1 waiting for its review date, and 1 reviewed.",
      ),
    ).toBeVisible();
    const upNext = within(hero).getAllByRole("link");
    expect(upNext[0]).toHaveAccessibleName(/Apply weekly/);
    expect(upNext[0]).toHaveAttribute("href", `/decisions/${ready.id}`);
    expect(upNext[1]).toHaveAccessibleName(/Study daily.*Review in 3 days/);
    expect(
      within(
        within(hero).getByRole("list", { name: "Decisions by review state" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(3);
  });

  it("lists each decision by month with its state, measure, notes, and goal", () => {
    renderScreen();
    const list = screen.getByRole("region", { name: "Your decisions" });
    expect(
      within(list).getByRole("heading", { name: "September 2026" }),
    ).toBeVisible();
    expect(
      within(list).getByRole("heading", { name: "August 2026" }),
    ).toBeVisible();
    const row = within(list)
      .getByRole("link", { name: "Apply weekly" })
      .closest("li")!;
    expect(within(row).getByText("Ready to review")).toBeVisible();
    expect(within(row).getByText("1 note")).toBeVisible();
    expect(within(row).getByText("Find work")).toBeVisible();
    const cooked = within(list)
      .getByRole("link", { name: "Cook at home" })
      .closest("li")!;
    expect(within(cooked).getByText("Reviewed")).toBeVisible();
    expect(within(cooked).getByText("2 notes")).toBeVisible();
    const studying = within(list)
      .getByRole("link", { name: "Study daily" })
      .closest("li")!;
    expect(within(studying).getByText("Knowledge reviews")).toBeVisible();
  });

  it("records a decision in a sheet", async () => {
    const user = userEvent.setup();
    renderScreen();
    expect(
      screen.queryByRole("textbox", { name: "Decision" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Record a decision" }));
    const sheet = screen.getByRole("dialog", { name: "Record a decision" });
    expect(
      within(sheet).getByRole("textbox", { name: "Decision" }),
    ).toHaveFocus();
    await user.click(within(sheet).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("explains the journal and holds the only add button when empty", () => {
    renderScreen({
      decisions: [],
      journal: { decisions: [], total: 0, notes: [], noteTotal: 0 },
      pageNotes: [],
    });
    expect(screen.getByText("No decisions recorded yet")).toBeVisible();
    expect(
      screen.getByRole("list", { name: "How the journal works" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: "Record a decision" }),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("region", { name: "Your decisions" }),
    ).not.toBeInTheDocument();
  });

  it("pages through older decisions without repeating the hero", () => {
    renderScreen({ page: 2, hasMore: true });
    expect(
      screen.queryByRole("region", { name: "Review loop" }),
    ).not.toBeInTheDocument();
    const pages = screen.getByRole("navigation", { name: "Decision pages" });
    expect(
      within(pages).getByRole("link", { name: "Newer decisions" }),
    ).toHaveAttribute("href", "/decisions");
    expect(
      within(pages).getByRole("link", { name: "Older decisions" }),
    ).toHaveAttribute("href", "/decisions?page=3");
  });

  it("offers a way back from a page past the end", () => {
    renderScreen({ page: 4, decisions: [], pageNotes: [] });
    expect(screen.getByText("No decisions on page 4")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Back to the newest" }),
    ).toHaveAttribute("href", "/decisions");
  });
});
