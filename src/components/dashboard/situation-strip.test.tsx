import {
  BriefcaseBusiness,
  CheckCircle2,
  Goal,
  WalletCards,
} from "lucide-react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SituationStrip, type SituationItem } from "./situation-strip";

const items: SituationItem[] = [
  {
    label: "Available cash",
    value: "₱13,218.00",
    detail: "Active accounts",
    href: "/money/accounts",
    icon: WalletCards,
  },
  {
    label: "Tasks",
    value: "7 overdue",
    detail: "2 due today",
    href: "/tasks?view=overdue",
    icon: CheckCircle2,
  },
  {
    label: "Career",
    value: "2 follow-ups",
    detail: "4 active applications",
    href: "/career",
    icon: BriefcaseBusiness,
  },
  {
    label: "Goals",
    value: "4 active",
    detail: "Learn Sales",
    href: "/goals",
    icon: Goal,
  },
];

afterEach(cleanup);

describe("SituationStrip", () => {
  it("uses one compact two-column surface while keeping every cell navigable", () => {
    render(<SituationStrip items={items} />);

    const heading = screen.getByRole("heading", { name: "Situation" });
    const grid = heading.parentElement?.nextElementSibling;

    expect(grid).toHaveClass("grid-cols-2", "xl:grid-cols-4");
    expect(screen.getAllByRole("link")).toHaveLength(4);
    expect(
      screen.getByRole("link", { name: /Available cash/ }),
    ).toHaveAttribute("href", "/money/accounts");
    expect(screen.getByRole("link", { name: /Tasks/ })).toHaveClass(
      "min-h-[84px]",
    );
  });
});
