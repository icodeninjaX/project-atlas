import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineContext } from "@/components/offline/offline-provider";
import { BudgetWorkspace } from "./budget-workspace";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(cleanup);

const categories = [
  { id: "debt", name: "Debt Payment", icon: "landmark" },
  { id: "food", name: "Food", icon: "utensils" },
  { id: "health", name: "Health", icon: "heart-pulse" },
  { id: "rent", name: "Housing", icon: "house" },
  { id: "bills", name: "Utilities", icon: "bolt" },
];

const current = {
  planned: { food: 800_000, rent: 1_500_000, bills: 450_000, health: 200_000 },
  spent: { food: 685_000, rent: 1_500_000, bills: 488_000, debt: 250_000 },
  expectedIncomeCentavos: 6_500_000,
  hasPlan: true,
};

const previous = {
  planned: { food: 750_000, rent: 1_500_000 },
  spent: { food: 824_000, health: 90_000 },
  expectedIncomeCentavos: 6_200_000,
  hasPlan: true,
};

function withSubmit(submit = vi.fn()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <OfflineContext.Provider
        value={{
          userId: "user",
          online: true,
          pending: 0,
          blocked: 0,
          lastSyncedAt: null,
          submit,
          retry: async () => undefined,
          syncNow: async () => undefined,
          clearPrivateCache: async () => undefined,
        }}
      >
        {children}
      </OfflineContext.Provider>
    );
  };
}

function renderWorkspace(
  props: Partial<Parameters<typeof BudgetWorkspace>[0]> = {},
  submit = vi.fn(),
) {
  return render(
    <BudgetWorkspace
      month="2026-10"
      today="2026-10-18"
      categories={categories}
      current={current}
      previous={previous}
      notes="Keep groceries weekly"
      {...props}
    />,
    { wrapper: withSubmit(submit) },
  );
}

