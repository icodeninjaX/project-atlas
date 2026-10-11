import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { MfaChallengeForm } from "@/components/auth/mfa-challenge-form";
import { signOutAction } from "@/lib/auth/actions";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Verify sign-in" };

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const destination = safeRedirectPath((await searchParams).next, "/dashboard");
  const supabase = await createClient();
  if (!supabase) redirect("/login?setup=required");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(destination)}`);

  const { data: assurance } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance?.currentLevel === "aal2" || assurance?.nextLevel !== "aal2") {
    redirect(destination as never);
  }

  return (
    <AuthCard
      eyebrow="Step 2 of 2"
      title="Enter your authenticator code"
      description="Your password was accepted. This account also needs a code from your authenticator app."
    >
      <MfaChallengeForm destination={destination} />
      <form action={signOutAction} className="mt-4 text-center">
        <button
          type="submit"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring min-h-8 rounded-sm text-xs focus-visible:ring-2 focus-visible:outline-none"
        >
          Log out
        </button>
      </form>
    </AuthCard>
  );
}
