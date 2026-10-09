import { WalletCards } from "lucide-react";
import { MoneyNavigation } from "@/components/money/money-navigation";
import { RunwayWorkspace } from "@/components/runway/runway-workspace";
import { PageHeading } from "@/components/shared/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { manilaIsoDate } from "@/lib/dashboard/today";
import { loadRunwayWorkspace } from "@/lib/runway/server";
import { PageShell } from "@/components/shared/page-shell";

export const metadata = { title: "Runway" };

export default async function RunwayPage() {
  const now = new Date();
  let workspace: Awaited<ReturnType<typeof loadRunwayWorkspace>>;
  try {
    workspace = await loadRunwayWorkspace(now);
  } catch {
    workspace = null;
  }

  return (
    <PageShell>
      <PageHeading
        icon={WalletCards}
        eyebrow="Money / Runway"
        title="Personal runway"
        description="How long the money you have covers what you must keep paying. Future income never extends it."
        compactOnMobile
      />
      <MoneyNavigation currentHref="/money/runway" />
      {workspace ? (
        <RunwayWorkspace
          source={workspace.source}
          analysis={workspace.analysis}
          budgets={workspace.budgets}
          now={now.toISOString()}
          today={manilaIsoDate(now)}
        />
      ) : (
        <Card className="mt-8 border-dashed">
          <CardContent className="p-6 text-center">
            <WalletCards className="text-primary mx-auto size-6" />
            <p className="mt-4 text-sm font-semibold">
              Runway is not available yet.
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
              Check your connection and make sure the financial workspace is set
              up.
            </p>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
