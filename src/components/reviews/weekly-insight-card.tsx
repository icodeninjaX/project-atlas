"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import {
  ClaimText,
  evidenceDisplayValue,
} from "@/components/analyst/evidence-display";
import type { GroundedClaim } from "@/lib/analyst/freeform/answer";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";

type InsightResult = {
  status: "answered" | "fallback";
  message?: string;
  claims?: GroundedClaim[];
  evidence: ToolEvidence[];
  limitations: string[];
};

/** On-demand, evidence-checked note on what changed this week. */
export function WeeklyInsightCard() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<InsightResult | null>(null);

  async function generate() {
    setPending(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/reviews/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSharingAcknowledged: acknowledged }),
      });
      const body = await response.json();
      if (!response.ok && !body.status)
        setError(body.error ?? "Insights are unavailable. Try again.");
      if (body.status) setResult(body as InsightResult);
    } catch {
      setError("Insights are unavailable. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="weekly-insight-heading"
      className="border-border bg-card rounded-2xl border p-4 sm:p-6"
    >
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden className="text-primary size-4" />
        <h2 id="weekly-insight-heading" className="text-sm font-semibold">
          What changed this week
        </h2>
      </div>
      <p className="text-muted-foreground mt-1 text-xs">
        Compares this week so far with the same days last week for spending,
        income, debt payments and completed tasks. Every figure is checked
        against ATLAS records. Uses your Analyst allowance.
      </p>
      <label className="mt-4 flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          className="mt-1 size-4"
        />
        <span>
          These weekly totals are sent to OpenAI (GPT-4o mini) for this request
          under your organization’s data-sharing settings.
        </span>
      </label>
      <Button
        type="button"
        className="mt-4"
        onClick={generate}
        disabled={pending || !acknowledged}
      >
        {pending ? "Checking this week…" : "Generate insight"}
      </Button>
      {error && (
        <p role="alert" className="text-destructive mt-3 text-sm">
          {error}
        </p>
      )}
      {result && (
        <div className="mt-4" aria-live="polite">
          {result.message && (
            <p className="text-muted-foreground text-sm">{result.message}</p>
          )}
          {result.claims?.map((claim, index) => (
            <article key={index} className="border-border mt-3 border-t pt-3">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {claim.kind}
              </p>
              <p className="mt-1 text-sm leading-relaxed">
                <ClaimText text={claim.text} />
              </p>
            </article>
          ))}
          {result.evidence.length > 0 && (
            <details className="mt-4">
              <summary className="min-h-11 cursor-pointer text-sm font-semibold">
                Weekly facts ({result.evidence.length})
              </summary>
              <ul className="mt-2 space-y-2 text-sm">
                {result.evidence.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap justify-between gap-2"
                  >
                    <span>
                      {item.metric}
                      <span className="text-muted-foreground">
                        {" "}
                        · {item.period.from} to {item.period.through}
                      </span>
                    </span>
                    <SensitiveValue className="font-medium">
                      {evidenceDisplayValue(item)}
                    </SensitiveValue>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {result.limitations.length > 0 && (
            <ul className="text-muted-foreground mt-3 list-disc space-y-1 pl-5 text-xs">
              {result.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
