import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  CalendarDays,
  Compass,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  Fingerprint,
  HardDrive,
  History,
  Keyboard,
  Landmark,
  Mail,
  MapPin,
  Mountain,
  Palette,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  TableProperties,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
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
  SettingsGroup,
  SettingsSection,
  StatusChip,
  eyebrowClass,
  glassCardClass,
} from "@/components/settings/settings-chrome";
import { SettingsSectionNav } from "@/components/settings/settings-section-nav";
import { createClient } from "@/lib/supabase/server";
import { isAdminConfigured } from "@/lib/supabase/admin";
import {
  getPushServerConfig,
  isPushConfigured,
} from "@/lib/notifications/server-config";
import { cn } from "@/lib/utils";
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
      <kbd className="bg-background/80 ring-border text-foreground min-w-8 rounded-lg px-2 py-1 text-center font-mono text-[11px] font-semibold shadow-[inset_0_-2px_0_color-mix(in_srgb,var(--border)_90%,transparent)] ring-1">
        {keys}
      </kbd>
    </div>
  );
}

/** One default in the hero, as a quiet tile. */
function GlanceTile({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <>
      <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <span className="mt-1.5 block truncate text-sm font-semibold tracking-[-0.01em]">
        {value}
      </span>
    </>
  );
  const className =
    "bg-background/55 ring-border/80 block min-w-0 rounded-2xl px-3.5 py-3 ring-1 backdrop-blur";
  return href ? (
    <a
      href={href}
      className={cn(
        className,
        "hover:ring-primary/35 focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none",
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
        eyebrow="Your ATLAS"
        icon={Settings2}
        title="Settings"
        description="Shape your defaults, choose how ATLAS looks, and manage your account data in one place."
        aside={
          <PageHeadingLink href="/settings/activity" icon={History}>
            Activity history
          </PageHeadingLink>
        }
      />

      <section
        aria-label="Account summary"
        data-spotlight
        className={cn(
          surfaceClass,
          "bg-card @container relative isolate mt-6 overflow-hidden rounded-[1.75rem] shadow-[0_1px_2px_rgb(7_10_15/0.06),0_32px_90px_-34px_rgb(7_10_15/0.5)] sm:mt-8 sm:rounded-[2rem]",
        )}
      >
        <div
          aria-hidden="true"
          className="from-primary/14 pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b to-transparent"
        />
        <div
          aria-hidden="true"
          className="bg-primary/20 pointer-events-none absolute -top-40 -right-24 -z-10 size-96 rounded-full blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 -left-24 -z-10 size-80 rounded-full bg-emerald-400/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="atlas-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 [mask-image:radial-gradient(70%_100%_at_100%_0%,black,transparent)] opacity-40"
        />
        <div
          aria-hidden="true"
          className="via-primary/70 pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
        />

        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-8 lg:p-8">
          <div className="flex min-w-0 items-center gap-4">
            <span className="from-primary via-primary/60 relative grid size-16 shrink-0 place-items-center rounded-[1.35rem] bg-gradient-to-br to-emerald-400/70 p-[2px] shadow-[0_18px_40px_-18px_color-mix(in_srgb,var(--primary)_90%,transparent)] sm:size-[4.5rem]">
              <span className="bg-card text-foreground grid size-full place-items-center rounded-[1.25rem] font-mono text-lg font-semibold tracking-tight sm:text-xl">
                {accountInitials(accountName) || "A"}
              </span>
            </span>
            <div className="min-w-0">
              <p className={eyebrowClass}>Signed in as</p>
              <p className="mt-1 truncate text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
                {accountName}
              </p>
              <p className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">
                <Mail aria-hidden="true" className="size-3 shrink-0" />
                <span className="truncate">{email}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <StatusChip tone="primary">
                  Private, owner-only workspace
                </StatusChip>
                <StatusChip tone={remindersEnabled ? "positive" : "neutral"}>
                  Reminders {remindersEnabled ? "on" : "off"}
                </StatusChip>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <p className={cn(eyebrowClass, "mb-2.5 px-0.5")}>
              Your defaults at a glance
            </p>
            <div className="grid grid-cols-2 gap-2 @lg:grid-cols-3">
              <GlanceTile
                icon={Compass}
                label="Start page"
                value={homeRouteLabels[homeRoute] ?? "Today"}
                href="#profile"
              />
              <GlanceTile
                icon={Mountain}
                label="Payoff plan"
                value={strategyLabels[debtStrategy] ?? "Avalanche"}
                href="#profile"
              />
              <GlanceTile
                icon={BellRing}
                label="Quiet hours"
                value={`${(preferencesResult.data?.quiet_hours_start ?? "22:00").slice(0, 5)}–${(preferencesResult.data?.quiet_hours_end ?? "07:00").slice(0, 5)}`}
                href="#reminders"
              />
              <GlanceTile
                icon={WalletCards}
                label="Currency"
                value={currency}
              />
              <GlanceTile icon={MapPin} label="Timezone" value={timezone} />
              <GlanceTile
                icon={CalendarDays}
                label="Weekly cycle"
                value={`Starts ${weekStart}`}
              />
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
          <div className="border-border/70 mx-3 border-t pt-4">
            <p className="text-muted-foreground flex items-start gap-2 px-0.5 text-[11px] leading-4">
              <ShieldCheck
                aria-hidden="true"
                className="text-primary mt-px size-3.5 shrink-0"
              />
              Only you can see or change these settings.
            </p>
          </div>
        </aside>

        <div className="min-w-0 space-y-5 sm:space-y-6">
          <SettingsSection
            id="profile"
            index="01 · Profile"
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
            index="02 · Appearance"
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
            index="03 · Security"
            icon={Fingerprint}
            title="Sign-in security"
            description="Reconfirm your current password before changing sign-in credentials."
          >
            <SecuritySettings currentEmail={email} />
            <MfaSettings />
          </SettingsSection>

          <SettingsSection
            id="offline"
            index="04 · Offline"
            icon={HardDrive}
            title="Offline and device storage"
            description="Inspect queued changes, request a sync, and manage private page copies on this device."
          >
            <OfflineStorageSettings />
          </SettingsSection>

          <SettingsSection
            id="reminders"
            index="05 · Reminders"
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
            index="06 · Data"
            icon={Database}
            title="Data and privacy"
            description="Review your audit trail or take a portable copy of your ATLAS records."
          >
            <div className="space-y-7">
              <PrivacySettings />

              <div className="grid gap-2.5 md:grid-cols-2">
                <Link
                  href="/settings/activity"
                  className="bg-background/55 ring-border/80 hover:ring-primary/40 focus-visible:ring-ring group flex min-h-24 items-center gap-3.5 rounded-2xl p-4 ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span
                    aria-hidden="true"
                    className="bg-muted/80 text-muted-foreground group-hover:text-primary ring-border/80 grid size-11 shrink-0 place-items-center rounded-2xl ring-1 transition-colors"
                  >
                    <History className="size-[1.15rem]" />
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
                  <ArrowRight
                    aria-hidden="true"
                    className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  />
                </Link>

                <div className="from-primary/[0.1] ring-primary/20 relative flex min-h-24 flex-col gap-3 overflow-hidden rounded-2xl bg-gradient-to-br to-transparent p-4 ring-1">
                  <div
                    aria-hidden="true"
                    className="bg-primary/20 pointer-events-none absolute -top-12 -right-12 size-36 rounded-full blur-3xl"
                  />
                  <div className="relative flex items-start gap-3.5">
                    <span
                      aria-hidden="true"
                      className="bg-primary-solid text-primary-solid-foreground grid size-11 shrink-0 place-items-center rounded-2xl shadow-[0_8px_22px_-10px_color-mix(in_srgb,var(--primary-solid)_90%,transparent)]"
                    >
                      <FileJson className="size-[1.15rem]" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        Full ATLAS archive
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs leading-5">
                        A single JSON file with all supported records. Auth
                        data, passwords, and internal credentials are never
                        included.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/api/export/json"
                    prefetch={false}
                    className="bg-primary-solid text-primary-solid-foreground hover:bg-primary-solid/90 focus-visible:ring-ring relative inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl px-4 text-sm font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_4px_14px_-4px_color-mix(in_srgb,var(--primary-solid)_55%,transparent)] focus-visible:ring-2 focus-visible:outline-none sm:min-h-10"
                  >
                    <Download aria-hidden="true" className="size-4" />
                    Download JSON
                  </Link>
                </div>
              </div>

              <SettingsGroup
                title="Choose a CSV"
                icon={TableProperties}
                description={`${csvExports.length} tables, one file each. Opens in any spreadsheet app.`}
              >
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {csvExports.map((item) => (
                    <Link
                      key={item.entity}
                      href={`/api/export/csv?entity=${item.entity}` as never}
                      prefetch={false}
                      className="bg-background/55 ring-border/80 hover:ring-primary/40 focus-visible:ring-ring group flex min-h-16 items-center gap-3 rounded-2xl p-3 ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <span
                        aria-hidden="true"
                        className="bg-muted/80 text-muted-foreground group-hover:bg-primary/12 group-hover:text-primary grid size-9 shrink-0 place-items-center rounded-xl transition-colors"
                      >
                        <FileSpreadsheet className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {item.label}
                        </span>
                        <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                          {item.description}
                        </span>
                      </span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="text-muted-foreground/70 group-hover:text-primary size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                      />
                    </Link>
                  ))}
                </div>
              </SettingsGroup>
            </div>
          </SettingsSection>

          <section
            aria-labelledby="shortcuts-title"
            data-spotlight
            className={cn(glassCardClass, "p-4 min-[360px]:p-5 sm:p-6")}
          >
            <div className="flex items-center gap-2.5">
              <Keyboard aria-hidden="true" className="text-primary size-4" />
              <h2
                id="shortcuts-title"
                className="text-[0.9375rem] font-semibold tracking-[-0.01em]"
              >
                Keyboard shortcuts
              </h2>
            </div>
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
            index="07 · Account"
            icon={ShieldCheck}
            title="Session and account"
            description="Choose where you stay signed in, or close your ATLAS for good."
          >
            <SessionControls />
            <SettingsGroup
              title="Danger zone"
              icon={ShieldAlert}
              className="mt-7"
            >
              <DeleteAccountControl configured={accountDeletionConfigured} />
            </SettingsGroup>
          </SettingsSection>

          <p className="text-muted-foreground flex items-start gap-2.5 px-1 text-xs leading-5">
            <Landmark
              aria-hidden="true"
              className="text-primary mt-0.5 size-4 shrink-0"
            />
            Your payoff preference changes ordering only. It never changes debt
            balances or records payments.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
