import { FreeformWorkspace } from "@/components/analyst/freeform-workspace";
import { IntelligenceWorkspace } from "@/components/analyst/intelligence-workspace";
import { connection } from "next/server";
import { ChartNoAxesCombined, ShieldCheck } from "lucide-react";
import { analystIntelligenceV2Enabled } from "@/lib/analyst/intelligence/flags";
import { preferredRoute } from "@/lib/analyst/intelligence/policy";
import { createClient } from "@/lib/supabase/server";
import { PageHeading, PageHeadingNote } from "@/components/shared/page-heading";
import { PageShell } from "@/components/shared/page-shell";

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
    <PageShell>
      <PageHeading
        eyebrow="Evidence-based analysis"
        icon={ChartNoAxesCombined}
        title="ATLAS Analyst"
        description="Ask about your records in plain words. ATLAS calculates the facts, and every figure in an answer is checked against its sources."
        aside={
          <PageHeadingNote icon={ShieldCheck}>
            Every figure checked against its sources
          </PageHeadingNote>
        }
      />

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
    </PageShell>
  );
}
