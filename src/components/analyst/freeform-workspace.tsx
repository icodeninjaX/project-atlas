"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowUp,
  ArrowUpRight,
  CalendarCheck,
  Check,
  ChevronDown,
  Compass,
  Crosshair,
  Lightbulb,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  Wallet,
  X,
  type LucideIcon,
  Info,
  CornerDownRight,
} from "lucide-react";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import {
  ClaimText,
  evidenceDisplayValue as displayValue,
} from "@/components/analyst/evidence-display";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";
import type { GroundedClaim } from "@/lib/analyst/freeform/answer";
import {
  ANALYST_STAGES,
  NDJSON_TYPE,
  parseStreamEvent,
  stageLabel,
  type AnalystDomain,
  type AnalystStage,
} from "@/lib/analyst/freeform/progress";
import { questionKey } from "@/lib/analyst/freeform/suggestions";
import { formatPeriodLabel } from "@/lib/history/period-label";
import { cn } from "@/lib/utils";

type FreeformResult = {
  status: "answered" | "fallback" | "unsupported" | "clarification_required";
  message?: string;
  claims?: GroundedClaim[];
  evidence: ToolEvidence[];
  limitations: string[];
  matchedEntity?: { type: "goal" | "debt"; name: string };
  /** Owner-only display titles (focus tasks); never sent to the model. */
  labels?: Record<string, { title: string; date: string | null }>;
  /** Fixed follow-up questions from the tools that ran; no record text. */
  suggestions?: string[];
};

/** The owner's own name for an evidence item, or its model-safe metric. */
function nameOf(result: FreeformResult, item: ToolEvidence) {
  return result.labels?.[item.id]?.title ?? item.metric;
}

/** Replaces "Suggested focus task N" in claim prose with the task's title. */
function personalize(text: string, result: FreeformResult) {
  let next = text;
  for (const item of result.evidence) {
    const title = result.labels?.[item.id]?.title;
    const index = item.metric.match(/focus task (\d+)$/i)?.[1];
    if (!title || !index) continue;
    next = next.replace(
      new RegExp(`\\b(?:suggested\\s+)?focus\\s+task\\s+${index}\\b`, "gi"),
      `“${title}”`,
    );
  }
  return next;
}

type Turn = {
  id: number;
  question: string;
  focus: string | null;
  result: FreeformResult | null;
  error: string;
  pending: boolean;
  /** Furthest live stage reached while pending, with the domains read. */
  stage: AnalystStage;
  domains: AnalystDomain[];
};

/** Starter questions; each goes through the same verified Analyst flow. */
export const SUGGESTED_QUESTIONS = [
  "How did my spending compare to my income last month?",
  "What needs my attention across money and goals?",
  "Am I making progress toward becoming debt-free?",
  "What should I focus on this week?",
  "How are my goals progressing?",
  "What if my monthly income falls by 20%?",
] as const;

const starterIcons: LucideIcon[] = [
  Wallet,
  Compass,
  TrendingDown,
  CalendarCheck,
  Target,
  Scale,
];

const consentKey = (userId: string) => `atlas:analyst-consent:${userId}`;

function readConsent(userId: string) {
  try {
    return window.localStorage.getItem(consentKey(userId)) === "granted";
  } catch {
    return false;
  }
}

function writeConsent(userId: string, granted: boolean) {
  try {
    if (granted) window.localStorage.setItem(consentKey(userId), "granted");
    else window.localStorage.removeItem(consentKey(userId));
  } catch {
    /* Consent still applies for this page view. */
  }
}

function scenarioGroups(evidence: ToolEvidence[]) {
  const rows = evidence.filter(
    (item) => item.provenance.tool === "compareFinancialScenarios",
  );
  return ["Current", "Option 1", "Option 2"]
    .map((label) => ({
      label,
      items: rows.filter((item) => item.metric.startsWith(`${label} · `)),
    }))
    .filter((group) => group.items.length > 0);
}

function inspectedSpan(evidence: ToolEvidence[]) {
  const from = evidence.reduce(
    (first, item) => (item.period.from < first ? item.period.from : first),
    evidence[0]!.period.from,
  );
  const through = evidence.reduce(
    (last, item) => (item.period.through > last ? item.period.through : last),
    evidence[0]!.period.through,
  );
  return formatPeriodLabel(from, through);
}

