import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineContext } from "@/components/offline/offline-provider";
import type { DebtRecord } from "@/lib/debts/debt";
import type {
  OfflineActionState,
  OfflineMutationType,
} from "@/lib/offline/types";
import { DebtsWorkspace, type DebtPaymentLite } from "./debts-workspace";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(cleanup);

const debt = (
  overrides: Partial<DebtRecord> & Pick<DebtRecord, "id" | "creditor_name">,
): DebtRecord => ({
  debt_type: "credit_card",
  original_balance_centavos: 100_000,
  current_balance_centavos: 100_000,
  interest_rate_percent: 0,
  minimum_payment_centavos: 10_000,
  due_day: null,
  next_due_date: null,
  status: "active",
  priority: 1,
  notes: null,
  ...overrides,
});

const DEBTS: DebtRecord[] = [
  debt({
    id: "11111111-1111-4111-8111-111111111111",
    creditor_name: "Big Card",
    original_balance_centavos: 600_000,
    current_balance_centavos: 400_000,
    interest_rate_percent: 36,
    minimum_payment_centavos: 30_000,
    next_due_date: "2026-09-30",
    priority: 2,
  }),
  debt({
    id: "22222222-2222-4222-8222-222222222222",
    creditor_name: "Small Loan",
    debt_type: "personal_loan",
    current_balance_centavos: 50_000,
    interest_rate_percent: 12,
    next_due_date: "2026-10-05",
    priority: 1,
  }),
  debt({
    id: "33333333-3333-4333-8333-333333333333",
    creditor_name: "Cleared Wallet",
    debt_type: "online_lending",
    current_balance_centavos: 0,
    status: "paid",
    priority: 3,
  }),
];

type Submit = (
  mutation: OfflineMutationType,
  formData: FormData,
) => Promise<OfflineActionState>;

function renderWorkspace({
  debts = DEBTS,
  payments = [],
  highlightId = null,
  submit = vi.fn<Submit>(async () => ({ success: true, message: "Saved." })),
}: {
  debts?: DebtRecord[];
  payments?: DebtPaymentLite[];
  highlightId?: string | null;
  submit?: Submit;
} = {}) {
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
    <DebtsWorkspace
      debts={debts}
      payments={payments}
      today="2026-10-02"
      initialStrategy="avalanche"
      savedStrategy="avalanche"
      highlightId={highlightId}
    />,
    { wrapper: Wrapper },
  );
}

function planOrder() {
  const plan = within(screen.getByRole("region", { name: "Payoff plan" }));
  return within(plan.getByRole("list", { name: "Order to pay them off" }))
    .getAllByRole("listitem")
    .map((item) => item.querySelector(".font-semibold:not(.sr-only)"))
    .map((name) => name?.textContent?.replace(/^\d+\. /, ""));
}

