import { beforeEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { loadTimelinePage } from "./server";

const filters = { query: "", module: null, from: null, to: null };
const getUser = vi.fn();
const rpc = vi.fn();
const client = { auth: { getUser }, rpc } as unknown as SupabaseClient;

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: [], error: null });
});

it("checks the signed-in user itself by default", async () => {
  getUser.mockResolvedValue({ data: { user: null } });

  expect(await loadTimelinePage(filters, null, client)).toBeNull();
  expect(getUser).toHaveBeenCalledTimes(1);
  expect(rpc).not.toHaveBeenCalled();
});

it("skips the repeated Auth request when the caller already verified the user", async () => {
  expect(
    await loadTimelinePage(filters, null, client, { userVerified: true }),
  ).toEqual({ events: [], nextCursor: null });
  expect(getUser).not.toHaveBeenCalled();
  expect(rpc).toHaveBeenCalledTimes(1);
});
