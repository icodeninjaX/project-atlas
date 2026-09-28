import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AnswerV2View } from "@/components/analyst/answer-v2";
import { PageHeading } from "@/components/shared/page-heading";
import { previewAnswers } from "@/lib/analyst/intelligence/evaluation/preview";
import { analystIntelligenceV2Enabled } from "@/lib/analyst/intelligence/flags";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Analyst V2 preview",
  robots: { index: false, follow: false },
};

/** Synthetic fixture answers only; no user records and no model calls. */
export default async function AnalystV2PreviewPage() {
  // Read the server flag per request, never at build time.
  await connection();
  if (!analystIntelligenceV2Enabled()) notFound();
  // Pages render beside the layout's sign-in redirect, so check here too.
  const client = await createClient();
  const user = client ? await client.auth.getUser() : null;
  if (!user?.data.user) notFound();
  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Internal preview"
        title="Analyst V2 answers"
        description="Synthetic fixture answers checked by the versioned claim ledger. Nothing here reads your records or calls a model."
      />
      <div className="mt-8 flex flex-col gap-6">
        {previewAnswers().map((item) => (
          <section key={item.title} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">{item.title}</h2>
            <AnswerV2View
              answer={item.answer}
              brief={item.brief}
              evidence={item.evidence}
              derived={item.derived}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
