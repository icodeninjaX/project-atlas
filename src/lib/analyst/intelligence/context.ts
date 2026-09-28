import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { z } from "zod";
import { CONSENT_DOMAINS, periodSchema } from "./contracts";
import { consentFingerprint, type AnalystConsent } from "./policy";

/**
 * Structured conversation context for Analyst V2 (AI-03). It keeps what a
 * follow-up needs: resolved entity handles, periods, assumptions, references
 * to verified findings, earlier suggestions, open requirements and a pending
 * clarification. It is not a narrative of the user's life and not a record
 * store: prior findings are earlier conclusions, re-checked before reuse.
 *
 * Storage is session-scoped and client-held: the server seals the context
 * with AES-256-GCM, so the browser can neither read nor alter it. The owner
 * ID is authenticated data, so a token cannot be replayed by another
 * account, and the consent fingerprint and expiry are checked on every open.
 * No database table is involved; persistent threads would need their own
 * retention and deletion design.
 */

export const CONTEXT_LIMITS = Object.freeze({
  ttlMs: 2 * 60 * 60 * 1000,
  turns: 20,
  entities: 10,
  periods: 4,
  assumptions: 8,
  findings: 12,
  recommendations: 6,
  unresolved: 6,
  candidates: 10,
  questionChars: 500,
  findingTextChars: 300,
  tokenChars: 16_000,
});

const handle = z.string().min(1).max(80);
const text = (max: number) => z.string().max(max);

const citedValueSchema = z
  .object({
    evidenceId: z.string().max(160),
    metricKey: z.string().max(160),
    scopeId: z.string().max(160),
    period: periodSchema,
    value: z.union([z.number(), z.string().max(200), z.boolean()]),
  })
  .strict();
export type CitedValue = z.infer<typeof citedValueSchema>;

export const conversationContextSchema = z
  .object({
    version: z.literal("1"),
    conversationId: z.uuid(),
    ownerId: z.uuid(),
    consentFingerprint: z.string().max(32),
    issuedAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    turn: z.number().int().min(0).max(CONTEXT_LIMITS.turns),
    topic: z
      .object({
        domains: z.array(z.enum(CONSENT_DOMAINS)).max(CONSENT_DOMAINS.length),
        intent: z.string().max(40),
      })
      .strict()
      .nullable(),
    entities: z
      .array(
        z
          .object({
            handle,
            resolution: z.enum([
              "selected",
              "confirmed",
              "exact_match",
              "context",
            ]),
            turn: z.number().int().min(0),
          })
          .strict(),
      )
      .max(CONTEXT_LIMITS.entities),
    periods: z
      .array(
        z
          .object({
            id: z.string().max(40),
            from: z.string(),
            through: z.string(),
            basis: z.enum(["explicit", "context", "disclosed_default"]),
          })
          .strict(),
      )
      .max(CONTEXT_LIMITS.periods),
    assumptions: z
      .array(
        z
          .object({
            key: z.string().max(60),
            value: z.union([z.number(), z.string().max(80)]),
            origin: z.enum([
              "user_stated",
              "user_confirmed",
              "disclosed_default",
            ]),
            turn: z.number().int().min(0),
          })
          .strict(),
      )
      .max(CONTEXT_LIMITS.assumptions),
    findings: z
      .array(
        z
          .object({
            id: z.string().max(40),
            turn: z.number().int().min(0),
            kind: z.string().max(20),
            requirementIds: z.array(z.string().max(80)).max(6),
            /** The earlier wording, kept only to locate the claim a user refers to. */
            text: text(CONTEXT_LIMITS.findingTextChars),
            cited: z.array(citedValueSchema).max(8),
            assumptionKeys: z.array(z.string().max(60)).max(6),
          })
          .strict(),
      )
      .max(CONTEXT_LIMITS.findings),
    /** Analyst suggestions: prior output, never a user preference. */
    recommendations: z
      .array(
        z
          .object({
            findingId: z.string().max(40),
            turn: z.number().int().min(0),
            origin: z.literal("analyst_suggestion"),
          })
          .strict(),
      )
      .max(CONTEXT_LIMITS.recommendations),
    unresolved: z
      .array(
        z
          .object({
            requirementId: z.string().max(80),
            question: text(400),
            reason: z.string().max(40),
          })
          .strict(),
      )
      .max(CONTEXT_LIMITS.unresolved),
    pendingClarification: z
      .discriminatedUnion("kind", [
        z
          .object({
            kind: z.literal("entity"),
            question: text(CONTEXT_LIMITS.questionChars),
            candidates: z.array(handle).min(2).max(CONTEXT_LIMITS.candidates),
          })
          .strict(),
        z
          .object({
            kind: z.literal("assumption"),
            question: text(CONTEXT_LIMITS.questionChars),
            key: z.string().max(60),
            proposed: z.union([z.number(), z.string().max(80)]),
          })
          .strict(),
      ])
      .nullable(),
    lastQuestion: text(CONTEXT_LIMITS.questionChars).nullable(),
  })
  .strict();
export type ConversationContext = z.infer<typeof conversationContextSchema>;

/** A fresh context for a new conversation; nothing carries over. */
export function newConversation(
  ownerId: string,
  consent: AnalystConsent,
  now: Date,
): ConversationContext {
  return {
    version: "1",
    conversationId: randomUUID(),
    ownerId,
    consentFingerprint: consentFingerprint(consent),
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CONTEXT_LIMITS.ttlMs).toISOString(),
    turn: 0,
    topic: null,
    entities: [],
    periods: [],
    assumptions: [],
    findings: [],
    recommendations: [],
    unresolved: [],
    pendingClarification: null,
    lastQuestion: null,
  };
}

