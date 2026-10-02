"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronRight, History, Info, Sparkles, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import {
  ClaimText,
  evidenceDisplayValue,
} from "@/components/analyst/evidence-display";
import { glassCardClass, tileClass } from "@/components/reviews/review-visuals";
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
  { label: string; tone: string }
> = {
  observation: {
    label: "What the records show",
    tone: "bg-primary/10 text-primary ring-primary/20",
  },
  interpretation: {
    label: "What it may mean",
    tone: "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300",
  },
  suggestion: {
    label: "Worth a look",
    tone: "bg-positive/10 text-positive ring-positive/20",
  },
};

/** A consent checkbox that reads as one tappable row. */
const consentClass =
  "bg-card/50 ring-border/70 has-[:checked]:bg-primary/[0.05] has-[:checked]:ring-primary/30 has-[:focus-visible]:ring-ring mt-3 flex cursor-pointer items-start gap-3 rounded-xl p-3 text-xs leading-5 ring-1 transition-colors has-[:focus-visible]:ring-2";

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
        <ul className="space-y-2.5">
          {result.claims.map((claim, index) => {
            const kind = claimKinds[claim.kind] ?? claimKinds.observation;
            return (
              <li
                key={index}
                className="bg-card/70 ring-border/60 rounded-xl p-3 ring-1 sm:p-3.5"
              >
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1",
                    kind.tone,
                  )}
                >
                  {kind.label}
                </span>
                <p className="mt-2 text-sm leading-6">
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
          <ul className="divide-border/60 bg-card/50 ring-border/60 mt-1 divide-y rounded-xl text-xs ring-1">
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

function TileHeading({
  icon: Icon,
  children,
}: {
  icon: typeof Sparkles;
  children: React.ReactNode;
}) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold">
      <Icon aria-hidden="true" className="text-primary size-4" />
      {children}
    </h3>
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
      <TileHeading icon={History}>Last week</TileHeading>
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
        <p className="text-muted-foreground mt-1.5 text-xs leading-5">
          Get a checked note on last week automatically the first time you open
          Weekly reviews each week. It uses one Analyst request per week.
        </p>
      ) : null}
      <label className={consentClass}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={saving}
          onChange={(event) => toggle(event.target.checked)}
          className={consentInputClass}
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
      data-spotlight
      className={cn(glassCardClass, "p-4 min-[360px]:p-5 sm:p-6")}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="bg-primary/10 text-primary ring-primary/15 grid size-10 shrink-0 place-items-center rounded-xl ring-1 @max-[16rem]:hidden">
          <Sparkles aria-hidden="true" className="size-[1.125rem]" />
        </span>
        <div className="min-w-0">
          <h2
            id="weekly-insight-heading"
            className="text-base font-semibold tracking-[-0.01em]"
          >
            What changed this week
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs leading-5">
            Compares spending, income, debt payments and completed tasks with
            the week before. Every figure is checked against ATLAS records. Uses
            your Analyst allowance.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2 lg:items-start">
        <div className={cn(tileClass, "p-4 sm:p-5")}>
          <LastWeekInsight autoEnabled={autoEnabled} stored={lastWeek} />
        </div>

        <div className={cn(tileClass, "p-4 sm:p-5")}>
          <TileHeading icon={Timer}>This week so far</TileHeading>
          <p className="text-muted-foreground mt-1.5 text-xs leading-5">
            Compares this week so far with the same days last week.
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
            <Sparkles aria-hidden="true" className="size-4" />
            {pending ? "Checking this week…" : "Generate insight"}
          </Button>
          {error && (
            <p role="alert" className="text-destructive mt-3 text-sm">
              {error}
            </p>
          )}
          {result && <InsightResultView result={result} label="Weekly facts" />}
        </div>
      </div>
    </section>
  );
}
