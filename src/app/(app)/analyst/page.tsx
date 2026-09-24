import { AnalystWorkspace } from "@/components/analyst/analyst-workspace";
import { FreeformWorkspace } from "@/components/analyst/freeform-workspace";
import { PageHeading } from "@/components/shared/page-heading";
import { AI_MODELS, ANALYST_MODEL_OPTIONS } from "@/lib/ai/models";

export const metadata = { title: "ATLAS Analyst" };
export default function AnalystPage() {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Evidence-based analysis"
        title="ATLAS Analyst"
        description="Ask about supported ATLAS records. ATLAS calculates the facts and shows the sources behind each answer."
      />
      <div className="mt-8">
        <FreeformWorkspace />
      </div>
      <h2 className="mt-10 text-lg font-semibold">Suggested questions</h2>
      <AnalystWorkspace
        models={ANALYST_MODEL_OPTIONS}
        defaultModel={AI_MODELS.analyst}
      />
    </div>
  );
}
