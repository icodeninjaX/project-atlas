import Link from "next/link";
import { DecisionCreatePanel } from "@/components/decisions/decision-create-panel";
import { PageHeading } from "@/components/shared/page-heading";
import { manilaToday } from "@/lib/analyst/evidence";
import { loadDecisionGoals, loadDecisionList } from "@/lib/decisions/server";

export const metadata = { title: "Decision journal" };

export default async function DecisionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const query = await searchParams;
  const page = /^\d+$/.test(query.page ?? "")
    ? Math.min(500, Math.max(1, Number(query.page)))
    : 1;
  const [{ decisions, hasMore }, goals] = await Promise.all([
    loadDecisionList(page),
    loadDecisionGoals(),
  ]);
  const today = manilaToday(new Date());
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Reflect"
        title="Decision journal"
        description="Record a choice in your own words, then return to what happened. ATLAS will not infer past decisions for you."
      />
      <DecisionCreatePanel
        goals={goals}
        today={today}
        startOpen={page === 1 && decisions.length === 0}
      >
        {decisions.length === 0 ? (
          <div className="border-border mt-3 rounded-2xl border border-dashed p-8 text-center">
            <p className="text-sm font-semibold">No decisions recorded yet</p>
            <p className="text-muted-foreground mt-2 text-xs">
              Start with a choice you want to revisit.
            </p>
          </div>
        ) : (
          <ul className="mt-3 grid gap-3">
            {decisions.map((decision) => (
              <li
                key={decision.id}
                className="border-border bg-card min-w-0 rounded-2xl border p-4"
              >
                <p className="text-muted-foreground text-xs">
                  Decided {decision.decision_on} · Review {decision.review_on}
                </p>
                <h3 className="mt-1 font-semibold break-words">
                  {decision.title}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm break-words">
                  {decision.expected_outcome}
                </p>
                <Link
                  href={`/decisions/${decision.id}` as never}
                  className="text-primary focus-visible:ring-ring mt-3 inline-flex min-h-11 items-center rounded-xl text-sm font-semibold underline underline-offset-2 focus-visible:ring-2 focus-visible:outline-none"
                >
                  Review decision
                </Link>
              </li>
            ))}
          </ul>
        )}
        <nav
          aria-label="Decision pages"
          className="mt-4 flex items-center gap-3"
        >
          {page > 1 && (
            <Link
              href={`/decisions?page=${page - 1}` as never}
              className="text-primary inline-flex min-h-11 items-center text-sm underline underline-offset-2"
            >
              Previous
            </Link>
          )}
          <span className="text-muted-foreground text-xs">Page {page}</span>
          {hasMore && (
            <Link
              href={`/decisions?page=${page + 1}` as never}
              className="text-primary inline-flex min-h-11 items-center text-sm underline underline-offset-2"
            >
              Next
            </Link>
          )}
        </nav>
      </DecisionCreatePanel>
    </div>
  );
}
