import { describe, expect, it, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAssuredUser, hasRequiredAssurance } from "./assurance";

describe("required assurance", () => {
  it("uses Auth-verified factors even when unsigned cookie factors were removed", async () => {
    const user = {
      id: "be000000-0000-4000-8000-000000000001",
      aud: "authenticated",
      role: "authenticated",
      email: "mfa@example.test",
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    };
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const encode = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, aal: "aal1", exp })}.${encode("synthetic")}`;
    const request = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...user,
          factors: [
            {
              id: "factor",
              factor_type: "totp",
              status: "verified",
              created_at: "",
              updated_at: "",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const client = createClient(
      "https://auth.example.test",
      "public-test-key",
      {
        global: { fetch: request },
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storage: {
            getItem: () =>
              JSON.stringify({
                access_token: token,
                refresh_token: "synthetic",
                token_type: "bearer",
                expires_at: exp,
                expires_in: 3600,
                user: { ...user, factors: [] },
              }),
            setItem: () => undefined,
            removeItem: () => undefined,
          },
        },
      },
    );
    expect(await hasRequiredAssurance(client)).toBe(false);
    expect(request).toHaveBeenCalled();
    expect(String(request.mock.calls[0]?.[0])).toContain("/auth/v1/user");
  });
  it.each([
    ["aal1", "aal1", true],
    ["aal1", "aal2", false],
    ["aal2", "aal2", true],
    [null, "aal1", false],
    ["aal1", null, false],
  ])("checks %s / %s", async (currentLevel, nextLevel, allowed) => {
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "test-token" } },
          error: null,
        }),
        mfa: {
          getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
            data: { currentLevel, nextLevel },
            error: null,
          }),
        },
      },
    } as unknown as SupabaseClient;
    expect(await hasRequiredAssurance(client)).toBe(allowed);
  });
  it("fails closed on unavailable assurance", async () => {
    for (const result of [
      { data: null, error: new Error("offline") },
      { data: null, error: null },
    ]) {
      const client = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: "test-token" } },
            error: null,
          }),
          mfa: {
            getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue(result),
          },
        },
      } as unknown as SupabaseClient;
      expect(await hasRequiredAssurance(client)).toBe(false);
    }
  });
});

describe("getAssuredUser", () => {
  const user = {
    id: "be000000-0000-4000-8000-000000000002",
    aud: "authenticated",
    role: "authenticated",
    email: "assured@example.test",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const verifiedFactor = {
    id: "factor",
    factor_type: "totp",
    status: "verified",
    created_at: "",
    updated_at: "",
  };

  function clientFor({
    aal,
    authFactors,
    cookieFactors = [],
    authStatus = 200,
    signedIn = true,
  }: {
    aal: string;
    authFactors: unknown[];
    cookieFactors?: unknown[];
    authStatus?: number;
    signedIn?: boolean;
  }) {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const encode = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, aal, exp })}.${encode("synthetic")}`;
    const request = vi.fn().mockImplementation(async () =>
      authStatus === 200
        ? new Response(JSON.stringify({ ...user, factors: authFactors }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        : new Response(
            JSON.stringify({ code: authStatus, msg: "invalid JWT" }),
            {
              status: authStatus,
              headers: { "Content-Type": "application/json" },
            },
          ),
    );
    const client = createClient(
      "https://auth.example.test",
      "public-test-key",
      {
        global: { fetch: request },
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storage: {
            getItem: () =>
              signedIn
                ? JSON.stringify({
                    access_token: token,
                    refresh_token: "synthetic",
                    token_type: "bearer",
                    expires_at: exp,
                    expires_in: 3600,
                    user: { ...user, factors: cookieFactors },
                  })
                : null,
            setItem: () => undefined,
            removeItem: () => undefined,
          },
        },
      },
    );
    return { client, request };
  }

  it("verifies the user and assurance with a single Auth request", async () => {
    const { client, request } = clientFor({ aal: "aal1", authFactors: [] });
    const result = await getAssuredUser(client);
    expect(result.user?.id).toBe(user.id);
    expect(result.assured).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    expect(String(request.mock.calls[0]?.[0])).toContain("/auth/v1/user");
  });

  it("requires the second factor once one is enrolled", async () => {
    const { client } = clientFor({
      aal: "aal1",
      authFactors: [verifiedFactor],
    });
    expect(await getAssuredUser(client)).toMatchObject({ assured: false });
  });

  it("uses Auth-verified factors even when unsigned cookie factors were removed", async () => {
    const { client } = clientFor({
      aal: "aal1",
      authFactors: [verifiedFactor],
      cookieFactors: [],
    });
    expect(await getAssuredUser(client)).toMatchObject({ assured: false });
  });

  it("ignores factors that exist only in the unsigned cookie", async () => {
    const { client } = clientFor({
      aal: "aal1",
      authFactors: [],
      cookieFactors: [verifiedFactor],
    });
    expect(await getAssuredUser(client)).toMatchObject({ assured: true });
  });

  it("accepts a session that completed the second factor", async () => {
    const { client } = clientFor({
      aal: "aal2",
      authFactors: [verifiedFactor],
    });
    expect(await getAssuredUser(client)).toMatchObject({ assured: true });
  });

  it("ignores unverified factors", async () => {
    const { client } = clientFor({
      aal: "aal1",
      authFactors: [{ ...verifiedFactor, status: "unverified" }],
    });
    expect(await getAssuredUser(client)).toMatchObject({ assured: true });
  });

  it("returns no user when Auth rejects the token", async () => {
    const { client } = clientFor({
      aal: "aal2",
      authFactors: [],
      authStatus: 401,
    });
    expect(await getAssuredUser(client)).toEqual({
      user: null,
      assured: false,
    });
  });

  it("returns no user without a session and makes no request", async () => {
    const { client, request } = clientFor({
      aal: "aal1",
      authFactors: [],
      signedIn: false,
    });
    expect(await getAssuredUser(client)).toEqual({
      user: null,
      assured: false,
    });
    expect(request).not.toHaveBeenCalled();
  });
});
