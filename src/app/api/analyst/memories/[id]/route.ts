import { hasRequiredAssurance } from "@/lib/auth/assurance";
import { NextResponse } from "next/server";
import { analystIntelligenceV2Enabled } from "@/lib/analyst/intelligence/flags";
import { deleteMemory } from "@/lib/analyst/intelligence/memory-store";
import { createClient } from "@/lib/supabase/server";

/** Forgets one of the signed-in owner's saved priorities. */

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = analystIntelligenceV2Enabled() ? await createClient() : null;
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user)
    return NextResponse.json(
      { error: "Sign in to use Analyst." },
      { status: 401, headers },
    );
  if (!(await hasRequiredAssurance(supabase)))
    return NextResponse.json(
      { error: "MFA required" },
      { status: 403, headers },
    );
  const deleted = await deleteMemory(supabase, user.id, id);
  return deleted
    ? new NextResponse(null, { status: 204, headers })
    : NextResponse.json(
        { error: "The priority could not be deleted." },
        { status: 400, headers },
      );
}
