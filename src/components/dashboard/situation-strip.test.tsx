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
    detail: "2 due today · 1 done",
    href: "/tasks?view=overdue",
    urgent: true,
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
    detail: "Learn Sales · 40%",
    href: "/goals",
  },
];

afterEach(cleanup);

describe("SituationStrip", () => {
  it("starts as one readable column and progressively enhances to a compact strip", () => {
    render(<SituationStrip items={items} />);

    const heading = screen.getByRole("heading", { name: "Situation" });
    const grid = heading.parentElement?.nextElementSibling;

    // Columns follow the strip's width in rem: a 320 px phone gets two,
    // while 200% text gets one column instead of two cramped ones. The
    // cells share one surface, split by hairlines.
    expect(grid).toHaveClass(
      "grid-cols-1",
      "@[17rem]:grid-cols-2",
      "@[56rem]:grid-cols-4",
      "gap-px",
      "bg-border",
    );
    expect(screen.getAllByRole("link")).toHaveLength(4);
    expect(
      screen.getByRole("link", { name: /Available cash/ }),
    ).toHaveAttribute("href", "/money/accounts");
    expect(screen.getByRole("link", { name: /Tasks/ })).toHaveClass(
      "min-w-0",
      "@[17rem]:min-h-24",
    );
    expect(screen.getByText("Available cash")).not.toHaveClass("truncate");
    expect(screen.getByText("₱13,218.00")).not.toHaveClass("truncate");
    expect(screen.getByText("Active accounts")).not.toHaveClass("truncate");
  });

  it("marks urgent areas in words as well as color, without decorative meters", () => {
    render(<SituationStrip items={items} />);

    const tasks = screen.getByRole("link", { name: /Tasks/ });
    expect(tasks).toHaveTextContent("7 overdue");
    expect(screen.getByText("7 overdue").parentElement).toHaveClass(
      "text-destructive",
    );
    expect(screen.getByText("4 active").parentElement).not.toHaveClass(
      "text-destructive",
    );
    // The detail carries the progress in words; there is no ring beside it.
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Goals/ })).toHaveTextContent(
      "Learn Sales · 40%",
    );
  });
});
