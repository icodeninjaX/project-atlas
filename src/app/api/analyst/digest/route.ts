import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAnalystModel } from "@/lib/ai/models";
import { manilaToday } from "@/lib/analyst/evidence";
import {
  DIGEST_FIRST_DAY,
  DIGEST_QUESTION,
  digestBody,
  digestConsentKey,
  digestCurrent,
  digestShown,
  type DigestBody,
  type DigestResponse,
} from "@/lib/analyst/intelligence/digest";
import {
  claimDigest,
  readDigest,
  releaseDigest,
  saveDigest,
} from "@/lib/analyst/intelligence/digest-store";
import { analystIntelligenceV2Enabled } from "@/lib/analyst/intelligence/flags";
import { listMemories } from "@/lib/analyst/intelligence/memory-store";
import {
  parseConsent,
  preferredRoute,
} from "@/lib/analyst/intelligence/policy";
import {
  reserveAnalystRequest,
  serveAnalystRun,
} from "@/lib/analyst/intelligence/serve";
import { createClient } from "@/lib/supabase/server";

/**
 * The "this month so far" summary. It answers one fixed question about the
 * month's spending change through the same checked V2 run as any question,
 * under the person's current consent, and keeps it for the rest of the day:
 * a page view reads the kept summary, and only the first view of a day (or
 * of a new consent) runs, and is metered as, one Analyst request. That
 * view first claims the day's slot, so views arriving together run it once.
 * When the store cannot be read nothing runs, so the summary never costs a
 * request per view.
 */

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers });

const requestSchema = z
  .object({ consent: z.unknown(), model: z.string().max(80).optional() })
  .strict();

export async function POST(request: Request) {
  if (!analystIntelligenceV2Enabled())
    return json({ error: "Not found." }, 404);
  const supabase = await createClient();
  if (!supabase) return json({ error: "Analyst is unavailable." }, 503);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return json({ error: "Sign in to use Analyst." }, 401);
  const text = await request.text();
  if (text.length > 4_000) return json({ error: "Request is too large." }, 413);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return json({ error: "Invalid request." }, 400);
  const consent = parseConsent(parsed.data.consent);
  if (!consent)
    return json({ error: "Choose what Analyst may share first." }, 400);
  const model = resolveAnalystModel(parsed.data.model);
  if (!model) return json({ error: "Choose an available Analyst model." }, 400);

  const reply = (body: DigestResponse) => json(body);
  // The summary is about money; without it there is nothing to summarize.
  if (!consent.domains.includes("money"))
    return reply({ digest: null, reason: "no_money" });
  const day = manilaToday(new Date());
  if (Number(day.slice(8, 10)) < DIGEST_FIRST_DAY)
    return reply({ digest: null, reason: "too_early" });
  const route = preferredRoute();
  const consentKey = digestConsentKey(consent, route);
  const shown = (body: DigestBody, cached: boolean) =>
    reply(
      digestShown(body)
        ? { digest: body, day, cached }
        : { digest: null, reason: "nothing_to_show" },
    );

  // Today's kept summary is read; one another view is making is waited for.
  let stored;
  try {
    stored = await readDigest(supabase, user.id);
  } catch {
    return json({ error: "The summary is unavailable." }, 503);
  }
  if (
    stored &&
    digestCurrent(stored, day, consentKey) &&
    stored.state === "ready"
  )
    return shown(stored.body as DigestBody, true);

  if (
    !(route.id === "openai_non_sharing"
      ? process.env.OPENAI_NON_SHARING_API_KEY
      : process.env.OPENAI_API_KEY)
  )
    return json({ error: "AI analysis is not configured." }, 503);
  // Only the view that claims today's slot runs, so two at once are never
  // both charged; the others wait for its summary.
  let claimed: boolean;
  try {
    claimed = await claimDigest(supabase, { day, consentKey });
  } catch {
    return json({ error: "The summary is unavailable." }, 503);
  }
  if (!claimed) return reply({ digest: null, reason: "in_progress" });
  const reserved = await reserveAnalystRequest(supabase, model);
  if (!reserved.ok) {
    await releaseDigest(supabase, user.id).catch(() => undefined);
    return json({ error: reserved.error }, reserved.status);
  }
  const memories =
    (await listMemories(supabase, user.id, new Date()).catch(() => null)) ?? [];
  const served = await serveAnalystRun({
    supabase,
    ownerId: user.id,
    requestId: reserved.requestId,
    question: DIGEST_QUESTION,
    contextToken: null,
    model,
    consent,
    route,
    memories,
  });
  // Every run that was charged is kept for the day, answered or not, so
  // later views read it instead of running (and being charged) again.
  const body: DigestBody =
    served.status === 200 && served.result
      ? digestBody(served.body as DigestBody)
      : { status: "error" };
  await saveDigest(supabase, user.id, { day, consentKey, body }).catch(
    () => undefined,
  );
  if (served.status !== 200) return json(served.body, served.status);
  return shown(body, false);
}
