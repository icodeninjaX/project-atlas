import { FreeformWorkspace } from "@/components/analyst/freeform-workspace";
import { IntelligenceWorkspace } from "@/components/analyst/intelligence-workspace";
import { connection } from "next/server";
import { ChartNoAxesCombined, ShieldCheck } from "lucide-react";
import todayStyles from "@/components/dashboard/today.module.css";
import { SpotlightArea } from "@/components/dashboard/spotlight-area";
import { analystIntelligenceV2Enabled } from "@/lib/analyst/intelligence/flags";
import { preferredRoute } from "@/lib/analyst/intelligence/policy";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "ATLAS Analyst" };
export default async function AnalystPage() {
  // The V2 flag and the signed-in user are read per request, never prerendered.
  await connection();
  const client = await createClient();
  const user = client ? await client.auth.getUser() : null;
  const goals =
    client && user?.data.user
      ? await client
          .from("goals")
          .select("id,title")
          .eq("user_id", user.data.user.id)
          .order("title")
          .limit(100)
      : null;
  const debts =
    client && user?.data.user
      ? await client
          .from("debts")
          .select("id,creditor_name")
          .eq("user_id", user.data.user.id)
          .eq("status", "active")
          .order("creditor_name")
          .limit(100)
      : null;
  return (
    <SpotlightArea className="relative isolate mx-auto w-full max-w-[1200px] min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div
        aria-hidden="true"
        className={cn(todayStyles.aurora, todayStyles.grain)}
      />

      <header className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-6">
        <div className="max-w-2xl min-w-0">
          <p className="bg-card/60 text-primary ring-border/70 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.1em] uppercase ring-1 backdrop-blur">
            <ChartNoAxesCombined aria-hidden="true" className="size-3.5" />
            Evidence-based analysis
          </p>
          <h1 className="from-foreground via-foreground to-foreground/60 mt-4 bg-gradient-to-br bg-clip-text pb-[0.08em] text-[2.125rem] leading-[1.04] font-semibold tracking-[-0.05em] break-words text-transparent sm:text-[2.75rem] lg:text-[3.25rem]">
            ATLAS Analyst
          </h1>
          <p className="text-muted-foreground mt-2.5 max-w-xl text-sm leading-6 text-pretty sm:text-[0.9375rem]">
            Ask about your records in plain words. ATLAS calculates the facts,
            and every figure in an answer is checked against its sources.
          </p>
        </div>
        <p className="bg-card/60 text-foreground ring-border/80 inline-flex min-h-9 items-center gap-2 self-start rounded-full px-4 text-xs font-semibold ring-1 backdrop-blur sm:self-auto">
          <ShieldCheck aria-hidden="true" className="text-primary size-4" />
          Every figure checked against its sources
        </p>
      </header>

      <div className="mt-6 sm:mt-8">
        {analystIntelligenceV2Enabled() && user?.data.user ? (
          // The versioned Analyst replaces the workspace only behind the server flag.
          <div className="mx-auto max-w-3xl">
            <IntelligenceWorkspace
              userId={user.data.user.id}
              privateRoute={preferredRoute().sharing === "non_sharing_verified"}
            />
          </div>
        ) : (
          <FreeformWorkspace
            goals={goals?.data ?? []}
            debts={debts?.data ?? []}
            userId={user?.data.user?.id ?? ""}
          />
        )}
      </div>
    </SpotlightArea>
  );
}
