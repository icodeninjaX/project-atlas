import { DecisionsScreen } from "@/components/decisions/decisions-screen";
import { manilaToday } from "@/lib/analyst/evidence";
import {
  loadDecisionGoals,
  loadDecisionJournal,
  loadDecisionList,
  loadDecisionNoteStamps,
} from "@/lib/decisions/server";

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
  const [{ decisions, hasMore }, goals, journal] = await Promise.all([
    loadDecisionList(page),
    loadDecisionGoals(),
    loadDecisionJournal(),
  ]);
  // The journal's recent notes cover this page unless there are more notes
  // than one request returns.
  const pageNotes =
    journal.noteTotal > journal.notes.length
      ? await loadDecisionNoteStamps(decisions.map((decision) => decision.id))
      : journal.notes;
  return (
    <DecisionsScreen
      page={page}
      decisions={decisions}
      hasMore={hasMore}
      journal={journal}
      pageNotes={pageNotes}
      goals={goals}
      todayIso={manilaToday(new Date())}
    />
  );
}
