"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Info,
  MessageSquareText,
  RotateCcw,
  X,
} from "lucide-react";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { Button } from "@/components/ui/button";
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
import { AI_MODELS, type AnalystModelId } from "@/lib/ai/models";
import { ModelPicker, optionFor } from "@/components/analyst/model-picker";
import { formatPeriodLabel } from "@/lib/history/period-label";
import { cn } from "@/lib/utils";
import {
  eyebrowClass,
  glassCardClass,
  tileClass,
} from "@/components/analyst/analyst-chrome";

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
  /** The model that wrote the explanation (it can differ after a fallback). */
  model?: { id: string; label: string };
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
  /** The model chosen when this question was asked. */
  model: AnalystModelId;
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

const consentKey = (userId: string) => `atlas:analyst-consent:${userId}`;

function readConsent(userId: string) {
  try {
    return window.localStorage.getItem(consentKey(userId)) === "granted";
  } catch {
    return false;
  }
}

const modelKey = (userId: string) => `atlas:analyst-model:${userId}`;

function readModel(userId: string): AnalystModelId {
  try {
    const saved = window.localStorage.getItem(modelKey(userId));
    // A model no longer offered falls back to the default.
    return saved && optionFor(saved).id === saved
      ? (saved as AnalystModelId)
      : AI_MODELS.analyst;
  } catch {
    return AI_MODELS.analyst;
  }
}

