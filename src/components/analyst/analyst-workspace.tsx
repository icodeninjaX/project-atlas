"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { Button } from "@/components/ui/button";
import { formatCentavos } from "@/lib/money/money";
import type { Evidence, EvidencePackage } from "@/lib/analyst/evidence";

const questions = [
  "What changed in my spending this month?",
  "Am I making progress toward becoming debt-free?",
  "What should I focus on this week?",
  "Which area of my career pipeline is weakest?",
  "How are my goals progressing?",
  "What patterns do you see in my last 12 weekly reviews?",
  "What are my current Signals?",
];
type Result = {
  evidence: EvidencePackage;
  explanation: string | null;
  fallbackMessage?: string;
  uncertainty: string;
  citedEvidenceIds?: string[];
  providerStatus: string;
};
function displayValue(item: Evidence) {
  if (item.unit === "centavos" && typeof item.value === "number")
    return formatCentavos(item.value);
  if (item.unit === "percent") return `${item.value}%`;
  if (item.unit === "score") return `${item.value} / 10`;
  return `${item.value}${item.unit === "count" ? "" : ` ${item.unit}`}`;
}

export function AnalystWorkspace({
  models,
  defaultModel,
}: {
  models: readonly { id: string; label: string }[];
  defaultModel: string;
}) {
  const [question, setQuestion] = useState(questions[0]);
  const [model, setModel] = useState(defaultModel);
  const [acknowledged, setAcknowledged] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setPending(true);
    try {
      const response = await fetch("/api/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          model,
          dataSharingAcknowledged: acknowledged,
        }),
      });
      const body = await response.json();
      if (!response.ok) setError(body.error ?? "Analyst is unavailable.");
      if (body.evidence) setResult(body as Result);
    } catch {
      setError("Analyst is unavailable. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <form
        onSubmit={ask}
        className="border-border bg-card space-y-5 rounded-2xl border p-4 sm:p-6"
      >
        <div>
          <label
            htmlFor="analyst-question"
            className="block text-sm font-semibold"
          >
            Ask about your ATLAS data
          </label>
          <select
            id="analyst-question"
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value);
              setResult(null);
            }}
            className="border-border bg-background mt-2 min-h-11 w-full rounded-xl border px-3 text-sm"
          >
            {questions.map((q) => (
              <option key={q}>{q}</option>
            ))}
          </select>
          <p className="text-muted-foreground mt-2 text-xs">
            Analyst currently supports these specific questions. Other requests
            are rejected.
          </p>
        </div>
        <div>
          <label
            htmlFor="analyst-model"
            className="block text-sm font-semibold"
          >
            AI model
          </label>
          <select
            id="analyst-model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="border-border bg-background mt-2 min-h-11 w-full rounded-xl border px-3 text-sm sm:max-w-sm"
          >
            {models.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground mt-2 text-xs">
            Model usage may be billed by OpenAI unless your API project
            qualifies for complimentary tokens.
          </p>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            required
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-1 size-4"
          />
          <span>
            Before first use: relevant personal facts from your ATLAS records
            are sent to OpenAI under your OpenAI organization’s current
            data-sharing settings when you ask for an explanation. ATLAS
            retrieves fresh facts each time; the model does not learn or
            remember your whole database.
          </span>
        </label>
        <Button type="submit" disabled={pending || !acknowledged}>
          {pending ? "Analyzing…" : "Analyze"}
        </Button>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </form>
      {result && (
        <section aria-label="Analyst answer" className="space-y-5">
          <div className="border-border bg-card rounded-2xl border p-4 sm:p-6">
            <h2 className="text-lg font-semibold">What ATLAS found</h2>
            <p className="mt-3 text-sm leading-relaxed">
              {result.explanation ??
                result.fallbackMessage ??
                "ATLAS calculated the facts below. An AI explanation is not available for this request."}
            </p>
            <p className="text-muted-foreground mt-3 text-sm">
              {result.evidence.note}
            </p>
            {result.uncertainty !== result.evidence.note && (
              <p className="text-muted-foreground mt-2 text-sm">
                {result.uncertainty}
              </p>
            )}
            {result.evidence.status !== "ready" && (
              <p className="mt-2 text-sm font-medium">
                Data status: {result.evidence.status}
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {result.evidence.evidence.map((item) => (
              <article
                key={item.id}
                className="border-border bg-card min-w-0 rounded-2xl border p-4"
              >
                <h3 className="text-sm font-semibold">{item.metric}</h3>
                {result.citedEvidenceIds?.includes(item.id) && (
                  <p className="text-primary mt-1 text-xs">
                    Used in explanation
                  </p>
                )}
                <p className="mt-2 font-mono text-xl">
                  <SensitiveValue>{displayValue(item)}</SensitiveValue>
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  {item.period.from} to {item.period.through} ·{" "}
                  {item.completeness}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {item.comparisonBasis}
                </p>
                <Link
                  href={item.source.href as Route}
                  className="text-primary mt-3 inline-block text-sm underline"
                >
                  View ATLAS records
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
