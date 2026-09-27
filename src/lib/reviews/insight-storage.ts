import type { Json } from "@/lib/supabase/database.types";

/** A claim older than this was abandoned mid-request and reads as failed. */
const CLAIM_TIMEOUT_MS = 2 * 60_000;

/** Maps a stored weekly insight row to the card's response shape. */
export function storedResponse(
  row: {
    status: string;
    claims: Json;
    evidence: Json;
    limitations: Json;
    created_at: string;
  },
  weekStart: string,
  now = Date.now(),
) {
  const base = {
    claims: row.claims,
    evidence: row.evidence,
    limitations: row.limitations,
    weekStart,
    stored: true,
  };
  if (row.status === "answered") return { status: "answered", ...base };
  const preparing =
    row.status === "pending" &&
    now - Date.parse(row.created_at) < CLAIM_TIMEOUT_MS;
  return {
    status: "fallback",
    ...base,
    ...(preparing
      ? {
          failureCode: "in_progress",
          message:
            "Last week's insight is being prepared. Refresh in a minute to see it.",
        }
      : row.status === "insufficient"
        ? {
            failureCode: "insufficient_evidence",
            message:
              "Last week's records were not complete enough for an insight. Review the facts below.",
          }
        : {
            failureCode: "not_prepared",
            message:
              "Last week's insight could not be prepared and will not be retried until next week. You can still check this week so far.",
          }),
  };
}
