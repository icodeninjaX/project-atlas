"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { formatCentavos } from "@/lib/money/money";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";
import type { GroundedClaim } from "@/lib/analyst/freeform/answer";

type FreeformResult = {
  status: "answered" | "fallback" | "unsupported" | "clarification_required";
  message?: string;
  claims?: GroundedClaim[];
  evidence: ToolEvidence[];
  limitations: string[];
};

function displayValue(item: ToolEvidence) {
  if (item.unit === "centavos" && typeof item.value === "number")
    return formatCentavos(item.value);
  if (item.unit === "percent") return `${item.value}%`;
  if (item.unit === "score") return `${item.value} / 10`;
  if (item.unit === "correlation") return `r = ${item.value}`;
  return `${item.value}${item.unit === "count" ? "" : ` ${item.unit}`}`;
}

export function FreeformWorkspace({
  goals = [],
}: {
  goals?: Array<{ id: string; title: string }>;
}) {
  const evidenceDetails = useRef<HTMLDetailsElement>(null);
  const [question, setQuestion] = useState("");
  const [goalId, setGoalId] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<FreeformResult | null>(null);

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
          dataSharingAcknowledged: acknowledged,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        setError(body.error ?? "Analyst is unavailable. Try again.");
      if (body.status) setResult(body as FreeformResult);
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
          <textarea
            id="analyst-freeform-question"
            value={question}
            maxLength={goalId ? 400 : 500}
            rows={3}
            onChange={(event) => setQuestion(event.target.value)}
            required
            minLength={8}
            placeholder="What needs my attention across money and goals?"
            className="border-border bg-background mt-2 w-full rounded-xl border px-3 py-3 text-sm"
          />
          <p className="text-muted-foreground mt-2 text-xs">
            Analyst can use supported ATLAS records. Questions about unavailable
            history or unnamed records may need clarification.
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Freeform questions use GPT-4o mini for planning and explanation. The
            model selector under Suggested questions applies to those presets.
          </p>
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
              onChange={(event) => setGoalId(event.target.value)}
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
              Selecting a goal lets Analyst inspect its current links and dated
              linked activity. Past goal progress is unavailable.
            </p>
            {goalId && question.length > 400 && (
              <p className="text-destructive mt-1 text-xs">
                Shorten the question to 400 characters for a selected goal.
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
            (Boolean(goalId) && question.length > 400)
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
                {result.evidence.reduce(
                  (first, item) =>
                    item.period.from < first ? item.period.from : first,
                  result.evidence[0]!.period.from,
                )}
                {" to "}
                {result.evidence.reduce(
                  (last, item) =>
                    item.period.through > last ? item.period.through : last,
                  result.evidence[0]!.period.through,
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
            {result.claims?.map((claim, index) => (
              <article key={index} className="border-border mt-4 border-t pt-4">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {claim.kind}
                </p>
                <p className="mt-1 text-sm leading-relaxed">{claim.text}</p>
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
                Interpretations and suggestions are optional. The figures below
                are calculated by ATLAS.
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
                      {item.comparisonBasis}
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
