import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  user: { id: "00000000-0000-4000-8000-00000000000a" } as { id: string } | null,
  list: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}));
vi.mock("@/lib/analyst/intelligence/memory-store", () => ({
  listMemories: state.list,
  saveMemory: state.save,
  deleteMemory: state.remove,
}));

import { DELETE } from "./[id]/route";
import { GET, POST } from "./route";

const post = (body: string) =>
  POST(
    new Request("http://localhost/api/analyst/memories", {
      method: "POST",
      body,
    }),
  );

beforeEach(() => {
  process.env.ATLAS_ANALYST_V2 = "1";
  state.user = { id: "00000000-0000-4000-8000-00000000000a" };
  state.list.mockReset();
  state.save.mockReset();
  state.remove.mockReset();
});
afterEach(() => {
  delete process.env.ATLAS_ANALYST_V2;
});

describe("Analyst memory endpoints", () => {
  it("require sign-in and the V2 flag", async () => {
    state.user = null;
    expect((await GET()).status).toBe(401);
    state.user = { id: "00000000-0000-4000-8000-00000000000a" };
    delete process.env.ATLAS_ANALYST_V2;
    expect((await GET()).status).toBe(401);
    expect(state.list).not.toHaveBeenCalled();
  });

  it("lists the owner's priorities with the days each has left", async () => {
    state.list.mockResolvedValue([
      {
        id: "m1",
        text: "Saving for a laptop",
        lastMentionedAt: new Date().toISOString(),
      },
    ]);
    const response = await GET();
    expect(await response.json()).toMatchObject({
      limit: 10,
      days: 90,
      memories: [{ id: "m1", text: "Saving for a laptop", daysLeft: 90 }],
    });
    expect(state.list.mock.calls[0]![1]).toBe(
      "00000000-0000-4000-8000-00000000000a",
    );
  });

  it("saves the confirmed text and explains every refusal", async () => {
    state.save.mockResolvedValue({
      status: "saved",
      memory: { id: "m1", text: "Saving for a laptop", lastMentionedAt: "" },
    });
    const saved = await post(JSON.stringify({ text: "Saving for a laptop" }));
    expect(saved.status).toBe(201);
    expect(state.save.mock.calls[0]![2]).toBe("Saving for a laptop");
    state.save.mockResolvedValue({ status: "full" });
    const full = await post(JSON.stringify({ text: "Another priority" }));
    expect(full.status).toBe(400);
    expect((await full.json()).error).toMatch(/at most 10/);
    expect((await post("not json")).status).toBe(400);
  });

  it("deletes one of the owner's priorities", async () => {
    state.remove.mockResolvedValue(true);
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "m1" }),
    });
    expect(response.status).toBe(204);
    expect(state.remove.mock.calls[0]!.slice(1)).toEqual([
      "00000000-0000-4000-8000-00000000000a",
      "m1",
    ]);
  });
});
