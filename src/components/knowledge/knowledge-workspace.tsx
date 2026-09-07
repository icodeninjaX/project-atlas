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
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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

type KnowledgeView = "all" | "due" | "weak" | "archived";
type KnowledgeSort = "next-review" | "newest" | "title";

const primaryViews: Array<{
  value: Exclude<KnowledgeView, "archived">;
  label: string;
}> = [
  { value: "all", label: "All concepts" },
  { value: "due", label: "Due for review" },
  { value: "weak", label: "Needs practice" },
];

function dateLabel(value: string | null) {
  if (!value) return "Not reviewed yet";
  return new Date(value).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
  });
}

function sortConcepts(concepts: KnowledgeConcept[], sort: KnowledgeSort) {
  return [...concepts].sort((left, right) => {
    if (sort === "title") return left.title.localeCompare(right.title);
    if (sort === "newest")
      return right.created_at.localeCompare(left.created_at);
    return left.next_review_at.localeCompare(right.next_review_at);
  });
}

export function KnowledgeWorkspace({
  concepts,
  reviews,
  initialView,
  initialQuery,
  initialCategory,
  initialSort,
  initialConceptId,
  nowIso,
}: {
  concepts: KnowledgeConcept[];
  reviews: KnowledgeReview[];
  initialView: KnowledgeView;
  initialQuery: string;
  initialCategory: string;
  initialSort: KnowledgeSort;
  initialConceptId?: string;
  nowIso: string;
}) {
  const [view, setView] = useState(initialView);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<KnowledgeSort>(initialSort);
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
  const pathname = usePathname();
  const router = useRouter();
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
  const activeConcepts = useMemo(
    () => concepts.filter((item) => !item.archived_at),
    [concepts],
  );
  const dueConcepts = useMemo(
    () =>
      activeConcepts.filter(
        (item) => new Date(item.next_review_at).getTime() <= now,
      ),
    [activeConcepts, now],
  );
  const categories = useMemo(
    () =>
      [
        ...new Set(
          concepts.map((item) => item.category.trim()).filter(Boolean),
        ),
      ].sort((left, right) => left.localeCompare(right)),
    [concepts],
  );
  const selectedCategory =
    category === "all" || categories.includes(category) ? category : "all";
  const filtered = useMemo(() => {
    let visible = activeConcepts;
    if (view === "archived")
      visible = concepts.filter((item) => item.archived_at);
    if (view === "due") visible = dueConcepts;
    if (view === "weak")
      visible = activeConcepts.filter((item) => item.confidence <= 2);

    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (normalizedQuery) {
      visible = visible.filter((item) =>
        [item.title, item.category, ...item.tags].some((value) =>
          value.toLocaleLowerCase().includes(normalizedQuery),
        ),
      );
    }
    if (selectedCategory !== "all") {
      visible = visible.filter((item) => item.category === selectedCategory);
    }
    return sortConcepts(visible, sort);
  }, [
    activeConcepts,
    concepts,
    dueConcepts,
    query,
    selectedCategory,
    sort,
    view,
  ]);
  const active = filtered.find((item) => item.id === activeId) ?? filtered[0];
  const isActiveSelection = active?.id === activeId;
  const revealedActive = isActiveSelection && revealed;
  const editingActive = isActiveSelection && editing;
  const activeReviews = reviews.filter(
    (review) => review.concept_id === active?.id,
  );
  const filtersActive =
    query.trim() !== "" || selectedCategory !== "all" || sort !== "next-review";

  useEffect(() => {
    const params = new URLSearchParams();
    if (view !== "all") params.set("view", view);
    if (query.trim()) params.set("query", query.trim());
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (sort !== "next-review") params.set("sort", sort);
    const nextUrl = params.size ? `${pathname}?${params}` : pathname;
    router.replace(nextUrl as never);
  }, [pathname, query, router, selectedCategory, sort, view]);

  const selectView = (nextView: KnowledgeView) => {
    setView(nextView);
    setRevealed(false);
    setEditing(false);
  };

  const clearFilters = () => {
    setQuery("");
    setCategory("all");
    setSort("next-review");
  };

  return (
    <div className="mt-6 space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [dueConcepts.length, "Due now"],
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

      <section aria-label="Browse concepts" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="border-border bg-card flex max-w-full gap-1 overflow-x-auto rounded-xl border p-1">
            {primaryViews.map(({ value, label }) => {
              const count =
                value === "all"
                  ? activeConcepts.length
                  : value === "due"
                    ? dueConcepts.length
                    : activeConcepts.filter((item) => item.confidence <= 2)
                        .length;
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={`${label}, ${count} ${count === 1 ? "concept" : "concepts"}`}
                  aria-pressed={view === value}
                  onClick={() => selectView(value)}
                  className={`focus-visible:ring-ring min-h-10 shrink-0 rounded-lg px-3 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none ${view === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  {label}
                  <span className="ml-1.5 font-mono text-[10px] opacity-80">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={view === "archived" ? "secondary" : "ghost"}
              onClick={() =>
                selectView(view === "archived" ? "all" : "archived")
              }
            >
              <Archive className="size-3.5" />
              Archive
            </Button>
            <Button onClick={() => setCreating((value) => !value)}>
              <Plus className="size-4" />
              Add concept
            </Button>
          </div>
        </div>
        <div className="border-border bg-card grid gap-3 rounded-2xl border p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(10rem,0.4fr)_minmax(10rem,0.4fr)_auto]">
          <label className="text-muted-foreground text-xs">
            Search concepts
            <span className="relative mt-1 block">
              <Search className="text-muted-foreground pointer-events-none absolute top-3.5 left-3 size-4" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Title, category, or tag"
                className="pl-9"
              />
            </span>
          </label>
          <label className="text-muted-foreground text-xs">
            Category
            <select
              value={selectedCategory}
              onChange={(event) => setCategory(event.target.value)}
              className="border-border bg-background focus-visible:ring-ring mt-1 min-h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-muted-foreground text-xs">
            Sort by
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as KnowledgeSort)}
              className="border-border bg-background focus-visible:ring-ring mt-1 min-h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
            >
              <option value="next-review">Next review</option>
              <option value="newest">Newest added</option>
              <option value="title">Title A–Z</option>
            </select>
          </label>
          {filtersActive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="self-end"
            >
              <X className="size-3.5" />
              Clear filters
            </Button>
          )}
        </div>
      </section>

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
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="text-lg font-semibold">
                  {view === "due"
                    ? "Due for review"
                    : view === "weak"
                      ? "Needs practice"
                      : view === "archived"
                        ? "Archived concepts"
                        : "Knowledge library"}
                </h2>
                <p className="text-muted-foreground text-xs">
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "concept" : "concepts"}
                  {concepts.length === 200 && " across the 200 loaded concepts"}
                </p>
              </div>
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
                      <div className="min-w-0">
                        <p className="font-semibold">{concept.title}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className="text-primary text-xs">
                            {concept.category}
                          </span>
                          {concept.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="bg-muted text-muted-foreground rounded-full px-2 py-1 font-mono text-[10px]">
                        Confidence {concept.confidence}/5
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-3 text-xs">
                      {concept.archived_at
                        ? "Archived"
                        : `Next review: ${dateLabel(concept.next_review_at)}`}
                    </p>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="text-muted-foreground py-12 text-center text-sm">
                    <p>
                      {filtersActive
                        ? "No concepts match these filters."
                        : view === "due"
                          ? "Nothing is due for review right now."
                          : view === "archived"
                            ? "Your archive is empty."
                            : view === "weak"
                              ? "No concepts need extra practice right now."
                              : "Your knowledge library is empty."}
                    </p>
                    {filtersActive ? (
                      <p className="mt-2 text-xs">
                        Clear the filters above to see more concepts.
                      </p>
                    ) : view === "all" ? (
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3"
                        onClick={() => setCreating(true)}
                      >
                        Add a concept
                      </Button>
                    ) : null}
                  </div>
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
                    onClick={() => {
                      if (active) setActiveId(active.id);
                      setEditing(!editingActive);
                    }}
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
                {editingActive && (
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
                {!editingActive && (
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
                      {!revealedActive ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="mt-3"
                          onClick={() => {
                            setActiveId(active.id);
                            setRevealed(true);
                          }}
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
                        disabled={!revealedActive || reviewPending}
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
