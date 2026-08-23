import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adjustAccountBalanceAction,
  archiveAccountAction,
  deleteArchivedAccountAction,
} from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
      }),
    },
    rpc: mocks.rpc,
  });
});

function adjustmentForm(targetBalance: string) {
  const formData = new FormData();
  formData.set("accountId", "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb");
  formData.set("targetBalance", targetBalance);
  formData.set("adjustmentDate", "2026-08-13");
  formData.set("note", "Reconciled with the bank app");
  return formData;
}

describe("money actions", () => {
  it("sends an exact signed target balance to the adjustment function", async () => {
    mocks.rpc.mockResolvedValue({
      data: "2d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
      error: null,
    });

    await expect(
      adjustAccountBalanceAction(
        { success: false, message: "" },
        adjustmentForm("-1,250.50"),
      ),
    ).resolves.toEqual({
      success: true,
      message: "Current balance adjusted.",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("adjust_account_balance", {
      p_account_id: "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
      p_target_balance_centavos: -125_050,
      p_adjustment_date: "2026-08-13",
      p_note: "Reconciled with the bank app",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/money/accounts");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("does not revalidate when the database rejects the adjustment", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(
      adjustAccountBalanceAction(
        { success: false, message: "" },
        adjustmentForm("701.00"),
      ),
    ).resolves.toEqual({
      success: false,
      message: "The balance could not be adjusted.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("refreshes both account views after an account is restored", async () => {
    const ownerFilter = vi.fn().mockResolvedValue({ error: null });
    const idFilter = vi.fn().mockReturnValue({ eq: ownerFilter });
    const update = vi.fn().mockReturnValue({ eq: idFilter });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
      from: vi.fn().mockReturnValue({ update }),
    });
    const formData = new FormData();
    formData.set("accountId", "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb");
    formData.set("archived", "false");

    await archiveAccountAction(formData);

    expect(update).toHaveBeenCalledWith({ is_archived: false });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/money/accounts");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/money/accounts/archived",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("permanently deletes a confirmed empty archived account", async () => {
    mocks.rpc.mockResolvedValue({ data: "deleted", error: null });
    const formData = new FormData();
    formData.set("accountId", "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb");
    formData.set("confirmationName", "Old GCash");

    await expect(
      deleteArchivedAccountAction({ success: false, message: "" }, formData),
    ).resolves.toEqual({
      success: true,
      message: "Archived account permanently deleted.",
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "delete_archived_financial_account",
      {
        p_account_id: "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
        p_confirmation_name: "Old GCash",
      },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/money/accounts/archived",
    );
  });

  it("preserves an archived account that has financial history", async () => {
    mocks.rpc.mockResolvedValue({ data: "has_history", error: null });
    const formData = new FormData();
    formData.set("accountId", "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb");
    formData.set("confirmationName", "Old GCash");

    await expect(
      deleteArchivedAccountAction({ success: false, message: "" }, formData),
    ).resolves.toEqual({
      success: false,
      message:
        "This account has financial history and must stay archived to preserve your records.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
