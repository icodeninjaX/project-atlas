import { Scale } from "lucide-react";
import { SpotlightArea } from "@/components/dashboard/spotlight-area";
import todayStyles from "@/components/dashboard/today.module.css";
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
import { cn } from "@/lib/utils";

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
    <SpotlightArea className="relative isolate mx-auto w-full max-w-5xl min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div
        aria-hidden="true"
        className={cn(todayStyles.aurora, todayStyles.grain)}
      />

      <header className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-6">
        <div className="max-w-2xl min-w-0">
          <p className="bg-card/60 text-primary ring-border/70 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.1em] uppercase ring-1 backdrop-blur">
            <Scale aria-hidden="true" className="size-3.5" />
            Reflect
          </p>
          <h1 className="from-foreground via-foreground to-foreground/60 mt-4 bg-gradient-to-br bg-clip-text pb-[0.08em] text-[2.125rem] leading-[1.04] font-semibold tracking-[-0.05em] text-transparent sm:text-[2.75rem] lg:text-[3.25rem]">
            Decision journal
          </h1>
          <p className="text-muted-foreground mt-2.5 max-w-xl text-sm leading-6 sm:text-[0.9375rem]">
            Record a choice in your own words, then return to what happened.
            ATLAS will not infer past decisions for you.
          </p>
        </div>
        {/* Until something is recorded, the hero holds the only add button. */}
        {empty ? null : (
          <DecisionCreateButton
            goals={goals}
            today={todayIso}
            className="self-start max-sm:w-full sm:self-auto"
          />
        )}
      </header>

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
    </SpotlightArea>
  );
}
