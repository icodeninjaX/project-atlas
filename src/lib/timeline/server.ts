import "server-only";

import {
  type TimelineCursor,
  type TimelineEvent,
  type TimelineFilters,
  isTimelineModule,
} from "@/lib/timeline/timeline";
import { createClient } from "@/lib/supabase/server";

const pageSize = 30;

type TimelineRow = {
  event_id: string;
  occurred_on: string;
  occurred_at: string;
  occurred_precision: "date" | "timestamp";
  module: string;
  event_type: string;
  title: string;
  description: string | null;
  amount_centavos: number | string | null;
  amount_direction: "inflow" | "outflow" | "neutral" | null;
  metric_label: string | null;
  metric_value: string | null;
  source_href: string | null;
  source_available: boolean;
};

function toTimelineEvent(row: TimelineRow): TimelineEvent | null {
  if (!isTimelineModule(row.module)) return null;
  return {
    eventId: row.event_id,
    occurredOn: row.occurred_on,
    occurredAt: row.occurred_at,
    occurredPrecision: row.occurred_precision,
    module: row.module,
    eventType: row.event_type,
    title: row.title,
    description: row.description,
    amountCentavos:
      row.amount_centavos === null ? null : Number(row.amount_centavos),
    amountDirection: row.amount_direction,
    metricLabel: row.metric_label,
    metricValue: row.metric_value,
    sourceHref: row.source_href,
    sourceAvailable: row.source_available,
  };
}

export function encodeTimelineCursor(cursor: TimelineCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeTimelineCursor(
  value: string | null,
): TimelineCursor | null {
  if (!value || value.length > 300) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<TimelineCursor>;
    if (
      typeof parsed.occurredOn !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(parsed.occurredOn) ||
      typeof parsed.occurredAt !== "string" ||
      Number.isNaN(new Date(parsed.occurredAt).getTime()) ||
      typeof parsed.eventId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(parsed.eventId)
    ) {
      return null;
    }
    return {
      occurredOn: parsed.occurredOn,
      occurredAt: parsed.occurredAt,
      eventId: parsed.eventId,
    };
  } catch {
    return null;
  }
}

export type TimelinePage = {
  events: TimelineEvent[];
  nextCursor: string | null;
};

export async function loadTimelinePage(
  filters: TimelineFilters,
  cursor: TimelineCursor | null,
): Promise<TimelinePage | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc("life_timeline", {
    p_query: filters.query || null,
    p_module: filters.module,
    p_from_date: filters.from,
    p_to_date: filters.to,
    p_before_on: cursor?.occurredOn ?? null,
    p_before_at: cursor?.occurredAt ?? null,
    p_before_id: cursor?.eventId ?? null,
    p_limit: pageSize + 1,
  });
  if (error) throw new Error("Timeline data could not be loaded.");

  const rows = (data ?? []) as TimelineRow[];
  const normalized = rows
    .map(toTimelineEvent)
    .filter((event): event is TimelineEvent => event !== null);
  const events = normalized.slice(0, pageSize);
  const lastEvent = events.at(-1);
  return {
    events,
    nextCursor:
      normalized.length > pageSize && lastEvent
        ? encodeTimelineCursor({
            occurredOn: lastEvent.occurredOn,
            occurredAt: lastEvent.occurredAt,
            eventId: lastEvent.eventId,
          })
        : null,
  };
}
