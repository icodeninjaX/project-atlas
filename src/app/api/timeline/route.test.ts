import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { testAccessToken, verifiedTotpFactor } from "@/test/auth";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  getSession: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { GET } from "./route";

const request = (query = "") =>
  new NextRequest(`http://localhost/api/timeline${query}`);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "owner-a", factors: [] } },
    error: null,
  });
  mocks.getSession.mockResolvedValue({
    data: { session: { access_token: testAccessToken("aal1") } },
    error: null,
  });
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  mocks.createClient.mockResolvedValue({
    auth: { getUser: mocks.getUser, getSession: mocks.getSession },
    rpc: mocks.rpc,
  });
});

it("verifies the session once and reuses the client for the page", async () => {
  const response = await GET(request());

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ events: [], nextCursor: null });
  expect(mocks.createClient).toHaveBeenCalledTimes(1);
  expect(mocks.getUser).toHaveBeenCalledTimes(1);
  expect(mocks.rpc).toHaveBeenCalledWith(
    "life_timeline",
    expect.objectContaining({ p_limit: 31 }),
  );
});

it("rejects a missing session before reading the timeline", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

  expect((await GET(request())).status).toBe(401);
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it("blocks enrolled MFA AAL1 before reading the timeline", async () => {
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "owner-a", factors: [verifiedTotpFactor] } },
    error: null,
  });

  expect((await GET(request())).status).toBe(403);
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it("allows enrolled MFA once the session reached AAL2", async () => {
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "owner-a", factors: [verifiedTotpFactor] } },
    error: null,
  });
  mocks.getSession.mockResolvedValue({
    data: { session: { access_token: testAccessToken("aal2") } },
    error: null,
  });

  expect((await GET(request())).status).toBe(200);
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
