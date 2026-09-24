import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createToolTransport } from "./transport";
import { TOOL_LIMITS } from "./contracts";

vi.mock("server-only", () => ({}));

const ownerId = "11111111-1111-4111-8111-111111111111";
const root = "https://local.example/rest/v1/";
const path = (extra = "") => `${root}tasks?user_id=eq.${ownerId}${extra}`;
function setup(data: unknown = [], status = 200, headers = {}) {
  const controller = new AbortController();
  const fetch = vi.fn<typeof globalThis.fetch>(
    async () => new Response(JSON.stringify(data), { status, headers }),
  );
  const transport = createToolTransport({
    ownerId,
    signal: controller.signal,
    fetch,
  });
  return { transport, fetch, controller };
}

describe("tool read transport", () => {
  it("bounds an unbounded owner-scoped Supabase query without changing its data", async () => {
    const { transport, fetch } = setup([{ id: "task", title: "read me" }]);
    const client = createClient("https://local.example", "public-key", {
      global: { fetch: transport.fetch },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await client
      .from("tasks")
      .select("id,title")
      .eq("user_id", ownerId);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ id: "task", title: "read me" }]);
    expect(
      new URL(new Request(...fetch.mock.calls[0]!).url).searchParams.get(
        "limit",
      ),
    ).toBe(String(TOOL_LIMITS.rowsPerQuery + 1));
    expect(transport.stats).toEqual({ queries: 1, rows: 1 });
  });

  it.each([
    ["other owner", `${root}tasks?user_id=eq.other`, "GET"],
    ["missing owner", `${root}tasks`, "GET"],
    ["write", path(), "POST"],
    ["unknown table", `${root}secrets?user_id=eq.${ownerId}`, "GET"],
    ["nested rows", path("&select=id,goals(id)"), "GET"],
    ["fractional limit", path("&limit=1.5"), "GET"],
    ["write RPC", `${root}rpc/save_runway_preferences`, "POST"],
  ])("rejects %s before private retrieval", async (_, url, method) => {
    const { transport, fetch } = setup();
    await expect(transport.fetch(url, { method })).rejects.toMatchObject({
      code: "invalid_input",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retains typed failure when Supabase converts the thrown exception to its error result", async () => {
    const { transport } = setup({ code: "42P01" }, 400);
    const client = createClient("https://local.example", "public-key", {
      global: { fetch: transport.fetch },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await client.from("tasks").select("id").eq("user_id", ownerId);
    expect(transport.failure?.code).toBe("setup_error");
  });

  it("fails at an explicit row cap, but accepts an exact-ID bound", async () => {
    const first = setup([{ id: "one" }]);
    await expect(first.transport.fetch(path("&limit=1"))).rejects.toMatchObject(
      { code: "partial" },
    );
    const second = setup([{ id: ownerId }]);
    await expect(
      second.transport.fetch(path(`&limit=1&id=eq.${ownerId}`)),
    ).resolves.toBeInstanceOf(Response);
  });

  it("detects an unbounded read's extra sentinel row and reported truncation", async () => {
    const first = setup(
      Array.from({ length: TOOL_LIMITS.rowsPerQuery + 1 }, () => ({ id: "x" })),
    );
    await expect(first.transport.fetch(path())).rejects.toMatchObject({
      code: "partial",
    });
    const second = setup([{ id: "x" }], 200, { "content-range": "0-0/9" });
    await expect(second.transport.fetch(path())).rejects.toMatchObject({
      code: "partial",
    });
  });

  it("clamps a legacy large limit to a sentinel and rejects incomplete data", async () => {
    const complete = setup([{ id: "one" }]);
    await complete.transport.fetch(path("&limit=1000"));
    expect(
      new URL(
        new Request(...complete.fetch.mock.calls[0]!).url,
      ).searchParams.get("limit"),
    ).toBe("501");
    const partial = setup(Array.from({ length: 501 }, () => ({ id: "row" })));
    await expect(
      partial.transport.fetch(path("&limit=1000")),
    ).rejects.toMatchObject({ code: "partial" });
  });

  it("accepts exact equality when Content-Range proves all matching rows returned", async () => {
    const { transport } = setup([{ id: "one" }], 200, {
      "content-range": "0-0/1",
    });
    await expect(transport.fetch(path("&limit=1"))).resolves.toBeInstanceOf(
      Response,
    );
  });

  it.each([
    ["weekly_reviews", "&limit=12&order=week_start.desc", 12],
    ["atlas_relationships", "&limit=21", 21],
    ["tasks", `&limit=21&related_goal_id=eq.${ownerId}`, 21],
    ["goal_milestones", `&limit=21&goal_id=eq.${ownerId}`, 21],
  ])(
    "preserves %s deliberate window or Graph lookahead",
    async (table, query, count) => {
      const { transport } = setup(
        Array.from({ length: count }, () => ({ id: "row" })),
        200,
        { "content-range": `0-${count - 1}/100` },
      );
      await expect(
        transport.fetch(`${root}${table}?user_id=eq.${ownerId}${query}`),
      ).resolves.toBeInstanceOf(Response);
      expect(transport.stats.rows).toBe(count);
    },
  );

  it("reserves query budget before concurrent network requests", async () => {
    const { transport, fetch } = setup();
    await Promise.allSettled(
      Array.from({ length: TOOL_LIMITS.queries + 2 }, () =>
        transport.fetch(path()),
      ),
    );
    expect(fetch).toHaveBeenCalledTimes(TOOL_LIMITS.queries);
    expect(transport.failure?.code).toBe("budget_exceeded");
    await expect(transport.fetch(path())).rejects.toMatchObject({
      code: "budget_exceeded",
    });
  });

  it("stops before any request when cancelled", async () => {
    const { transport, controller, fetch } = setup();
    controller.abort();
    await expect(transport.fetch(path())).rejects.toMatchObject({
      code: "timeout",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("excludes authentication from row and query budgets", async () => {
    const { transport } = setup({ id: ownerId });
    await transport.fetch("https://local.example/auth/v1/user");
    expect(transport.stats).toEqual({ queries: 0, rows: 0 });
  });

  it("enforces total row budget across successful reads", async () => {
    const { transport } = setup(
      Array.from({ length: 500 }, () => ({ id: "row" })),
    );
    for (let index = 0; index < 8; index++) await transport.fetch(path());
    await expect(transport.fetch(path())).rejects.toMatchObject({
      code: "budget_exceeded",
    });
  });

  it("detects unsafe sums across separate source reads", async () => {
    const { transport } = setup([{ amount_centavos: Number.MAX_SAFE_INTEGER }]);
    await transport.fetch(path());
    await expect(transport.fetch(path())).rejects.toMatchObject({
      code: "invalid_output",
    });
  });

  it.each([
    [401, "unauthenticated"],
    [503, "unavailable_source"],
  ])("maps source HTTP %s safely", async (status, code) => {
    const { transport } = setup({ message: "private source details" }, status);
    await expect(transport.fetch(path())).rejects.toMatchObject({ code });
    expect(transport.failure?.message).not.toContain("private source details");
  });

  it.each([
    [Number.MAX_SAFE_INTEGER + 1],
    ["9007199254740992"],
    [Number.MAX_SAFE_INTEGER, 1],
  ])("rejects unsafe money values or sums %j", async (...amounts) => {
    const { transport } = setup(
      amounts.map((amount_centavos) => ({ amount_centavos })),
    );
    await expect(transport.fetch(path())).rejects.toMatchObject({
      code: "invalid_output",
    });
  });

  it("enforces the streamed byte budget", async () => {
    const { transport } = setup([
      { title: "x".repeat(TOOL_LIMITS.responseBytes) },
    ]);
    await expect(transport.fetch(path())).rejects.toMatchObject({
      code: "budget_exceeded",
    });
  });

  it("enforces cumulative response bytes across otherwise valid reads", async () => {
    const { transport } = setup([{ title: "x".repeat(600000) }]);
    await transport.fetch(path());
    await expect(transport.fetch(path())).rejects.toMatchObject({
      code: "budget_exceeded",
    });
  });

  it("reports missing authenticated grants as setup rather than expired login", async () => {
    const { transport } = setup(
      { code: "42501", message: "private table" },
      403,
    );
    await expect(transport.fetch(path())).rejects.toMatchObject({
      code: "setup_error",
    });
  });

  it("allows one bounded Timeline page including its lookahead row", async () => {
    const { transport } = setup(
      Array.from({ length: 31 }, (_, index) => ({ event_id: String(index) })),
    );
    await expect(
      transport.fetch(`${root}rpc/life_timeline`, {
        method: "POST",
        body: JSON.stringify({ p_limit: 31 }),
      }),
    ).resolves.toBeInstanceOf(Response);
    expect(transport.stats.rows).toBe(31);
  });

  it("preserves RPC method, parameters and auth headers on the wire", async () => {
    const { transport, fetch } = setup([]);
    const body = { p_start_date: "2026-06-01", p_end_date: "2026-09-01" };
    await transport.fetch(`${root}rpc/runway_monthly_totals`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        authorization: "Bearer synthetic",
        "content-type": "application/json",
      },
    });
    const request = new Request(...fetch.mock.calls[0]!);
    expect(request.method).toBe("POST");
    expect(request.headers.get("authorization")).toBe("Bearer synthetic");
    expect(request.headers.get("prefer")).toContain("count=exact");
    expect(await request.json()).toEqual(body);
  });

  it("detects a server cap smaller than the Timeline lookahead", async () => {
    const { transport } = setup(
      Array.from({ length: 10 }, () => ({ event_id: "id" })),
      200,
      { "content-range": "0-9/31" },
    );
    await expect(
      transport.fetch(`${root}rpc/life_timeline`, {
        method: "POST",
        body: JSON.stringify({ p_limit: 31 }),
      }),
    ).rejects.toMatchObject({ code: "partial" });
  });

  it("rejects a runway RPC without a bounded valid period", async () => {
    const { transport, fetch } = setup();
    await expect(
      transport.fetch(`${root}rpc/runway_monthly_totals`, {
        method: "POST",
        body: JSON.stringify({
          p_start_date: "2020-01-01",
          p_end_date: "2026-01-01",
        }),
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
