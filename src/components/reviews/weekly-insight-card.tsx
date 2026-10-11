"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronRight, Info, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import {
  ClaimText,
  evidenceDisplayValue,
} from "@/components/analyst/evidence-display";
import {
  ReviewSection,
  glassCardClass,
} from "@/components/reviews/review-visuals";
import { Disclosure } from "@/components/shared/disclosure";
import type { GroundedClaim } from "@/lib/analyst/freeform/answer";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";
import { setWeeklyInsightAutoAction } from "@/lib/reviews/insight-actions";
import { cn } from "@/lib/utils";

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

const claimKinds: Record<
  GroundedClaim["kind"],
  { label: string; dot: string }
> = {
  observation: { label: "What the records show", dot: "bg-primary" },
  interpretation: { label: "What it may mean", dot: "bg-violet-500" },
  suggestion: { label: "Worth a look", dot: "bg-positive" },
};

/** A consent checkbox that reads as one tappable row. */
const consentClass =
  "bg-background/50 ring-border/70 has-[:checked]:bg-primary/[0.05] has-[:checked]:ring-primary/30 has-[:focus-visible]:ring-ring text-muted-foreground mt-3 flex cursor-pointer items-start gap-3 rounded-xl p-3 text-xs leading-5 ring-1 transition-colors has-[:focus-visible]:ring-2";

const consentInputClass =
  "mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--primary-solid)] focus-visible:outline-none";

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
        <p className="text-muted-foreground text-sm leading-6">
          {result.message}
        </p>
      )}
      {result.claims?.length ? (
        <ul className="space-y-4">
          {result.claims.map((claim, index) => {
            const kind = claimKinds[claim.kind] ?? claimKinds.observation;
            return (
              <li key={index} className="min-w-0">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                  <span
                    aria-hidden="true"
                    className={cn("size-1.5 shrink-0 rounded-full", kind.dot)}
                  />
                  {kind.label}
                </span>
                <p className="mt-1 text-sm leading-6">
                  <ClaimText text={claim.text} />
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
      {result.evidence.length > 0 && (
        <details className="group mt-3">
          <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-full text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none sm:min-h-9 [&::-webkit-details-marker]:hidden">
            <ChevronRight
              aria-hidden="true"
              className="size-3.5 transition-transform group-open:rotate-90"
            />
            {label} ({result.evidence.length})
          </summary>
          <ul className="divide-border/60 bg-background/50 ring-border/60 mt-1 divide-y rounded-xl text-xs ring-1">
            {result.evidence.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-2.5"
              >
                <span className="min-w-0">
                  <span className="font-medium">{item.metric}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {item.period.from} to {item.period.through}
                  </span>
                </span>
                <SensitiveValue className="font-mono text-sm font-semibold tabular-nums">
                  {evidenceDisplayValue(item)}
                </SensitiveValue>
              </li>
            ))}
          </ul>
        </details>
      )}
      {result.limitations.length > 0 && (
        <ul className="text-muted-foreground mt-3 space-y-1 text-xs leading-5">
          {result.limitations.map((limitation) => (
            <li key={limitation} className="flex items-start gap-1.5">
              <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              {limitation}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RowHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
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
      <RowHeading>Last week</RowHeading>
      {result ? (
        <InsightResultView result={result} label="Last week's facts" />
      ) : pending ? (
        <div className="mt-3">
          <p className="text-muted-foreground text-sm" role="status">
            Preparing last week’s insight…
          </p>
          <div aria-hidden="true" className="mt-3 space-y-2">
            <div className="bg-muted/70 h-3 w-11/12 animate-pulse rounded-full motion-reduce:animate-none" />
            <div className="bg-muted/70 h-3 w-3/4 animate-pulse rounded-full motion-reduce:animate-none" />
          </div>
        </div>
      ) : !enabled ? (
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          Get a checked note on last week, ready the first time you open Weekly
          reviews each week. It uses one Analyst request per week.
        </p>
      ) : null}
      {enabled ? (
        <p className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-2 text-xs">
          Prepared automatically each week.
          <button
            type="button"
            disabled={saving}
            onClick={() => toggle(false)}
            className="text-foreground hover:text-primary focus-visible:ring-ring -mx-1 inline-flex min-h-11 items-center rounded-md px-1 font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 sm:min-h-8"
          >
            Turn off
          </button>
        </p>
      ) : (
        <label className={consentClass}>
          <input
            type="checkbox"
            checked={false}
            disabled={saving}
            onChange={(event) => toggle(event.target.checked)}
            className={consentInputClass}
          />
          <span>
            Prepare last week’s insight automatically. Last week’s totals are
            sent to OpenAI (GPT-4o mini) under your organization’s data-sharing
            settings at most once per week (one request, plus one automatic
            correction if the first answer fails ATLAS’s checks); a failed
            attempt is not retried until the next week.
          </span>
        </label>
      )}
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
    <ReviewSection
      id="weekly-insight-heading"
      title="What changed"
      meta="Optional · from your records"
    >
      <div className={cn(glassCardClass, "divide-border/70 divide-y")}>
        <div className="p-4 sm:p-6">
          <LastWeekInsight autoEnabled={autoEnabled} stored={lastWeek} />
        </div>

        <div className="p-2 sm:p-3">
          <Disclosure
            label="Check this week so far"
            summary="Compare with the same days last week"
            className="[&>button]:hover:bg-muted/50 [&>button]:bg-transparent [&>div]:px-2 [&>div]:pb-3 sm:[&>div]:px-3"
          >
            <p className="text-muted-foreground text-xs leading-5">
              Compares spending, income, debt payments and completed tasks with
              the same days last week. Uses your Analyst allowance.
            </p>
            <label className={consentClass}>
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className={consentInputClass}
              />
              <span>
                These weekly totals are sent to OpenAI (GPT-4o mini) for this
                request under your organization’s data-sharing settings.
              </span>
            </label>
            <Button
              type="button"
              className="mt-4 w-full sm:w-auto"
              onClick={generate}
              disabled={pending || !acknowledged}
            >
              <Lightbulb aria-hidden="true" className="size-4" />
              {pending ? "Checking this week…" : "Generate insight"}
            </Button>
            {error && (
              <p role="alert" className="text-destructive mt-3 text-sm">
                {error}
              </p>
            )}
            {result && (
              <InsightResultView result={result} label="Weekly facts" />
            )}
          </Disclosure>
        </div>
      </div>
    </ReviewSection>
  );
}
