import { Scale } from "lucide-react";
import {
  DecisionJournalList,
  type JournalEntry,
} from "@/components/decisions/decision-journal-list";
import { DecisionCreateButton } from "@/components/decisions/decision-sheet";
import {
  DecisionsEmptyHero,
  DecisionsHero,
} from "@/components/decisions/decisions-hero";
import type { Decision } from "@/lib/decisions/decision";
import {
  decisionReview,
  summarizeJournal,
  tallyNotes,
  type JournalDecision,
  type NoteStamp,
} from "@/lib/decisions/view";
import { PageHeading } from "@/components/shared/page-heading";
import { PageShell } from "@/components/shared/page-shell";

/** The decision journal page body, from data the page has already loaded. */
export function DecisionsScreen({
  page,
  decisions,
  hasMore,
  journal,
  pageNotes,
  goals,
  todayIso,
}: {
  page: number;
  /** This page of the journal, newest first. */
  decisions: Decision[];
  hasMore: boolean;
  journal: {
    decisions: JournalDecision[];
    total: number;
    notes: NoteStamp[];
    noteTotal: number;
  };
  /** Every note date for the decisions on this page. */
  pageNotes: NoteStamp[];
  goals: { id: string; title: string }[];
  /** Today in Manila, `YYYY-MM-DD`. */
  todayIso: string;
}) {
  const summary = summarizeJournal({ ...journal, todayIso });
  const empty = summary.total === 0 && decisions.length === 0;
  const tally = tallyNotes(pageNotes);
  const goalTitles = new Map(goals.map((goal) => [goal.id, goal.title]));
  const entries: JournalEntry[] = decisions.map((decision) => {
    const notes = tally.get(decision.id);
    return {
      decision,
      review: decisionReview(decision, notes?.latestOn ?? null, todayIso),
      notes: notes?.count ?? 0,
      goal: decision.goal_id
        ? (goalTitles.get(decision.goal_id) ?? null)
        : null,
    };
  });

  return (
    <PageShell>
      <PageHeading
        eyebrow="Reflect"
        icon={Scale}
        title="Decision journal"
        description="Record a choice in your own words, then return to what happened. ATLAS will not infer past decisions for you."
        actions={
          // Until something is recorded, the hero holds the only add button.
          empty ? undefined : (
            <DecisionCreateButton goals={goals} today={todayIso} />
          )
        }
      />

      {empty ? (
        <DecisionsEmptyHero goals={goals} today={todayIso} />
      ) : (
        <>
          {page === 1 ? (
            <DecisionsHero summary={summary} todayIso={todayIso} />
          ) : null}
          <DecisionJournalList
            entries={entries}
            page={page}
            hasMore={hasMore}
          />
        </>
      )}
    </PageShell>
  );
}
