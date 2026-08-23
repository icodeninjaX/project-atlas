import { redirect } from "next/navigation";
import { AppHeader } from "@/components/atlas/app-header";
import { AppShell } from "@/components/atlas/app-shell";
import { OfflineProvider } from "@/components/offline/offline-provider";
import { PrivacyProvider } from "@/components/privacy/privacy-provider";
import { createClient } from "@/lib/supabase/server";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?setup=required");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assurance } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance?.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
    redirect("/mfa");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <PrivacyProvider userId={user.id}>
      <OfflineProvider userId={user.id}>
        <AppShell>
          <AppHeader displayName={profile?.display_name ?? user.email} />
          {children}
        </AppShell>
      </OfflineProvider>
    </PrivacyProvider>
  );
}
