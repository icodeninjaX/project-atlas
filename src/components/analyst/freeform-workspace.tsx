"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ChevronDown, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import {
  ClaimText,
  evidenceDisplayValue as displayValue,
} from "@/components/analyst/evidence-display";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";
import type { GroundedClaim } from "@/lib/analyst/freeform/answer";
import { formatPeriodLabel } from "@/lib/history/period-label";

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

function Answer({ turn }: { turn: Turn }) {
  const sources = useRef<HTMLDetailsElement>(null);
  const result = turn.result;
  if (turn.pending)
    return (
      <p role="status" className="text-muted-foreground text-sm">
        Checking your records…
      </p>
    );
  if (turn.error)
    return (
      <p role="alert" className="text-destructive text-sm">
        {turn.error}
      </p>
    );
  if (!result) return null;
  const anchor = (id: string) =>
    `evidence-${turn.id}-${encodeURIComponent(id)}`;
  const groups = scenarioGroups(result.evidence);
  const hasClaims = (result.claims?.length ?? 0) > 0;
  return (
    <div className="space-y-4">
      {result.matchedEntity && (
        <p className="text-muted-foreground text-xs">
          Using your {result.matchedEntity.type} “{result.matchedEntity.name}”.
        </p>
      )}
      {result.message && (
        <p className="bg-muted/50 rounded-lg px-3 py-2 text-sm leading-relaxed">
          {result.message}
        </p>
      )}
      {hasClaims && (
        <ul className="space-y-3">
          {result.claims!.map((claim, index) => (
            <li key={index}>
              <p className="text-sm leading-relaxed">
                <span className="text-muted-foreground mr-2 text-[11px] font-semibold tracking-wide uppercase">
                  {claim.kind}
                </span>
                <ClaimText text={claim.text} />
              </p>
              <div
                className="mt-1.5 flex flex-wrap gap-1.5"
                aria-label="Evidence for this point"
              >
                {claim.evidenceIds.map((id) => (
                  <a
                    key={id}
                    href={`#${anchor(id)}`}
                    onClick={() => {
                      if (sources.current) sources.current.open = true;
                    }}
                    className="border-border text-primary inline-flex min-h-9 items-center rounded-full border px-3 text-xs underline-offset-2 hover:underline"
                  >
                    {result.evidence.find((item) => item.id === id)?.metric ??
                      "Evidence"}
                  </a>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      {groups.length > 0 && (
        <div aria-label="Runway scenario comparison">
          <div className="grid gap-3 md:grid-cols-3">
            {groups.map((group) => (
              <article
                key={group.label}
                className="border-border min-w-0 rounded-xl border p-3"
              >
                <h3 className="text-sm font-semibold">{group.label}</h3>
                <dl className="mt-2 space-y-2">
                  {group.items.map((item) => (
                    <div key={item.id}>
                      <dt className="text-muted-foreground text-xs">
                        {item.metric.replace(`${group.label} · `, "")}
                      </dt>
                      <dd className="font-mono text-sm">
                        <SensitiveValue>{displayValue(item)}</SensitiveValue>
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="text-muted-foreground mt-2 text-xs break-words">
                  <SensitiveValue>
                    {group.items[0]?.comparisonBasis}
                  </SensitiveValue>
                </p>
              </article>
            ))}
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            Every option uses the same current runway baseline. Estimates depend
            on the stated assumptions and are not guaranteed.{" "}
            <Link
              href="/money/runway"
              className="text-primary inline-flex min-h-9 items-center underline"
            >
              Review or edit runway assumptions
            </Link>
          </p>
        </div>
      )}
      {(result.status === "answered" || result.limitations.length > 0) && (
        <ul className="text-muted-foreground space-y-1 text-xs">
          {result.status === "answered" && (
            <li>
              Every figure and comparison above was checked against the ATLAS
              records it cites.
            </li>
          )}
          {result.limitations.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
      {result.evidence.length > 0 && (
        <details
          ref={sources}
          open={!hasClaims && groups.length === 0}
          className="group border-border border-t pt-3"
        >
          <summary className="text-muted-foreground hover:text-foreground inline-flex min-h-9 cursor-pointer list-none items-center gap-1 text-xs font-semibold [&::-webkit-details-marker]:hidden">
            Sources · {result.evidence.length} ATLAS{" "}
            {result.evidence.length === 1 ? "fact" : "facts"} ·{" "}
            {inspectedSpan(result.evidence)}
            {result.evidence.some((item) => item.completeness !== "complete")
              ? " · some incomplete"
              : ""}
            <ChevronDown
              aria-hidden="true"
              className="size-3.5 transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {result.evidence.map((item) => (
              <article
                key={item.id}
                id={anchor(item.id)}
                className="border-border min-w-0 scroll-mt-24 rounded-xl border p-3"
              >
                <h4 className="text-sm font-semibold">{item.metric}</h4>
                <p className="mt-1 font-mono text-base">
                  <SensitiveValue>{displayValue(item)}</SensitiveValue>
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {item.period.from} to {item.period.through} ·{" "}
                  {item.completeness}
                </p>
                <p className="text-muted-foreground mt-1 text-xs break-words">
                  <SensitiveValue>{item.comparisonBasis}</SensitiveValue>
                </p>
                {item.relationship && (
                  <p className="text-muted-foreground mt-1 text-xs break-words">
                    Current {item.relationship.origin} path:{" "}
                    {item.relationship.source.type} →{" "}
                    {item.relationship.target.type}
                  </p>
                )}
                <Link
                  href={item.source.href as Route}
                  className="text-primary mt-1 inline-flex min-h-9 items-center text-xs underline"
                >
                  View ATLAS records
                </Link>
              </article>
            ))}
          </div>
        </details>
      )}
    </div>
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
  const latest = useRef<HTMLLIElement>(null);
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
  const maxLength = focus ? 400 : 500;

  function updateConsent(granted: boolean) {
    setConsent(granted);
    writeConsent(userId, granted);
  }

  async function ask(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 8 || pending || !consent) return;
    // Answered exchanges give follow-ups their context.
    const history = turns
      .filter((turn) => turn.result?.status === "answered")
      .slice(-2)
      .map((turn) => ({
        question: turn.question,
        answer: (turn.result?.claims ?? [])
          .map((claim) => claim.text)
          .join(" ")
          .slice(0, 600),
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

  return (
    <section aria-label="Ask Analyst" className="space-y-6">
      {turns.length === 0 ? (
        <div className="border-border bg-card rounded-2xl border p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden className="text-primary size-4" />
            <h2 className="text-sm font-semibold">Start with a question</h2>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Pick one or type your own below. Name a goal or debt and Analyst
            will find it.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={pending}
                onClick={() => {
                  if (consent) void ask(suggestion);
                  else {
                    setQuestion(suggestion);
                    input.current?.focus();
                  }
                }}
                className="border-border hover:bg-muted min-h-9 rounded-full border px-3 text-left text-xs transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ol aria-label="Conversation" className="space-y-5">
          {turns.map((turn, index) => (
            <li
              key={turn.id}
              ref={index === turns.length - 1 ? latest : undefined}
              className="scroll-mt-4 space-y-2"
            >
              <div className="flex justify-end">
                <p className="bg-primary/10 max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2 text-sm break-words">
                  {turn.question}
                  {turn.focus && (
                    <span className="text-muted-foreground block text-xs">
                      Focus: {turn.focus}
                    </span>
                  )}
                </p>
              </div>
              <article
                aria-label="Analyst answer"
                aria-live="polite"
                className="border-border bg-card rounded-2xl border p-4 sm:p-5"
              >
                <Answer turn={turn} />
              </article>
            </li>
          ))}
        </ol>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
        className="border-border bg-card space-y-3 rounded-2xl border p-3 sm:p-4"
      >
        {!consent && (
          <label className="bg-muted/50 flex items-start gap-3 rounded-lg p-3 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => updateConsent(event.target.checked)}
              className="mt-1 size-4"
            />
            <span>
              Share relevant facts from my records with OpenAI to answer my
              questions, under my organization’s data-sharing settings.
              Remembered on this device; you can turn it off anytime.
            </span>
          </label>
        )}
        <label htmlFor="analyst-question" className="sr-only">
          Ask about your ATLAS records
        </label>
        <textarea
          id="analyst-question"
          ref={input}
          value={question}
          maxLength={maxLength}
          rows={2}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void ask(question);
            }
          }}
          placeholder={
            turns.length > 0
              ? "Ask a follow-up, like “What about the month before?”"
              : "Ask about your money, goals, tasks or reviews…"
          }
          className="border-border bg-background w-full resize-none rounded-xl border px-3 py-2.5 text-sm"
        />
        {focusLabel && (
          <p className="flex items-center gap-2 text-xs">
            <span className="bg-muted inline-flex items-center gap-1 rounded-full px-2.5 py-1">
              Focus: {focusLabel}
              <button
                type="button"
                aria-label="Clear focus"
                onClick={() => setFocus("")}
                className="hover:text-foreground text-muted-foreground"
              >
                <X aria-hidden className="size-3" />
              </button>
            </span>
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {(goals.length > 0 || debts.length > 0) && (
              <label className="text-muted-foreground inline-flex items-center gap-2">
                <span>Focus</span>
                <select
                  aria-label="Focus on a goal or debt"
                  value={focus}
                  onChange={(event) => setFocus(event.target.value)}
                  className="border-border bg-background min-h-9 max-w-[12rem] rounded-lg border px-2 text-xs"
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
            )}
            {turns.length > 0 && (
              <button
                type="button"
                onClick={startOver}
                className="text-primary inline-flex min-h-9 items-center underline"
              >
                New conversation
              </button>
            )}
            {consent && (
              <span className="text-muted-foreground">
                Data sharing on ·{" "}
                <button
                  type="button"
                  onClick={() => updateConsent(false)}
                  className="text-primary inline-flex min-h-9 items-center underline"
                >
                  Turn off
                </button>
              </span>
            )}
          </div>
          <Button
            type="submit"
            disabled={pending || !consent || question.trim().length < 8}
          >
            {pending ? "Analyzing…" : "Ask Analyst"}
          </Button>
        </div>
      </form>

      <details className="group text-muted-foreground text-xs">
        <summary className="hover:text-foreground inline-flex min-h-9 cursor-pointer list-none items-center gap-1 font-semibold [&::-webkit-details-marker]:hidden">
          How Analyst answers
          <ChevronDown
            aria-hidden="true"
            className="size-3.5 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="mt-1 space-y-1 leading-5">
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
