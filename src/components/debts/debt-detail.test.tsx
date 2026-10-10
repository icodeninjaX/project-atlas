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
import { DebtDetail } from "./debt-detail";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

afterEach(cleanup);

type Submit = (
  mutation: OfflineMutationType,
  formData: FormData,
) => Promise<OfflineActionState>;

const DEBT: DebtRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  creditor_name: "Big Card",
  debt_type: "credit_card",
  original_balance_centavos: 600_000,
  current_balance_centavos: 400_000,
  interest_rate_percent: 36,
  minimum_payment_centavos: 30_000,
  due_day: 30,
  next_due_date: "2026-09-30",
  status: "active",
  priority: 1,
  notes: null,
};

function renderDetail({
  debt = DEBT,
  submit = vi.fn<Submit>(async () => ({ success: true, message: "Saved." })),
}: { debt?: DebtRecord; submit?: ReturnType<typeof vi.fn<Submit>> } = {}) {
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
  render(
    <DebtDetail
      debt={debt}
      today="2026-10-02"
      highlightPaymentId={null}
      payments={[
        {
          id: "22222222-2222-4222-8222-222222222222",
          amount_centavos: 200_000,
          payment_date: "2026-09-01",
          notes: null,
          account_name: "GCash",
          logged: true,
        },
      ]}
    />,
    { wrapper: Wrapper },
  );
  return submit;
}

describe("DebtDetail", () => {
  it("shows what is left, what is due, and one way to pay", () => {
    renderDetail();

    const hero = within(screen.getByRole("region", { name: "Big Card" }));
    expect(hero.getByText(/paid off/)).toHaveTextContent("33% paid off");
    expect(screen.getByRole("region", { name: "Big Card" })).toHaveTextContent(
      "₱2,000.00 of ₱6,000.00",
    );
    expect(hero.getByText("Next due").nextSibling).toHaveTextContent("Sep 30");
    expect(hero.getByText("Overdue by 2 days")).toBeInTheDocument();
    expect(hero.getByText("Interest").nextSibling).toHaveTextContent("3% / mo");
    expect(
      screen.getByText("Sep 1 · from GCash", { exact: false }),
    ).toBeInTheDocument();
  });

  it("records a payment in a sheet", async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(screen.getByRole("button", { name: "Record payment" }));

    expect(
      screen.getByRole("dialog", { name: "Pay Big Card" }),
    ).toBeInTheDocument();
  });

  it("edits the balance, a monthly rate, and the status", async () => {
    const user = userEvent.setup();
    const submit = renderDetail();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const sheet = within(screen.getByRole("dialog", { name: "Edit Big Card" }));
    expect(
      sheet.getByText(/you have paid stays in the history/),
    ).toHaveTextContent("The ₱2,000.00 you have paid stays in the history.");
    expect(sheet.getByText(/Repeats monthly on day 30/)).toBeInTheDocument();

    const more = sheet.getByRole("button", { name: /More details/ });
    expect(more).toHaveTextContent("3% interest a month · Active");
    await user.click(more);
    const rate = sheet.getByLabelText("Interest rate percent");
    await user.clear(rate);
    await user.type(rate, "3");
    await user.click(sheet.getByRole("radio", { name: "/mo" }));
    expect(sheet.getByText("That is 36% a year.")).toBeInTheDocument();
    await user.click(sheet.getByRole("radio", { name: /Paused/ }));
    await user.click(sheet.getByRole("button", { name: "Save changes" }));

    const formData = submit.mock.calls[0]![1];
    expect(formData.get("currentBalance")).toBe("4,000.00");
    expect(formData.get("interestRatePercent")).toBe("3");
    expect(formData.get("interestRateUnit")).toBe("month");
    expect(formData.get("status")).toBe("paused");
  });

  it("deletes the debt after a confirmation and returns to the list", async () => {
    const user = userEvent.setup();
    const submit = renderDetail();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const sheet = within(screen.getByRole("dialog", { name: "Edit Big Card" }));
    await user.click(sheet.getByRole("button", { name: "Delete" }));
    expect(sheet.getByRole("alert")).toHaveTextContent("Delete Big Card?");
    expect(submit).not.toHaveBeenCalled();

    await user.click(sheet.getByRole("button", { name: "Delete debt" }));

    expect(submit).toHaveBeenCalledWith("debt.delete", expect.any(FormData));
    expect(submit.mock.calls[0]![1].get("debtId")).toBe(DEBT.id);
    expect(replace).toHaveBeenCalledWith("/debts");
  });

  it("hides paying and the outlook once the debt is paid off", () => {
    renderDetail({
      debt: { ...DEBT, current_balance_centavos: 0, status: "paid" },
    });

    expect(
      screen.queryByRole("button", { name: "Record payment" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "When it will be paid off" }),
    ).not.toBeInTheDocument();
  });

  it("shows the three latest payments and folds the rest", async () => {
    const user = userEvent.setup();
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <OfflineContext.Provider
          value={{
            userId: "user",
            online: true,
            pending: 0,
            blocked: 0,
            lastSyncedAt: null,
            submit: async () => ({ success: true, message: "ok" }),
            retry: async () => undefined,
            syncNow: async () => undefined,
            clearPrivateCache: async () => undefined,
          }}
        >
          {children}
        </OfflineContext.Provider>
      );
    }
    const dates = ["2026-09-20", "2026-09-05", "2026-08-20", "2026-08-05"];
    render(
      <DebtDetail
        debt={DEBT}
        today="2026-10-02"
        highlightPaymentId={null}
        payments={dates.map((date, index) => ({
          id: `3333333${index}-3333-4333-8333-333333333333`,
          amount_centavos: 10_000,
          payment_date: date,
          notes: null,
        }))}
      />,
      { wrapper: Wrapper },
    );
    const history = within(screen.getByRole("region", { name: "Payments" }));

    expect(history.getAllByRole("listitem")).toHaveLength(3);
    // The month total still counts the folded payment.
    expect(history.getByText("August 2026").nextSibling).toHaveTextContent(
      "₱200.00",
    );

    await user.click(
      history.getByRole("button", { name: "Show all 4 payments" }),
    );

    expect(history.getAllByRole("listitem")).toHaveLength(4);
  });
});