describe("BudgetWorkspace", () => {
  it("leads with what is left, the pace, and names what is over", () => {
    renderWorkspace();

    const hero = screen.getByRole("region", { name: "October 2026" });
    expect(within(hero).getByText("Left to spend")).toBeVisible();
    // ₱29,500 planned, ₱29,230 spent across planned and unplanned.
    expect(hero).toHaveTextContent(
      "₱29,230.00 spent of ₱29,500.00 · 14 days left",
    );
    expect(
      within(hero).getByRole("meter", { name: "Plan spent" }),
    ).toHaveAttribute(
      "aria-valuetext",
      "99% of the plan spent, 58% of the month gone",
    );
    expect(hero).toHaveTextContent("That leaves about ₱19.28 a day");
    expect(within(hero).getByText("Over in Utilities.")).toBeVisible();
    expect(
      within(hero).getByRole("link", {
        name: "Previous month, September 2026",
      }),
    ).toHaveAttribute("href", "/money/budget?month=2026-09");
  });

  it("shows each envelope, over first, and spending outside the plan", () => {
    renderWorkspace();

    const envelopes = within(
      screen.getByRole("region", { name: "By category" }),
    ).getAllByRole("listitem");
    expect(envelopes.map((row) => row.textContent)).toEqual([
      expect.stringMatching(
        /^Utilities₱380\.00 over₱4,880\.00 of ₱4,500\.00108%/,
      ),
      expect.stringMatching(/^Housing.*All used/),
      expect.stringMatching(/^Food₱1,150\.00 left/),
      expect.stringMatching(/^Health₱2,000\.00 left₱0\.00 of ₱2,000\.000%/),
    ]);

    const outside = screen.getByRole("region", { name: "Outside the plan" });
    expect(outside).toHaveTextContent("Debt Payment₱2,500.00");
    expect(
      within(outside).getByRole("button", { name: "Plan Debt Payment" }),
    ).toBeVisible();
  });

  it("opens a category's amount straight from its envelope", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "Edit Food plan" }));

    const sheet = screen.getByRole("dialog", { name: "Edit plan" });
    expect(within(sheet).getByLabelText("Food")).toHaveFocus();
    expect(within(sheet).getByLabelText("Food")).toHaveValue("8,000.00");
    expect(within(sheet).getByLabelText("Food")).toHaveAccessibleDescription(
      "₱6,850.00 so far · ₱8,240.00 in September",
    );
  });

  it("totals the plan live and saves it in the budget form's shape", async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => ({
      success: true,
      message: "Monthly budget saved.",
    }));
    renderWorkspace({}, submit);

    await user.click(screen.getByRole("button", { name: "Edit plan" }));
    const sheet = screen.getByRole("dialog", { name: "Edit plan" });
    expect(sheet).toHaveTextContent("Planned ₱29,500.00 of ₱65,000.00");
    expect(sheet).toHaveTextContent("₱35,500.00 not yet planned");

    await user.clear(within(sheet).getByLabelText("Health"));
    await user.type(within(sheet).getByLabelText("Debt Payment"), "2500");
    expect(sheet).toHaveTextContent("Planned ₱30,000.00 of ₱65,000.00");

    await user.click(within(sheet).getByRole("button", { name: "Save plan" }));

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    const [mutation, formData] = submit.mock.calls[0] as unknown as [
      string,
      FormData,
    ];
    expect(mutation).toBe("budget.save");
    expect(Object.fromEntries(formData)).toEqual({
      monthStart: "2026-10-01",
      notes: "Keep groceries weekly",
      expectedIncome: "65,000.00",
      "item:debt": "2,500.00",
      "item:food": "8,000.00",
      "item:health": "",
      "item:rent": "15,000.00",
      "item:bills": "4,500.00",
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("names a plan that goes past expected income", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "Edit plan" }));
    const sheet = screen.getByRole("dialog", { name: "Edit plan" });
    await user.clear(within(sheet).getByLabelText("Expected income"));
    await user.type(within(sheet).getByLabelText("Expected income"), "20000");

    expect(sheet).toHaveTextContent("₱9,500.00 over income");
  });

  it("starts an empty month from last month's plan or spending", async () => {
    const user = userEvent.setup();
    renderWorkspace({
      current: {
        planned: {},
        spent: { food: 120_000 },
        expectedIncomeCentavos: 0,
        hasPlan: false,
      },
    });

    const hero = screen.getByRole("region", { name: "October 2026" });
    expect(within(hero).getByText("No plan for October yet")).toBeVisible();
    expect(
      within(hero).queryByRole("link", { name: "Timeline" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Spent this month" }),
    ).toBeVisible();

    await user.click(
      within(hero).getByRole("button", { name: "Start from September" }),
    );
    const sheet = screen.getByRole("dialog", { name: "Plan October" });
    expect(within(sheet).getByLabelText("Food")).toHaveValue("7,500.00");
    expect(within(sheet).getByLabelText("Expected income")).toHaveValue(
      "62,000.00",
    );
    expect(within(sheet).getByRole("status")).toHaveTextContent(
      "Filled from September's plan. Review, then save.",
    );

    await user.click(
      within(sheet).getByRole("button", { name: "Use September's spending" }),
    );
    expect(within(sheet).getByLabelText("Food")).toHaveValue("8,300.00");
    expect(within(sheet).getByLabelText("Health")).toHaveValue("900.00");
    expect(within(sheet).getByLabelText("Housing")).toHaveValue("");
  });

  it("reads a finished month in the past tense with a way back", () => {
    renderWorkspace({ today: "2026-11-03" });

    const hero = screen.getByRole("region", { name: "October 2026" });
    expect(hero).toHaveTextContent("Left unspent");
    expect(hero).toHaveTextContent("month closed");
    expect(hero).not.toHaveTextContent("a day for the rest");
    expect(
      within(hero).getByRole("link", { name: "This month" }),
    ).toHaveAttribute("href", "/money/budget");
  });
});