/** The 32-byte sealing key from `ATLAS_ANALYST_CONTEXT_KEY` (base64), or null. */
export function contextKey(
  env: Record<string, string | undefined> = process.env,
): Buffer | null {
  const raw = env.ATLAS_ANALYST_CONTEXT_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  return key.length === 32 ? key : null;
}

const aad = (ownerId: string) =>
  Buffer.from(`atlas-analyst-context-v1:${ownerId}`);

/** Encrypts and authenticates a context for the browser to hold. */
export function sealContext(
  context: ConversationContext,
  key: Buffer,
  now: Date,
) {
  const refreshed = conversationContextSchema.parse({
    ...context,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CONTEXT_LIMITS.ttlMs).toISOString(),
  });
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad(refreshed.ownerId));
  const body = Buffer.concat([
    cipher.update(JSON.stringify(refreshed), "utf8"),
    cipher.final(),
  ]);
  const token = Buffer.concat([iv, cipher.getAuthTag(), body]).toString(
    "base64url",
  );
  if (token.length > CONTEXT_LIMITS.tokenChars)
    throw new Error("Conversation context exceeds its bound.");
  return token;
}

export type OpenResult =
  | { ok: true; context: ConversationContext }
  | {
      ok: false;
      reason:
        "disabled" | "malformed" | "tampered" | "expired" | "consent_changed";
    };

/**
 * Opens a sealed context for the signed-in owner. A token from another
 * account fails authentication exactly like a tampered one, so an account
 * switch never inherits context. Consent changes discard it.
 */
export function openContext(
  token: unknown,
  options: {
    ownerId: string;
    consent: AnalystConsent | null;
    key: Buffer | null;
    now: Date;
  },
): OpenResult {
  if (!options.key) return { ok: false, reason: "disabled" };
  if (typeof token !== "string" || token.length > CONTEXT_LIMITS.tokenChars)
    return { ok: false, reason: "malformed" };
  const raw = Buffer.from(token, "base64url");
  if (raw.length < 29) return { ok: false, reason: "malformed" };
  let json: string;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      options.key,
      raw.subarray(0, 12),
    );
    decipher.setAAD(aad(options.ownerId));
    decipher.setAuthTag(raw.subarray(12, 28));
    json = Buffer.concat([
      decipher.update(raw.subarray(28)),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return { ok: false, reason: "tampered" };
  }
  let parsed: ReturnType<typeof conversationContextSchema.safeParse>;
  try {
    parsed = conversationContextSchema.safeParse(JSON.parse(json));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!parsed.success || parsed.data.ownerId !== options.ownerId)
    return { ok: false, reason: "tampered" };
  if (Date.parse(parsed.data.expiresAt) <= options.now.getTime())
    return { ok: false, reason: "expired" };
  if (
    !options.consent ||
    parsed.data.consentFingerprint !== consentFingerprint(options.consent)
  )
    return { ok: false, reason: "consent_changed" };
  return { ok: true, context: parsed.data };
}

/**
 * Re-authorizes every handle the context carries for this turn. Handles the
 * owner can no longer read (deleted, or never theirs) are removed, along with
 * a pending clarification that offered them.
 */
export async function reauthorizeContext(
  context: ConversationContext,
  authorize: (handles: string[]) => Promise<ReadonlySet<string>>,
) {
  const carried = [
    ...new Set([
      ...context.entities.map((item) => item.handle),
      ...(context.pendingClarification?.kind === "entity"
        ? context.pendingClarification.candidates
        : []),
    ]),
  ];
  if (carried.length === 0) return { context, dropped: [] as string[] };
  const allowed = await authorize(carried);
  const dropped = carried.filter((item) => !allowed.has(item));
  const pending = context.pendingClarification;
  const candidates =
    pending?.kind === "entity"
      ? pending.candidates.filter((item) => allowed.has(item))
      : null;
  return {
    dropped,
    context: {
      ...context,
      entities: context.entities.filter((item) => allowed.has(item.handle)),
      pendingClarification:
        pending?.kind === "entity"
          ? candidates!.length >= 2
            ? { ...pending, candidates: candidates! }
            : null
          : pending,
    },
  };
}

/** Bytes and characters accepted for one Analyst V2 request. */
export const V2_REQUEST_LIMITS = Object.freeze({
  questionChars: 4_000,
  requestBytes: 24_000,
  standaloneMinChars: 8,
});

export const v2RequestSchema = z
  .object({
    question: z.string().trim().min(1).max(V2_REQUEST_LIMITS.questionChars),
    context: z.string().max(CONTEXT_LIMITS.tokenChars).nullable().default(null),
    model: z.string().max(64).optional(),
    /** Versioned consent; parsed and checked separately by `parseConsent`. */
    consent: z.unknown().optional(),
  })
  .strict();

/**
 * Parses a request body within its byte bound. A short message such as
 * "Why?" or "Yes" is meaningful only with a valid context; without one it
 * needs a standalone question.
 */
export function parseV2Request(raw: string) {
  if (Buffer.byteLength(raw) > V2_REQUEST_LIMITS.requestBytes)
    return { ok: false as const, reason: "too_large" as const };
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false as const, reason: "invalid" as const };
  }
  const parsed = v2RequestSchema.safeParse(body);
  if (!parsed.success)
    return { ok: false as const, reason: "invalid" as const };
  return { ok: true as const, request: parsed.data };
}

export function needsContext(question: string) {
  return question.trim().length < V2_REQUEST_LIMITS.standaloneMinChars;
}
