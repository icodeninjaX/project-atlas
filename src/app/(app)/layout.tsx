import { redirect } from "next/navigation";
import { AppHeader } from "@/components/atlas/app-header";
import { AppShell } from "@/components/atlas/app-shell";
import { YesterdayProductivityReport } from "@/components/notifications/yesterday-productivity-report";
import { OfflineProvider } from "@/components/offline/offline-provider";
import { PrivacyProvider } from "@/components/privacy/privacy-provider";
import { previousManilaDayWindow } from "@/lib/dates/dates";
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

  const yesterday = previousManilaDayWindow(new Date());
  const [{ data: profile }, { count: completedTaskCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("completed_at", yesterday.start)
      .lt("completed_at", yesterday.end),
  ]);

  return (
    <PrivacyProvider userId={user.id}>
      <OfflineProvider userId={user.id}>
        <YesterdayProductivityReport
          completedTaskCount={completedTaskCount ?? 0}
          summaryDate={yesterday.date}
          userId={user.id}
        />
        <AppShell>
          <AppHeader displayName={profile?.display_name ?? user.email} />
          {children}
        </AppShell>
      </OfflineProvider>
    </PrivacyProvider>
  );
}
