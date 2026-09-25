import { CaptureBatchWorkspace } from "@/components/capture/capture-batch-workspace";
import { PageHeading } from "@/components/shared/page-heading";
import { AI_MODELS, CAPTURE_MODEL_OPTIONS } from "@/lib/ai/models";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Universal Capture" };

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
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Capture"
        title="Tell ATLAS what happened"
        description="Describe up to five actions. ATLAS will separate them into cards for you to review, correct, save, or reject."
      />
      <CaptureBatchWorkspace
        accounts={accounts.data ?? []}
        categories={categories.data ?? []}
        models={CAPTURE_MODEL_OPTIONS}
        defaultModel={AI_MODELS.capture}
      />
    </div>
  );
}
