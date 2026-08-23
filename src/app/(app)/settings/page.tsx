import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Database,
  Download,
  FileJson,
  Fingerprint,
  HardDrive,
  History,
  Keyboard,
  Landmark,
  LockKeyhole,
  Mail,
  MapPin,
  Palette,
  ShieldCheck,
  TableProperties,
  UserRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { SessionControls } from "@/components/settings/session-controls";
import { OfflineStorageSettings } from "@/components/settings/offline-storage-settings";
import { DeleteAccountControl } from "@/components/settings/delete-account-control";
import { PrivacySettings } from "@/components/settings/privacy-settings";
import { SecuritySettings } from "@/components/settings/security-settings";
import { MfaSettings } from "@/components/settings/mfa-settings";
import { ReminderSettings } from "@/components/settings/reminder-settings";
import { SettingsPreferencesForm } from "@/components/settings/settings-preferences-form";
import { ThemePreferencePicker } from "@/components/settings/theme-preference-picker";
import { PageHeading } from "@/components/shared/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { isAdminConfigured } from "@/lib/supabase/admin";
import {
  getPushServerConfig,
  isPushConfigured,
} from "@/lib/notifications/server-config";

export const metadata = { title: "Settings" };

const csvExports = [
  {
    entity: "transactions",
    label: "Transactions",
    description: "Income and expense records",
  },
  {
    entity: "debts",
    label: "Debts",
    description: "Balances and payoff details",
  },
  {
    entity: "debt_payments",
    label: "Debt payments",
    description: "Recorded payment history",
  },
  {
    entity: "tasks",
    label: "Tasks",
    description: "Open and completed tasks",
  },
  {
    entity: "goals",
    label: "Goals",
    description: "Goals and progress",
  },
  {
    entity: "job_applications",
    label: "Career applications",
    description: "Pipeline and follow-ups",
  },
  {
    entity: "activity_log",
    label: "Activity history",
    description: "Audited events and timestamps",
  },
] as const;

