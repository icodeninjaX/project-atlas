import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeTimelineFilters,
  validTimelineDate,
} from "@/lib/timeline/timeline";
import { decodeTimelineCursor, loadTimelinePage } from "@/lib/timeline/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Service unavailable." },
      { status: 503 },
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = request.nextUrl.searchParams;
  const filters = normalizeTimelineFilters({
    query: query.get("q"),
    module: query.get("module"),
    from: query.get("from"),
    to: query.get("to"),
  });
  if (
    (query.get("from") && !validTimelineDate(query.get("from"))) ||
    (query.get("to") && !validTimelineDate(query.get("to"))) ||
    (filters.from && filters.to && filters.from > filters.to)
  ) {
    return NextResponse.json(
      { error: "Invalid timeline filters." },
      { status: 400 },
    );
  }

  const encodedCursor = query.get("cursor");
  const cursor = decodeTimelineCursor(encodedCursor);
  if (encodedCursor && !cursor) {
    return NextResponse.json(
      { error: "Invalid timeline cursor." },
      { status: 400 },
    );
  }

  try {
    const page = await loadTimelinePage(filters, cursor);
    if (!page)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(page, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Timeline unavailable." },
      { status: 500 },
    );
  }
}
