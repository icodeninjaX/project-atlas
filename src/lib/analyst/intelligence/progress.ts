import type { ConsentDomain } from "./contracts";

/**
 * Live progress for Analyst V2 (AI-06). Events name a fixed stage, and for
 * reading, the round and the domains being read. Investigation can return to
 * reading after assessing, so the round is part of the event rather than a
 * checklist that implies retrieval is finished. Events carry no question,
 * record text, figure or percentage, and no model reasoning.
 */

export const V2_STAGES = [
  "understanding",
  "reading",
  "assessing",
  "writing",
  "checking",
  "reviewing",
  "repairing",
] as const;
export type V2Stage = (typeof V2_STAGES)[number];

export type V2ProgressEvent =
  | { type: "stage"; stage: Exclude<V2Stage, "reading" | "assessing"> }
  | {
      type: "stage";
      stage: "reading" | "assessing";
      round: number;
      domains: ConsentDomain[];
    };

export type V2ResultEvent = { type: "result"; status: number; body: unknown };
export type V2StreamEvent = V2ProgressEvent | V2ResultEvent;

const allowedKeys = new Set(["type", "stage", "round", "domains"]);

/** Refuses any event that could carry more than the fixed vocabulary. */
export function safeProgress(event: V2ProgressEvent): V2ProgressEvent {
  if (Object.keys(event).some((key) => !allowedKeys.has(key)))
    throw new Error("Progress events carry only stage, round and domains.");
  if (!(V2_STAGES as readonly string[]).includes(event.stage))
    throw new Error("Unknown progress stage.");
  return event;
}

const labels: Record<"en" | "fil-en", Record<V2Stage, string>> = {
  en: {
    understanding: "Understanding your question",
    reading: "Reading your records",
    assessing: "Checking what is still missing",
    writing: "Writing the answer",
    checking: "Checking figures, dates and scope",
    reviewing: "Reviewing the meaning",
    repairing: "Correcting the answer",
  },
  "fil-en": {
    understanding: "Inuunawa ang tanong mo",
    reading: "Binabasa ang records mo",
    assessing: "Tinitingnan kung ano pa ang kulang",
    writing: "Isinusulat ang sagot",
    checking: "Sinusuri ang mga numero, petsa at saklaw",
    reviewing: "Sinusuri ang kahulugan",
    repairing: "Itinatama ang sagot",
  },
};

export function progressLabel(
  event: V2ProgressEvent,
  language: "en" | "fil-en",
) {
  const base = labels[language][event.stage];
  if (event.stage === "reading")
    return `${base}${event.domains.length ? ` (${event.domains.join(", ")})` : ""} · ${language === "fil-en" ? "hakbang" : "step"} ${event.round}`;
  return base;
}
