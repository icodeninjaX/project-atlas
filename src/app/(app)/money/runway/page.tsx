import { WalletCards } from "lucide-react";
import { MoneyNavigation } from "@/components/money/money-navigation";
import { RunwayWorkspace } from "@/components/runway/runway-workspace";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeading } from "@/components/shared/page-heading";
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
        eyebrow="Money / Runway"
        title="Runway"
        description="How long the money you have covers what you must keep paying, without counting future income."
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
        <div className="mt-8">
          <EmptyState
            icon={WalletCards}
            title="Runway isn't available right now"
            description="It couldn't be loaded. Check your connection and try again."
          />
        </div>
      )}
    </PageShell>
  );
}
