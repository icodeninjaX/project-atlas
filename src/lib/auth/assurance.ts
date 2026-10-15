import type { SupabaseClient, User } from "@supabase/supabase-js";

type AssuranceLevels = {
  currentLevel: string | null | undefined;
  nextLevel: string | null | undefined;
};

function meetsRequiredAssurance({ currentLevel, nextLevel }: AssuranceLevels) {
  return (
    !!currentLevel &&
    !!nextLevel &&
    (nextLevel !== "aal2" || currentLevel === "aal2")
  );
}

function tokenAssuranceLevel(token: string) {
  const payload = token.split(".")[1];
  if (!payload) return null;
  const claims: unknown = JSON.parse(atob(base64UrlToBase64(payload)));
  const aal = (claims as { aal?: unknown } | null)?.aal;
  return typeof aal === "string" ? aal : null;
}

function base64UrlToBase64(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
}

// getUser authenticates identity, but does not enforce an enrolled second factor.
export async function hasRequiredAssurance(supabase: SupabaseClient) {
  try {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) return false;
    // The explicit JWT branch verifies the token with Auth and reads fresh
    // factors. The no-argument branch trusts mutable session.user cookie data.
    const { data, error } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel(
        sessionData.session.access_token,
      );
    return !error && !!data && meetsRequiredAssurance(data);
  } catch {
    return false;
  }
}

/**
 * Verifies the session and enforces an enrolled second factor with a single
 * Auth request.
 *
 * `getUser()` sends the session's access token to Auth, which rejects it unless
 * it is valid, and returns the user's current factors from the server. That is
 * everything `getAuthenticatorAssuranceLevel(jwt)` reads, so taking the level
 * from the same, just-verified token skips the second `/user` request it makes.
 * Factors always come from Auth, never from the unsigned session cookie.
 */
export async function getAssuredUser(
  supabase: SupabaseClient,
): Promise<{ user: User | null; assured: boolean }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { user: null, assured: false };

    // getUser() has just loaded (and refreshed, if needed) this session, so
    // this returns the token Auth verified without another request.
    const { data, error } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (error || !token) return { user, assured: false };

    const currentLevel = tokenAssuranceLevel(token);
    const hasVerifiedFactor = (user.factors ?? []).some(
      (factor) => factor.status === "verified",
    );
    const nextLevel = hasVerifiedFactor ? "aal2" : currentLevel;
    return {
      user,
      assured: meetsRequiredAssurance({ currentLevel, nextLevel }),
    };
  } catch {
    return { user: null, assured: false };
  }
}
