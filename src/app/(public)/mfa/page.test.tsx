import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createClient,
  type Factor,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { MfaChallengeForm } from "@/components/auth/mfa-challenge-form";
import { proxy } from "@/proxy";
import MfaPage from "./page";

const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.client }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/auth/mfa-challenge-form", () => ({
  MfaChallengeForm: () => null,
}));
vi.mock("@/lib/env", () => ({
  getPublicSupabaseConfig: () => ({
    url: "https://auth.example.test",
    publishableKey: "public-test-key",
  }),
}));

const factor: Factor = {
  id: "factor",
  factor_type: "totp",
  status: "verified",
  created_at: "",
  updated_at: "",
};
const destination = "/tasks?status=open";
const page = (next = destination) =>
  MfaPage({ searchParams: Promise.resolve({ next }) });

function authFixture({
  aal = "aal1",
  cachedFactors = [],
  remoteFactors = [factor],
}: {
  aal?: "aal1" | "aal2";
  cachedFactors?: Factor[];
  remoteFactors?: Factor[];
} = {}) {
  const user = {
    id: "be000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "mfa@example.test",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-10-01T00:00:00Z",
  };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, aal, exp })}.${encode("synthetic")}`;
  const storage = new Map<string, string>();
  storage.set(
    "mfa-page-test",
    JSON.stringify({
      access_token: token,
      refresh_token: "synthetic",
      token_type: "bearer",
      expires_at: exp,
      expires_in: 3600,
      user: { ...user, factors: cachedFactors },
    }),
  );
  // The real SDK handles assurance; only the Auth HTTP boundary is mocked.
  const request = vi.fn(
    async () =>
      new Response(JSON.stringify({ ...user, factors: remoteFactors }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
  const client = createClient("https://auth.example.test", "public-test-key", {
    global: { fetch: request },
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "mfa-page-test",
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
        removeItem: (key) => {
          storage.delete(key);
        },
      },
    },
  });
  mocks.client.mockReturnValue(client);
  return { client, request, token };
}

async function expectChallenge() {
  const result = await page();
  expect(result.props.children.type).toBe(MfaChallengeForm);
  expect(result.props.children.props.destination).toBe(destination);
  expect(mocks.redirect).not.toHaveBeenCalled();
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("MFA page assurance consistency", () => {
  it("renders the challenge after the proxy rejects an AAL1 session with stale factors", async () => {
    const { client, request, token } = authFixture();
    const response = await proxy(
      new NextRequest(`https://atlas.example.test${destination}`),
    );
    const challenge = new URL(response.headers.get("location")!);
    expect(challenge.pathname).toBe("/mfa");
    expect(challenge.searchParams.get("next")).toBe(destination);

    // getUser succeeds with fresh factors but does not update session.user.
    expect((await client.auth.getUser()).data.user?.factors).toEqual([factor]);
    expect((await client.auth.getSession()).data.session?.user.factors).toEqual(
      [],
    );
    expect(
      (await client.auth.mfa.getAuthenticatorAssuranceLevel()).data,
    ).toMatchObject({
      currentLevel: "aal1",
      nextLevel: "aal1",
    });

    const assurance = vi.spyOn(
      client.auth.mfa,
      "getAuthenticatorAssuranceLevel",
    );
    await expectChallenge();
    expect(assurance).toHaveBeenCalledWith(token);
    for (const [url, options] of request.mock.calls as unknown as [
      string,
      RequestInit,
    ][]) {
      expect(url).toBe("https://auth.example.test/auth/v1/user");
      expect(options.method).toBe("GET");
    }
  });

  it("renders the challenge for normally cached AAL1 enrollment", async () => {
    authFixture({ cachedFactors: [factor] });
    await expectChallenge();
  });

  it.each([
    { name: "AAL2", aal: "aal2" as const, remoteFactors: [factor] },
    { name: "AAL1 without factors", aal: "aal1" as const, remoteFactors: [] },
    {
      name: "AAL1 with only unverified factors",
      aal: "aal1" as const,
      remoteFactors: [{ ...factor, status: "unverified" as const }],
    },
  ])("allows $name through both the page and proxy", async (fixture) => {
    authFixture(fixture);
    await expect(page()).rejects.toThrow(`redirect:${destination}`);
    const response = await proxy(
      new NextRequest(`https://atlas.example.test${destination}`),
    );
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });

  it("does not redirect back when Auth rejects the assurance lookup", async () => {
    const { client, request } = authFixture();
    await client.auth.initialize();
    request.mockResolvedValueOnce(
      new Response(JSON.stringify((await client.auth.getUser()).data.user)),
    );
    request.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Invalid JWT" }), { status: 401 }),
    );
    await expectChallenge();
  });

  it.each([
    "session error",
    "missing session",
    "missing token",
    "assurance error",
    "missing assurance",
    "incomplete assurance",
    "thrown lookup",
  ])("stays on the challenge on %s", async (failure) => {
    const getSession = vi.fn().mockResolvedValue({
      data: { session: { access_token: "synthetic" } },
      error: null,
    });
    const getAssurance = vi.fn().mockResolvedValue({
      data: { currentLevel: "aal2", nextLevel: "aal2" },
      error: null,
    });
    if (failure === "session error")
      getSession.mockResolvedValue({
        data: { session: null },
        error: new Error("offline"),
      });
    if (failure === "missing session")
      getSession.mockResolvedValue({ data: { session: null }, error: null });
    if (failure === "missing token")
      getSession.mockResolvedValue({ data: { session: {} }, error: null });
    if (failure === "assurance error")
      getAssurance.mockResolvedValue({
        data: null,
        error: new Error("offline"),
      });
    if (failure === "missing assurance")
      getAssurance.mockResolvedValue({ data: null, error: null });
    if (failure === "incomplete assurance")
      getAssurance.mockResolvedValue({
        data: { currentLevel: null, nextLevel: "aal1" },
        error: null,
      });
    if (failure === "thrown lookup")
      getAssurance.mockRejectedValue(new Error("offline"));
    mocks.client.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user" } } }),
        getSession,
        mfa: { getAuthenticatorAssuranceLevel: getAssurance },
      },
    } as unknown as SupabaseClient);
    await expectChallenge();
  });

  it("keeps the unauthenticated login redirect", async () => {
    const { client } = authFixture();
    vi.spyOn(client.auth, "getUser").mockResolvedValue({
      data: { user: null },
      error: null,
    } as never);
    await expect(page()).rejects.toThrow(
      `redirect:/login?next=${encodeURIComponent(destination)}`,
    );
  });

  it("keeps the setup redirect", async () => {
    mocks.client.mockReturnValue(null);
    await expect(page()).rejects.toThrow("redirect:/login?setup=required");
  });

  it("sanitizes the destination before an allowed redirect", async () => {
    authFixture({ aal: "aal2" });
    await expect(page("https://outside.example.test")).rejects.toThrow(
      "redirect:/dashboard",
    );
  });
});