function writeModel(userId: string, model: AnalystModelId) {
  try {
    window.localStorage.setItem(modelKey(userId), model);
  } catch {
    /* The choice still applies for this page view. */
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

const claimLabels: Record<GroundedClaim["kind"], string | null> = {
  observation: null,
  interpretation: "What it may mean",
  suggestion: "Worth checking",
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
          className="text-muted-foreground hover:text-primary hover:ring-primary/40 bg-background/55 ring-border/80 focus-visible:ring-ring inline-flex min-h-8 items-center gap-1.5 rounded-xl px-2.5 text-[0.6875rem] font-medium ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <span
            aria-hidden="true"
            className="bg-muted-foreground/60 size-1 rounded-full"
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
            <p className="bg-background/55 text-muted-foreground flex gap-2.5 rounded-xl p-3.5 text-sm leading-6">
              <Info aria-hidden="true" className="mt-1 size-4 shrink-0" />
              {result.message}
            </p>
          ) : (
            <p className="text-[0.9375rem] leading-7 text-pretty">
              {result.message}
            </p>
          ))}
        {lead.map((claim, index) => (
          <div key={`lead-${index}`}>
            <p className="text-base leading-7 tracking-[-0.005em] text-pretty">
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
            <p className={eyebrowClass}>This week’s focus</p>
            <ol
              className={cn(
                tileClass,
                "divide-border/70 mt-2 divide-y overflow-hidden rounded-xl",
              )}
            >
              {focusTasks.map((item, index) => {
                const label = result.labels![item.id]!;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.source.href as Route}
                      className="hover:bg-muted/50 focus-visible:ring-ring flex min-h-14 items-center gap-3 px-3.5 py-2.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                    >
                      <span className="text-muted-foreground w-4 shrink-0 text-center font-mono text-xs">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {label.title}
                        </span>
                        <span className="text-muted-foreground block text-[0.6875rem] first-letter:uppercase">
                          {String(item.value)} priority
                          {label.date &&
                            ` · ${formatPeriodLabel(label.date, label.date)}`}
                        </span>
                      </span>
                      <ChevronRight
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
              tileClass,
              "grid gap-x-4 gap-y-3 rounded-xl p-3.5",
              figures.length > 1 && "grid-cols-2",
              figures.length > 2 && "@xl:grid-cols-4",
            )}
          >
            {figures.map((item) => (
              <div key={item.id} className="min-w-0">
                <dt className="text-muted-foreground line-clamp-2 text-xs leading-4">
                  {item.metric}
                </dt>
                <dd className="mt-1.5 font-mono text-xl font-semibold tracking-tight tabular-nums">
                  <SensitiveValue>{displayValue(item)}</SensitiveValue>
                </dd>
                <dd className="text-muted-foreground mt-0.5 text-[0.6875rem]">
                  {formatPeriodLabel(item.period.from, item.period.through)}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {insights.map((claim, index) => (
          <div
            key={`insight-${index}`}
            className={cn(tileClass, "rounded-xl p-4")}
          >
            <p className="text-muted-foreground text-xs font-medium">
              {claimLabels[claim.kind]}
              <span className="sr-only"> ({claim.kind})</span>
            </p>
            <p className="mt-1.5 text-sm leading-6 text-pretty">
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
        {groups.length > 0 && (
          <div aria-label="Runway scenario comparison">
            {/* One well; options sit in hairline-divided columns. */}
            <div
              className={cn(
                tileClass,
                "divide-border/70 grid divide-y overflow-hidden rounded-xl @xl:auto-cols-fr @xl:grid-flow-col @xl:divide-x @xl:divide-y-0",
              )}
            >
              {groups.map((group) => (
                <article key={group.label} className="min-w-0 p-4">
                  <h3 className="text-[0.8125rem] font-semibold">
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
                  <p className="text-muted-foreground mt-3 text-[0.6875rem] leading-4 break-words">
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
                className="text-primary font-medium hover:underline"
              >
                Review or edit runway assumptions
              </Link>
            </p>
          </div>
        )}
      </div>
      {(result.limitations.length > 0 || result.evidence.length > 0) && (
        <footer className="border-border/70 bg-background/30 border-t px-5 py-3 sm:px-6">
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
              <div className="divide-border/70 mb-1 divide-y">
                {result.evidence.map((item) => (
                  <article
                    key={item.id}
                    id={anchor(item.id)}
                    className="target:bg-muted/50 -mx-2 flex min-w-0 scroll-mt-24 items-start justify-between gap-4 rounded-lg px-2 py-3"
                  >
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium">
                        {nameOf(result, item)}
                      </h4>
                      <p className="text-muted-foreground mt-0.5 text-[0.6875rem]">
                        {formatPeriodLabel(
                          item.period.from,
                          item.period.through,
                        )}
                        {item.completeness !== "complete" &&
                          ` · ${item.completeness}`}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-[0.6875rem] leading-4 break-words">
                        <SensitiveValue>{item.comparisonBasis}</SensitiveValue>
                      </p>
                      {item.relationship && (
                        <p className="text-muted-foreground mt-0.5 text-[0.6875rem] break-words">
                          Current {item.relationship.origin} path from{" "}
                          {item.relationship.source.type} to{" "}
                          {item.relationship.target.type}
                        </p>
                      )}
                      <Link
                        href={item.source.href as Route}
                        className="text-primary mt-1 inline-flex min-h-8 items-center text-xs font-medium hover:underline"
                      >
                        View ATLAS records
                      </Link>
                    </div>
                    <p className="shrink-0 text-right font-mono text-sm font-semibold tabular-nums">
                      <SensitiveValue>{displayValue(item)}</SensitiveValue>
                    </p>
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
                "flex min-h-9 items-center gap-3 text-sm transition-colors duration-200",
                state === "upcoming" && "text-muted-foreground/60",
                state === "done" && "text-muted-foreground",
                state === "active" &&
                  "text-foreground motion-safe:animate-analyst-rise font-medium",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full",
                  state === "done" && "text-positive",
                  state === "upcoming" && "border-border border",
                )}
              >
                {state === "done" ? (
                  <Check className="size-3.5" strokeWidth={2.5} />
                ) : state === "active" ? (
                  // Pulses only while this step is actually running.
                  <span className="bg-primary size-2 rounded-full motion-safe:animate-pulse" />
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
      <p className={eyebrowClass}>Ask next</p>
      <ul className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {suggestions.map((text) => (
          <li key={text} className="min-w-0">
            <Button
              type="button"
              variant="secondary"
              disabled={disabled}
              onClick={() => onAsk(text)}
              className="h-auto w-full justify-start py-2 text-left leading-5 font-medium sm:h-auto sm:w-auto"
            >
              {text}
            </Button>
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
      className={cn(glassCardClass, "overflow-hidden")}
    >
      <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-2">
          <MessageSquareText
            aria-hidden="true"
            className="text-muted-foreground mt-0.5 size-4 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold whitespace-nowrap">
              Analyst
              <span className="text-muted-foreground font-normal">
                {" · "}
                {turn.result?.model?.label ?? optionFor(turn.model).label}
              </span>
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
          <span className="bg-positive/10 text-positive inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold">
            Checked
            <span className="hidden sm:inline">against your records</span>
          </span>
        )}
        {turn.result?.status === "fallback" && (
          <span className="bg-muted text-muted-foreground inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold">
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
  modelPicker,
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
  /** The model button, shown beside the focus control. */
  modelPicker?: ReactNode;
}) {
  const length = question.trim().length;
  const tooLong = length > maxLength;
  const canAsk = !pending && consent && length >= 8 && !tooLong;
  const hasTargets = goals.length > 0 || debts.length > 0;
  const focusChip = focusLabel && (
    <span className="bg-muted text-foreground inline-flex min-h-8 max-w-[14rem] items-center gap-1.5 rounded-xl pr-1 pl-2.5 text-xs font-medium">
      <Crosshair
        aria-hidden="true"
        className="text-muted-foreground size-3.5 shrink-0"
      />
      <span className="truncate">Focus: {focusLabel}</span>
      <button
        type="button"
        aria-label="Clear focus"
        onClick={() => setFocus("")}
        className="text-muted-foreground hover:text-foreground hover:bg-background/60 focus-visible:ring-ring grid size-6 place-items-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
      >
        <X aria-hidden="true" className="size-3" />
      </button>
    </span>
  );
  const focusPicker = hasTargets && !focusLabel && (
    <label
      title="Focus on a goal or debt"
      className={cn(
        "text-muted-foreground hover:text-foreground hover:bg-muted has-[:focus-visible]:ring-ring relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl text-xs font-medium has-[:focus-visible]:ring-2",
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
        followUp ? "min-w-0 flex-1 px-1 py-2" : "px-4 pt-4 pb-1 sm:text-base",
      )}
    />
  );
  const send = (
    <button
      type="submit"
      aria-label={pending ? "Analyzing…" : "Ask Analyst"}
      disabled={!canAsk}
      className={cn(
        "focus-visible:ring-ring focus-visible:ring-offset-background grid size-10 shrink-0 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        canAsk
          ? "bg-primary-solid text-primary-solid-foreground hover:bg-primary-solid/90 shadow-[inset_0_1px_0_rgb(255_255_255/0.14)]"
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
      className="bg-background/60 ring-border/80 focus-within:ring-ring/50 rounded-2xl ring-1 transition-shadow focus-within:ring-2"
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
            {modelPicker}
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
              {modelPicker}
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
  const [model, setModel] = useState<AnalystModelId>(AI_MODELS.analyst);
  const [turns, setTurns] = useState<Turn[]>([]);
  const pending = turns.some((turn) => turn.pending);
  const asked = new Set(turns.map((turn) => questionKey(turn.question)));

  useEffect(() => {
    const saved = readConsent(userId);
    const savedModel = readModel(userId);
    queueMicrotask(() => {
      setConsent(saved);
      setModel(savedModel);
    });
  }, [userId]);

  function chooseModel(next: AnalystModelId) {
    setModel(next);
    writeModel(userId, next);
  }

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
        model,
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
          ...(model !== AI_MODELS.analyst && { model }),
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
      modelPicker={
        <ModelPicker
          value={model}
          onChange={chooseModel}
          compact={followUp}
          disabled={pending}
        />
      }
      goals={goals}
      debts={debts}
    >
      {followUp && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={startOver}
          aria-label="New conversation"
          title="New conversation"
          className="size-10 shrink-0 sm:size-10"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
        </Button>
      )}
    </Composer>
  );

  const consentNotice = !consent && (
    <div className="bg-muted/40 flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center">
      <p className="text-muted-foreground min-w-0 flex-1 text-xs leading-5">
        To answer, Analyst shares the relevant facts from your records with
        OpenAI, never task titles or notes. ATLAS shares this traffic with
        OpenAI for free daily usage, so OpenAI may use these facts to improve
        its models. You choose once on this device and can turn it off anytime.
      </p>
      <Button
        type="button"
        size="sm"
        onClick={() => updateConsent(true)}
        className="shrink-0 self-start sm:self-center"
      >
        Allow data sharing
      </Button>
    </div>
  );

  const sharingStatus = consent && (
    <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-[0.6875rem]">
      <span
        aria-hidden="true"
        className="bg-positive size-1.5 shrink-0 rounded-full"
      />
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
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-8">
      <section aria-label="Ask Analyst" className="min-w-0 space-y-6">
        {turns.length === 0 ? (
          <div
            className={cn(
              glassCardClass,
              "bg-card isolate overflow-hidden rounded-2xl shadow-[0_1px_2px_rgb(7_10_15/0.04)]",
            )}
          >
            <div className="space-y-4 px-4 pt-5 pb-5 min-[360px]:px-5 sm:px-6 sm:pt-6">
              <h2 className="text-base font-semibold">
                Ask about your records
              </h2>
              {consentNotice}
              {composer(false)}
              {sharingStatus}
            </div>
            <div className="border-border/70 border-t pt-4 pb-2">
              <h3 className="text-muted-foreground px-4 text-xs font-medium min-[360px]:px-5 sm:px-6">
                Suggested questions
              </h3>
              <ul className="divide-border/70 mt-2 divide-y">
                {SUGGESTED_QUESTIONS.map((suggestion) => (
                  <li key={suggestion} className="min-w-0">
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
                      className="hover:bg-muted/50 focus-visible:ring-ring flex min-h-11 w-full items-center px-4 py-2.5 text-left text-sm leading-5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset disabled:opacity-60 min-[360px]:px-5 sm:px-6"
                    >
                      {suggestion}
                    </button>
                  </li>
                ))}
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
                    <p className="bg-muted text-foreground max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-6 break-words">
                      {turn.question}
                      {turn.focus && (
                        <span className="text-muted-foreground mt-0.5 block text-xs">
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
            <div className="bg-card sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 rounded-2xl shadow-lg group-data-[keyboard=open]/shell:bottom-2 lg:bottom-4">
              {composer(true)}
            </div>
            {sharingStatus}
          </>
        )}
      </section>

      <aside
        aria-label="About Analyst"
        className="min-w-0 space-y-5 lg:sticky lg:top-8"
      >
        <section
          aria-labelledby="analyst-how"
          className={cn(glassCardClass, "p-4 min-[360px]:p-5")}
        >
          <h2
            id="analyst-how"
            className="text-[0.9375rem] font-semibold tracking-[-0.01em]"
          >
            How Analyst answers
          </h2>
          <div className="text-muted-foreground mt-3 space-y-2 text-xs leading-5">
            <p>
              ATLAS calculates every figure from your records. GPT-5.4 mini
              plans which records to read, and the model you choose explains
              them.
            </p>
            <p>
              Models run on OpenAI’s free daily token pools, and ATLAS stops
              before a pool is used up. Follow-ups use your last two answers as
              context.
            </p>
            <p>
              Scenarios are estimates, and extra debt payments are treated as
              monthly. Mark amounts with ₱ or “pesos”. Questions about
              unavailable history may need clarification.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="analyst-privacy"
          className={cn(glassCardClass, "p-4 min-[360px]:p-5")}
        >
          <h2
            id="analyst-privacy"
            className="text-[0.9375rem] font-semibold tracking-[-0.01em]"
          >
            What leaves ATLAS
          </h2>
          <ul className="text-muted-foreground mt-3 list-disc space-y-1.5 pl-4 text-xs leading-5">
            <li>Only the facts an answer needs.</li>
            <li>Never task titles or notes.</li>
            <li>Your sharing choice stays on this device.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
