import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  linkCreatedRecordToGoal,
  relatedGoalIdFrom,
  withGoalLinkMessage,
} from "./link";

const goalId = "11111111-1111-4111-8111-111111111111";
const debtId = "22222222-2222-4222-8222-222222222222";

function client(error: { code: string } | null) {
  const insert = vi.fn().mockResolvedValue({ error });
  return {
    insert,
    client: { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient,
  };
}

describe("create-time goal links", () => {
  it("reads only a valid related goal id", () => {
    const form = new FormData();
    expect(relatedGoalIdFrom(form)).toBeNull();
    form.set("relatedGoalId", "not-a-goal");
    expect(relatedGoalIdFrom(form)).toBeNull();
    form.set("relatedGoalId", goalId);
    expect(relatedGoalIdFrom(form)).toBe(goalId);
  });

  it("inserts the canonical pair for the created record", async () => {
    const { client: supabase, insert } = client(null);
    await expect(
      linkCreatedRecordToGoal(supabase, "owner", "debt", debtId, goalId),
    ).resolves.toEqual({ linked: true, failed: false });
    expect(insert).toHaveBeenCalledWith({
      user_id: "owner",
      source_type: "debt",
      source_id: debtId,
      target_type: "goal",
      target_id: goalId,
      relationship_type: "tracks_goal",
    });
  });

  it("skips without a goal, tolerates replays and reports failures", async () => {
    const none = client(null);
    await expect(
      linkCreatedRecordToGoal(none.client, "owner", "debt", debtId, null),
    ).resolves.toEqual({ linked: false, failed: false });
    expect(none.insert).not.toHaveBeenCalled();
    const replay = client({ code: "23505" });
    await expect(
      linkCreatedRecordToGoal(replay.client, "owner", "debt", debtId, goalId),
    ).resolves.toEqual({ linked: true, failed: false });
    const failed = client({ code: "23503" });
    const result = await linkCreatedRecordToGoal(
      failed.client,
      "owner",
      "transaction",
      debtId,
      goalId,
    );
    expect(result).toEqual({ linked: false, failed: true });
    expect(withGoalLinkMessage("Debt added.", result)).toMatch(
      /could not be linked/,
    );
    expect(
      withGoalLinkMessage("Debt added.", { linked: true, failed: false }),
    ).toBe("Debt added. Linked to your goal.");
  });
});
