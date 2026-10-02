import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineContext } from "@/components/offline/offline-provider";
import type {
  OfflineActionState,
  OfflineMutationType,
} from "@/lib/offline/types";
import { calculateRunway, type RunwaySource } from "@/lib/runway/engine";
import { RunwayWorkspace } from "./runway-workspace";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(cleanup);

/** The sheet's live estimate; the month stepper is a status of its own. */
function preview(sheet: ReturnType<typeof within>) {
  return sheet
    .getAllByRole("status")
    .find((element: HTMLElement) => element.tagName === "DIV")!;
}

const now = new Date("2026-09-15T12:00:00+08:00");

const expense = (monthStart: string, categoryId: string, amount: number) => ({
  monthStart,
  categoryId,
  transactionType: "expense" as const,
  amountCentavos: amount,
});

const baseSource: RunwaySource = {
  accounts: [
    {
      id: "cash",
      name: "Cash",
      accountType: "cash",
      currentBalanceCentavos: 900_000,
      includeInRunway: true,
      isArchived: false,
    },
    {
      id: "savings",
      name: "BPI Savings",
      accountType: "savings",
      currentBalanceCentavos: 300_000,
      includeInRunway: false,
      isArchived: false,
    },
  ],
  categories: [
    { id: "food", name: "Food", isEssential: true, isSystem: true },
    { id: "rent", name: "Rent", isEssential: false, isSystem: false },
    { id: "debt", name: "Debt Payment", isEssential: true, isSystem: true },
  ],
  monthlyTotals: [
    expense("2026-06-01", "food", 100_000),
    expense("2026-07-01", "food", 200_000),
    expense("2026-08-01", "food", 300_000),
    expense("2026-06-01", "rent", 50_000),
    expense("2026-07-01", "rent", 50_000),
    expense("2026-08-01", "rent", 50_000),
  ],
  budget: null,
  debts: [
    {
      id: "card",
      creditorName: "Card",
      currentBalanceCentavos: 100_000,
      interestRatePercent: 12,
      minimumPaymentCentavos: 10_000,
      status: "active",
    },
  ],
  profileMonthlyNetIncomeCentavos: 0,
  targetMonths: 3,
};

type Submit = (
  mutation: OfflineMutationType,
  formData: FormData,
) => Promise<OfflineActionState>;

function renderWorkspace(
  source = baseSource,
  submit = vi.fn<Submit>(async () => ({ success: true, message: "Saved." })),
) {
  function Wrapper({ children }: { children: ReactNode }) {
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
  }
  return render(
    <RunwayWorkspace
      source={source}
      analysis={calculateRunway(source, now)}
      budgets={[]}
      now={now.toISOString()}
      today="2026-09-15"
    />,
    { wrapper: Wrapper },
  );
}

describe("RunwayWorkspace", () => {
  it("leads with the runway in months, a date, and the target in words", () => {
    renderWorkspace();

    const hero = within(
      screen.getByRole("region", { name: "Estimated runway" }),
    );
    // ₱9,000 over ₱2,000 of food and ₱100 of debt minimums a month.
    expect(hero.getByText("4.3 months")).toBeInTheDocument();
    expect(hero.getByText("3-month target met")).toBeInTheDocument();
    expect(hero.getByText("late January 2027")).toBeInTheDocument();
    expect(
      hero.getByText(/Your 3-month reserve is covered, with/),
    ).toHaveTextContent("1.3 months to spare");
  });

  it("splits the need and the funds, and says what uncounted money would add", () => {
    renderWorkspace();

    const need = within(screen.getByRole("region", { name: "Monthly need" }));
    expect(need.getByText("Average of Jun, Jul, and Aug 2026")).toBeVisible();
    expect(need.getByText("Food")).toBeVisible();
    expect(need.getByText("95%")).toBeVisible();
    expect(need.getByText("Card")).toBeVisible();

    const funds = within(screen.getByRole("region", { name: "Runway funds" }));
    expect(funds.getByText("Not counted")).toBeVisible();
    expect(funds.getByText("BPI Savings")).toBeVisible();
    expect(funds.getByText(/Counting it would add about/)).toHaveTextContent(
      "1.4 months of runway",
    );
  });

  it("previews new assumptions and saves them with the same form fields", async () => {
    const user = userEvent.setup();
    const submit = vi.fn<Submit>(async () => ({
      success: true,
      message: "Saved.",
    }));
    renderWorkspace(baseSource, submit);

    await user.click(screen.getByRole("button", { name: "Edit assumptions" }));
    const sheet = within(screen.getByRole("dialog", { name: "Assumptions" }));
    expect(preview(sheet)).toHaveTextContent("Runway4.3 months");

    await user.click(sheet.getByRole("checkbox", { name: /BPI Savings/ }));
    await user.click(sheet.getByRole("checkbox", { name: /Rent/ }));
    // ₱12,000 over ₱2,600 a month.
    expect(preview(sheet)).toHaveTextContent("Runway4.3becomes4.6 months");
    expect(
      sheet.queryByRole("checkbox", { name: /Debt Payment/ }),
    ).not.toBeInTheDocument();

    await user.click(sheet.getByRole("button", { name: "One month more" }));
    await user.click(sheet.getByRole("button", { name: "Save assumptions" }));

    expect(submit).toHaveBeenCalledWith(
      "runway.savePreferences",
      expect.any(FormData),
    );
    const formData = submit.mock.calls[0]![1];
    expect(formData.getAll("accountId")).toEqual(["cash", "savings"]);
    expect(formData.getAll("categoryId")).toEqual(["food", "rent"]);
    expect(formData.get("targetMonths")).toBe("4");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("names what is missing and opens the assumptions to fix it", async () => {
    const user = userEvent.setup();
    renderWorkspace({
      ...baseSource,
      categories: baseSource.categories.map((category) => ({
        ...category,
        isEssential: false,
      })),
    });

    expect(screen.getByText("Choose essential expenses")).toBeVisible();
    expect(screen.getByText("Needs setup")).toBeVisible();
    expect(
      screen.queryByRole("region", { name: "Try a scenario" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Choose essentials" }));
    const sheet = within(screen.getByRole("dialog", { name: "Assumptions" }));
    expect(preview(sheet)).toHaveTextContent(
      "Choose at least one essential expense.",
    );
    await user.click(sheet.getByRole("checkbox", { name: /Food/ }));
    expect(preview(sheet)).toHaveTextContent("Runway4.3 months");
  });
});
