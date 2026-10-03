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
  Calculator,
  Lock,
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
import { AI_MODELS, type AnalystModelId } from "@/lib/ai/models";
import { ModelPicker, optionFor } from "@/components/analyst/model-picker";
import { formatPeriodLabel } from "@/lib/history/period-label";
import { cn } from "@/lib/utils";
import {
  eyebrowClass,
  glassCardClass,
  iconTileClass,
  tileClass,
  type AreaTone,
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

/** Each starter's icon, area, and color, in SUGGESTED_QUESTIONS order. */
const starterStyles: Array<{ icon: LucideIcon; area: string; tone: AreaTone }> =
  [
    { icon: Wallet, area: "Money", tone: "emerald" },
    { icon: Compass, area: "Overview", tone: "sky" },
    { icon: TrendingDown, area: "Debts", tone: "rose" },
    { icon: CalendarCheck, area: "Tasks", tone: "violet" },
    { icon: Target, area: "Goals", tone: "amber" },
    { icon: Scale, area: "Scenarios", tone: "primary" },
  ];

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
          className="text-muted-foreground hover:text-primary hover:ring-primary/40 bg-background/55 ring-border/80 focus-visible:ring-ring inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
            <p className="bg-primary/[0.05] ring-primary/15 text-muted-foreground flex gap-2.5 rounded-2xl p-3.5 text-sm leading-6 ring-1">
              <Info
                aria-hidden="true"
                className="text-primary mt-1 size-4 shrink-0"
              />
              {result.message}
            </p>
          ) : (
            <p className="text-[0.9375rem] leading-7 text-pretty">
              {result.message}
            </p>
          ))}
        {lead.map((claim, index) => (
          <div key={`lead-${index}`}>
            <p className="text-[1rem] leading-7 tracking-[-0.005em] text-pretty">
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
                "divide-border/70 mt-2 divide-y overflow-hidden rounded-2xl",
              )}
            >
              {focusTasks.map((item, index) => {
                const label = result.labels![item.id]!;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.source.href as Route}
                      className="group hover:bg-primary/[0.05] focus-visible:ring-ring flex min-h-14 items-center gap-3 px-3.5 py-2.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                    >
                      <span className="from-primary/25 to-primary/8 text-primary ring-primary/20 grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br font-mono text-xs font-semibold ring-1 ring-inset">
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
                        className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-colors"
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
              "grid gap-2",
              figures.length > 1 && "grid-cols-2",
              figures.length > 2 && "@xl:grid-cols-4",
            )}
          >
            {figures.map((item) => (
              <div
                key={item.id}
                className={cn(
                  tileClass,
                  "relative overflow-hidden rounded-2xl p-3.5",
                )}
              >
                <span
                  aria-hidden="true"
                  className="via-primary/40 absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
                />
                <dt className="text-muted-foreground line-clamp-2 text-xs leading-4">
                  {item.metric}
                </dt>
                <dd className="mt-1.5 font-mono text-xl font-semibold tracking-tight tabular-nums">
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
              className={cn(
                "relative rounded-2xl p-4 pl-5 ring-1",
                claim.kind === "suggestion"
                  ? "bg-violet-500/[0.05] ring-violet-500/20"
                  : "bg-primary/[0.05] ring-primary/15",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-y-4 left-0 w-[3px] rounded-r-full",
                  claim.kind === "suggestion" ? "bg-violet-500" : "bg-primary",
                )}
              />
              <p
                className={cn(
                  "flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.1em] uppercase",
                  claim.kind === "suggestion"
                    ? "text-violet-700 dark:text-violet-300"
                    : "text-primary",
                )}
              >
                <Icon aria-hidden="true" className="size-3.5" />
                {style.label}
                <span className="sr-only">({claim.kind})</span>
              </p>
              <p className="text-foreground/85 mt-1.5 text-sm leading-6 text-pretty">
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
            <div className="grid gap-2 @xl:grid-cols-3">
              {groups.map((group) => (
                <article
                  key={group.label}
                  className={cn(
                    "min-w-0 rounded-2xl p-4 ring-1",
                    group.label === "Current"
                      ? "bg-background/55 ring-border/80"
                      : "bg-primary/[0.06] ring-primary/25",
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
              <div className="mt-2 mb-2 grid gap-2 @lg:grid-cols-2">
                {result.evidence.map((item) => (
                  <article
                    key={item.id}
                    id={anchor(item.id)}
                    className="bg-card ring-border/80 target:ring-primary/60 min-w-0 scroll-mt-24 rounded-2xl p-3.5 ring-1 transition-shadow target:ring-2"
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
                  state === "done" && "bg-positive/12 text-positive",
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
        <div className="from-muted via-primary/15 to-muted h-2.5 w-11/12 rounded-full bg-gradient-to-r" />
        <div className="from-muted via-primary/10 to-muted h-2.5 w-3/5 rounded-full bg-gradient-to-r" />
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
              className="group bg-card/80 ring-border/80 hover:ring-primary/40 hover:bg-primary/[0.05] focus-visible:ring-ring flex min-h-11 w-full items-center gap-2 rounded-2xl px-3.5 py-2 text-left text-sm leading-5 shadow-[0_6px_18px_rgb(7_10_15/0.06)] ring-1 backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60 sm:w-auto sm:rounded-full"
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
      data-spotlight
      className={cn(glassCardClass, "overflow-hidden")}
    >
      <div
        aria-hidden="true"
        className="via-primary/45 pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
      />
      <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="from-primary via-primary/70 grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br to-violet-500/80 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_10px_24px_-12px_color-mix(in_srgb,var(--primary)_90%,transparent)]"
          >
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold whitespace-nowrap">
              ATLAS Analyst
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
          <span
            title="Every figure and comparison was checked against the ATLAS records it cites."
            className="bg-positive/10 text-positive ring-positive/25 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1"
          >
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            Checked
            <span className="hidden sm:inline">against your records</span>
          </span>
        )}
        {turn.result?.status === "fallback" && (
          <span className="bg-background/60 text-muted-foreground ring-border inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1">
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
        "grid size-10 shrink-0 place-items-center rounded-full transition-all",
        canAsk
          ? "from-primary-solid to-primary-solid/80 text-primary-solid-foreground bg-gradient-to-br shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_8px_20px_rgb(43_102_242/0.35)] hover:brightness-110"
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
      className="bg-background/60 ring-border/80 hover:ring-primary/30 focus-within:ring-ring/70 rounded-2xl ring-1 transition-[box-shadow] focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_12%,transparent)]"
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
    <div className="bg-primary/[0.05] ring-primary/20 flex flex-col gap-3 rounded-2xl p-4 ring-1 sm:flex-row sm:items-center">
      <span aria-hidden="true" className={iconTileClass("primary", "sm")}>
        <ShieldCheck className="size-4" />
      </span>
      <p className="text-muted-foreground min-w-0 flex-1 text-xs leading-5">
        To answer, Analyst shares the relevant facts from your records with
        OpenAI, never task titles or notes. ATLAS shares this traffic with
        OpenAI for free daily usage, so OpenAI may use these facts to improve
        its models. You choose once on this device and can turn it off anytime.
      </p>
      <button
        type="button"
        onClick={() => updateConsent(true)}
        className="bg-primary-solid text-primary-solid-foreground focus-visible:ring-ring min-h-10 shrink-0 rounded-full px-4 text-xs font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_4px_14px_-4px_color-mix(in_srgb,var(--primary-solid)_55%,transparent)] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Allow data sharing
      </button>
    </div>
  );

  const sharingStatus = consent && (
    <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-[11px]">
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
            data-spotlight
            className={cn(
              glassCardClass,
              "bg-card isolate overflow-hidden rounded-[1.75rem] shadow-[0_1px_2px_rgb(7_10_15/0.06),0_32px_90px_-34px_rgb(7_10_15/0.5)] sm:rounded-[2rem]",
            )}
          >
            <div
              aria-hidden="true"
              className="from-primary/14 pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b to-transparent"
            />
            <div
              aria-hidden="true"
              className="bg-primary/20 pointer-events-none absolute -top-40 -right-24 -z-10 size-96 rounded-full blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-40 -left-24 -z-10 size-80 rounded-full bg-violet-400/10 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="atlas-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 [mask-image:radial-gradient(70%_100%_at_100%_0%,black,transparent)] opacity-40"
            />
            <div
              aria-hidden="true"
              className="via-primary/70 pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
            />
            <div className="relative space-y-4 px-4 pt-5 pb-5 min-[360px]:px-5 sm:px-7 sm:pt-7">
              <div className="flex items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="from-primary via-primary/70 grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br to-violet-500/80 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_12px_28px_-12px_color-mix(in_srgb,var(--primary)_90%,transparent)]"
                >
                  <Sparkles className="size-[1.15rem]" />
                </span>
                <div className="min-w-0">
                  <p className={eyebrowClass}>Ask ATLAS</p>
                  <h2 className="mt-0.5 text-xl font-semibold tracking-[-0.03em] text-balance sm:text-2xl">
                    What would you like to understand?
                  </h2>
                </div>
              </div>
              {consentNotice}
              {composer(false)}
              {sharingStatus}
            </div>
            <div className="border-border/70 bg-background/30 relative border-t px-4 pt-4 pb-5 min-[360px]:px-5 sm:px-7">
              <h3 className={eyebrowClass}>Start with</h3>
              <ul className="mt-3 grid gap-2 @xl:grid-cols-2">
                {SUGGESTED_QUESTIONS.map((suggestion, index) => {
                  const { icon: Icon, area, tone } = starterStyles[index]!;
                  return (
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
                        className="group bg-card/70 ring-border/80 hover:ring-primary/40 hover:bg-primary/[0.04] focus-visible:ring-ring flex min-h-16 w-full items-center gap-3 rounded-2xl p-3 text-left text-sm ring-1 transition-[background-color,box-shadow,transform] hover:-translate-y-px focus-visible:ring-2 focus-visible:outline-none motion-reduce:hover:translate-y-0"
                      >
                        <span
                          aria-hidden="true"
                          className={iconTileClass(tone, "sm")}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            aria-hidden="true"
                            className="text-muted-foreground block text-[10px] font-semibold tracking-[0.12em] uppercase"
                          >
                            {area}
                          </span>
                          <span className="mt-0.5 block leading-5 font-medium">
                            {suggestion}
                          </span>
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
                    <p className="from-primary-solid to-primary-solid/85 text-primary-solid-foreground max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br px-4 py-2.5 text-sm leading-6 break-words shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_10px_28px_-8px_rgb(43_102_242/0.45)]">
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
            <div className="bg-card/90 ring-border/80 sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 rounded-2xl shadow-[0_18px_50px_rgb(7_10_15/0.22)] ring-1 backdrop-blur-xl lg:bottom-4">
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
          data-spotlight
          className={cn(glassCardClass, "p-4 min-[360px]:p-5")}
        >
          <p className={eyebrowClass}>Guide</p>
          <h2
            id="analyst-how"
            className="mt-0.5 text-[0.9375rem] font-semibold tracking-[-0.01em]"
          >
            How Analyst answers
          </h2>
          <ol className="mt-3.5 space-y-3.5">
            {(
              [
                {
                  icon: Calculator,
                  tone: "emerald",
                  title: "ATLAS calculates",
                  text: "Every figure comes from your records, not the model.",
                },
                {
                  icon: Sparkles,
                  tone: "violet",
                  title: "A model explains",
                  text: "GPT-5.4 mini plans which records to read, and the model you choose explains them.",
                },
                {
                  icon: ShieldCheck,
                  tone: "primary",
                  title: "Every number is checked",
                  text: "Each figure is checked against the facts it cites.",
                },
              ] as const
            ).map(({ icon: Icon, tone, title, text }, index) => (
              <li key={title} className="flex items-start gap-3">
                <span aria-hidden="true" className={iconTileClass(tone, "sm")}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm leading-5 font-medium">
                    <span className="text-muted-foreground mr-1.5 font-mono text-xs">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {title}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-4">
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="border-border/70 text-muted-foreground mt-4 space-y-2 border-t pt-4 text-xs leading-5">
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
          data-spotlight
          className={cn(glassCardClass, "p-4 min-[360px]:p-5")}
        >
          <p className={eyebrowClass}>Privacy</p>
          <h2
            id="analyst-privacy"
            className="mt-0.5 text-[0.9375rem] font-semibold tracking-[-0.01em]"
          >
            What leaves ATLAS
          </h2>
          <div className="mt-3 space-y-2">
            {[
              "Only the facts an answer needs.",
              "Never task titles or notes.",
              "Your sharing choice stays on this device.",
            ].map((line) => (
              <p
                key={line}
                className="text-muted-foreground flex items-start gap-2 text-xs leading-4"
              >
                <Lock
                  aria-hidden="true"
                  className="text-primary mt-px size-3.5 shrink-0"
                />
                {line}
              </p>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
