import { ChevronLeft, ChevronRight, History } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeading } from "@/components/shared/page-heading";
import {
  cardClass,
  fieldLabelClass,
  selectClass,
} from "@/components/settings/settings-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isCalendarDate } from "@/lib/dates/dates";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/shared/page-shell";

export const metadata = { title: "Activity history" };

const entityTypes = [
  ["", "All activity"],
  ["tasks", "Tasks"],
  ["debt_payments", "Debt payments"],
  ["job_applications", "Career applications"],
  ["goals", "Goals"],
  ["weekly_reviews", "Weekly reviews"],
  ["knowledge_concepts", "Knowledge"],
] as const;

const pageSize = 25;

function validDate(value: string | undefined) {
  return isCalendarDate(value) ? value : "";
}

function pageHref({
  page,
  type,
  from,
  to,
}: {
  page: number;
  type: string;
  from: string;
  to: string;
}) {
  const query = new URLSearchParams();
  if (type) query.set("type", type);
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  if (page > 1) query.set("page", String(page));
  const suffix = query.toString();
  return suffix ? `/settings/activity?${suffix}` : "/settings/activity";
}

function readableLabel(value: unknown) {
  const words = String(value || "Activity").replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const manilaDayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const manilaDayLabel = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const manilaTime = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  timeStyle: "short",
});

/** Events grouped by their Manila calendar day, keeping the newest first. */
function groupByDay<T extends { created_at: string }>(items: T[]) {
  const days: Array<{ key: string; label: string; items: T[] }> = [];
  for (const item of items) {
    const date = new Date(item.created_at);
    const key = manilaDayKey.format(date);
    const last = days.at(-1);
    if (last?.key === key) last.items.push(item);
    else days.push({ key, label: manilaDayLabel.format(date), items: [item] });
  }
  return days;
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const allowedTypes = new Set<string>(entityTypes.map(([value]) => value));
  const type = allowedTypes.has(params.type ?? "") ? (params.type ?? "") : "";
  const from = validDate(params.from);
  const to = validDate(params.to);
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const supabase = await createClient();
  let query = supabase
    ? supabase
        .from("activity_log")
        .select("id,action,entity_type,entity_id,metadata,created_at", {
          count: "exact",
        })
        .order("created_at", { ascending: false })
    : null;
  if (query && type) query = query.eq("entity_type", type);
  if (query && from) query = query.gte("created_at", `${from}T00:00:00+08:00`);
  if (query && to) {
    const nextDay = new Date(`${to}T00:00:00+08:00`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    query = query.lt("created_at", nextDay.toISOString());
  }
  const { data, count } = query
    ? await query.range((page - 1) * pageSize, page * pageSize - 1)
    : { data: [], count: 0 };
  const activity = data ?? [];
  // A page past the end (a stale bookmark, or filters that now match less)
  // returns nothing; start the filtered list over rather than claim it is
  // empty.
  if (page > 1 && activity.length === 0) {
    redirect(pageHref({ page: 1, type, from, to }) as Route);
  }
  const filtered = Boolean(type || from || to);
  const total = count ?? activity.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PageShell>
      <PageHeading
        eyebrow="Settings / Activity"
        title="Activity history"
        description="A concise record of meaningful changes. Full record payloads, passwords, and secrets are never stored here."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/timeline">Open timeline</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/settings">Back to settings</Link>
            </Button>
          </div>
        }
      />

      <form
        method="get"
        className={cn(
          cardClass,
          "mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_160px_160px_auto]",
        )}
      >
        <div className="space-y-1.5">
          <label htmlFor="activity-type" className={fieldLabelClass}>
            Activity type
          </label>
          <select
            id="activity-type"
            name="type"
            defaultValue={type}
            className={selectClass}
          >
            {entityTypes.map(([value, label]) => (
              <option key={value || "all"} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="activity-from" className={fieldLabelClass}>
            From
          </label>
          <Input
            id="activity-from"
            name="from"
            type="date"
            defaultValue={from}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="activity-to" className={fieldLabelClass}>
            To
          </label>
          <Input id="activity-to" name="to" type="date" defaultValue={to} />
        </div>
        <Button type="submit" className="self-end">
          Apply filters
        </Button>
      </form>

      <div className="mt-6 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold">Recent changes</h2>
        <p className="text-muted-foreground font-mono text-xs">
          {total} {total === 1 ? "event" : "events"}
        </p>
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Activity pagination"
          className="mt-4 flex items-center justify-between gap-3"
        >
          <Button asChild variant="secondary" size="sm">
            <Link
              href={
                pageHref({
                  page: Math.max(1, page - 1),
                  type,
                  from,
                  to,
                }) as never
              }
              aria-disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Link>
          </Button>
          <span className="text-muted-foreground font-mono text-xs">
            Page {Math.min(page, totalPages)} of {totalPages}
          </span>
          <Button asChild variant="secondary" size="sm">
            <Link
              href={
                pageHref({
                  page: Math.min(totalPages, page + 1),
                  type,
                  from,
                  to,
                }) as never
              }
              aria-disabled={page >= totalPages}
              className={
                page >= totalPages ? "pointer-events-none opacity-50" : ""
              }
            >
              Next
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </nav>
      )}

      <div className="mt-3">
        {activity.length === 0 ? (
          <EmptyState
            icon={History}
            title={
              filtered ? "No activity matches these filters" : "No activity yet"
            }
            description={
              filtered
                ? from && to && from > to
                  ? "The From date is after the To date. Swap them to see that range."
                  : "Try another activity type or a wider date range."
                : "Completed tasks, knowledge reviews, debt payments, career stage changes, goal updates, and submitted reviews will appear here."
            }
            action={
              <Button asChild size="sm" variant="secondary">
                {filtered ? (
                  <Link href="/settings/activity">Clear filters</Link>
                ) : (
                  <Link href="/dashboard">Return to Today</Link>
                )}
              </Button>
            }
          />
        ) : (
          <div className={cn(cardClass, "overflow-hidden")}>
            {groupByDay(activity).map((day) => (
              <section
                key={day.key}
                aria-label={day.label}
                className="border-border/70 border-t first:border-t-0"
              >
                <h3 className="bg-muted/30 text-muted-foreground px-4 py-2 text-xs font-semibold sm:px-5">
                  {day.label}
                </h3>
                <ol
                  aria-label={`Activity events, ${day.label}`}
                  className="divide-border/70 border-border/70 divide-y border-t"
                >
                  {day.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 px-4 py-3 sm:items-center sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {readableLabel(item.action)}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {readableLabel(item.entity_type)}
                        </p>
                      </div>
                      <time
                        dateTime={item.created_at}
                        className="text-muted-foreground shrink-0 text-right font-mono text-xs"
                      >
                        {manilaTime.format(new Date(item.created_at))}
                      </time>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