/** Numeric facts the claims cite, shown as the answer's key figures. */
function keyFigures(result: FreeformResult) {
  const cited = new Set(result.claims?.flatMap((claim) => claim.evidenceIds));
  return result.evidence
    .filter(
      (item) =>
        cited.has(item.id) &&
        typeof item.value === "number" &&
        item.provenance.tool !== "compareFinancialScenarios",
    )
    .slice(0, 4);
}

const claimStyles: Record<
  GroundedClaim["kind"],
  { label: string; icon: LucideIcon } | null
> = {
  observation: null,
  interpretation: { label: "What it may mean", icon: Lightbulb },
  suggestion: { label: "Worth checking", icon: Compass },
};

function Citations({
  ids,
  result,
  anchor,
  onOpen,
}: {
  ids: string[];
  result: FreeformResult;
  anchor: (id: string) => string;
  onOpen: () => void;
}) {
  return (
    <span
      className="mt-2 flex flex-wrap gap-1.5"
      aria-label="Evidence for this point"
    >
      {ids.map((id) => (
        <a
          key={id}
          href={`#${anchor(id)}`}
          onClick={onOpen}
          className="text-muted-foreground hover:text-primary hover:border-primary/40 border-border bg-background/40 inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition-colors"
        >
          <span
            aria-hidden="true"
            className="bg-primary/70 size-1 rounded-full"
          />
          {(() => {
            const item = result.evidence.find((entry) => entry.id === id);
            return item ? nameOf(result, item) : "Evidence";
          })()}
        </a>
      ))}
    </span>
  );
}

