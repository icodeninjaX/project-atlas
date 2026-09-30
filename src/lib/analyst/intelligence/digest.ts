import { z } from "zod";
import type { AnalystConsent, ProviderRoute } from "./policy";
import type { V2Response } from "./run";

/**
 * The "this month so far" summary at the top of Analyst: the month's
 * spending change question, answered by the same checked V2 run as any
 * question and kept for the rest of the day.
 */

/**
 * The question the summary answers. It names no period, so the brief reads
 * this month so far against the same days of last month, and asks why, so
 * the change drivers run.
 */
export const DIGEST_QUESTION =
  "What changed in my spending, and which categories account for it?";

/** Until this day of the month there are too few days to compare. */
export const DIGEST_FIRST_DAY = 3;

/** The consent a summary was made under; another consent makes a new one. */
export function digestConsentKey(
  consent: AnalystConsent,
  route: ProviderRoute,
) {
  return [
    route.id,
    [...consent.domains].sort().join(","),
    [...consent.profiles].sort().join(","),
  ].join(":");
}

export type DigestBody = Omit<
  Partial<V2Response>,
  "outcome" | "usage" | "relatedMemoryIds" | "diagnostics" | "context"
>;

/**
 * What the summary keeps: the checked answer without its conversation token
 * (a summary is not a conversation) or the memory offer.
 */
export function digestBody(body: Partial<V2Response>): DigestBody {
  const kept: Partial<V2Response> = { ...body };
  delete kept.context;
  delete kept.contextNotice;
  delete kept.memorySuggestion;
  delete kept.outcome;
  delete kept.usage;
  delete kept.relatedMemoryIds;
  delete kept.diagnostics;
  return kept;
}

/** Whether a summary has something to show; others are kept but not shown. */
export function digestShown(body: DigestBody) {
  const presentation = body.presentation;
  return Boolean(
    presentation &&
    ["answered", "partial_answer", "fallback_facts"].includes(
      body.status ?? "",
    ) &&
    presentation.direct.length + presentation.findings.length > 0,
  );
}

export const digestRowSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  consent_key: z.string(),
  body: z.record(z.string(), z.unknown()),
});

/** Whether a stored summary is today's under this consent. */
export function digestCurrent(
  row: z.infer<typeof digestRowSchema> | null,
  day: string,
  consentKey: string,
) {
  return Boolean(row && row.day === day && row.consent_key === consentKey);
}

export type DigestResponse =
  | { digest: DigestBody; day: string; cached: boolean }
  | {
      digest: null;
      reason: "too_early" | "no_money" | "nothing_to_show";
    };
