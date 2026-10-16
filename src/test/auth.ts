import type { Mock } from "vitest";

/** An unsigned, JWT-shaped access token carrying the given assurance level. */
export function testAccessToken(aal: "aal1" | "aal2" = "aal1") {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "test-user", aal, exp })}.${encode("synthetic")}`;
}

/** A user whose Auth record has an enrolled, verified second factor. */
export const verifiedTotpFactor = {
  id: "factor",
  factor_type: "totp",
  status: "verified",
  created_at: "",
  updated_at: "",
};

type ClientWithUser = {
  auth: { getUser: () => Promise<{ data: { user: unknown } }> };
};

/**
 * Stands in for `@/lib/auth/assurance` when a test drives assurance with one
 * mock: `getAssuredUser` reads the user from the test client and asks
 * `assurance` whether the session meets the required level.
 */
export function assuranceModuleMock(assurance: Mock) {
  return {
    hasRequiredAssurance: assurance,
    getAssuredUser: async (client: ClientWithUser) => {
      const {
        data: { user },
      } = await client.auth.getUser();
      return user
        ? { user, assured: Boolean(await assurance(client)) }
        : { user: null, assured: false };
    },
  };
}
