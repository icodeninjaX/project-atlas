"use client";

import { ArrowUp, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ClaimText } from "@/components/analyst/evidence-display";
import { ModelPicker, optionFor } from "@/components/analyst/model-picker";
import { AI_MODELS, type AnalystModelId } from "@/lib/ai/models";
import { NDJSON_TYPE } from "@/lib/analyst/freeform/progress";
import {
  CONSENT_DOMAINS,
  type ConsentDomain,
} from "@/lib/analyst/intelligence/contracts";
import { UI_TEXT, detectLanguage } from "@/lib/analyst/intelligence/language";
import {
  CONSENT_VERSION,
  SHARED_ROUTE,
  describeConsent,
  parseConsent,
  type AnalystConsent,
} from "@/lib/analyst/intelligence/policy";
import type { PresentedClaim } from "@/lib/analyst/intelligence/presentation";
import {
  progressLabel,
  type V2ProgressEvent,
  type V2StreamEvent,
} from "@/lib/analyst/intelligence/progress";
import type { V2Response } from "@/lib/analyst/intelligence/run";

/**
 * The Analyst V2 conversation (AI-06), shown only when the server flag is on.
 * It keeps the existing model picker and privacy masking, asks for versioned
 * per-area consent, streams stage-and-round progress without record text,
 * and renders only the server's checked presentation. The sealed context
 * lives in memory for this page: a new conversation, a consent change or
 * leaving the page discards it.
 */

type Answer = Omit<V2Response, "outcome" | "usage">;
type Turn = {
  question: string;
  answer: Answer | null;
  error: string | null;
  progress: V2ProgressEvent | null;
};

const domainLabels: Record<ConsentDomain, string> = {
  money: "Money",
  debts: "Debts",
  tasks: "Tasks",
  goals: "Goals",
  career: "Career",
  reviews: "Weekly reviews",
  knowledge: "Knowledge",
  decisions: "Decisions",
  signals: "Signals",
  graph: "Connections",
  runway: "Runway",
  history: "Trends",
  timeline: "Timeline",
};

const consentKey = (userId: string) => `atlas:analyst-consent-v2:${userId}`;

function readConsent(userId: string): AnalystConsent | null {
  try {
    return parseConsent(
      JSON.parse(window.localStorage.getItem(consentKey(userId)) ?? "null"),
    );
  } catch {
    return null;
  }
}

function writeConsent(userId: string, consent: AnalystConsent | null) {
  try {
    if (consent)
      window.localStorage.setItem(consentKey(userId), JSON.stringify(consent));
    else window.localStorage.removeItem(consentKey(userId));
  } catch {
    /* The choice still applies to this page view. */
  }
}