const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function accountInitials(value: string) {
  return value
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ShortcutRow({ label, keys }: { label: string; keys: string }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      <kbd className="border-border bg-muted min-w-8 rounded-lg border px-2 py-1 text-center font-mono text-[11px]">
        {keys}
      </kbd>
    </div>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const [userResult, profileResult, preferencesResult, accountsResult] =
    supabase
      ? await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("profiles")
            .select("display_name,default_currency,timezone")
            .maybeSingle(),
          supabase
            .from("user_preferences")
            .select(
              "debt_strategy,week_starts_on,home_route,default_task_priority,default_task_estimated_minutes,default_account_id,reminders_enabled,task_reminders,debt_reminders,payday_reminders,review_reminders,quiet_hours_start,quiet_hours_end",
            )
            .maybeSingle(),
          supabase
            .from("financial_accounts")
            .select("id,name")
            .eq("is_archived", false)
            .order("name", { ascending: true }),
        ])
      : [
          { data: { user: null } },
          { data: null },
          { data: null },
          { data: [] },
        ];

  const email = userResult.data.user?.email ?? "Atlas account";
  const displayName = profileResult.data?.display_name ?? "";
  const accountName = displayName || email;
  const debtStrategy = preferencesResult.data?.debt_strategy ?? "avalanche";
  const weekStartsOn = Number(preferencesResult.data?.week_starts_on ?? 1);
  const weekStart = weekDays[weekStartsOn] ?? "Monday";
  const accountDeletionConfigured = isAdminConfigured();
  const pushConfig = getPushServerConfig();

  return (
    <div className="mx-auto max-w-[1120px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Your Atlas"
        title="Settings"
        description="Shape your defaults, choose how Atlas looks, and manage your account data in one place."
      />

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card aria-labelledby="preferences-title">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                  <UserRound className="size-[18px]" />
                </span>
                <div>
                  <CardTitle id="preferences-title" className="text-base">
                    Profile and planning defaults
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    Personalize your header and the payoff plan Atlas opens
                    first.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SettingsPreferencesForm
                displayName={displayName}
                debtStrategy={debtStrategy}
                homeRoute={preferencesResult.data?.home_route ?? "/dashboard"}
                defaultTaskPriority={
                  preferencesResult.data?.default_task_priority ?? "medium"
                }
                defaultTaskEstimatedMinutes={
                  preferencesResult.data?.default_task_estimated_minutes ?? null
                }
                defaultAccountId={
                  preferencesResult.data?.default_account_id ?? null
                }
                accounts={accountsResult.data ?? []}
              />

              <div className="border-border mt-6 border-t pt-5">
                <div className="flex items-center gap-2">
                  <LockKeyhole className="text-muted-foreground size-3.5" />
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Atlas regional defaults
                  </p>
                </div>
                <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="bg-muted/60 rounded-xl p-3">
                    <dt className="text-muted-foreground flex items-center gap-2 text-xs">
                      <WalletCards className="size-3.5" />
                      Currency
                    </dt>
                    <dd className="mt-2 text-sm font-semibold">
                      {profileResult.data?.default_currency ?? "PHP"}
                    </dd>
                  </div>
                  <div className="bg-muted/60 rounded-xl p-3">
                    <dt className="text-muted-foreground flex items-center gap-2 text-xs">
                      <MapPin className="size-3.5" />
                      Timezone
                    </dt>
                    <dd className="mt-2 text-sm font-semibold">
                      {profileResult.data?.timezone ?? "Asia/Manila"}
                    </dd>
                  </div>
                  <div className="bg-muted/60 rounded-xl p-3">
                    <dt className="text-muted-foreground flex items-center gap-2 text-xs">
                      <CalendarDays className="size-3.5" />
                      Weekly cycle
                    </dt>
                    <dd className="mt-2 text-sm font-semibold">
                      Starts {weekStart}
                    </dd>
                  </div>
                </dl>
              </div>
            </CardContent>
          </Card>

          <Card aria-labelledby="appearance-title">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                  <Palette className="size-[18px]" />
                </span>
                <div>
                  <CardTitle id="appearance-title" className="text-base">
                    Appearance
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    Choose a theme with a clear view of the active setting.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ThemePreferencePicker />
            </CardContent>
          </Card>

          <Card aria-labelledby="security-title">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                  <Fingerprint className="size-[18px]" />
                </span>
                <div>
                  <CardTitle id="security-title" className="text-base">
                    Sign-in security
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    Reconfirm your current password before changing sign-in
                    credentials.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SecuritySettings currentEmail={email} />
              <MfaSettings />
            </CardContent>
          </Card>

          <Card aria-labelledby="offline-title">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                  <HardDrive className="size-[18px]" />
                </span>
                <div>
                  <CardTitle id="offline-title" className="text-base">
                    Offline and device storage
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    Inspect queued changes, request a sync, and manage private
                    page copies on this device.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <OfflineStorageSettings />
            </CardContent>
          </Card>

          <Card aria-labelledby="reminders-title">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                  <BellRing className="size-[18px]" />
                </span>
                <div>
                  <CardTitle id="reminders-title" className="text-base">
                    Reminders and quiet hours
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    Receive one useful daily digest without noisy empty alerts.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ReminderSettings
                configured={isPushConfigured()}
                publicKey={pushConfig?.publicKey ?? ""}
                preferences={{
                  remindersEnabled:
                    preferencesResult.data?.reminders_enabled ?? false,
                  taskReminders: preferencesResult.data?.task_reminders ?? true,
                  debtReminders: preferencesResult.data?.debt_reminders ?? true,
                  paydayReminders:
                    preferencesResult.data?.payday_reminders ?? true,
                  reviewReminders:
                    preferencesResult.data?.review_reminders ?? true,
                  quietHoursStart:
                    preferencesResult.data?.quiet_hours_start ?? "22:00",
                  quietHoursEnd:
                    preferencesResult.data?.quiet_hours_end ?? "07:00",
                }}
              />
            </CardContent>
          </Card>

          <Card aria-labelledby="data-title">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                  <Database className="size-[18px]" />
                </span>
                <div>
                  <CardTitle id="data-title" className="text-base">
                    Data and privacy
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    Review your audit trail or take a portable copy of your
                    Atlas records.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <PrivacySettings />
              <div className="border-border border-t pt-5" />
              <Link
                href="/settings/activity"
                className="border-border bg-background hover:border-primary/60 focus-visible:ring-ring group flex min-h-20 items-center gap-3 rounded-xl border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:p-4"
              >
                <span className="bg-secondary text-secondary-foreground grid size-10 shrink-0 place-items-center rounded-xl">
                  <History className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    Activity history
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs leading-5">
                    See completed work, payments, stage changes, goals, and
                    reviews.
                  </span>
                </span>
                <ArrowRight className="text-muted-foreground group-hover:text-primary size-4 shrink-0" />
              </Link>

              <div className="border-border border-t pt-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">Full Atlas archive</p>
                    <p className="text-muted-foreground mt-1 max-w-lg text-xs leading-5">
                      A single JSON file with all supported records. Auth data,
                      passwords, and internal credentials are never included.
                    </p>
                  </div>
                  <Link
                    href="/api/export/json"
                    prefetch={false}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none sm:min-h-10"
                  >
                    <FileJson className="size-4" />
                    Download JSON
                  </Link>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <TableProperties className="text-muted-foreground size-4" />
                  <p className="text-sm font-semibold">Choose a CSV</p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {csvExports.map((item) => (
                    <Link
                      key={item.entity}
                      href={`/api/export/csv?entity=${item.entity}` as never}
                      prefetch={false}
                      className="border-border bg-background hover:border-primary/60 focus-visible:ring-ring group flex min-h-16 items-center gap-3 rounded-xl border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          {item.label}
                        </span>
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          {item.description}
                        </span>
                      </span>
                      <Download className="text-muted-foreground group-hover:text-primary size-4 shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside
          aria-label="Account settings"
          className="space-y-4 lg:sticky lg:top-6"
        >
          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <span className="bg-primary text-primary-foreground grid size-11 shrink-0 place-items-center rounded-xl font-mono text-sm font-semibold shadow-sm">
                  {accountInitials(accountName) || "A"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {accountName}
                  </p>
                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate text-xs">
                    <Mail className="size-3 shrink-0" />
                    {email}
                  </p>
                </div>
              </div>
              <div className="border-primary/20 bg-primary/10 text-primary mt-4 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs">
                <ShieldCheck className="size-4 shrink-0" />
                Private, owner-only workspace
              </div>
            </CardContent>
          </Card>

          <Card aria-labelledby="shortcuts-title">
            <CardHeader>
              <CardTitle
                id="shortcuts-title"
                className="flex items-center gap-2"
              >
                <Keyboard className="text-primary size-4" />
                Keyboard shortcuts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <ShortcutRow label="Capture a task" keys="N" />
              <ShortcutRow label="Search Atlas" keys="/" />
              <ShortcutRow label="Close an overlay" keys="Esc" />
              <p className="text-muted-foreground border-border mt-3 border-t pt-3 text-xs leading-5">
                Single-key shortcuts pause while you are typing in a field.
              </p>
            </CardContent>
          </Card>

          <Card aria-labelledby="session-title">
            <CardHeader>
              <CardTitle id="session-title" className="flex items-center gap-2">
                <ShieldCheck className="text-primary size-4" />
                Session and account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SessionControls />
              <div className="border-border border-t pt-4">
                <DeleteAccountControl configured={accountDeletionConfigured} />
              </div>
            </CardContent>
          </Card>

          <div className="border-border text-muted-foreground flex items-start gap-3 rounded-2xl border border-dashed p-4 text-xs leading-5">
            <Landmark className="text-primary mt-0.5 size-4 shrink-0" />
            Your payoff preference changes ordering only. It never changes debt
            balances or records payments.
          </div>
        </aside>
      </div>
    </div>
  );
}
