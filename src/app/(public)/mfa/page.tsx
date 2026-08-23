import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { MfaChallengeForm } from "@/components/auth/mfa-challenge-form";
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
      eyebrow="Second step"
      title="Verify it’s you."
      description="Your password was accepted. Complete the authenticator step to open your private Atlas workspace."
    >
      <MfaChallengeForm destination={destination} />
    </AuthCard>
  );
}