describe("DebtsWorkspace", () => {
  it("leads with what is owed, how much is paid, and when it ends", () => {
    renderWorkspace({
      payments: [
        {
          debtId: DEBTS[0]!.id,
          amountCentavos: 30_000,
          paymentDate: "2026-10-01",
        },
      ],
    });

    const region = screen.getByRole("region", { name: "You owe" });
    const hero = within(region);
    expect(region).toHaveTextContent(/₱4,500\.00/);
    // ₱8,000 owed in all, ₱3,500 of it repaid, the paid debt included.
    expect(hero.getByText(/paid off/).parentElement).toHaveTextContent(
      "44% paid off · ₱3,500.00 of ₱8,000.00",
    );
    expect(hero.getByText("1 payment overdue")).toBeInTheDocument();
    expect(hero.getByText("Paid in October").nextSibling).toHaveTextContent(
      "₱300.00",
    );
  });

  it("lists each open debt as a row that opens its page, soonest due first", () => {
    renderWorkspace();

    const list = within(screen.getByRole("region", { name: "Your debts" }));
    const links = list.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", `/debts/${DEBTS[0]!.id}`);
    expect(links[0]).toHaveTextContent("Big Card");
    expect(links[0]).toHaveTextContent("Overdue by 2 days");
    expect(links[1]).toHaveTextContent("Small Loan");
  });

  it("lists what to pay next, overdue first, each one tap from paying", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    const next = within(screen.getByRole("region", { name: "Pay next" }));
    const rows = next.getAllByRole("listitem");
    expect(rows.map((row) => row.querySelector("p")?.textContent)).toEqual([
      "Big Card",
      "Small Loan",
    ]);
    expect(within(rows[0]!).getByText("Overdue by 2 days")).toBeInTheDocument();

    await user.click(next.getByRole("button", { name: "Pay Small Loan" }));
    const sheet = within(
      screen.getByRole("dialog", { name: "Pay Small Loan" }),
    );
    expect(
      sheet.getByRole("checkbox", { name: /This pays the bill due Oct 5/ }),
    ).toBeChecked();
  });

  it("points out active debts with no due date and opens their editor", async () => {
    const user = userEvent.setup();
    renderWorkspace({
      debts: [
        debt({
          id: "44444444-4444-4444-8444-444444444444",
          creditor_name: "Tita Lorna",
          debt_type: "family",
        }),
      ],
    });

    const next = within(screen.getByRole("region", { name: "Pay next" }));
    expect(next.getByText("Nothing due in the next 30 days.")).toBeVisible();
    await user.click(
      next.getByRole("button", { name: "Tita Lorna, set its due date" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Edit Tita Lorna" }),
    ).toBeInTheDocument();
  });

  it("orders the plan by the chosen strategy and keeps it in the address", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    expect(planOrder()).toEqual(["Big Card", "Small Loan"]);

    await user.click(screen.getByRole("radio", { name: "Snowball" }));

    expect(planOrder()).toEqual(["Small Loan", "Big Card"]);
    expect(window.location.search).toContain("strategy=snowball");
  });

  it("shows what an extra monthly amount changes", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    const plan = within(screen.getByRole("region", { name: "Payoff plan" }));

    expect(plan.getByRole("status")).toHaveTextContent(
      "Try an amount to see how much sooner you finish.",
    );

    await user.click(plan.getByRole("button", { name: "+₱1,000" }));

    expect(plan.getByRole("status")).toHaveTextContent(/sooner/);
    expect(plan.getByText(/Paying/)).toHaveTextContent(
      "Paying ₱1,400.00 a month",
    );
  });

  it("sets my own order with the arrows and saves it", async () => {
    const user = userEvent.setup();
    const submit = vi.fn<Submit>(async () => ({
      success: true,
      message: "Priority order saved.",
    }));
    renderWorkspace({ submit });

    expect(
      screen.queryByRole("button", { name: /Move .* up/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "My priority" }));
    expect(planOrder()).toEqual(["Small Loan", "Big Card"]);
    expect(
      screen.getByRole("button", { name: "Move Small Loan up" }),
    ).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Move Big Card up" }));

    expect(planOrder()).toEqual(["Big Card", "Small Loan"]);
    expect(submit).toHaveBeenCalledWith("debt.reorder", expect.any(FormData));
    expect(submit.mock.calls[0]![1].get("order")).toBe(
      `${DEBTS[0]!.id},${DEBTS[1]!.id}`,
    );
  });

  it("folds paid-off debts away from the open ones", () => {
    renderWorkspace();

    const paid = within(screen.getByRole("region", { name: "Paid off" }));
    expect(paid.getByRole("link", { name: /Cleared Wallet/ })).toHaveAttribute(
      "href",
      `/debts/${DEBTS[2]!.id}`,
    );
    expect(
      within(screen.getByRole("region", { name: "Your debts" })).queryByText(
        "Cleared Wallet",
      ),
    ).not.toBeInTheDocument();
  });

  it("adds a debt in a sheet and closes it once saved", async () => {
    const user = userEvent.setup();
    const submit = vi.fn<Submit>(async () => ({
      success: true,
      message: "Debt added.",
    }));
    renderWorkspace({ submit });

    await user.click(screen.getByRole("button", { name: "Add debt" }));
    const sheet = within(screen.getByRole("dialog", { name: "New debt" }));
    expect(sheet.getByLabelText("Creditor name")).toHaveFocus();

    await user.type(sheet.getByLabelText("Creditor name"), "Atome");
    await user.click(sheet.getByRole("radio", { name: "Installment" }));
    await user.type(sheet.getByLabelText("Amount owed in pesos"), "12000");
    await user.type(sheet.getByLabelText("Minimum payment in pesos"), "1000");
    expect(sheet.getByText(/At the minimum, paid off in/)).toHaveTextContent(
      "1 year (Oct 2027), with no interest.",
    );
    await user.click(sheet.getByRole("button", { name: "Add debt" }));

    expect(submit).toHaveBeenCalledWith("debt.create", expect.any(FormData));
    const formData = submit.mock.calls[0]![1];
    expect(formData.get("creditorName")).toBe("Atome");
    expect(formData.get("debtType")).toBe("installment");
    // Formatted on blur; the server reads the separators.
    expect(formData.get("balance")).toBe("12,000.00");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("marks the debt a suggestion pointed to", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderWorkspace({ highlightId: DEBTS[1]!.id });

    const link = within(
      screen.getByRole("region", { name: "Your debts" }),
    ).getByRole("link", { name: /Small Loan/ });
    expect(link).toHaveClass("bg-primary/[0.08]");
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("invites a first debt when nothing is tracked", () => {
    renderWorkspace({ debts: [] });

    expect(screen.getByText("Map what you owe")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add debt" })).toBeVisible();
    expect(
      screen.queryByRole("region", { name: "Payoff plan" }),
    ).not.toBeInTheDocument();
  });
});
