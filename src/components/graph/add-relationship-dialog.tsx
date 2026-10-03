"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addGraphRelationshipAction,
  searchGraphCandidatesAction,
} from "@/lib/graph/actions";
import {
  explicitGraphPairs,
  graphRegistry,
  type GraphEntitySummary,
  type GraphEntityType,
} from "@/lib/graph/registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setTaskGoalRelationshipAction } from "@/lib/tasks/actions";

const nativeTaskPair = {
  source: "task",
  target: "goal",
  kind: "task_goal",
  label: "Supports this goal",
} as const;

export function AddGraphRelationshipDialog({
  anchorType,
  anchorId,
  linkedKeys = [],
}: {
  anchorType: "goal" | "goal_milestone";
  anchorId: string;
  /** `type:id` keys already related to the anchor, shown as linked. */
  linkedKeys?: string[];
}) {
  const router = useRouter();
  const pairs = [
    ...explicitGraphPairs.filter(
      (pair) => pair.source === anchorType || pair.target === anchorType,
    ),
    ...(anchorType === "goal" ? [nativeTaskPair] : []),
  ];
  const [pairIndex, setPairIndex] = useState(0);
  const pair = pairs[pairIndex] ?? explicitGraphPairs[0]!;
  const candidateType = (
    pair.source === anchorType ? pair.target : pair.source
  ) as GraphEntityType;
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<GraphEntitySummary[]>([]);
  const [selected, setSelected] = useState<Map<string, GraphEntitySummary>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const requestRef = useRef(0);
  const linked = new Set(linkedKeys);

  // Recent items load as soon as the dialog opens; typing narrows them.
  useEffect(() => {
    if (!open) return;
    const request = ++requestRef.current;
    const timer = window.setTimeout(
      async () => {
        setLoading(true);
        setMessage("");
        try {
          const results = await searchGraphCandidatesAction(
            candidateType,
            query,
          );
          if (request !== requestRef.current) return;
          setCandidates(results.filter((item) => item.id !== anchorId));
          if (results.length === 0)
            setMessage(
              query.trim()
                ? "No matching items. Try a different search."
                : `No ${graphRegistry[candidateType].label.toLowerCase()} yet.`,
            );
        } catch {
          if (request === requestRef.current)
            setMessage("Search could not be completed. Try again.");
        } finally {
          if (request === requestRef.current) setLoading(false);
        }
      },
      query.trim() ? 250 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [anchorId, candidateType, open, query]);

  function toggle(item: GraphEntitySummary) {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });
  }

  async function add() {
    if (selected.size === 0) return;
    setLinking(true);
    let added = 0;
    let lastFailure = "";
    for (const item of selected.values()) {
      const result =
        pair.kind === "task_goal"
          ? await setTaskGoalRelationshipAction(item.id, anchorId, "link")
          : await addGraphRelationshipAction({
              sourceType: pair.source,
              sourceId: pair.source === anchorType ? anchorId : item.id,
              targetType: pair.target,
              targetId: pair.target === anchorType ? anchorId : item.id,
              kind: pair.kind,
            });
      if (result.success) added += 1;
      else lastFailure = result.message;
    }
    setLinking(false);
    if (added > 0) router.refresh();
    if (!lastFailure) {
      setOpen(false);
      setSelected(new Map());
      setQuery("");
      return;
    }
    setMessage(
      added > 0
        ? `Linked ${added}. Some items failed: ${lastFailure}`
        : lastFailure,
    );
    setSelected(new Map());
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button" variant="secondary" size="sm">
          <Plus className="size-4" aria-hidden="true" /> Add related item
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="border-border bg-background fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-lg font-semibold">
                Add relationship
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground mt-1 text-sm">
                Pick one or more of your records to link.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="mt-5 space-y-4 overflow-y-auto">
            {pairs.length > 1 ? (
              <div>
                <label
                  htmlFor="graph-type"
                  className="mb-1 block text-sm font-semibold"
                >
                  Item type
                </label>
                <select
                  id="graph-type"
                  value={pairIndex}
                  onChange={(event) => {
                    setPairIndex(Number(event.target.value));
                    setCandidates([]);
                    setSelected(new Map());
                    setQuery("");
                    setMessage("");
                  }}
                  className="border-border bg-background min-h-11 w-full rounded-xl border px-3 text-sm"
                >
                  {pairs.map((option, index) => (
                    <option
                      key={`${option.source}:${option.target}`}
                      value={index}
                    >
                      {
                        graphRegistry[
                          (option.source === anchorType
                            ? option.target
                            : option.source) as GraphEntityType
                        ].label
                      }
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <form onSubmit={(event) => event.preventDefault()}>
              <label
                htmlFor="graph-search"
                className="mb-1 block text-sm font-semibold"
              >
                Search {graphRegistry[candidateType].label.toLowerCase()}
              </label>
              <div className="flex gap-2">
                <Input
                  id="graph-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  type={candidateType === "weekly_review" ? "date" : "search"}
                  placeholder="Name or title"
                  maxLength={80}
                  autoComplete="off"
                />
                <Search
                  className="text-muted-foreground size-4 shrink-0 self-center"
                  aria-hidden="true"
                />
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {query.trim()
                  ? "Results update as you type."
                  : "Showing your most recent items."}
              </p>
            </form>
            <div
              role="status"
              aria-live="polite"
              className="text-muted-foreground text-sm"
            >
              {loading ? "Loading…" : message}
            </div>
            {candidates.length > 0 ? (
              <div
                className="border-border max-h-56 overflow-y-auto rounded-xl border"
                role="group"
                aria-label="Search results"
              >
                {candidates.map((item) => {
                  const alreadyLinked = linked.has(`${item.type}:${item.id}`);
                  const isSelected = selected.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggle(item)}
                      disabled={alreadyLinked}
                      aria-pressed={isSelected}
                      className="border-border hover:bg-muted focus-visible:ring-ring aria-pressed:bg-primary/10 flex min-h-12 w-full min-w-0 items-center gap-3 border-b px-3 py-2 text-left last:border-b-0 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span
                        aria-hidden="true"
                        className="border-border aria-checked:border-primary aria-checked:bg-primary aria-checked:text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-md border"
                        aria-checked={isSelected || alreadyLinked}
                      >
                        {isSelected || alreadyLinked ? (
                          <Check className="size-3.5" />
                        ) : null}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="w-full text-sm font-semibold break-words">
                          {item.title}
                        </span>
                        {item.subtitle || alreadyLinked ? (
                          <span className="text-muted-foreground text-xs">
                            {[
                              alreadyLinked ? "Already linked" : null,
                              item.subtitle,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="border-border bg-muted/30 rounded-xl border p-3 text-sm">
              <span className="font-semibold">Relationship:</span> {pair.label}
            </div>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              type="button"
              disabled={selected.size === 0 || linking}
              onClick={() => void add()}
            >
              {linking
                ? "Linking…"
                : selected.size > 1
                  ? `Link ${selected.size} items`
                  : "Link item"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
