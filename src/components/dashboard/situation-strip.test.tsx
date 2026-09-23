import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SituationStrip, type SituationItem } from "./situation-strip";

const items: SituationItem[] = [
  {
    label: "Available cash",
    value: "₱13,218.00",
    detail: "Active accounts",
    href: "/money/accounts",
  },
  {
    label: "Tasks",
    value: "7 overdue",
    detail: "2 due today",
    href: "/tasks?view=overdue",
  },
  {
    label: "Career",
    value: "2 follow-ups",
    detail: "4 active applications",
    href: "/career",
  },
  {
    label: "Goals",
    value: "4 active",
    detail: "Learn Sales",
    href: "/goals",
  },
];

afterEach(cleanup);

describe("SituationStrip", () => {
  it("starts as one readable column and progressively enhances to a compact grid", () => {
    render(<SituationStrip items={items} />);

    const heading = screen.getByRole("heading", { name: "Situation" });
    const grid = heading.parentElement?.nextElementSibling;

    expect(grid).toHaveClass(
      "grid-cols-1",
      "min-[360px]:grid-cols-2",
      "xl:grid-cols-4",
    );
    expect(screen.getAllByRole("link")).toHaveLength(4);
    expect(
      screen.getByRole("link", { name: /Available cash/ }),
    ).toHaveAttribute("href", "/money/accounts");
    expect(screen.getByRole("link", { name: /Tasks/ })).toHaveClass(
      "min-w-0",
      "min-[360px]:min-h-24",
    );
    expect(screen.getByText("Available cash")).not.toHaveClass("truncate");
    expect(screen.getByText("₱13,218.00")).not.toHaveClass("truncate");
    expect(screen.getByText("Active accounts")).not.toHaveClass("truncate");
    expect(heading.closest("section")?.querySelector("svg")).toBeNull();
  });
});
