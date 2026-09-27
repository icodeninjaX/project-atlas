"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import {
  ClaimText,
  evidenceDisplayValue,
} from "@/components/analyst/evidence-display";
import type { GroundedClaim } from "@/lib/analyst/freeform/answer";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";
import { setWeeklyInsightAutoAction } from "@/lib/reviews/insight-actions";

export type InsightResult = {
  status: "answered" | "fallback";
  message?: string;
  claims?: GroundedClaim[];
  evidence: ToolEvidence[];
  limitations: string[];
};

async function requestInsight(body: Record<string, unknown>) {
  try {
    const response = await fetch("/api/reviews/insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const parsed = await response.json();
    if (parsed.status) return { result: parsed as InsightResult, error: "" };
    return {
      result: null,
      error: parsed.error ?? "Insights are unavailable. Try again.",
    };
  } catch {
    return { result: null, error: "Insights are unavailable. Try again." };
  }
}

function InsightResultView({
  result,
  label,
}: {
  result: InsightResult;
  label: string;
}) {
  return (
    <div className="mt-3" aria-live="polite">
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
            {label} ({result.evidence.length})
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
  );
}

/** Last week's stored insight, prepared automatically once opted in. */
function LastWeekInsight({
  autoEnabled,
  stored,
}: {
  autoEnabled: boolean;
  stored: InsightResult | null;
}) {
  const [enabled, setEnabled] = useState(autoEnabled);
  const [result, setResult] = useState<InsightResult | null>(stored);
  const [pending, setPending] = useState(autoEnabled && !stored);
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();
  const requested = useRef(false);

  async function prepare() {
    if (requested.current) return;
    requested.current = true;
    const next = await requestInsight({ mode: "previous" });
    setResult(next.result);
    setError(next.error);
    setPending(false);
  }

  useEffect(() => {
    if (autoEnabled && !stored) void prepare();
    // Runs once on mount; later opt-ins call prepare() directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(next: boolean) {
    startSaving(async () => {
      const saved = await setWeeklyInsightAutoAction(next);
      if (!saved.success) {
        setError(saved.message);
        return;
      }
      setError("");
      setEnabled(next);
      if (next && !result) {
        setPending(true);
        await prepare();
      }
    });
  }

  return (
    <div>
      <h3 className="text-sm font-semibold">Last week</h3>
      {result ? (
        <InsightResultView result={result} label="Last week's facts" />
      ) : pending ? (
        <p className="text-muted-foreground mt-2 text-sm" role="status">
          Preparing last week’s insight…
        </p>
      ) : !enabled ? (
        <p className="text-muted-foreground mt-1 text-xs">
          Get a checked note on last week automatically the first time you open
          Weekly reviews each week. It uses one Analyst request per week.
        </p>
      ) : null}
      <label className="mt-3 flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          disabled={saving}
          onChange={(event) => toggle(event.target.checked)}
          className="mt-1 size-4"
        />
        <span>
          Prepare last week’s insight automatically. Last week’s totals are sent
          to OpenAI (GPT-4o mini) under your organization’s data-sharing
          settings at most once per week (one request, plus one automatic
          correction if the first answer fails ATLAS’s checks); a failed attempt
          is not retried until the next week.
        </span>
      </label>
      {error && (
        <p role="alert" className="text-destructive mt-2 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

/** Evidence-checked notes on what changed last week and this week so far. */
export function WeeklyInsightCard({
  autoEnabled = false,
  lastWeek = null,
}: {
  autoEnabled?: boolean;
  lastWeek?: InsightResult | null;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<InsightResult | null>(null);

  async function generate() {
    setPending(true);
    setResult(null);
    const next = await requestInsight({
      mode: "current",
      dataSharingAcknowledged: acknowledged,
    });
    setResult(next.result);
    setError(next.error);
    setPending(false);
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
        Compares spending, income, debt payments and completed tasks with the
        week before. Every figure is checked against ATLAS records. Uses your
        Analyst allowance.
      </p>

      <div className="border-border mt-4 border-t pt-4">
        <LastWeekInsight autoEnabled={autoEnabled} stored={lastWeek} />
      </div>

      <div className="border-border mt-4 border-t pt-4">
        <h3 className="text-sm font-semibold">This week so far</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Compares this week so far with the same days last week.
        </p>
        <label className="mt-3 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-1 size-4"
          />
          <span>
            These weekly totals are sent to OpenAI (GPT-4o mini) for this
            request under your organization’s data-sharing settings.
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
        {result && <InsightResultView result={result} label="Weekly facts" />}
      </div>
    </section>
  );
}
