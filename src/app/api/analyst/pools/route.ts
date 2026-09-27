import { NextResponse } from "next/server";
import { readPoolStatus } from "@/lib/ai/pool-meter";
import { nextPoolReset } from "@/lib/ai/pools";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

/** Today's use of each free OpenAI pool, for the Analyst model picker. */
export async function GET() {
  const supabase = await createClient();
  if (!supabase)
    return NextResponse.json(
      { error: "Unavailable." },
      { status: 503, headers },
    );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in." }, { status: 401, headers });
  const pools = await readPoolStatus();
  if (!pools)
    return NextResponse.json(
      { error: "Unavailable." },
      { status: 503, headers },
    );
  return NextResponse.json(
    { pools, resetsAt: nextPoolReset().toISOString() },
    { headers },
  );
}
