import {
  Download,
  History,
  Keyboard,
  Palette,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/atlas/theme-toggle";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Settings" };

const csvExports = [
  "transactions",
  "debts",
  "debt_payments",
  "tasks",
  "goals",
  "job_applications",
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Preferences and privacy"
        title="Settings"
        description="Manage how Atlas displays your route and take your application data with you."
      />
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl">
              <History className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Activity history</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Review completed tasks, debt payments, stage changes, goals, and
                submitted reviews.
              </p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link href={"/settings/activity" as never}>Open history</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="text-primary size-4" />
              Profile defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {[
              ["Currency", "Philippine peso · PHP"],
              ["Timezone", "Asia/Manila"],
              ["Week starts", "Monday"],
              ["Debt strategy", "Avalanche"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="border-border flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono text-xs">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="text-primary size-4" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Color theme</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Switch between light and dark.
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="text-primary size-4" />
              Export your data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground max-w-2xl text-sm leading-6">
              Exports are generated on the server after your session is
              verified. Auth records and internal credentials are never
              included.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild>
                <Link href={"/api/export/json" as never}>
                  Download all data · JSON
                </Link>
              </Button>
              {csvExports.map((entity) => (
                <Button key={entity} asChild variant="secondary" size="sm">
                  <Link href={`/api/export/csv?entity=${entity}` as never}>
                    {entity.replaceAll("_", " ")} · CSV
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="text-primary size-4" />
              Keyboard shortcuts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quick task</span>
              <kbd className="border-border bg-muted rounded border px-2 font-mono text-xs">
                N
              </kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Global search</span>
              <kbd className="border-border bg-muted rounded border px-2 font-mono text-xs">
                /
              </kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Close dialog or sheet
              </span>
              <kbd className="border-border bg-muted rounded border px-2 font-mono text-xs">
                Esc
              </kbd>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/25">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <ShieldAlert className="size-4" />
              Delete account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm leading-6">
              Permanent account deletion requires a fresh password confirmation
              and a server-side administrative operation. It is intentionally
              unavailable until the deployment’s secure deletion function is
              configured.
            </p>
            <Button variant="destructive" className="mt-5" disabled>
              Delete account permanently
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
