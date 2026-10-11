import {
  BellRing,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  Fingerprint,
  HardDrive,
  History,
  Keyboard,
  LogOut,
  Mail,
  Palette,
  UserRound,
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
import { FontPreferencePicker } from "@/components/settings/font-preference-picker";
import { ThemePreferencePicker } from "@/components/settings/theme-preference-picker";
import {
  SettingRow,
  SettingsGroup,
  SettingsSection,
  StatusChip,
  cardClass,
  eyebrowClass,
} from "@/components/settings/settings-chrome";
import { SettingsSectionNav } from "@/components/settings/settings-section-nav";
import { createClient } from "@/lib/supabase/server";
import { isAdminConfigured } from "@/lib/supabase/admin";
import {
  getPushServerConfig,
  isPushConfigured,
} from "@/lib/notifications/server-config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeading, PageHeadingLink } from "@/components/shared/page-heading";
import { PageShell } from "@/components/shared/page-shell";

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
    entity: "decisions",
    label: "Decisions",
    description: "Choices and expected outcomes",
  },
  {
    entity: "decision_observations",
    label: "Decision observations",
    description: "Notes from later reviews",
  },
  {
    entity: "decision_revisions",
    label: "Decision revisions",
    description: "Earlier plans kept for review",
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
  {
    entity: "atlas_relationships",
    label: "Graph relationships",
    description: "Manually linked records across ATLAS",
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

const homeRouteLabels: Record<string, string> = {
  "/dashboard": "Today",
  "/tasks": "Tasks",
  "/money/accounts": "Money accounts",
  "/money/transactions": "Transactions",
  "/debts": "Debts",
  "/career": "Career",
  "/reviews": "Weekly reviews",
};

const strategyLabels: Record<string, string> = {
  avalanche: "Avalanche",
  snowball: "Snowball",
  priority: "My priority",
};

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
    <div className="flex min-h-10 items-center justify-between gap-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      <kbd className="bg-background/80 ring-border text-foreground min-w-8 rounded-lg px-2 py-1 text-center font-mono text-[0.6875rem] font-semibold shadow-[inset_0_-2px_0_color-mix(in_srgb,var(--border)_90%,transparent)] ring-1">
        {keys}
      </kbd>
    </div>
  );
}

