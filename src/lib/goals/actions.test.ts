import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGoalAction,
  deleteGoalAction,
  deleteMilestoneAction,
  updateGoalAction,
  updateGoalProgressAction,
  updateMilestoneAction,
} from "./actions";

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
    formData.set("successDefinition", "Portfolio is live");

    await expect(
      updateGoalAction({ success: false, message: "" }, formData),
    ).resolves.toEqual({
      success: false,
      message: "The goal could not be updated.",
    });
    expect(update.mock.calls[0]?.[0]).not.toHaveProperty("progress_percent");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("creates a goal without a manual progress override", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });

    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
      from: vi.fn().mockReturnValue({ insert }),
    });

    const formData = new FormData();
    formData.set("title", "Launch portfolio");
    formData.set("area", "career");
    formData.set("targetDate", "2026-09-30");
    formData.set("successDefinition", "Portfolio is live");

    await expect(
      createGoalAction({ success: false, message: "" }, formData),
    ).resolves.toEqual({ success: true, message: "Goal created." });
    expect(insert.mock.calls[0]?.[0]).not.toHaveProperty("progress_percent");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/goals");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("recalculates progress for mutations queued by older clients", async () => {
    const finalOwnerFilter = vi.fn().mockResolvedValue({ error: null });
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
    formData.set("progress", "88");

    await expect(updateGoalProgressAction(formData)).resolves.toEqual({
      success: true,
      message: "Goal progress recalculated from milestones.",
    });
    expect(update).toHaveBeenCalledWith({ progress_percent: 0 });
  });

  it("deletes a goal and scopes the deletion to its owner", async () => {
    const finalOwnerFilter = vi.fn().mockResolvedValue({ error: null });
    const idFilter = vi.fn().mockReturnValue({ eq: finalOwnerFilter });
    const deleteGoal = vi.fn().mockReturnValue({ eq: idFilter });

    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
      from: vi.fn().mockReturnValue({ delete: deleteGoal }),
    });

    const formData = new FormData();
    formData.set("goalId", "2d334d84-4e32-46fa-bbdb-05ce7dc0dfbb");

    await expect(deleteGoalAction(formData)).resolves.toEqual({
      success: true,
      message: "Goal deleted.",
    });
    expect(deleteGoal).toHaveBeenCalledOnce();
    expect(idFilter).toHaveBeenCalledWith(
      "id",
      "2d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
    );
    expect(finalOwnerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/goals");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/tasks");
  });

  it("updates a milestone and scopes the change to its owner", async () => {
    const finalOwnerFilter = vi.fn().mockResolvedValue({ error: null });
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
    formData.set("milestoneId", "53f3368c-d188-4aef-82b3-2846ba974169");
    formData.set("title", "Book the lodging");
    formData.set("description", "Compare refundable rates before booking.");
    formData.set("targetDate", "2026-09-10");

    await expect(updateMilestoneAction(formData)).resolves.toEqual({
      success: true,
      message: "Milestone updated.",
    });
    expect(update).toHaveBeenCalledWith({
      title: "Book the lodging",
      description: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Compare refundable rates before booking.",
              },
            ],
          },
        ],
      },
      target_date: "2026-09-10",
    });
    expect(idFilter).toHaveBeenCalledWith(
      "id",
      "53f3368c-d188-4aef-82b3-2846ba974169",
    );
    expect(finalOwnerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/goals");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("removes a milestone and scopes the deletion to its owner", async () => {
    const finalOwnerFilter = vi.fn().mockResolvedValue({ error: null });
    const idFilter = vi.fn().mockReturnValue({ eq: finalOwnerFilter });
    const deleteMilestone = vi.fn().mockReturnValue({ eq: idFilter });

    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
      from: vi.fn().mockReturnValue({ delete: deleteMilestone }),
    });

    const formData = new FormData();
    formData.set("milestoneId", "53f3368c-d188-4aef-82b3-2846ba974169");

    await expect(deleteMilestoneAction(formData)).resolves.toEqual({
      success: true,
      message: "Milestone removed.",
    });
    expect(deleteMilestone).toHaveBeenCalledOnce();
    expect(idFilter).toHaveBeenCalledWith(
      "id",
      "53f3368c-d188-4aef-82b3-2846ba974169",
    );
    expect(finalOwnerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/goals");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
