"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  Archive,
  BookOpen,
  Brain,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createKnowledgeConceptAction,
  reviewKnowledgeConceptAction,
  setKnowledgeConceptArchivedAction,
  type KnowledgeActionState,
  updateKnowledgeConceptAction,
} from "@/lib/knowledge/actions";

export type KnowledgeConcept = {
  id: string;
  title: string;
  notes: string;
  category: string;
  tags: string[];
  example: string | null;
  personal_explanation: string | null;
  confidence: number;
  review_count: number;
  interval_days: number;
  last_reviewed_at: string | null;
  next_review_at: string;
  archived_at: string | null;
  created_at: string;
};

export type KnowledgeReview = {
  id: string;
  concept_id: string;
  outcome: "again" | "hard" | "good" | "easy";
  reviewed_at: string;
  next_review_at: string;
  next_interval_days: number;
};

const initialState: KnowledgeActionState = { success: false, message: "" };
const outcomes = [
  ["again", "Again", "10 min"],
  ["hard", "Hard", "1+ day"],
  ["good", "Good", "3+ days"],
  ["easy", "Easy", "7+ days"],
] as const;

function dateLabel(value: string | null) {
  if (!value) return "Not reviewed yet";
  return new Date(value).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
  });
}

export function KnowledgeWorkspace({
  concepts,
  reviews,
  initialView,
  initialConceptId,
  nowIso,
}: {
  concepts: KnowledgeConcept[];
  reviews: KnowledgeReview[];
  initialView: "library" | "due" | "recent" | "weak" | "archived";
  initialConceptId?: string;
  nowIso: string;
}) {
  const [view, setView] = useState(initialView);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeId, setActiveId] = useState(
    initialConceptId ?? concepts[0]?.id ?? "",
  );
  const [revealed, setRevealed] = useState(false);
  const [createState, createAction, createPending] = useActionState(
    createKnowledgeConceptAction,
    initialState,
  );
  const [reviewState, reviewAction, reviewPending] = useActionState(
    reviewKnowledgeConceptAction,
    initialState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateKnowledgeConceptAction,
    initialState,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    setKnowledgeConceptArchivedAction,
    initialState,
  );
  useEffect(() => {
    const state = archiveState.message
      ? archiveState
      : updateState.message
        ? updateState
        : reviewState.message
          ? reviewState
          : createState;
    if (!state.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [archiveState, createState, reviewState, updateState]);

  const now = new Date(nowIso).getTime();
  const activeConcepts = concepts.filter((item) => !item.archived_at);
  const filtered = useMemo(() => {
    if (view === "archived") return concepts.filter((item) => item.archived_at);
    if (view === "due")
      return concepts.filter(
        (item) =>
          !item.archived_at && new Date(item.next_review_at).getTime() <= now,
      );
    if (view === "recent")
      return [...activeConcepts].sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      );
    if (view === "weak")
      return activeConcepts.filter((item) => item.confidence <= 2);
    return activeConcepts;
  }, [activeConcepts, concepts, now, view]);
  const active = filtered.find((item) => item.id === activeId) ?? filtered[0];
  const activeReviews = reviews.filter(
    (review) => review.concept_id === active?.id,
  );

  return (
    <div className="mt-6 space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [
            activeConcepts.filter(
              (item) => new Date(item.next_review_at).getTime() <= now,
            ).length,
            "Due now",
          ],
          [activeConcepts.length, "Concepts"],
          [
            activeConcepts.filter((item) => item.confidence >= 4).length,
            "Strong concepts",
          ],
          [
            activeConcepts.filter((item) => item.confidence <= 2).length,
            "Needs practice",
          ],
        ].map(([value, label]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="font-mono text-2xl font-semibold">{value}</p>
              <p className="text-muted-foreground mt-1 text-xs">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="border-border bg-card flex flex-wrap rounded-xl border p-1">
          {(["library", "due", "recent", "weak", "archived"] as const).map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={`min-h-10 rounded-lg px-3 text-xs font-semibold capitalize ${view === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item === "due"
                  ? "Due now"
                  : item === "weak"
                    ? "Weak concepts"
                    : item}
              </button>
            ),
          )}
        </div>
        <Button onClick={() => setCreating((value) => !value)}>
          <Plus className="size-4" />
          Add concept
        </Button>
      </div>

      {creating && (
        <form
          action={createAction}
          className="border-border bg-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-2"
        >
          <label className="text-muted-foreground text-xs">
            Concept title
            <Input
              name="title"
              required
              maxLength={160}
              className="mt-1.5"
              placeholder="e.g. Compound interest"
            />
          </label>
          <label className="text-muted-foreground text-xs">
            Category
            <Input
              name="category"
              required
              maxLength={80}
              className="mt-1.5"
              placeholder="Finance, technology, career…"
            />
          </label>
          <label className="text-muted-foreground text-xs sm:col-span-2">
            Learning notes
            <textarea
              name="notes"
              required
              maxLength={10000}
              rows={4}
              className="border-border bg-background mt-1.5 w-full rounded-xl border p-3 text-sm"
              placeholder="The explanation you want to remember"
            />
          </label>
          <label className="text-muted-foreground text-xs">
            Tags
            <Input
              name="tags"
              className="mt-1.5"
              placeholder="Comma-separated"
            />
          </label>
          <label className="text-muted-foreground text-xs">
            Example
            <Input
              name="example"
              maxLength={2000}
              className="mt-1.5"
              placeholder="A concrete example"
            />
          </label>
          <label className="text-muted-foreground text-xs sm:col-span-2">
            Personal explanation
            <textarea
              name="personalExplanation"
              maxLength={2000}
              rows={2}
              className="border-border bg-background mt-1.5 w-full rounded-xl border p-3 text-sm"
              placeholder="How would you explain this in your own words?"
            />
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreating(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              pending={createPending}
              pendingLabel="Saving…"
            >
              Save concept
            </Button>
          </div>
        </form>
      )}

      {concepts.length === 0 ? (
        <div className="border-border grid min-h-72 place-items-center rounded-2xl border border-dashed p-6 text-center">
          <div className="max-w-sm">
            <BookOpen className="text-primary mx-auto size-7" />
            <p className="mt-4 font-semibold">Build your knowledge library</p>
            <p className="text-muted-foreground mt-2 text-sm">
              Add the first concept you want ATLAS to help you retain.
            </p>
            <Button className="mt-5" onClick={() => setCreating(true)}>
              Add your first concept
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
          <Card>
            <CardContent>
              <h2 className="text-lg font-semibold">
                {view === "due" ? "Due for review" : "Knowledge library"}
              </h2>
              <div className="mt-4 space-y-3">
                {filtered.map((concept) => (
                  <button
                    type="button"
                    key={concept.id}
                    onClick={() => {
                      setActiveId(concept.id);
                      setRevealed(false);
                      setEditing(false);
                    }}
                    className={`border-border hover:border-primary w-full rounded-xl border p-4 text-left ${active?.id === concept.id ? "bg-primary/5 border-primary" : "bg-background"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{concept.title}</p>
                        <p className="text-primary mt-1 text-xs">
                          {concept.category}
                        </p>
                      </div>
                      <span className="bg-muted text-muted-foreground rounded-full px-2 py-1 font-mono text-[10px]">
                        Confidence {concept.confidence}/5
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-3 text-xs">
                      Last reviewed: {dateLabel(concept.last_reviewed_at)}
                    </p>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-muted-foreground py-12 text-center text-sm">
                    Nothing matches this view.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {active && active.archived_at && (
            <Card className="xl:sticky xl:top-6 xl:self-start">
              <CardContent>
                <h2 className="text-lg font-semibold">{active.title}</h2>
                <p className="text-primary mt-1 text-xs">{active.category}</p>
                <p className="mt-5 text-sm leading-6 whitespace-pre-wrap">
                  {active.notes}
                </p>
                <form action={archiveAction} className="mt-5">
                  <input type="hidden" name="conceptId" value={active.id} />
                  <input type="hidden" name="archived" value="false" />
                  <Button
                    type="submit"
                    pending={archivePending}
                    pendingLabel="Restoring…"
                  >
                    <RotateCcw className="size-4" />
                    Restore concept
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
          {active && !active.archived_at && (
            <Card className="xl:sticky xl:top-6 xl:self-start">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="text-primary size-5" />
                    <h2 className="text-lg font-semibold">Active recall</h2>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {active.review_count} reviews
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditing((value) => !value)}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <form action={archiveAction}>
                    <input type="hidden" name="conceptId" value={active.id} />
                    <input type="hidden" name="archived" value="true" />
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      pending={archivePending}
                      pendingLabel="Archiving…"
                    >
                      <Archive className="size-3.5" />
                      Archive
                    </Button>
                  </form>
                </div>
                {editing && (
                  <form
                    action={updateAction}
                    className="border-border mt-4 grid gap-3 rounded-xl border p-3"
                  >
                    <input type="hidden" name="conceptId" value={active.id} />
                    <label className="text-muted-foreground text-xs">
                      Title
                      <Input
                        name="title"
                        required
                        maxLength={160}
                        defaultValue={active.title}
                        className="mt-1"
                      />
                    </label>
                    <label className="text-muted-foreground text-xs">
                      Category
                      <Input
                        name="category"
                        required
                        maxLength={80}
                        defaultValue={active.category}
                        className="mt-1"
                      />
                    </label>
                    <label className="text-muted-foreground text-xs">
                      Notes
                      <textarea
                        name="notes"
                        required
                        maxLength={10000}
                        rows={4}
                        defaultValue={active.notes}
                        className="border-border bg-background mt-1 w-full rounded-xl border p-3 text-sm"
                      />
                    </label>
                    <label className="text-muted-foreground text-xs">
                      Tags
                      <Input
                        name="tags"
                        defaultValue={active.tags.join(", ")}
                        className="mt-1"
                      />
                    </label>
                    <label className="text-muted-foreground text-xs">
                      Example
                      <Input
                        name="example"
                        maxLength={2000}
                        defaultValue={active.example ?? ""}
                        className="mt-1"
                      />
                    </label>
                    <label className="text-muted-foreground text-xs">
                      Personal explanation
                      <textarea
                        name="personalExplanation"
                        maxLength={2000}
                        rows={2}
                        defaultValue={active.personal_explanation ?? ""}
                        className="border-border bg-background mt-1 w-full rounded-xl border p-3 text-sm"
                      />
                    </label>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setEditing(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        pending={updatePending}
                        pendingLabel="Saving…"
                      >
                        Save changes
                      </Button>
                    </div>
                  </form>
                )}
                {!editing && (
                  <>
                    <p className="mt-6 text-lg font-semibold">
                      Explain “{active.title}” in your own words.
                    </p>
                    <form action={reviewAction} className="mt-4">
                      <input type="hidden" name="conceptId" value={active.id} />
                      <textarea
                        name="recalledAnswer"
                        rows={5}
                        className="border-border bg-background w-full rounded-xl border p-3 text-sm"
                        placeholder="Type your answer before revealing the notes…"
                      />
                      {!revealed ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="mt-3"
                          onClick={() => setRevealed(true)}
                        >
                          <Eye className="size-4" />
                          Reveal notes
                        </Button>
                      ) : (
                        <div className="bg-muted mt-3 rounded-xl p-4">
                          <p className="text-primary text-[11px] font-semibold tracking-wider uppercase">
                            Learning notes
                          </p>
                          <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">
                            {active.notes}
                          </p>
                          {active.example && (
                            <p className="text-muted-foreground mt-3 text-xs">
                              <strong>Example:</strong> {active.example}
                            </p>
                          )}
                        </div>
                      )}
                      <fieldset
                        disabled={!revealed || reviewPending}
                        className="mt-5"
                      >
                        <legend className="text-muted-foreground mb-2 text-xs">
                          How well did you recall it?
                        </legend>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {outcomes.map(([value, label, interval]) => (
                            <button
                              key={value}
                              name="outcome"
                              value={value}
                              className="border-border hover:border-primary min-h-14 rounded-xl border px-2 text-xs font-semibold disabled:opacity-40"
                            >
                              <span className="block">{label}</span>
                              <span className="text-muted-foreground mt-1 block font-mono text-[9px]">
                                {interval}
                              </span>
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    </form>
                    <p className="text-muted-foreground mt-4 flex gap-2 text-[11px] leading-4">
                      <Sparkles className="size-3.5 shrink-0" />
                      ATLAS schedules reviews deterministically from your last
                      interval and rating.
                    </p>
                    {activeReviews.length > 0 && (
                      <section className="border-border mt-5 border-t pt-4">
                        <h3 className="text-sm font-semibold">
                          Review history
                        </h3>
                        <ol className="mt-3 space-y-2">
                          {activeReviews.slice(0, 8).map((review) => (
                            <li
                              key={review.id}
                              className="flex items-center justify-between gap-3 text-xs"
                            >
                              <span className="capitalize">
                                {review.outcome}
                              </span>
                              <span className="text-muted-foreground">
                                {dateLabel(review.reviewed_at)} ·{" "}
                                {review.next_interval_days === 0
                                  ? "10 min"
                                  : `${review.next_interval_days} days`}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </section>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
