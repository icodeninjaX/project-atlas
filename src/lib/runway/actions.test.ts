import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePath, rpc, getUser } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser }, rpc })),
}));

import { saveRunwayPreferencesAction } from "./actions";

const accountId = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";

function formData() {
  const form = new FormData();
  form.append("accountId", accountId);
  form.append("categoryId", categoryId);
  form.set("targetMonths", "6");
  return form;
}

describe("saveRunwayPreferencesAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    rpc.mockResolvedValue({ error: null });
  });

  it("validates choices before calling the RPC", async () => {
    const invalid = new FormData();
    invalid.set("targetMonths", "0");

    const result = await saveRunwayPreferencesAction(
      { success: false, message: "" },
      invalid,
    );

    expect(result.success).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("saves validated preferences and revalidates each financial surface", async () => {
    const result = await saveRunwayPreferencesAction(
      { success: false, message: "" },
      formData(),
    );

    expect(result).toEqual({
      success: true,
      message: "Runway assumptions saved.",
    });
    expect(rpc).toHaveBeenCalledWith("save_runway_preferences", {
      p_account_ids: [accountId],
      p_category_ids: [categoryId],
      p_target_months: 6,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/money/runway");
    expect(revalidatePath).toHaveBeenCalledWith("/money/accounts");
    expect(revalidatePath).toHaveBeenCalledWith("/money/budget");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("keeps an RPC error non-destructive", async () => {
    rpc.mockResolvedValue({ error: { message: "denied" } });

    const result = await saveRunwayPreferencesAction(
      { success: false, message: "" },
      formData(),
    );

    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
