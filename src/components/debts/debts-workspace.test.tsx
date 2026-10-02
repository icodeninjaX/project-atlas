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

function openDebtNames() {
  const list = screen.getByRole("region", { name: "Open debts" });
  return within(list)
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
}

describe("DebtsWorkspace", () => {
  it("leads with what is owed, what is repaid, and the next payment", () => {
    renderWorkspace({
      payments: [
        {
          debtId: DEBTS[0]!.id,
          amountCentavos: 30_000,
          paymentDate: "2026-10-01",
        },
      ],
    });

    const region = screen.getByRole("region", { name: "Total remaining" });
    const hero = within(region);
    // The figure splits its centavos off, so read the region's text.
    expect(region).toHaveTextContent(/^Total remaining.*₱4,500\.00Across/);
    // ₱8,000 borrowed in all, ₱3,500 of it repaid, the paid debt included.
    expect(hero.getByText(/Across 2 open debts/)).toHaveTextContent(
      "You have repaid ₱3,500.00 of the ₱8,000.00 borrowed.",
    );
    expect(hero.getByText("1 payment overdue")).toBeInTheDocument();
    expect(hero.getByText("Big Card")).toBeInTheDocument();
    expect(hero.getByText("Overdue by 2 days")).toBeInTheDocument();
    expect(hero.getByText("1 payment recorded")).toBeInTheDocument();
  });

  it("orders the debts by the chosen strategy and keeps it in the address", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    expect(openDebtNames()).toEqual(["Big Card", "Small Loan"]);

    await user.click(screen.getByRole("radio", { name: "Snowball" }));

    expect(openDebtNames()).toEqual(["Small Loan", "Big Card"]);
    expect(window.location.search).toContain("strategy=snowball");
    expect(screen.getByText(/In snowball order/)).toBeInTheDocument();
  });

  it("compares an extra monthly amount against the plan without it", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    const result = within(screen.getByRole("group", { name: "Plan result" }));

    expect(result.getByRole("status")).toHaveTextContent(
      "Add an extra amount to compare",
    );

    await user.click(screen.getByRole("button", { name: "+₱1,000" }));

    expect(result.getByRole("status")).toHaveTextContent(/sooner/);
    expect(result.getByText("Each month").nextSibling).toHaveTextContent(
      "₱400.00becomes₱1,400.00",
    );
  });

  it("lists paid-off debts apart from the plan", () => {
    renderWorkspace();

    const paid = within(screen.getByRole("region", { name: "Paid off" }));
    expect(paid.getByRole("link", { name: "Cleared Wallet" })).toHaveAttribute(
      "href",
      `/debts/${DEBTS[2]!.id}`,
    );
    expect(openDebtNames()).not.toContain("Cleared Wallet");
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
    await user.type(sheet.getByLabelText("Original balance in pesos"), "12000");
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
    expect(formData.get("originalBalance")).toBe("12,000.00");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("edits a debt from its card", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "Edit Small Loan" }));

    const sheet = within(
      screen.getByRole("dialog", { name: "Edit Small Loan" }),
    );
    expect(sheet.getByLabelText("Current balance in pesos")).toHaveValue(
      "500.00",
    );
    expect(sheet.getByRole("radio", { name: "Personal loan" })).toBeChecked();
  });

  it("marks the debt a suggestion pointed to", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderWorkspace({ highlightId: DEBTS[1]!.id });

    const card = screen.getByRole("link", { name: "Small Loan" }).closest("li");
    expect(card).toHaveClass("ring-2");
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
