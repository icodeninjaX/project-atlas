import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  History,
} from "lucide-react";
import Link from "next/link";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Activity history" };

const entityTypes = [
  ["", "All activity"],
  ["tasks", "Tasks"],
  ["debt_payments", "Debt payments"],
  ["job_applications", "Career applications"],
  ["goals", "Goals"],
  ["weekly_reviews", "Weekly reviews"],
] as const;

const pageSize = 25;

function validDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
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
  const total = count ?? activity.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Audit trail"
        title="Activity history"
        description="A concise record of meaningful changes. Full record payloads, passwords, and secrets are never stored here."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/timeline">
                <History className="size-4" />
                Open timeline
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/settings">
                <ArrowLeft className="size-4" />
                Back to settings
              </Link>
            </Button>
          </div>
        }
      />

      <form
        method="get"
        className="border-border bg-card mt-6 grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_160px_160px_auto]"
      >
        <label className="text-muted-foreground text-xs">
          Activity type
          <select
            name="type"
            defaultValue={type}
            className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
          >
            {entityTypes.map(([value, label]) => (
              <option key={value || "all"} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-muted-foreground text-xs">
          From
          <input
            name="from"
            type="date"
            defaultValue={from}
            className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
          />
        </label>
        <label className="text-muted-foreground text-xs">
          To
          <input
            name="to"
            type="date"
            defaultValue={to}
            className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
          />
        </label>
        <Button type="submit" className="self-end">
          <Filter className="size-4" />
          Apply filters
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold">Recent changes</p>
        <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 font-mono text-[10px]">
          {total} {total === 1 ? "event" : "events"}
        </span>
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
          <div className="border-border grid min-h-64 place-items-center rounded-2xl border border-dashed p-6 text-center">
            <div className="max-w-sm">
              <span className="bg-primary/10 text-primary mx-auto grid size-12 place-items-center rounded-2xl">
                <History className="size-5" />
              </span>
              <p className="mt-4 text-sm font-semibold">No activity yet</p>
              <p className="text-muted-foreground mt-2 text-xs leading-5">
                Completed tasks, recorded debt payments, career stage changes,
                goal updates, and submitted reviews will appear here.
              </p>
              <Button asChild size="sm" className="mt-5">
                <Link href="/dashboard">Return to Today</Link>
              </Button>
            </div>
          </div>
        ) : (
          <ol aria-label="Activity events" className="space-y-2">
            {activity.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="flex items-start gap-3 p-3.5 sm:items-center sm:p-4">
                    <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-xl">
                      <CheckCircle2 className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {readableLabel(item.action)}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {readableLabel(item.entity_type)}
                      </p>
                    </div>
                    <time
                      dateTime={item.created_at}
                      className="text-muted-foreground shrink-0 text-right font-mono text-[10px] leading-4"
                    >
                      {new Date(item.created_at).toLocaleString("en-PH", {
                        timeZone: "Asia/Manila",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