function ClaimBlock({
  claim,
  language,
}: {
  claim: PresentedClaim;
  language: "en" | "fil-en";
}) {
  const text = UI_TEXT[language];
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="break-words">
        <ClaimText text={claim.text} />
      </p>
      {claim.recommendation && (
        <div className="text-muted-foreground flex min-w-0 flex-col gap-1 text-xs">
          <p className="break-words">
            <span className="font-semibold">{text.tradeoff}: </span>
            <ClaimText text={claim.recommendation.tradeoff} />
          </p>
          {claim.recommendation.nextAction.href ? (
            <a
              className="text-primary w-fit underline underline-offset-2"
              href={claim.recommendation.nextAction.href}
            >
              {claim.recommendation.nextAction.label}
            </a>
          ) : (
            <p>{claim.recommendation.nextAction.label}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function AnswerCard({
  answer,
  onAsk,
  disabled,
}: {
  answer: Answer;
  onAsk: (question: string) => void;
  disabled: boolean;
}) {
  const p = answer.presentation;
  const text = UI_TEXT[p.language];
  const writer = answer.models.writer;
  return (
    <article className="border-border bg-card flex min-w-0 flex-col gap-4 rounded-2xl border p-4 text-sm leading-6">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {p.statusLabel}
      </p>
      {p.direct.length > 0 && (
        <div className="flex min-w-0 flex-col gap-2 text-base leading-7">
          {p.direct.map((claim) => (
            <ClaimBlock key={claim.id} claim={claim} language={p.language} />
          ))}
        </div>
      )}
      {answer.candidates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {answer.candidates.map((candidate, index) => (
            <button
              key={candidate.handle}
              type="button"
              disabled={disabled}
              onClick={() => onAsk(String(index + 1))}
              className="border-border hover:bg-muted max-w-full rounded-full border px-3 py-1.5 text-left text-xs break-words disabled:opacity-50"
            >
              {candidate.label}
            </button>
          ))}
        </div>
      )}
      {p.findings.length > 0 && (
        <ul className="flex min-w-0 list-disc flex-col gap-1.5 pl-5">
          {p.findings.map((claim) => (
            <li key={claim.id} className="min-w-0">
              <ClaimBlock claim={claim} language={p.language} />
            </li>
          ))}
        </ul>
      )}
      {p.options.length > 0 && (
        <section className="flex min-w-0 flex-col gap-2">
          <h3 className="font-semibold">{text.options}</h3>
          {p.options.map((claim) => (
            <ClaimBlock key={claim.id} claim={claim} language={p.language} />
          ))}
        </section>
      )}
      {p.limitations.length > 0 && (
        <section className="rounded-xl bg-amber-500/10 p-3">
          <h3 className="font-semibold">{text.limits}</h3>
          <ul className="mt-1 flex flex-col gap-1">
            {p.limitations.map((item) => (
              <li key={item} className="break-words">
                <ClaimText text={item} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {p.unresolved.length > 0 && (
        <section className="rounded-xl bg-amber-500/10 p-3">
          <h3 className="font-semibold">{text.notAnswered}</h3>
          <ul className="mt-1 flex flex-col gap-1">
            {p.unresolved.map((item) => (
              <li key={item.requirementId} className="break-words">
                <ClaimText text={item.text} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {p.shortened && (
        <p className="text-muted-foreground text-xs">{p.shortened.note}</p>
      )}
      <div className="text-muted-foreground flex flex-col gap-0.5 text-xs">
        <p>{p.verification.figures}</p>
        <p>{p.verification.review}</p>
        {p.verification.freshness && <p>{p.verification.freshness}</p>}
        {/* Only a model that answered wrote it; checked ATLAS figures are ATLAS's own. */}
        {writer?.resolved && p.status !== "fallback_facts" && (
          <p>Written by {optionFor(writer.resolved).label}.</p>
        )}
      </div>
      {p.sources.length > 0 && (
        <p className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
          <span>{text.sources}:</span>
          {p.sources.map((source) => (
            <a
              key={source.href}
              href={source.href}
              className="break-all underline underline-offset-2"
            >
              {source.href}
            </a>
          ))}
        </p>
      )}
      {answer.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {answer.suggestions.map((item) => (
            <button
              key={item.text}
              type="button"
              disabled={disabled}
              onClick={() => onAsk(item.text)}
              className="border-border hover:bg-muted max-w-full rounded-full border px-3 py-1.5 text-left text-xs break-words disabled:opacity-50"
            >
              {item.text}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

export function IntelligenceWorkspace({ userId }: { userId: string }) {
  const [consent, setConsent] = useState<AnalystConsent | null>(null);
  const [domains, setDomains] = useState<ConsentDomain[]>([...CONSENT_DOMAINS]);
  const [model, setModel] = useState<AnalystModelId>(AI_MODELS.analyst);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [context, setContext] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const composer = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Reading browser storage has to wait until after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(readConsent(userId));
  }, [userId]);

  function grant() {
    const next: AnalystConsent = {
      version: CONSENT_VERSION,
      providerProcessing: true,
      domains,
      profiles: ["aggregate"],
      grantedAt: new Date().toISOString(),
    };
    setConsent(next);
    writeConsent(userId, next);
    setContext(null);
  }

  function revoke() {
    setConsent(null);
    writeConsent(userId, null);
    setContext(null);
  }

  function restart() {
    setTurns([]);
    setContext(null);
    composer.current?.focus();
  }

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!consent || pending || !trimmed) return;
    setPending(true);
    setQuestion("");
    const index = turns.length;
    setTurns((current) => [
      ...current,
      { question: trimmed, answer: null, error: null, progress: null },
    ]);
    const update = (patch: Partial<Turn>) =>
      setTurns((current) =>
        current.map((turn, i) => (i === index ? { ...turn, ...patch } : turn)),
      );
    try {
      const response = await fetch("/api/analyst/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: NDJSON_TYPE },
        body: JSON.stringify({ question: trimmed, context, model, consent }),
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        update({
          error: body?.error ?? "Analysis could not be completed. Try again.",
        });
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as V2StreamEvent;
          if (event.type === "stage") update({ progress: event });
          else if (event.status === 200) {
            const answer = event.body as Answer;
            update({ answer, progress: null });
            setContext(answer.context);
          } else
            update({
              error:
                (event.body as { error?: string })?.error ??
                "Analysis could not be completed. Try again.",
              progress: null,
            });
        }
      }
    } catch {
      update({
        error: "Analysis could not be completed. Try again.",
        progress: null,
      });
    } finally {
      setPending(false);
      composer.current?.focus();
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  if (!consent)
    return (
      <section className="border-border bg-background/40 flex min-w-0 flex-col gap-3 rounded-2xl border p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold">
          <ShieldCheck aria-hidden="true" className="size-4" /> Choose what
          Analyst may share
        </p>
        <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
          <legend className="sr-only">Areas Analyst may read</legend>
          {CONSENT_DOMAINS.map((domain) => (
            <label key={domain} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={domains.includes(domain)}
                onChange={(event) =>
                  setDomains((current) =>
                    event.target.checked
                      ? [...current, domain]
                      : current.filter((item) => item !== domain),
                  )
                }
              />
              {domainLabels[domain]}
            </label>
          ))}
        </fieldset>
        <ul className="text-muted-foreground flex flex-col gap-1 text-xs">
          {describeConsent(
            {
              version: CONSENT_VERSION,
              providerProcessing: true,
              domains,
              profiles: ["aggregate"],
              grantedAt: new Date(0).toISOString(),
            },
            SHARED_ROUTE,
          ).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={grant}
          className="bg-primary-solid text-primary-solid-foreground min-h-9 w-fit rounded-full px-4 text-xs font-semibold"
        >
          Allow these areas
        </button>
      </section>
    );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ol
        className="flex min-w-0 flex-col gap-4"
        aria-label="Analyst conversation"
      >
        {turns.map((turn, index) => (
          <li key={index} className="flex min-w-0 flex-col gap-2">
            <p className="bg-muted ml-auto max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words">
              {turn.question}
            </p>
            {turn.progress && (
              <p
                className="text-muted-foreground flex items-center gap-2 text-xs"
                role="status"
                aria-live="polite"
              >
                <span
                  aria-hidden="true"
                  className="bg-primary size-1.5 rounded-full motion-safe:animate-pulse"
                />
                {progressLabel(turn.progress, detectLanguage(turn.question))}
              </p>
            )}
            {turn.error && (
              <p role="alert" className="text-destructive text-sm">
                {turn.error}
              </p>
            )}
            {turn.answer && (
              <AnswerCard
                answer={turn.answer}
                onAsk={(text) => void ask(text)}
                disabled={pending}
              />
            )}
            {turn.answer?.contextNotice && (
              <p className="text-muted-foreground text-xs">
                {turn.answer.contextNotice}
              </p>
            )}
          </li>
        ))}
      </ol>
      <form
        onSubmit={submit}
        className="border-border flex min-w-0 flex-col gap-2 rounded-2xl border p-2"
      >
        <label htmlFor="analyst-v2-question" className="sr-only">
          Ask Analyst
        </label>
        <textarea
          id="analyst-v2-question"
          ref={composer}
          value={question}
          maxLength={4000}
          rows={2}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void ask(question);
            }
          }}
          placeholder={
            turns.length ? "Ask a follow-up" : "Ask about your records"
          }
          className="min-h-11 w-full min-w-0 resize-y bg-transparent px-2 py-1.5 text-sm outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <ModelPicker
            value={model}
            onChange={setModel}
            compact
            disabled={pending}
          />
          <button
            type="button"
            onClick={restart}
            disabled={pending}
            className="text-muted-foreground flex items-center gap-1 text-xs disabled:opacity-50"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" /> New
            conversation
          </button>
          <button
            type="button"
            onClick={revoke}
            className="text-muted-foreground text-xs underline underline-offset-2"
          >
            Stop sharing
          </button>
          <button
            type="submit"
            aria-label="Ask"
            disabled={pending || !question.trim()}
            className="bg-primary-solid text-primary-solid-foreground ml-auto grid size-9 place-items-center rounded-full disabled:opacity-50"
          >
            <ArrowUp aria-hidden="true" className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
