import { NextResponse } from "next/server";
import { analystIntelligenceV2Enabled } from "@/lib/analyst/intelligence/flags";
import { MEMORY_LIMITS, daysLeft } from "@/lib/analyst/intelligence/memory";
import {
  listMemories,
  saveMemory,
} from "@/lib/analyst/intelligence/memory-store";
import { createClient } from "@/lib/supabase/server";

/**
 * The priorities Analyst remembers for the signed-in owner. GET lists them
 * with how many days each has left; POST saves one the owner confirmed.
 */

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers });

async function owner() {
  if (!analystIntelligenceV2Enabled()) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, id: user.id } : null;
}

export async function GET() {
  const signedIn = await owner();
  if (!signedIn) return json({ error: "Sign in to use Analyst." }, 401);
  const now = new Date();
  const memories = await listMemories(signedIn.supabase, signedIn.id, now);
  if (!memories)
    return json({ error: "Saved priorities are unavailable." }, 503);
  return json({
    limit: MEMORY_LIMITS.items,
    days: MEMORY_LIMITS.days,
    memories: memories.map((item) => ({
      id: item.id,
      text: item.text,
      daysLeft: daysLeft(item, now),
    })),
  });
}

const errors = {
  invalid:
    "A priority is a few words without amounts or figures, such as 'saving for a laptop'.",
  full: `Analyst keeps at most ${MEMORY_LIMITS.items} priorities. Delete one first.`,
  duplicate: "Analyst already remembers this.",
  unavailable: "Saved priorities are unavailable.",
} as const;

export async function POST(request: Request) {
  const signedIn = await owner();
  if (!signedIn) return json({ error: "Sign in to use Analyst." }, 401);
  const text = await request.text();
  if (text.length > 2_000) return json({ error: errors.invalid }, 400);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: errors.invalid }, 400);
  }
  const result = await saveMemory(
    signedIn.supabase,
    signedIn.id,
    body && typeof body === "object" ? (body as { text?: unknown }).text : null,
    new Date(),
  );
  if (result.status === "saved")
    return json(
      {
        memory: {
          id: result.memory.id,
          text: result.memory.text,
          daysLeft: MEMORY_LIMITS.days,
        },
      },
      201,
    );
  return json(
    { error: errors[result.status] },
    result.status === "unavailable" ? 503 : 400,
  );
}
