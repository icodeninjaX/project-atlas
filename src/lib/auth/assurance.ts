import type { SupabaseClient } from "@supabase/supabase-js";

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
    return (
      !error &&
      !!data?.currentLevel &&
      !!data.nextLevel &&
      (data.nextLevel !== "aal2" || data.currentLevel === "aal2")
    );
  } catch {
    return false;
  }
}
