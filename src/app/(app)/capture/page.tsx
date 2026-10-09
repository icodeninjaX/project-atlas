import { Inbox, ShieldCheck } from "lucide-react";
import { CaptureBatchWorkspace } from "@/components/capture/capture-batch-workspace";
import { AI_MODELS, CAPTURE_MODEL_OPTIONS } from "@/lib/ai/models";
import { createClient } from "@/lib/supabase/server";
import { PageHeading, PageHeadingNote } from "@/components/shared/page-heading";
import { PageShell } from "@/components/shared/page-shell";

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
    <PageShell>
      <PageHeading
        eyebrow="Capture"
        icon={Inbox}
        title="Tell ATLAS what happened"
        description="Describe up to five actions. ATLAS will separate them into cards for you to review, correct, save, or reject."
        aside={
          <PageHeadingNote icon={ShieldCheck}>
            Nothing saves until you confirm
          </PageHeadingNote>
        }
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
