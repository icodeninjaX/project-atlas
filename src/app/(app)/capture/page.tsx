import { Inbox, ShieldCheck } from "lucide-react";
import todayStyles from "@/components/dashboard/today.module.css";
import { SpotlightArea } from "@/components/dashboard/spotlight-area";
import { CaptureBatchWorkspace } from "@/components/capture/capture-batch-workspace";
import { AI_MODELS, CAPTURE_MODEL_OPTIONS } from "@/lib/ai/models";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

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
    <SpotlightArea className="relative isolate mx-auto w-full max-w-[1200px] min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div
        aria-hidden="true"
        className={cn(todayStyles.aurora, todayStyles.grain)}
      />

      <header className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-6">
        <div className="max-w-2xl min-w-0">
          <p className="bg-card/60 text-primary ring-border/70 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.1em] uppercase ring-1 backdrop-blur">
            <Inbox aria-hidden="true" className="size-3.5" />
            Capture
          </p>
          <h1 className="from-foreground via-foreground to-foreground/60 mt-4 bg-gradient-to-br bg-clip-text pb-[0.08em] text-[2.125rem] leading-[1.04] font-semibold tracking-[-0.05em] break-words text-transparent sm:text-[2.75rem] lg:text-[3.25rem]">
            Tell ATLAS what happened
          </h1>
          <p className="text-muted-foreground mt-2.5 max-w-xl text-sm leading-6 text-pretty sm:text-[0.9375rem]">
            Describe up to five actions. ATLAS will separate them into cards for
            you to review, correct, save, or reject.
          </p>
        </div>
        <p className="bg-card/60 text-foreground ring-border/80 inline-flex min-h-9 items-center gap-2 self-start rounded-full px-4 text-xs font-semibold ring-1 backdrop-blur sm:self-auto">
          <ShieldCheck aria-hidden="true" className="text-primary size-4" />
          Nothing saves until you confirm
        </p>
      </header>

      <CaptureBatchWorkspace
        accounts={accounts.data ?? []}
        categories={categories.data ?? []}
        models={CAPTURE_MODEL_OPTIONS}
        defaultModel={AI_MODELS.capture}
      />
    </SpotlightArea>
  );
}
