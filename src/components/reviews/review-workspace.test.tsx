import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReviewWorkspace, type ReviewArchiveItem } from "./review-workspace";

vi.mock("./review-trend", () => ({
  ReviewTrend: () => <div>Review trend chart</div>,
}));

afterEach(cleanup);

const reviews: ReviewArchiveItem[] = [
  {
    id: "70000000-0000-4000-8000-000000000001",
    weekStart: "2026-08-10",
    wins: "Finished the portfolio case study.",
    challenges: "Context switching after lunch.",
    lessons: "Protect the first two hours.",
    timeWasters: "Unplanned scrolling.",
    moneyReflection: "Tracked every expense.",
    careerReflection: "Sent three applications.",
    nextWeekFocus: "Protect deep-work mornings",
    energyScore: 8,
    stressScore: 5,
    overallScore: 8,
    completedAt: "2026-08-16T12:00:00Z",
  },
  {
    id: "70000000-0000-4000-8000-000000000002",
    weekStart: "2026-08-03",
    wins: "Kept three small commitments.",
    challenges: "Energy dipped midweek.",
    lessons: "Small promises are easier to keep.",
    timeWasters: null,
    moneyReflection: null,
    careerReflection: "Practiced interview answers.",
    nextWeekFocus: "Keep the momentum simple",
    energyScore: 6,
    stressScore: 6,
    overallScore: 7,
    completedAt: "2026-08-09T12:00:00Z",
  },
];

describe("ReviewWorkspace", () => {
  it("keeps this week's form primary and opens the reflection archive", async () => {
    const user = userEvent.setup();
    render(
      <ReviewWorkspace
        reviews={reviews}
        currentContent={<p>Current review form</p>}
      />,
    );

    const currentTab = screen.getByRole("tab", { name: "This week" });
    const archiveTab = screen.getByRole("tab", { name: /Past reviews/ });

    expect(currentTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Current review form")).toBeVisible();
    expect(document.getElementById("reviews-archive-panel")).not.toBeVisible();

    await user.click(archiveTab);

    expect(archiveTab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("tabpanel", { name: /Past reviews/ }),
    ).toBeVisible();
    expect(
      screen.getByText(/made space to reflect across 2 weeks/i),
    ).toBeVisible();
  });

  it("opens a selected week and exposes every saved reflection", async () => {
    const user = userEvent.setup();
    render(
      <ReviewWorkspace
        reviews={reviews}
        currentContent={<p>Current review form</p>}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /Past reviews/ }));
    await user.click(
      screen.getByRole("button", { name: /Keep the momentum simple/ }),
    );

    const selectedReview = screen.getByRole("article", {
      name: "Review for August 3–9, 2026",
    });

    expect(
      within(selectedReview).getByText("Energy dipped midweek."),
    ).toBeVisible();
    expect(
      within(selectedReview).getByText("Practiced interview answers."),
    ).toBeVisible();
    expect(
      within(selectedReview).getAllByText("Keep the momentum simple"),
    ).not.toHaveLength(0);
    expect(
      screen.getByRole("button", { name: /Keep the momentum simple/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("supports arrow-key tab navigation", () => {
    render(
      <ReviewWorkspace
        reviews={reviews}
        currentContent={<p>Current review form</p>}
      />,
    );

    const currentTab = screen.getByRole("tab", { name: "This week" });
    const archiveTab = screen.getByRole("tab", { name: /Past reviews/ });

    currentTab.focus();
    fireEvent.keyDown(currentTab, { key: "ArrowRight" });

    expect(archiveTab).toHaveFocus();
    expect(archiveTab).toHaveAttribute("aria-selected", "true");
  });

  it("shows a meaningful archive empty state", async () => {
    const user = userEvent.setup();
    render(
      <ReviewWorkspace
        reviews={[]}
        currentContent={<p>Current review form</p>}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /Past reviews/ }));

    expect(
      screen.getByText("Your reflection archive starts here"),
    ).toBeVisible();
  });
});
