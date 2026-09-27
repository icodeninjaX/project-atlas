import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";
import { focusTaskLabels } from "./display-labels";

const evidence = (id: string, recordIds: string[]) =>
  ({
    id,
    metric: "Suggested focus task 1",
    value: "high",
    unit: "priority",
    period: { from: "2026-09-27", through: "2026-10-04" },
    comparisonBasis: "Current ATLAS records",
    source: { description: "Tasks", recordIds, href: "/tasks" },
    completeness: "complete",
    claimType: "RECOMMENDATION",
    provenance: {
      tool: "getTaskFocus",
      calculationVersion: "1",
      retrievedAt: "2026-09-27T00:00:00Z",
      textTrust: "untrusted_data",
    },
  }) as ToolEvidence;

function client(rows: unknown[], error: unknown = null) {
  const calls: unknown[][] = [];
  const query = {
    select: vi.fn((...args: unknown[]) => (calls.push(args), query)),
    eq: vi.fn((...args: unknown[]) => (calls.push(args), query)),
    in: vi.fn(async (...args: unknown[]) => {
      calls.push(args);
      return { data: rows, error };
    }),
  };
  return {
    calls,
    client: { from: vi.fn(() => query) } as unknown as SupabaseClient,
  };
}

describe("focusTaskLabels", () => {
  it("adds the owner's task titles and dates to focus evidence", async () => {
    const focus = evidence("getTaskFocus.tasks.focus.1.abc", ["task-1"]);
    const second = evidence("getTaskFocus.tasks.focus.2.def", ["task-2"]);
    const other = evidence("getTaskFocus.tasks.high.ghi", ["task-1"]);
    const { client: supabase, calls } = client([
      {
        id: "task-1",
        title: "File BIR return",
        due_at: "2026-09-29T17:00:00Z",
        scheduled_for: null,
      },
      {
        id: "task-2",
        title: "Call bank",
        due_at: null,
        scheduled_for: "2026-09-28",
      },
    ]);
    expect(
      await focusTaskLabels(supabase, "owner-a", [focus, second, other]),
    ).toEqual({
      [focus.id]: { title: "File BIR return", date: "2026-09-30" },
      [second.id]: { title: "Call bank", date: "2026-09-28" },
    });
    expect(calls).toContainEqual(["user_id", "owner-a"]);
    expect(calls).toContainEqual(["id", ["task-1", "task-2"]]);
  });

  it("skips the lookup without focus evidence and on errors", async () => {
    const { client: supabase } = client([]);
    expect(
      await focusTaskLabels(supabase, "owner-a", [
        evidence("getTaskFocus.tasks.open.x", ["a", "b"]),
      ]),
    ).toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
    const failing = client([], { message: "denied" }).client;
    expect(
      await focusTaskLabels(failing, "owner-a", [
        evidence("getTaskFocus.tasks.focus.1.abc", ["task-1"]),
      ]),
    ).toBeUndefined();
  });
});
