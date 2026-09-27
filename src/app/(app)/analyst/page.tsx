import { FreeformWorkspace } from "@/components/analyst/freeform-workspace";
import { PageHeading } from "@/components/shared/page-heading";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "ATLAS Analyst" };
export default async function AnalystPage() {
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
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Evidence-based analysis"
        title="ATLAS Analyst"
        description="Ask about your records in plain words. ATLAS calculates the facts, and every figure in an answer is checked against its sources."
      />
      <div className="mt-8">
        <FreeformWorkspace
          goals={goals?.data ?? []}
          debts={debts?.data ?? []}
          userId={user?.data.user?.id ?? ""}
        />
      </div>
    </div>
  );
}
