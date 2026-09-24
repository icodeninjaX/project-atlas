import { beforeEach, describe, expect, it, vi } from "vitest";
import { setTaskGoalRelationshipAction } from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const taskId = "a1300000-0000-4000-8000-000000000001";
const goalId = "a1100000-0000-4000-8000-000000000001";
const request = {
  update: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  request.update.mockReturnValue(request);
  request.eq.mockReturnValue(request);
  request.is.mockReturnValue(request);
  request.select.mockReturnValue(request);
  request.maybeSingle.mockResolvedValue({ data: { id: taskId }, error: null });
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }),
    },
    from: vi.fn(() => request),
  });
});

describe("canonical task goal relationships", () => {
  it("links only a currently unlinked owned task", async () => {
    await expect(
      setTaskGoalRelationshipAction(taskId, goalId, "link"),
    ).resolves.toEqual({ success: true, message: "Task linked to goal." });
    expect(request.update).toHaveBeenCalledWith({ related_goal_id: goalId });
    expect(request.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(request.is).toHaveBeenCalledWith("related_goal_id", null);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/goals/${goalId}`);
  });

  it("unlinks through the same canonical column with an expected goal", async () => {
    await expect(
      setTaskGoalRelationshipAction(taskId, goalId, "unlink"),
    ).resolves.toEqual({ success: true, message: "Task unlinked from goal." });
    expect(request.update).toHaveBeenCalledWith({ related_goal_id: null });
    expect(request.eq).toHaveBeenCalledWith("related_goal_id", goalId);
  });

  it("rejects invalid IDs and stale links", async () => {
    await expect(
      setTaskGoalRelationshipAction("bad", goalId, "link"),
    ).resolves.toMatchObject({ success: false });
    expect(mocks.createClient).not.toHaveBeenCalled();
    request.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(
      setTaskGoalRelationshipAction(taskId, goalId, "link"),
    ).resolves.toMatchObject({ success: false });
  });
});
