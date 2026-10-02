import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getWisdomQuote } from "@/lib/gratitude/gratitude-reflections";
import { TodayDashboard, type DashboardData } from "./today-dashboard";

vi.mock("@/lib/next-best-action/actions", () => ({
  chooseCareerFollowupAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(cleanup);

const dashboard: DashboardData = {
  financial: {
    total_balance_centavos: 4_826_350,
    income_month_centavos: 5_050_000,
    expense_month_centavos: 3_142_575,
    remaining_budget_centavos: 852_425,
    debt_remaining_centavos: 14_491_900,
    next_financial_deadline: "2026-10-16",
    days_until_payday: 14,
  },
  tasks: { today: 5, overdue: 2, completed_today: 3, remaining_minutes: 140 },
  career: {
    active: 6,
    follow_up: 1,
    interviews: 2,
    offers: 0,
    submitted_month: 4,
  },
  goals: [
    {
      id: "g1",
      title: "Pay off the card",
      progress_percent: 62.4,
      area: "finance",
    },
  ],
  review_complete: false,
  priorities: [],
};

function renderToday(overrides: Partial<DashboardData> = {}) {
  return render(
    <TodayDashboard
      now={new Date("2026-10-01T15:30:00+08:00")}
      dashboard={{ ...dashboard, ...overrides }}
      dayline={{
        items: [
          {
            id: "t1",
            kind: "task",
            position: "NOW",
            title: "Finish the design pass",
            reason: "Due today · High priority",
            durationMinutes: 45,
            href: "/tasks?highlight=t1",
          },
        ],
        plannedMinutes: 45,
        capacityMinutes: 180,
        energyLevel: "medium",
      }}
      nextBestActions={[]}
      signals={[]}
      wisdomQuote={getWisdomQuote(0)}
    />,
  );
}

describe("TodayDashboard", () => {
  it("greets by the Manila time of day above the page title", () => {
    renderToday();

    expect(screen.getByText("Good afternoon")).toBeInTheDocument();
    expect(screen.getByText("Thursday, October 1")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Your Day, Mapped." }),
    ).toBeInTheDocument();
  });

  it("keeps the sections in reading order", () => {
    const { container } = renderToday();

    expect(
      Array.from(
        container.querySelectorAll("section[aria-labelledby]"),
        (section) => section.getAttribute("aria-labelledby"),
      ),
    ).toEqual([
      "dayline-title",
      "situation-title",
      "financial-snapshot",
      "dashboard-signals",
      "week-position",
    ]);
  });

  it("summarizes each area in the situation tiles", () => {
    renderToday();

    expect(
      screen.getByRole("link", { name: /Available cash/ }),
    ).toHaveTextContent("Payday in 14 days");
    expect(screen.getByRole("link", { name: /^Tasks/ })).toHaveTextContent(
      "2 overdue5 due today · 2h 20m",
    );
    expect(screen.getByRole("link", { name: /^Career/ })).toHaveTextContent(
      "1 overdue follow-up6 active · 2 interviewing",
    );
    expect(screen.getByRole("link", { name: /^Goals/ })).toHaveTextContent(
      "1 activePay off the card · 62%",
    );
  });

  it("falls back to plain details when there is no payday or goal", () => {
    renderToday({
      financial: { ...dashboard.financial, days_until_payday: null },
      tasks: { ...dashboard.tasks, remaining_minutes: 0 },
      career: { ...dashboard.career, follow_up: 0, interviews: 0 },
      goals: [],
    });

    expect(
      screen.getByRole("link", { name: /Available cash/ }),
    ).toHaveTextContent("Active accounts");
    expect(screen.getByRole("link", { name: /^Tasks/ })).toHaveTextContent(
      /5 due today$/,
    );
    expect(screen.getByRole("link", { name: /^Career/ })).toHaveTextContent(
      "0 overdue follow-ups6 active applications",
    );
    expect(screen.getByRole("link", { name: /^Goals/ })).toHaveTextContent(
      "Define an outcome",
    );
  });
});
