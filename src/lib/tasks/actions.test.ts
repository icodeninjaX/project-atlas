import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTaskAction } from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  insert: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.insert.mockResolvedValue({ error: null });
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
      }),
    },
    from: vi.fn(() => ({ insert: mocks.insert })),
  });
});

function taskForm(energyRequired?: string) {
  const formData = new FormData();
  formData.set("title", "Prepare presentation");
  formData.set("priority", "high");
  formData.set("scheduledFor", "2026-09-04");
  formData.set("estimatedMinutes", "45");
  if (energyRequired) formData.set("energyRequired", energyRequired);
  return formData;
}

describe("task actions", () => {
  it("stores the selected energy requirement", async () => {
    await expect(
      createTaskAction({ success: false, message: "" }, taskForm("high")),
    ).resolves.toEqual({ success: true, message: "Task added." });

    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Prepare presentation",
        energy_required: "high",
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("defaults legacy and offline submissions to medium energy", async () => {
    await createTaskAction({ success: false, message: "" }, taskForm());

    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ energy_required: "medium" }),
    );
  });
});
