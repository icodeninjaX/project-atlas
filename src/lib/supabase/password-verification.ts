import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "@/lib/env";

// Password reconfirmation must not replace the caller's AAL2 cookies with AAL1.
export async function verifyCurrentPassword(email: string, password: string) {
  const config = getPublicSupabaseConfig();
  if (!config) return false;
  const client = createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return false;
  const { error: signOutError } = await client.auth.signOut({ scope: "local" });
  return !signOutError;
}
