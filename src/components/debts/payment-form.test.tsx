import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineContext } from "@/components/offline/offline-provider";
import type {
  OfflineActionState,
  OfflineMutationType,
} from "@/lib/offline/types";
import { PaymentForm } from "./payment-form";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(cleanup);

type Submit = (
  mutation: OfflineMutationType,
  formData: FormData,
) => Promise<OfflineActionState>;

function renderForm(
  submit = vi.fn<Submit>(async () => ({
    success: true,
    message: "Payment recorded and balance recalculated.",
  })),
  extra: Partial<Parameters<typeof PaymentForm>[0]> = {},
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
  render(
    <PaymentForm
      debtId="3d334d84-4e32-46fa-bbdb-05ce7dc0dfbb"
      today="2026-10-02"
      balanceCentavos={100_000}
      minimumCentavos={10_000}
      {...extra}
    />,
    { wrapper: Wrapper },
  );
  return submit;
}

describe("PaymentForm", () => {
  it("fills the minimum or the full balance in one tap", async () => {
    const user = userEvent.setup();
    renderForm();
    const amount = screen.getByLabelText("Payment amount in pesos");

    await user.click(screen.getByRole("button", { name: /Minimum/ }));
    expect(amount).toHaveValue("100.00");
    expect(screen.getByText(/Leaves/)).toHaveTextContent(
      "Leaves ₱900.00 to pay.",
    );

    await user.click(screen.getByRole("button", { name: "Full balance" }));
    expect(amount).toHaveValue("1,000.00");
    expect(screen.getByText("This clears the debt.")).toBeInTheDocument();
  });

  it("holds back a payment larger than the balance", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Payment amount in pesos"), "1500");

    expect(screen.getByText(/That is more than the/)).toHaveTextContent(
      "That is more than the ₱1,000.00 still owed.",
    );
    expect(
      screen.getByRole("button", { name: "Record payment" }),
    ).toBeDisabled();
  });

  it("records the payment and clears the amount", async () => {
    const user = userEvent.setup();
    const submit = renderForm();
    const amount = screen.getByLabelText("Payment amount in pesos");

    await user.type(amount, "250");
    await user.click(screen.getByRole("button", { name: "Yesterday" }));
    await user.click(screen.getByRole("button", { name: "Record payment" }));

    expect(submit).toHaveBeenCalledWith(
      "debtPayment.create",
      expect.any(FormData),
    );
    const formData = submit.mock.calls[0]![1];
    expect(formData.get("amount")).toBe("250.00");
    expect(formData.get("paymentDate")).toBe("2026-10-01");
    expect(amount).toHaveValue("");
  });

  it("moves the due date on when the payment settles the bill", async () => {
    const user = userEvent.setup();
    const submit = renderForm(undefined, {
      nextDueDate: "2026-10-05",
      dueDay: 5,
    });

    const settles = screen.getByRole("checkbox", {
      name: /This pays the bill due Oct 5/,
    });
    expect(settles).toBeChecked();
    expect(screen.getByText("Next due moves to Nov 5.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Payment amount in pesos"), "100");
    await user.click(screen.getByRole("button", { name: "Record payment" }));
    expect(submit.mock.calls[0]![1].get("settlesDue")).toBe("on");
  });

  it("leaves a payment well before the due date as extra", async () => {
    const user = userEvent.setup();
    const submit = renderForm(undefined, { nextDueDate: "2026-10-30" });

    const settles = screen.getByRole("checkbox", {
      name: /This pays the bill due Oct 30/,
    });
    expect(settles).not.toBeChecked();

    await user.type(screen.getByLabelText("Payment amount in pesos"), "100");
    await user.click(screen.getByRole("button", { name: "Record payment" }));
    expect(submit.mock.calls[0]![1].get("settlesDue")).toBeNull();
  });

  it("logs the payment from an account when one is chosen", async () => {
    const user = userEvent.setup();
    const submit = renderForm(undefined, {
      accounts: [
        {
          id: "7b0f7f3c-55c4-4bd5-9f1e-3f8f3f2f9a11",
          name: "GCash",
          account_type: "e_wallet",
          provider_id: null,
          current_balance_centavos: 500_000,
        },
      ],
    });

    const more = screen.getByRole("button", { name: /More options/ });
    expect(more).toHaveTextContent("Not logged in Money · No note");
    await user.click(more);
    const picker = screen.getByRole("combobox", { name: "Paid from" });
    expect(picker).toHaveValue("");
    await user.selectOptions(picker, "GCash");
    expect(
      screen.getByText(/Also saved as a Debt Payment expense/),
    ).toBeInTheDocument();

    await user.click(more);
    expect(more).toHaveTextContent("From GCash · No note");
    await user.type(screen.getByLabelText("Payment amount in pesos"), "100");
    await user.click(screen.getByRole("button", { name: "Record payment" }));
    expect(submit.mock.calls[0]![1].get("accountId")).toBe(
      "7b0f7f3c-55c4-4bd5-9f1e-3f8f3f2f9a11",
    );
  });
});
