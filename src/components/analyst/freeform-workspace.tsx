"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import {
  ClaimText,
  evidenceDisplayValue as displayValue,
} from "@/components/analyst/evidence-display";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";
import type { GroundedClaim } from "@/lib/analyst/freeform/answer";
import { ChevronDown } from "lucide-react";
import { formatPeriodLabel } from "@/lib/history/period-label";

type FreeformResult = {
  status: "answered" | "fallback" | "unsupported" | "clarification_required";
  message?: string;
  claims?: GroundedClaim[];
  evidence: ToolEvidence[];
  limitations: string[];
  matchedEntity?: { type: "goal" | "debt"; name: string };
};

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

export function FreeformWorkspace({
  goals = [],
  debts = [],
}: {
  goals?: Array<{ id: string; title: string }>;
  debts?: Array<{ id: string; creditor_name: string }>;
}) {
  const evidenceDetails = useRef<HTMLDetailsElement>(null);
  const [question, setQuestion] = useState("");
  const [goalId, setGoalId] = useState("");
  const [debtId, setDebtId] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<FreeformResult | null>(null);
  // Answered exchanges sent with the next question so follow-ups keep context.
  const [history, setHistory] = useState<
    Array<{ question: string; answer: string }>
  >([]);

  async function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/analyst/freeform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          ...(goalId && { goalId }),
          ...(debtId && { debtId }),
          ...(history.length > 0 && { history }),
          dataSharingAcknowledged: acknowledged,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        setError(body.error ?? "Analyst is unavailable. Try again.");
      if (body.status) setResult(body as FreeformResult);
      if (body.status === "answered") {
        const answer = (body as FreeformResult).claims
          ?.map((claim) => claim.text)
          .join(" ")
          .slice(0, 600);
        setHistory((previous) =>
          [
            ...previous,
            { question: question.trim(), answer: answer ?? "" },
          ].slice(-2),
        );
        setQuestion("");
      }
    } catch {
      setError("Analyst is unavailable. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-label="Ask a question" className="space-y-5">
      <form
        onSubmit={ask}
        className="border-border bg-card space-y-4 rounded-2xl border p-4 sm:p-6"
      >
        <div>
          <label
            htmlFor="analyst-freeform-question"
            className="block text-sm font-semibold"
          >
            Ask your own question
          </label>
          {history.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <p className="text-muted-foreground">
                Follow-up to “{history.at(-1)!.question}”
              </p>
              <button
                type="button"
                onClick={() => setHistory([])}
                className="text-primary inline-flex min-h-11 items-center underline"
              >
                Start a new question
              </button>
            </div>
          )}
          <textarea
            id="analyst-freeform-question"
            value={question}
            maxLength={goalId || debtId ? 400 : 500}
            rows={3}
            onChange={(event) => setQuestion(event.target.value)}
            required
            minLength={8}
            placeholder={
              history.length > 0
                ? "Ask a follow-up, like “What about last quarter?”"
                : "What needs my attention across money and goals?"
            }
            className="border-border bg-background mt-2 w-full rounded-xl border px-3 py-3 text-sm"
          />
          <p className="text-muted-foreground mt-2 text-xs">
            Try “What if monthly income falls by 20%?” Mark amounts with ₱ or
            “pesos”.
          </p>
          <details className="group text-muted-foreground mt-2 text-xs">
            <summary className="focus-visible:ring-ring hover:text-foreground inline-flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-md font-semibold focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              How Analyst answers
              <ChevronDown
                aria-hidden="true"
                className="size-3.5 transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="mt-1 space-y-1 leading-5">
              <p>
                Analyst uses supported ATLAS records. Questions about
                unavailable history or unnamed records may need clarification.
                Runway scenarios are estimates, and extra debt payments are
                treated as monthly.
              </p>
              <p>
                Freeform questions are sent to GPT-5.4 mini to plan which ATLAS
                data to read, and the retrieved evidence is sent to GPT-4o mini
                for the explanation. The model picker under Suggested questions
                applies only to those presets.
              </p>
            </div>
          </details>
        </div>
        {goals.length > 0 && (
          <div>
            <label
              htmlFor="analyst-goal"
              className="block text-sm font-semibold"
            >
              Specific goal (optional)
            </label>
            <select
              id="analyst-goal"
              value={goalId}
              onChange={(event) => {
                setGoalId(event.target.value);
                if (event.target.value) setDebtId("");
              }}
              className="border-border bg-background mt-2 min-h-11 w-full rounded-xl border px-3 text-sm"
            >
              <option value="">All records</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground mt-1 text-xs">
              Analyst inspects the goal’s current links and dated activity.
            </p>
            {goalId && question.length > 400 && (
              <p className="text-destructive mt-1 text-xs">
                Shorten the question to 400 characters for a selected goal.
              </p>
            )}
          </div>
        )}
        {debts.length > 0 && (
          <div>
            <label
              htmlFor="analyst-debt"
              className="block text-sm font-semibold"
            >
              Active debt for a monthly payment scenario (optional)
            </label>
            <select
              id="analyst-debt"
              value={debtId}
              onChange={(event) => {
                setDebtId(event.target.value);
                if (event.target.value) setGoalId("");
              }}
              className="border-border bg-background mt-2 min-h-11 w-full rounded-xl border px-3 text-sm"
            >
              <option value="">No specific debt</option>
              {debts.map((debt) => (
                <option key={debt.id} value={debt.id}>
                  {debt.creditor_name}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground mt-1 text-xs">
              For an extra monthly payment scenario. Nothing is paid or changed.
            </p>
            {debtId && question.length > 400 && (
              <p className="text-destructive mt-1 text-xs">
                Shorten the question to 400 characters for a selected debt.
              </p>
            )}
          </div>
        )}
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            required
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-1 size-4"
          />
          <span>
            Relevant personal facts are sent to OpenAI for this request under
            your organization’s data-sharing settings. ATLAS checks the answer
            against its evidence.
          </span>
        </label>
        <Button
          type="submit"
          disabled={
            pending ||
            !acknowledged ||
            question.trim().length < 8 ||
            (Boolean(goalId || debtId) && question.length > 400)
          }
        >
          {pending ? "Analyzing…" : "Ask Analyst"}
        </Button>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </form>
      {result && (
        <section
          aria-label="Freeform Analyst answer"
          className="space-y-4"
          aria-live="polite"
        >
          <div className="border-border bg-card rounded-2xl border p-4 sm:p-6">
            <h2 className="text-lg font-semibold">What ATLAS found</h2>
            {result.evidence.length > 0 && (
              <p className="text-muted-foreground mt-2 text-xs">
                Inspected records span{" "}
                {formatPeriodLabel(
                  result.evidence.reduce(
                    (first, item) =>
                      item.period.from < first ? item.period.from : first,
                    result.evidence[0]!.period.from,
                  ),
                  result.evidence.reduce(
                    (last, item) =>
                      item.period.through > last ? item.period.through : last,
                    result.evidence[0]!.period.through,
                  ),
                )}
                {result.evidence.some(
                  (item) => item.completeness !== "complete",
                )
                  ? " · some evidence is incomplete"
                  : " · all returned evidence is complete"}
              </p>
            )}
            {result.message && (
              <p className="mt-2 text-sm leading-relaxed">{result.message}</p>
            )}
            {scenarioGroups(result.evidence).length > 0 && (
              <div aria-label="Runway scenario comparison" className="mt-4">
                <p className="text-muted-foreground mb-3 text-xs">
                  ATLAS calculated every option from the same current runway
                  baseline. These estimates depend on the stated assumptions and
                  are not guaranteed results.
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  {scenarioGroups(result.evidence).map((group) => (
                    <article
                      key={group.label}
                      className="border-border min-w-0 rounded-xl border p-4"
                    >
                      <h3 className="text-sm font-semibold">{group.label}</h3>
                      <dl className="mt-3 space-y-3">
                        {group.items.map((item) => (
                          <div key={item.id}>
                            <dt className="text-muted-foreground text-xs">
                              {item.metric.replace(`${group.label} · `, "")}
                            </dt>
                            <dd className="font-mono text-sm">
                              <SensitiveValue>
                                {displayValue(item)}
                              </SensitiveValue>
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <p className="text-muted-foreground mt-3 text-xs break-words">
                        <SensitiveValue>
                          {group.items[0]?.comparisonBasis}
                        </SensitiveValue>
                      </p>
                    </article>
                  ))}
                </div>
                <Link
                  href="/money/runway"
                  className="text-primary mt-3 inline-flex min-h-11 items-center text-sm underline"
                >
                  Review or edit runway assumptions
                </Link>
              </div>
            )}
            {result.matchedEntity && (
              <p className="text-muted-foreground mt-4 text-xs">
                ATLAS matched your question to your {result.matchedEntity.type}{" "}
                “{result.matchedEntity.name}”.
              </p>
            )}
            {result.claims?.map((claim, index) => (
              <article key={index} className="border-border mt-4 border-t pt-4">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {claim.kind}
                </p>
                <p className="mt-1 text-sm leading-relaxed">
                  <ClaimText text={claim.text} />
                </p>
                <div
                  className="mt-2 flex flex-wrap gap-2"
                  aria-label="Evidence for this point"
                >
                  {claim.evidenceIds.map((id) => (
                    <a
                      key={id}
                      href={`#evidence-${encodeURIComponent(id)}`}
                      onClick={() => {
                        if (evidenceDetails.current)
                          evidenceDetails.current.open = true;
                      }}
                      className="border-border text-primary inline-flex min-h-11 items-center rounded-lg border px-3 text-xs underline"
                    >
                      {result.evidence.find((item) => item.id === id)?.metric ??
                        "Evidence"}
                    </a>
                  ))}
                </div>
              </article>
            ))}
            {result.status === "answered" && (
              <p className="text-muted-foreground mt-4 text-xs">
                Every figure and comparison in these points was checked against
                the ATLAS evidence it cites. Interpretations and suggestions are
                optional.
              </p>
            )}
          </div>
          {result.limitations.length > 0 && (
            <div className="border-border bg-card rounded-2xl border p-4 sm:p-6">
              <h3 className="text-sm font-semibold">
                Missing or limited information
              </h3>
              <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
                {result.limitations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {result.evidence.length > 0 && (
            <details
              ref={evidenceDetails}
              className="border-border bg-card rounded-2xl border p-4 sm:p-6"
              open={result.status !== "answered"}
            >
              <summary className="cursor-pointer text-sm font-semibold">
                How this was answered · {result.evidence.length} ATLAS facts
              </summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {result.evidence.map((item) => (
                  <article
                    key={item.id}
                    id={`evidence-${item.id}`}
                    className="border-border min-w-0 scroll-mt-24 rounded-xl border p-4"
                  >
                    <h4 className="text-sm font-semibold">{item.metric}</h4>
                    <p className="mt-2 font-mono text-lg">
                      <SensitiveValue>{displayValue(item)}</SensitiveValue>
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs">
                      {item.period.from} to {item.period.through} ·{" "}
                      {item.completeness}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
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
                      className="text-primary mt-3 inline-flex min-h-11 items-center text-sm underline"
                    >
                      View ATLAS records
                    </Link>
                  </article>
                ))}
              </div>
            </details>
          )}
        </section>
      )}
    </section>
  );
}