/** One default in the summary strip; some jump to where they are set. */
function GlanceCell({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <>
      <span className="text-muted-foreground block truncate text-xs">
        {label}
      </span>
      <span className="mt-1 block truncate text-sm font-semibold">{value}</span>
    </>
  );
  const className = "bg-card block min-w-0 px-3.5 py-3";
  return href ? (
    <a
      href={href}
      className={cn(
        className,
        "hover:bg-muted/40 focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
      )}
    >
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
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
              "debt_strategy,week_starts_on,home_route,default_task_priority,default_task_estimated_minutes,dayline_capacity_minutes,dayline_energy_level,default_account_id,reminders_enabled,task_reminders,debt_reminders,payday_reminders,review_reminders,quiet_hours_start,quiet_hours_end",
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

  const email = userResult.data.user?.email ?? "ATLAS account";
  const displayName = profileResult.data?.display_name ?? "";
  const accountName = displayName || email;
  const debtStrategy = preferencesResult.data?.debt_strategy ?? "avalanche";
  const weekStartsOn = Number(preferencesResult.data?.week_starts_on ?? 1);
  const weekStart = weekDays[weekStartsOn] ?? "Monday";
  const accountDeletionConfigured = isAdminConfigured();
  const pushConfig = getPushServerConfig();
  const pushConfigured = isPushConfigured();
  const remindersEnabled = preferencesResult.data?.reminders_enabled ?? false;
  const homeRoute = preferencesResult.data?.home_route ?? "/dashboard";
  const currency = profileResult.data?.default_currency ?? "PHP";
  const timezone = profileResult.data?.timezone ?? "Asia/Manila";

  return (
    <PageShell>
      <PageHeading
        title="Settings"
        description="Set your defaults, choose how ATLAS looks, and manage sign-in, privacy and your data."
        aside={
          <PageHeadingLink href="/settings/activity" icon={History}>
            Activity history
          </PageHeadingLink>
        }
      />

      <section
        aria-label="Account summary"
        className={cn(cardClass, "mt-6 sm:mt-8")}
      >
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-8">
          <div className="flex min-w-0 items-center gap-4">
            <span
              aria-hidden="true"
              className="bg-muted text-foreground grid size-14 shrink-0 place-items-center rounded-full text-lg font-semibold"
            >
              {accountInitials(accountName) || "A"}
            </span>
            <div className="min-w-0">
              <p className={eyebrowClass}>Signed in as</p>
              <p className="mt-1 truncate text-lg font-semibold tracking-[-0.02em] sm:text-xl">
                {accountName}
              </p>
              <p className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">
                <Mail aria-hidden="true" className="size-3 shrink-0" />
                <span className="truncate">{email}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <StatusChip tone={remindersEnabled ? "positive" : "neutral"}>
                  Reminders {remindersEnabled ? "on" : "off"}
                </StatusChip>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <p className={cn(eyebrowClass, "mb-2.5")}>Your defaults</p>
            <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl @lg:grid-cols-3">
              <GlanceCell
                label="Start page"
                value={homeRouteLabels[homeRoute] ?? "Today"}
                href="#profile"
              />
              <GlanceCell
                label="Payoff plan"
                value={strategyLabels[debtStrategy] ?? "Avalanche"}
                href="#profile"
              />
              <GlanceCell
                label="Quiet hours"
                value={`${(preferencesResult.data?.quiet_hours_start ?? "22:00").slice(0, 5)}–${(preferencesResult.data?.quiet_hours_end ?? "07:00").slice(0, 5)}`}
                href="#reminders"
              />
              <GlanceCell label="Currency" value={currency} />
              <GlanceCell label="Timezone" value={timezone} />
              <GlanceCell label="Weekly cycle" value={`Starts ${weekStart}`} />
            </div>
          </div>
        </div>
      </section>

      <SettingsSectionNav variant="strip" />

      <div className="mt-6 grid items-start gap-6 lg:mt-8 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-8">
        <aside
          aria-label="Settings navigation"
          className="hidden space-y-4 lg:sticky lg:top-8 lg:block"
        >
          <div className="pl-3">
            <p className={cn(eyebrowClass, "mb-2 px-2.5")}>On this page</p>
            <SettingsSectionNav variant="sidebar" />
          </div>
          <p className="text-muted-foreground border-border/70 mx-3 border-t px-2.5 pt-4 text-xs leading-5">
            Only you can see or change these settings.
          </p>
        </aside>

        <div className="min-w-0 space-y-5 sm:space-y-6">
          <SettingsSection
            id="profile"
            icon={UserRound}
            title="Profile and planning defaults"
            description="Personalize your header and the payoff plan ATLAS opens first."
          >
            <SettingsPreferencesForm
              displayName={displayName}
              debtStrategy={debtStrategy}
              homeRoute={homeRoute}
              defaultTaskPriority={
                preferencesResult.data?.default_task_priority ?? "medium"
              }
              defaultTaskEstimatedMinutes={
                preferencesResult.data?.default_task_estimated_minutes ?? null
              }
              daylineCapacityMinutes={
                preferencesResult.data?.dayline_capacity_minutes ?? 180
              }
              daylineEnergyLevel={
                preferencesResult.data?.dayline_energy_level ?? "medium"
              }
              defaultAccountId={
                preferencesResult.data?.default_account_id ?? null
              }
              accounts={accountsResult.data ?? []}
            />
          </SettingsSection>

          <SettingsSection
            id="appearance"
            icon={Palette}
            title="Appearance"
            description="Make ATLAS feel like your workspace with a theme and app-wide typeface."
          >
            <div className="space-y-7">
              <SettingsGroup title="Theme">
                <ThemePreferencePicker />
              </SettingsGroup>
              <SettingsGroup title="Typography">
                <FontPreferencePicker />
              </SettingsGroup>
            </div>
          </SettingsSection>

          <SettingsSection
            id="security"
            icon={Fingerprint}
            title="Sign-in security"
            description="Reconfirm your current password before changing sign-in credentials."
          >
            <SecuritySettings currentEmail={email} />
            <MfaSettings />
          </SettingsSection>

          <SettingsSection
            id="offline"
            icon={HardDrive}
            title="Offline and device storage"
            description="Inspect queued changes, request a sync, and manage private page copies on this device."
          >
            <OfflineStorageSettings />
          </SettingsSection>

          <SettingsSection
            id="reminders"
            icon={BellRing}
            title="Reminders and quiet hours"
            description="Get timely task alerts and one useful daily digest without noisy empty notifications."
          >
            <ReminderSettings
              configured={pushConfigured}
              publicKey={pushConfig?.publicKey ?? ""}
              preferences={{
                remindersEnabled,
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
          </SettingsSection>

          <SettingsSection
            id="data"
            icon={Database}
            title="Data and privacy"
            description="Review your audit trail or take a portable copy of your ATLAS records."
          >
            <div className="space-y-7">
              <div className="divide-border/70 divide-y">
                <PrivacySettings className="pb-5" />
                <SettingRow
                  icon={History}
                  title="Activity history"
                  detail="See completed work, payments, stage changes, goals, and reviews."
                  className="py-5"
                >
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/settings/activity">View activity</Link>
                  </Button>
                </SettingRow>
                <SettingRow
                  icon={FileJson}
                  title="Full ATLAS archive"
                  detail="A single JSON file with all supported records. Auth data, passwords, and internal credentials are never included."
                  className="pt-5"
                >
                  <Button asChild size="sm">
                    <Link href="/api/export/json" prefetch={false}>
                      <Download aria-hidden="true" className="size-4" />
                      Download JSON
                    </Link>
                  </Button>
                </SettingRow>
              </div>

              <SettingsGroup
                title="CSV exports"
                description={`${csvExports.length} tables, one file each. Opens in any spreadsheet app.`}
              >
                <ul className="bg-background/55 divide-border/70 divide-y overflow-hidden rounded-xl">
                  {csvExports.map((item) => (
                    <li key={item.entity}>
                      <Link
                        href={`/api/export/csv?entity=${item.entity}` as never}
                        prefetch={false}
                        className="focus-visible:ring-ring group flex min-h-14 items-center gap-3 px-3.5 py-2.5 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                      >
                        <FileSpreadsheet
                          aria-hidden="true"
                          className="text-muted-foreground size-4 shrink-0"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium underline-offset-2 group-hover:underline">
                            {item.label}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {item.description}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className="text-muted-foreground shrink-0 text-xs"
                        >
                          CSV
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </SettingsGroup>
            </div>
          </SettingsSection>

          <section
            aria-labelledby="shortcuts-title"
            className={cn(cardClass, "p-4 min-[360px]:p-5 sm:p-6")}
          >
            <h2
              id="shortcuts-title"
              className="flex items-center gap-2 text-base leading-6 font-semibold tracking-[-0.01em]"
            >
              <Keyboard
                aria-hidden="true"
                className="text-muted-foreground size-4 shrink-0"
              />
              Keyboard shortcuts
            </h2>
            <div className="divide-border/60 mt-3 grid gap-x-8 sm:grid-cols-3 sm:divide-x [&>*]:sm:px-4 [&>*:first-child]:sm:pl-0 [&>*:last-child]:sm:pr-0">
              <ShortcutRow label="Capture a task" keys="N" />
              <ShortcutRow label="Search ATLAS" keys="/" />
              <ShortcutRow label="Close an overlay" keys="Esc" />
            </div>
            <p className="text-muted-foreground border-border/70 mt-3 border-t pt-3 text-xs leading-5">
              Single-key shortcuts pause while you are typing in a field.
            </p>
          </section>

          <SettingsSection
            id="account"
            icon={LogOut}
            title="Session and account"
            description="Choose where you stay signed in, or close your ATLAS for good."
          >
            <SessionControls />
            <div className="border-border/70 mt-5 border-t pt-5">
              <DeleteAccountControl configured={accountDeletionConfigured} />
            </div>
          </SettingsSection>

          <p className="text-muted-foreground px-1 text-xs leading-5">
            Your payoff preference changes ordering only. It never changes debt
            balances or records payments.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
