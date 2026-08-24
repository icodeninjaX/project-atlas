import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    { status: "ok", service: "atlas" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
