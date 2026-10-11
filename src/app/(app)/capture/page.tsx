import { CaptureBatchWorkspace } from "@/components/capture/capture-batch-workspace";
import { AI_MODELS, CAPTURE_MODEL_OPTIONS } from "@/lib/ai/models";
import { createClient } from "@/lib/supabase/server";
import { PageHeading } from "@/components/shared/page-heading";
import { PageShell } from "@/components/shared/page-shell";

export const metadata = { title: "Capture" };

export default async function CapturePage() {
  const supabase = await createClient();
  const [accounts, categories] = supabase
    ? await Promise.all([
        supabase
          .from("financial_accounts")
          .select("id,name,account_type")
          .eq("is_archived", false)
          .order("name"),
        supabase
          .from("transaction_categories")
          .select("id,name,category_type")
          .order("name"),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <PageShell>
      <PageHeading
        title="Capture"
        description="Describe up to five actions. Each becomes a card you can correct, save, or reject."
      />

      <CaptureBatchWorkspace
        accounts={accounts.data ?? []}
        categories={categories.data ?? []}
        models={CAPTURE_MODEL_OPTIONS}
        defaultModel={AI_MODELS.capture}
      />
    </PageShell>
  );
}
