"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowUp,
  ArrowUpRight,
  CalendarCheck,
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
} from "lucide-react";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import {
  ClaimText,
  evidenceDisplayValue as displayValue,
} from "@/components/analyst/evidence-display";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";
import type { GroundedClaim } from "@/lib/analyst/freeform/answer";
import { formatPeriodLabel } from "@/lib/history/period-label";
import { cn } from "@/lib/utils";

type FreeformResult = {
  status: "answered" | "fallback" | "unsupported" | "clarification_required";
  message?: string;
  claims?: GroundedClaim[];
  evidence: ToolEvidence[];
  limitations: string[];
  matchedEntity?: { type: "goal" | "debt"; name: string };
};

type Turn = {
  id: number;
  question: string;
  focus: string | null;
  result: FreeformResult | null;
  error: string;
  pending: boolean;
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
  evidence,
  anchor,
  onOpen,
}: {
  ids: string[];
  evidence: ToolEvidence[];
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
          {evidence.find((item) => item.id === id)?.metric ?? "Evidence"}
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
              <ClaimText text={claim.text} />
            </p>
            <Citations
              ids={claim.evidenceIds}
              evidence={result.evidence}
              anchor={anchor}
              onOpen={openSources}
            />
          </div>
        ))}
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
                <dt className="text-muted-foreground truncate text-xs">
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
                <ClaimText text={claim.text} />
              </p>
              <Citations
                ids={claim.evidenceIds}
                evidence={result.evidence}
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
                      {item.metric}
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
            <span className="hidden sm:inline">&nbsp;against your records</span>
          </span>
        )}
        {turn.result?.status === "fallback" && (
          <span className="bg-muted text-muted-foreground inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold">
            ATLAS facts only
          </span>
        )}
      </header>
      {turn.pending ? (
        <div className="px-5 pb-6 sm:px-6" role="status">
          <p className="text-muted-foreground text-sm">Reading your records…</p>
          <div className="mt-4 space-y-2.5 motion-safe:animate-pulse">
            <div className="bg-muted h-3 w-11/12 rounded-full" />
            <div className="bg-muted h-3 w-4/5 rounded-full" />
            <div className="bg-muted h-3 w-3/5 rounded-full" />
          </div>
        </div>
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
        className="placeholder:text-muted-foreground/80 block w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[0.9375rem] leading-6 focus:outline-none"
      />
      {tooLong && (
        <p role="status" className="text-destructive px-4 text-xs">
          Questions with a focus can be up to {maxLength} characters. Shorten it
          or clear the focus.
        </p>
      )}
      <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {(goals.length > 0 || debts.length > 0) &&
            (focusLabel ? (
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
            ) : (
              <label className="text-muted-foreground hover:text-foreground hover:bg-muted relative inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium">
                <Crosshair aria-hidden="true" className="size-3.5" />
                Focus
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
            ))}
          {children}
        </div>
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
      </div>
    </form>
  );
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

  async function ask(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 8 || trimmed.length > (focusId ? 400 : 500)) return;
    if (pending || !consent) return;
    // Answered exchanges, and clarification requests, give follow-ups their
    // context: a short reply to a clarification keeps the original question.
    const history = turns
      .filter(
        (turn) =>
          turn.result?.status === "answered" ||
          turn.result?.status === "clarification_required",
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
        focus: focusLabel ?? null,
        result: null,
        error: "",
        pending: true,
      },
    ]);
    setQuestion("");
    const update = (patch: Partial<Turn>) =>
      setTurns((current) =>
        current.map((turn) =>
          turn.id === id ? { ...turn, ...patch, pending: false } : turn,
        ),
      );
    try {
      const response = await fetch("/api/analyst/freeform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          ...(focusType === "goal" && focusId && { goalId: focusId }),
          ...(focusType === "debt" && focusId && { debtId: focusId }),
          ...(history.length > 0 && { history }),
          dataSharingAcknowledged: true,
        }),
      });
      const body = await response.json();
      if (body.status) update({ result: body as FreeformResult });
      else
        update({ error: body.error ?? "Analyst is unavailable. Try again." });
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
          className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium"
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
          New conversation
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
              </li>
            ))}
          </ol>
          <div className="border-border bg-card/90 sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 space-y-2 rounded-[1.5rem] border p-2.5 shadow-[0_18px_50px_rgb(7_10_15/0.18)] backdrop-blur lg:bottom-4">
            {consentNotice}
            {composer(true)}
            {sharingStatus}
          </div>
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