function AnswerBody({ turn }: { turn: Turn }) {
  const sources = useRef<HTMLDetailsElement>(null);
  const result = turn.result!;
  const anchor = (id: string) =>
    `evidence-${turn.id}-${encodeURIComponent(id)}`;
  const openSources = () => {
    if (sources.current) sources.current.open = true;
  };
  const groups = scenarioGroups(result.evidence);
  const figures = keyFigures(result);
  const focusTasks = result.evidence.filter(
    (item) => result.labels?.[item.id] && item.completeness === "complete",
  );
  const claims = result.claims ?? [];
  const lead = claims.filter((claim) => claim.kind === "observation");
  const insights = claims.filter((claim) => claim.kind !== "observation");
  return (
    <>
      <div className="space-y-5 px-5 pb-5 sm:px-6">
        {result.message &&
          (claims.length === 0 ? (
            <p className="border-border bg-background/40 text-muted-foreground flex gap-2.5 rounded-2xl border p-3.5 text-sm leading-6">
              <Info
                aria-hidden="true"
                className="text-primary mt-1 size-4 shrink-0"
              />
              {result.message}
            </p>
          ) : (
            <p className="text-[0.9375rem] leading-7">{result.message}</p>
          ))}
        {lead.map((claim, index) => (
          <div key={`lead-${index}`}>
            <p className="text-[0.9375rem] leading-7 text-pretty">
              <ClaimText text={personalize(claim.text, result)} />
            </p>
            <Citations
              ids={claim.evidenceIds}
              result={result}
              anchor={anchor}
              onOpen={openSources}
            />
          </div>
        ))}
        {focusTasks.length > 0 && (
          <div aria-label="This week's focus">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.1em] uppercase">
              This week’s focus
            </p>
            <ol className="border-border mt-2 divide-y overflow-hidden rounded-2xl border">
              {focusTasks.map((item, index) => {
                const label = result.labels![item.id]!;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.source.href as Route}
                      className="hover:bg-primary/5 flex min-h-14 items-center gap-3 px-3.5 py-2.5 transition-colors"
                    >
                      <span className="bg-primary/12 text-primary grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {label.title}
                        </span>
                        <span className="text-muted-foreground block text-[11px] first-letter:uppercase">
                          {String(item.value)} priority
                          {label.date &&
                            ` · ${formatPeriodLabel(label.date, label.date)}`}
                        </span>
                      </span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="text-muted-foreground size-4 shrink-0"
                      />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
        {figures.length > 0 && (
          <dl
            aria-label="Key figures"
            className={cn(
              "border-border grid overflow-hidden rounded-2xl border",
              figures.length > 1 && "grid-cols-2",
              figures.length > 2 && "sm:grid-cols-4",
            )}
          >
            {figures.map((item) => (
              <div
                key={item.id}
                className="border-border bg-background/40 min-w-0 border-t border-l p-3.5 sm:first:border-l-0 [&:nth-child(-n+2)]:border-t-0 sm:[&:nth-child(-n+4)]:border-t-0 [&:nth-child(odd)]:border-l-0 sm:[&:nth-child(odd)]:border-l"
              >
                <dt className="text-muted-foreground line-clamp-2 text-xs leading-4">
                  {item.metric}
                </dt>
                <dd className="mt-1.5 font-mono text-lg font-semibold tracking-tight tabular-nums">
                  <SensitiveValue>{displayValue(item)}</SensitiveValue>
                </dd>
                <dd className="text-muted-foreground mt-0.5 text-[11px]">
                  {formatPeriodLabel(item.period.from, item.period.through)}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {insights.map((claim, index) => {
          const style = claimStyles[claim.kind]!;
          const Icon = style.icon;
          return (
            <div
              key={`insight-${index}`}
              className="border-primary/40 border-l-2 pl-4"
            >
              <p className="text-primary flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.1em] uppercase">
                <Icon aria-hidden="true" className="size-3.5" />
                {style.label}
                <span className="sr-only">({claim.kind})</span>
              </p>
              <p className="text-muted-foreground mt-1.5 text-sm leading-6 text-pretty">
                <ClaimText text={personalize(claim.text, result)} />
              </p>
              <Citations
                ids={claim.evidenceIds}
                result={result}
                anchor={anchor}
                onOpen={openSources}
              />
            </div>
          );
        })}
        {groups.length > 0 && (
          <div aria-label="Runway scenario comparison">
            <div className="grid gap-2 md:grid-cols-3">
              {groups.map((group) => (
                <article
                  key={group.label}
                  className={cn(
                    "min-w-0 rounded-2xl border p-4",
                    group.label === "Current"
                      ? "border-border bg-background/40"
                      : "border-primary/25 bg-primary/5",
                  )}
                >
                  <h3
                    className={cn(
                      "text-xs font-semibold tracking-[0.1em] uppercase",
                      group.label === "Current"
                        ? "text-muted-foreground"
                        : "text-primary",
                    )}
                  >
                    {group.label}
                  </h3>
                  <dl className="mt-3 space-y-2.5">
                    {group.items.map((item) => (
                      <div key={item.id}>
                        <dt className="text-muted-foreground text-xs">
                          {item.metric.replace(`${group.label} · `, "")}
                        </dt>
                        <dd className="font-mono text-base font-semibold tabular-nums">
                          <SensitiveValue>{displayValue(item)}</SensitiveValue>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-muted-foreground mt-3 text-[11px] leading-4 break-words">
                    <SensitiveValue>
                      {group.items[0]?.comparisonBasis}
                    </SensitiveValue>
                  </p>
                </article>
              ))}
            </div>
            <p className="text-muted-foreground mt-3 text-xs leading-5">
              Every option starts from the same current runway baseline.
              Estimates depend on the stated assumptions.{" "}
              <Link
                href="/money/runway"
                className="text-primary inline-flex items-center gap-0.5 font-medium hover:underline"
              >
                Review or edit runway assumptions
                <ArrowUpRight aria-hidden="true" className="size-3" />
              </Link>
            </p>
          </div>
        )}
      </div>
      {(result.limitations.length > 0 || result.evidence.length > 0) && (
        <footer className="border-border bg-background/35 border-t px-5 py-3 sm:px-6">
          {result.evidence.length > 0 && (
            <details
              ref={sources}
              open={claims.length === 0 && groups.length === 0}
              className="group"
            >
              <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-lg text-xs font-medium focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                Sources · {result.evidence.length} ATLAS{" "}
                {result.evidence.length === 1 ? "fact" : "facts"} ·{" "}
                {inspectedSpan(result.evidence)}
                {result.evidence.some(
                  (item) => item.completeness !== "complete",
                )
                  ? " · some incomplete"
                  : ""}
                <ChevronDown
                  aria-hidden="true"
                  className="size-3.5 transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="mt-2 mb-2 grid gap-2 sm:grid-cols-2">
                {result.evidence.map((item) => (
                  <article
                    key={item.id}
                    id={anchor(item.id)}
                    className="border-border bg-card min-w-0 scroll-mt-24 rounded-xl border p-3.5"
                  >
                    <h4 className="text-muted-foreground text-xs font-medium">
                      {nameOf(result, item)}
                    </h4>
                    <p className="mt-1 font-mono text-base font-semibold tabular-nums">
                      <SensitiveValue>{displayValue(item)}</SensitiveValue>
                    </p>
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      {formatPeriodLabel(item.period.from, item.period.through)}
                      {item.completeness !== "complete" &&
                        ` · ${item.completeness}`}
                    </p>
                    <p className="text-muted-foreground mt-1 text-[11px] leading-4 break-words">
                      <SensitiveValue>{item.comparisonBasis}</SensitiveValue>
                    </p>
                    {item.relationship && (
                      <p className="text-muted-foreground mt-1 text-[11px] break-words">
                        Current {item.relationship.origin} path:{" "}
                        {item.relationship.source.type} →{" "}
                        {item.relationship.target.type}
                      </p>
                    )}
                    <Link
                      href={item.source.href as Route}
                      className="text-primary mt-1.5 inline-flex min-h-8 items-center gap-0.5 text-xs font-medium hover:underline"
                    >
                      View ATLAS records
                      <ArrowUpRight aria-hidden="true" className="size-3" />
                    </Link>
                  </article>
                ))}
              </div>
            </details>
          )}
          {result.limitations.length > 0 && (
            <details className="group">
              <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-lg text-xs font-medium focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                {result.limitations.length === 1
                  ? "1 note on these facts"
                  : `${result.limitations.length} notes on these facts`}
                <ChevronDown
                  aria-hidden="true"
                  className="size-3.5 transition-transform group-open:rotate-180"
                />
              </summary>
              <ul className="text-muted-foreground mb-2 list-disc space-y-1 pl-4 text-xs leading-5">
                {result.limitations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </details>
          )}
        </footer>
      )}
    </>
  );
}

const baseStages: AnalystStage[] = [
  "understanding",
  "reading",
  "writing",
  "checking",
];

/** The real stages as the route reports them, as a short checklist. */
function ProgressChecklist({ turn }: { turn: Turn }) {
  const steps =
    turn.stage === "repairing"
      ? [...baseStages, "repairing" as const]
      : baseStages;
  const active = steps.indexOf(turn.stage);
  return (
    <div className="px-5 pb-6 sm:px-6" role="status">
      <ol aria-label="Analyst progress" className="space-y-1">
        {steps.map((step, index) => {
          const state =
            index < active ? "done" : index === active ? "active" : "upcoming";
          return (
            <li
              key={step}
              data-state={state}
              aria-current={state === "active" ? "step" : undefined}
              className={cn(
                "flex min-h-9 items-center gap-3 text-sm transition-colors duration-300",
                state === "upcoming" && "text-muted-foreground/60",
                state === "done" && "text-muted-foreground",
                state === "active" &&
                  "text-foreground motion-safe:animate-analyst-rise font-medium",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "relative grid size-5 shrink-0 place-items-center rounded-full",
                  state === "done" && "bg-primary/12 text-primary",
                  state === "active" && "bg-primary/15",
                  state === "upcoming" && "border-border border",
                )}
              >
                {state === "done" ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : state === "active" ? (
                  <>
                    <span className="bg-primary/35 absolute inset-0 rounded-full motion-safe:animate-ping" />
                    <span className="bg-primary relative size-2 rounded-full" />
                  </>
                ) : null}
              </span>
              <span className="min-w-0 leading-5">
                {stageLabel(step, step === "reading" ? turn.domains : [])}
                {state === "active" && <span aria-hidden="true">…</span>}
                {state === "done" && <span className="sr-only"> (done)</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <div
        className="mt-4 space-y-2.5 motion-safe:animate-pulse"
        aria-hidden="true"
      >
        <div className="bg-muted h-2.5 w-11/12 rounded-full" />
        <div className="bg-muted h-2.5 w-3/5 rounded-full" />
      </div>
    </div>
  );
}

/** Tappable follow-ups under the latest answered or fallback turn. */
function FollowUps({
  suggestions,
  disabled,
  onAsk,
}: {
  suggestions: string[];
  disabled: boolean;
  onAsk: (text: string) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <div aria-label="Suggested follow-ups" role="group" className="pl-1">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.1em] uppercase">
        Ask next
      </p>
      <ul className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {suggestions.map((text, index) => (
          <li
            key={text}
            className="motion-safe:animate-analyst-rise min-w-0"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAsk(text)}
              className="group border-border bg-card hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-ring flex min-h-11 w-full items-center gap-2 rounded-2xl border px-3.5 py-2 text-left text-sm leading-5 shadow-[0_6px_18px_rgb(7_10_15/0.06)] transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60 sm:w-auto sm:rounded-full"
            >
              <CornerDownRight
                aria-hidden="true"
                className="text-muted-foreground group-hover:text-primary size-3.5 shrink-0 transition-colors"
              />
              <span className="min-w-0">{text}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnswerCard({ turn }: { turn: Turn }) {
  const verified = turn.result?.status === "answered";
  return (
    <article
      aria-label="Analyst answer"
      aria-live="polite"
      className="border-border bg-card overflow-hidden rounded-[1.5rem] border shadow-[0_18px_50px_rgb(7_10_15/0.10)]"
    >
      <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="bg-primary/12 text-primary grid size-8 shrink-0 place-items-center rounded-xl">
            <Sparkles aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold whitespace-nowrap">
              ATLAS Analyst
            </p>
            {turn.result?.matchedEntity && (
              <p className="text-muted-foreground truncate text-xs">
                Using your {turn.result.matchedEntity.type} “
                {turn.result.matchedEntity.name}”.
              </p>
            )}
          </div>
        </div>
        {verified && (
          <span
            title="Every figure and comparison was checked against the ATLAS records it cites."
            className="bg-primary/10 text-primary inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          >
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            Checked
            <span className="hidden sm:inline">against your records</span>
          </span>
        )}
        {turn.result?.status === "fallback" && (
          <span className="bg-muted text-muted-foreground inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold">
            ATLAS facts only
          </span>
        )}
      </header>
      {turn.pending ? (
        <ProgressChecklist turn={turn} />
      ) : turn.error ? (
        <p role="alert" className="text-destructive px-5 pb-5 text-sm sm:px-6">
          {turn.error}
        </p>
      ) : turn.result ? (
        <AnswerBody turn={turn} />
      ) : null}
    </article>
  );
}

function Composer({
  question,
  setQuestion,
  onAsk,
  input,
  pending,
  consent,
  followUp,
  maxLength,
  focus,
  setFocus,
  focusLabel,
  goals,
  debts,
  children,
}: {
  question: string;
  setQuestion: (value: string) => void;
  onAsk: () => void;
  input: React.RefObject<HTMLTextAreaElement | null>;
  pending: boolean;
  consent: boolean;
  followUp: boolean;
  maxLength: number;
  focus: string;
  setFocus: (value: string) => void;
  focusLabel: string | undefined;
  goals: Array<{ id: string; title: string }>;
  debts: Array<{ id: string; creditor_name: string }>;
  children?: ReactNode;
}) {
  const length = question.trim().length;
  const tooLong = length > maxLength;
  const canAsk = !pending && consent && length >= 8 && !tooLong;
  const hasTargets = goals.length > 0 || debts.length > 0;
  const focusChip = focusLabel && (
    <span className="bg-primary/10 text-primary inline-flex min-h-8 max-w-[14rem] items-center gap-1.5 rounded-full pr-1 pl-3 text-xs font-medium">
      <Crosshair aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="truncate">Focus: {focusLabel}</span>
      <button
        type="button"
        aria-label="Clear focus"
        onClick={() => setFocus("")}
        className="hover:bg-primary/15 grid size-6 place-items-center rounded-full"
      >
        <X aria-hidden="true" className="size-3" />
      </button>
    </span>
  );
  const focusPicker = hasTargets && !focusLabel && (
    <label
      title="Focus on a goal or debt"
      className={cn(
        "text-muted-foreground hover:text-foreground hover:bg-muted relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full text-xs font-medium",
        followUp ? "size-10 justify-center" : "min-h-8 px-3",
      )}
    >
      <Crosshair aria-hidden="true" className="size-4" />
      <span className={cn(followUp && "sr-only")}>Focus</span>
      <select
        aria-label="Focus on a goal or debt"
        value={focus}
        onChange={(event) => setFocus(event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="">All records</option>
        {goals.length > 0 && (
          <optgroup label="Goals">
            {goals.map((goal) => (
              <option key={goal.id} value={`goal:${goal.id}`}>
                {goal.title}
              </option>
            ))}
          </optgroup>
        )}
        {debts.length > 0 && (
          <optgroup label="Debts (monthly payment scenarios)">
            {debts.map((debt) => (
              <option key={debt.id} value={`debt:${debt.id}`}>
                {debt.creditor_name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </label>
  );
  const textarea = (
    <textarea
      id="analyst-question"
      ref={input}
      value={question}
      maxLength={maxLength}
      rows={followUp ? 1 : 2}
      onChange={(event) => setQuestion(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          onAsk();
        }
      }}
      placeholder={
        followUp
          ? "Ask a follow-up…"
          : "Ask about your money, goals, tasks or reviews…"
      }
      className={cn(
        "placeholder:text-muted-foreground/80 block w-full resize-none bg-transparent text-[0.9375rem] leading-6 focus:outline-none",
        followUp ? "min-w-0 flex-1 px-1 py-2" : "px-4 pt-3.5 pb-1",
      )}
    />
  );
  const send = (
    <button
      type="submit"
      aria-label={pending ? "Analyzing…" : "Ask Analyst"}
      disabled={!canAsk}
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full transition-all",
        canAsk
          ? "bg-primary-solid text-primary-solid-foreground shadow-[0_8px_20px_rgb(43_102_242/0.35)] hover:brightness-110"
          : "bg-muted text-muted-foreground",
      )}
    >
      <ArrowUp aria-hidden="true" className="size-4.5" />
    </button>
  );
  const warning = tooLong && (
    <p role="status" className="text-destructive px-4 pb-2 text-xs">
      Questions with a focus can be up to {maxLength} characters. Shorten it or
      clear the focus.
    </p>
  );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onAsk();
      }}
      className="border-border bg-background/60 focus-within:border-primary/50 focus-within:ring-primary/15 rounded-2xl border transition-shadow focus-within:ring-4"
    >
      <label htmlFor="analyst-question" className="sr-only">
        Ask about your ATLAS records
      </label>
      {followUp ? (
        <>
          {focusChip && <div className="px-2 pt-2">{focusChip}</div>}
          {/* One compact row keeps the pinned composer short on phones. */}
          <div className="flex items-end gap-1 p-1.5">
            {focusPicker}
            {textarea}
            {children}
            {send}
          </div>
          {warning}
        </>
      ) : (
        <>
          {textarea}
          {warning}
          <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {focusChip}
              {focusPicker}
              {children}
            </div>
            {send}
          </div>
        </>
      )}
    </form>
  );
}

/** Applies stage lines as they arrive and returns the final result body. */
async function readStream(
  response: Response,
  onStage: (stage: AnalystStage, domains?: AnalystDomain[]) => void,
) {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let buffer = "";
  let result: unknown = null;
  const take = (line: string) => {
    if (!line.trim()) return;
    const event = parseStreamEvent(line);
    if (!event) return;
    if (event.type === "result") result = event.body;
    else
      onStage(
        event.stage,
        event.stage === "reading" ? event.domains : undefined,
      );
  };
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(take);
    if (done) break;
  }
  take(buffer);
  return result as { status?: string; error?: string } | null;
}

/** One conversation: suggested starters, a thread of answers and one composer. */
export function FreeformWorkspace({
  goals = [],
  debts = [],
  userId = "",
}: {
  goals?: Array<{ id: string; title: string }>;
  debts?: Array<{ id: string; creditor_name: string }>;
  userId?: string;
}) {
  const nextId = useRef(1);
  const input = useRef<HTMLTextAreaElement>(null);
  const latest = useRef<HTMLLIElement>(null);
  const [question, setQuestion] = useState("");
  const [focus, setFocus] = useState("");
  const [consent, setConsent] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const pending = turns.some((turn) => turn.pending);
  const asked = new Set(turns.map((turn) => questionKey(turn.question)));

  useEffect(() => {
    const saved = readConsent(userId);
    queueMicrotask(() => setConsent(saved));
  }, [userId]);

  // Bring each new question into view as it is asked.
  useEffect(() => {
    latest.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [turns.length]);

  const [focusType, focusId] = focus.split(":") as [
    "goal" | "debt" | "",
    string | undefined,
  ];
  const focusLabel =
    focusType === "goal"
      ? goals.find((goal) => goal.id === focusId)?.title
      : focusType === "debt"
        ? debts.find((debt) => debt.id === focusId)?.creditor_name
        : undefined;

  function updateConsent(granted: boolean) {
    setConsent(granted);
    writeConsent(userId, granted);
    if (granted) input.current?.focus();
  }

  /**
   * `followUpOf` marks a suggested follow-up: it always carries the turn it
   * came from (even a fallback) and asks without a goal or debt focus, since
   * suggestions are whole-domain questions a focus could reject.
   */
  async function ask(text: string, followUpOf?: number) {
    const chip = followUpOf !== undefined;
    const target = chip
      ? { type: "" as const, id: undefined, label: undefined }
      : { type: focusType, id: focusId, label: focusLabel };
    const trimmed = text.trim();
    if (trimmed.length < 8 || trimmed.length > (target.id ? 400 : 500)) return;
    if (pending || !consent) return;
    if (chip) setFocus("");
    // Answered exchanges, and clarification requests, give follow-ups their
    // context: a short reply to a clarification keeps the original question.
    const history = turns
      .filter(
        (turn) =>
          turn.result?.status === "answered" ||
          turn.result?.status === "clarification_required" ||
          turn.id === followUpOf,
      )
      .slice(-2)
      .map((turn) => ({
        question: turn.question,
        answer: (turn.result?.status === "answered"
          ? (turn.result.claims ?? []).map((claim) => claim.text).join(" ")
          : (turn.result?.message ?? "")
        ).slice(0, 600),
      }));
    const id = nextId.current++;
    setTurns((current) => [
      ...current,
      {
        id,
        question: trimmed,
        focus: target.label ?? null,
        result: null,
        error: "",
        pending: true,
        stage: "understanding",
        domains: [],
      },
    ]);
    setQuestion("");
    const update = (patch: Partial<Turn>) =>
      setTurns((current) =>
        current.map((turn) =>
          turn.id === id ? { ...turn, ...patch, pending: false } : turn,
        ),
      );
    // Stages only move forward; a late or repeated event never rewinds.
    const advance = (stage: AnalystStage, domains?: AnalystDomain[]) =>
      setTurns((current) =>
        current.map((turn) =>
          turn.id === id &&
          turn.pending &&
          ANALYST_STAGES.indexOf(stage) >= ANALYST_STAGES.indexOf(turn.stage)
            ? { ...turn, stage, ...(domains && { domains }) }
            : turn,
        ),
      );
    try {
      const response = await fetch("/api/analyst/freeform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: `${NDJSON_TYPE}, application/json`,
        },
        body: JSON.stringify({
          question: trimmed,
          ...(target.type === "goal" && target.id && { goalId: target.id }),
          ...(target.type === "debt" && target.id && { debtId: target.id }),
          ...(history.length > 0 && { history }),
          dataSharingAcknowledged: true,
        }),
      });
      const body = response.headers.get("content-type")?.includes(NDJSON_TYPE)
        ? await readStream(response, advance)
        : await response.json();
      if (body?.status) update({ result: body as FreeformResult });
      else
        update({ error: body?.error ?? "Analyst is unavailable. Try again." });
    } catch {
      update({ error: "Analyst is unavailable. Try again." });
    }
  }

  function startOver() {
    setTurns([]);
    setFocus("");
    setQuestion("");
    input.current?.focus();
  }

  const composer = (followUp: boolean) => (
    <Composer
      question={question}
      setQuestion={setQuestion}
      onAsk={() => void ask(question)}
      input={input}
      pending={pending}
      consent={consent}
      followUp={followUp}
      maxLength={focus ? 400 : 500}
      focus={focus}
      setFocus={setFocus}
      focusLabel={focusLabel}
      goals={goals}
      debts={debts}
    >
      {followUp && (
        <button
          type="button"
          onClick={startOver}
          aria-label="New conversation"
          title="New conversation"
          className="text-muted-foreground hover:text-foreground hover:bg-muted grid size-10 shrink-0 place-items-center rounded-full"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
        </button>
      )}
    </Composer>
  );

  const consentNotice = !consent && (
    <div className="border-border bg-background/40 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center">
      <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-xl">
        <ShieldCheck aria-hidden="true" className="size-4" />
      </span>
      <p className="text-muted-foreground min-w-0 flex-1 text-xs leading-5">
        To answer, Analyst shares the relevant facts from your records with
        OpenAI under your organization’s data-sharing settings. You choose once
        on this device and can turn it off anytime.
      </p>
      <button
        type="button"
        onClick={() => updateConsent(true)}
        className="bg-primary-solid text-primary-solid-foreground min-h-9 shrink-0 rounded-full px-4 text-xs font-semibold hover:brightness-110"
      >
        Allow data sharing
      </button>
    </div>
  );

  const sharingStatus = consent && (
    <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-[11px]">
      <ShieldCheck aria-hidden="true" className="size-3.5" />
      Data sharing on
      <span aria-hidden="true">·</span>
      <button
        type="button"
        onClick={() => updateConsent(false)}
        className="hover:text-foreground inline-flex min-h-8 items-center font-medium underline-offset-2 hover:underline"
      >
        Turn off
      </button>
    </p>
  );

  return (
    <section aria-label="Ask Analyst" className="space-y-6">
      {turns.length === 0 ? (
        <div className="border-primary/25 bg-card relative overflow-hidden rounded-[1.75rem] border shadow-[0_24px_70px_rgb(7_10_15/0.14)]">
          <div
            aria-hidden="true"
            className="from-primary/12 pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent"
          />
          <div className="relative space-y-4 px-5 pt-6 pb-5 sm:px-7 sm:pt-7">
            <div>
              <p className="text-primary text-xs font-semibold tracking-[0.12em] uppercase">
                Ask ATLAS
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
                What would you like to understand?
              </h2>
            </div>
            {consentNotice}
            {composer(false)}
            {sharingStatus}
          </div>
          <div className="border-border bg-background/35 relative border-t px-5 pt-4 pb-5 sm:px-7">
            <h3 className="text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase">
              Start with
            </h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {SUGGESTED_QUESTIONS.map((suggestion, index) => {
                const Icon = starterIcons[index]!;
                return (
                  <li key={suggestion}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (consent) void ask(suggestion);
                        else {
                          setQuestion(suggestion);
                          input.current?.focus();
                        }
                      }}
                      className="group border-border bg-card hover:border-primary/40 hover:bg-primary/5 flex min-h-14 w-full items-center gap-3 rounded-2xl border p-3 text-left text-sm transition-colors"
                    >
                      <span className="bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 grid size-8 shrink-0 place-items-center rounded-xl transition-colors">
                        <Icon aria-hidden="true" className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 leading-5">
                        {suggestion}
                      </span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="text-muted-foreground/50 group-hover:text-primary size-4 shrink-0 transition-colors"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : (
        <>
          <ol aria-label="Conversation" className="space-y-6">
            {turns.map((turn, index) => (
              <li
                key={turn.id}
                ref={index === turns.length - 1 ? latest : undefined}
                className="scroll-mt-6 space-y-3"
              >
                <div className="flex justify-end">
                  <p className="bg-primary-solid text-primary-solid-foreground max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-6 break-words shadow-[0_8px_24px_rgb(43_102_242/0.25)]">
                    {turn.question}
                    {turn.focus && (
                      <span className="mt-0.5 block text-xs opacity-80">
                        Focus: {turn.focus}
                      </span>
                    )}
                  </p>
                </div>
                <AnswerCard turn={turn} />
                {index === turns.length - 1 &&
                  (turn.result?.status === "answered" ||
                    turn.result?.status === "fallback") && (
                    <FollowUps
                      suggestions={(turn.result.suggestions ?? [])
                        .filter((text) => !asked.has(questionKey(text)))
                        .slice(0, 3)}
                      disabled={pending || !consent}
                      onAsk={(text) => void ask(text, turn.id)}
                    />
                  )}
              </li>
            ))}
          </ol>
          {consentNotice}
          <div className="bg-card/95 sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 rounded-2xl shadow-[0_18px_50px_rgb(7_10_15/0.22)] backdrop-blur lg:bottom-4">
            {composer(true)}
          </div>
          {sharingStatus}
        </>
      )}

      <details className="group text-muted-foreground text-xs">
        <summary className="hover:text-foreground inline-flex min-h-9 cursor-pointer list-none items-center gap-1 font-medium [&::-webkit-details-marker]:hidden">
          How Analyst answers
          <ChevronDown
            aria-hidden="true"
            className="size-3.5 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="mt-1 max-w-2xl space-y-1 leading-5">
          <p>
            ATLAS calculates every figure from your records. GPT-5.4 mini plans
            which records to read, and GPT-4o mini explains them; every number
            it writes is checked against the facts it cites. Follow-ups use your
            last two answers as context.
          </p>
          <p>
            Scenarios are estimates, and extra debt payments are treated as
            monthly. Mark amounts with ₱ or “pesos”. Questions about unavailable
            history may need clarification.
          </p>
        </div>
      </details>
    </section>
  );
}
