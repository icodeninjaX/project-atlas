import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CareerApplication } from "@/lib/career/view";
import { CareerWorkspace, parseCareerView } from "./career-workspace";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/career/actions", () => ({
  updateApplicationStageAction: vi.fn(),
}));

afterEach(cleanup);

const now = "2026-10-02T11:00:00Z"; // 7:00 PM, October 2 in Manila

function application(
  overrides: Partial<CareerApplication> & { id: string; company_name: string },
): CareerApplication {
  return {
    role_title: "Frontend Engineer",
    job_url: null,
    location: null,
    work_setup: "remote",
    employment_type: "full_time",
    stage: "applied",
    salary_min_centavos: null,
    salary_max_centavos: null,
    next_action: null,
    next_action_at: null,
    applied_at: null,
    contact_name: null,
    contact_email: null,
    resume_version: null,
    notes: null,
    is_follow_up_overdue: false,
    ...overrides,
  };
}

const id = (n: number) => `60000000-0000-4000-8000-00000000000${n}`;

const applications = [
  application({
    id: id(1),
    company_name: "Northstar Labs",
    next_action: "Follow up with the recruiter",
    next_action_at: "2026-09-29T01:00:00Z",
    is_follow_up_overdue: true,
    salary_min_centavos: 12_000_000,
    salary_max_centavos: 15_000_000,
    job_url: "https://example.com/northstar",
  }),
  application({
    id: id(2),
    company_name: "Cloudbank",
    stage: "interview",
    next_action: "Prepare the portfolio",
    next_action_at: "2026-10-04T01:00:00Z",
  }),
  application({ id: id(3), company_name: "Meridian", stage: "interested" }),
  application({ id: id(4), company_name: "Pacific Retail", stage: "rejected" }),
];

describe("CareerWorkspace", () => {
  it("opens the board for board or kanban, and the list otherwise", () => {
    expect(parseCareerView("board")).toBe("board");
    expect(parseCareerView("kanban")).toBe("board");
    expect(parseCareerView("table")).toBe("list");
    expect(parseCareerView(undefined)).toBe("list");
  });

  it("leads with the pipeline and groups the list by what is next", () => {
    render(
      <CareerWorkspace
        applications={applications}
        events={[]}
        view="list"
        nowIso={now}
        highlightId={id(2)}
      />,
    );

    const hero = screen.getByRole("region", { name: "Pipeline" });
    expect(hero).toHaveTextContent("3active applications");
    expect(hero).toHaveTextContent("1 follow-up overdue");
    expect(
      within(hero).getByText("Follow up with the recruiter"),
    ).toBeInTheDocument();
    expect(within(hero).getByText("3 days overdue")).toBeInTheDocument();
    expect(
      within(hero).getByRole("link", { name: /Open in list/ }),
    ).toHaveAttribute(
      "href",
      `/career?highlight=${id(1)}#application-${id(1)}`,
    );

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      "Pipeline",
      "Needs attention, 1 application",
      "This week, 1 application",
      "No next step, 1 application",
      "Closed, 1 application",
    ]);

    const overdue = screen
      .getByRole("region", { name: /Needs attention/ })
      .querySelector("li")!;
    expect(within(overdue).getByText("Northstar Labs")).toBeInTheDocument();
    // On the name line below lg, and in its own column on wide screens.
    expect(within(overdue).getAllByText("₱120K–₱150K")).toHaveLength(2);
    expect(
      within(overdue).getByRole("combobox", {
        name: "Stage for Northstar Labs",
      }),
    ).toHaveValue("applied");
    expect(
      within(overdue).getByRole("link", {
        name: "Open job post for Northstar Labs",
      }),
    ).toHaveAttribute("href", "https://example.com/northstar");
    expect(
      within(overdue).getByRole("button", { name: "Edit Northstar Labs" }),
    ).toBeInTheDocument();

    const highlighted = document.getElementById(`application-${id(2)}`);
    expect(highlighted).toHaveClass("bg-primary/[0.07]");
    expect(screen.getByRole("link", { name: "List" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("edits a row from its pencil, named for the company", async () => {
    const user = userEvent.setup();
    render(
      <CareerWorkspace
        applications={applications}
        events={[]}
        view="list"
        nowIso={now}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit Cloudbank" }));
    expect(
      screen.getByRole("dialog", { name: "Edit Cloudbank" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Edit Cloudbank role title")).toHaveValue(
      "Frontend Engineer",
    );
  });

  it("shows the board with the same hero", () => {
    render(
      <CareerWorkspace
        applications={applications}
        events={[]}
        view="board"
        nowIso={now}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Pipeline" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Pipeline board" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Board" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("starts empty with one way to add, and nothing to switch", () => {
    render(
      <CareerWorkspace
        applications={[]}
        events={[]}
        view="list"
        nowIso={now}
      />,
    );

    expect(
      screen.getByText("Build your opportunity pipeline"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Add application" }),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("navigation", { name: "Career views" }),
    ).not.toBeInTheDocument();
  });
});
