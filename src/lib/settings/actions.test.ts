import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveSettingsAction } from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  profileEq: vi.fn(),
  profileUpdate: vi.fn(),
  preferencesUpsert: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.profileEq.mockResolvedValue({ error: null });
  mocks.profileUpdate.mockReturnValue({ eq: mocks.profileEq });
  mocks.preferencesUpsert.mockResolvedValue({ error: null });
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
      }),
    },
    from: vi.fn((table: string) =>
      table === "profiles"
        ? { update: mocks.profileUpdate }
        : { upsert: mocks.preferencesUpsert },
    ),
  });
});

function settingsForm({
  displayName = "Kai Rivera",
  debtStrategy = "snowball",
  homeRoute = "/tasks",
  defaultTaskPriority = "high",
  defaultTaskEstimatedMinutes = "45",
  daylineCapacityMinutes = "150",
  daylineEnergyLevel = "high",
  defaultAccountId = "",
} = {}) {
  const formData = new FormData();
  formData.set("displayName", displayName);
  formData.set("debtStrategy", debtStrategy);
  formData.set("homeRoute", homeRoute);
  formData.set("defaultTaskPriority", defaultTaskPriority);
  formData.set("defaultTaskEstimatedMinutes", defaultTaskEstimatedMinutes);
  formData.set("daylineCapacityMinutes", daylineCapacityMinutes);
  formData.set("daylineEnergyLevel", daylineEnergyLevel);
  formData.set("defaultAccountId", defaultAccountId);
  return formData;
}

describe("settings actions", () => {
  it("updates the profile and default payoff plan", async () => {
    await expect(
      saveSettingsAction({ success: false, message: "" }, settingsForm()),
    ).resolves.toEqual({ success: true, message: "Preferences saved." });

    expect(mocks.profileUpdate).toHaveBeenCalledWith({
      display_name: "Kai Rivera",
    });
    expect(mocks.profileEq).toHaveBeenCalledWith("id", "user-1");
    expect(mocks.preferencesUpsert).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        debt_strategy: "snowball",
        home_route: "/tasks",
        default_task_priority: "high",
        default_task_estimated_minutes: 45,
        dayline_capacity_minutes: 150,
        dayline_energy_level: "high",
        default_account_id: null,
      },
      { onConflict: "user_id" },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/debts");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("rejects unsupported payoff plans before contacting the database", async () => {
    await expect(
      saveSettingsAction(
        { success: false, message: "" },
        settingsForm({ debtStrategy: "fastest" }),
      ),
    ).resolves.toMatchObject({ success: false });

    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns a retryable message when either update fails", async () => {
    mocks.preferencesUpsert.mockResolvedValue({
      error: { message: "database unavailable" },
    });

    await expect(
      saveSettingsAction({ success: false, message: "" }, settingsForm()),
    ).resolves.toEqual({
      success: false,
      message: "Your preferences could not be saved. Try again.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
