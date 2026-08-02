import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateGoalAction } from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
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
});

describe("goal actions", () => {
  it("reports a database error instead of claiming an edit succeeded", async () => {
    const finalOwnerFilter = vi.fn().mockResolvedValue({
      error: { message: "database unavailable" },
    });
    const idFilter = vi.fn().mockReturnValue({ eq: finalOwnerFilter });
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
    formData.set("goalId", "2d334d84-4e32-46fa-bbdb-05ce7dc0dfbb");
    formData.set("title", "Launch portfolio");
    formData.set("description", "Publish three case studies");
    formData.set("area", "career");
    formData.set("status", "paused");
    formData.set("targetDate", "2026-09-30");
    formData.set("progressPercent", "40");
    formData.set("successDefinition", "Portfolio is live");

    await expect(
      updateGoalAction({ success: false, message: "" }, formData),
    ).resolves.toEqual({
      success: false,
      message: "The goal could not be updated.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
