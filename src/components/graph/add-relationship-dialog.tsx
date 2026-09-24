"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Plus, Search, X } from "lucide-react";
import { useState } from "react";
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
}: {
  anchorType: "goal" | "goal_milestone";
  anchorId: string;
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
  const [selected, setSelected] = useState<GraphEntitySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  async function search() {
    setLoading(true);
    setMessage("");
    setSelected(null);
    try {
      const results = await searchGraphCandidatesAction(candidateType, query);
      setCandidates(results.filter((item) => item.id !== anchorId));
      if (results.length === 0)
        setMessage("No matching items. Try a different search.");
    } catch {
      setMessage("Search could not be completed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function add() {
    if (!selected) return;
    setLoading(true);
    const result =
      pair.kind === "task_goal"
        ? await setTaskGoalRelationshipAction(selected.id, anchorId, "link")
        : await addGraphRelationshipAction({
            sourceType: pair.source,
            sourceId: pair.source === anchorType ? anchorId : selected.id,
            targetType: pair.target,
            targetId: pair.target === anchorType ? anchorId : selected.id,
            kind: pair.kind,
          });
    setLoading(false);
    setMessage(result.message);
    if (result.success) {
      setOpen(false);
      setSelected(null);
      setCandidates([]);
      router.refresh();
    }
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
                Search your records and choose one item to link.
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
                    setSelected(null);
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
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void search();
              }}
            >
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
                  placeholder={
                    candidateType === "weekly_review"
                      ? "YYYY-MM-DD"
                      : "Name or title"
                  }
                  maxLength={80}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={loading}
                  aria-label="Search related items"
                >
                  <Search className="size-4" />
                </Button>
              </div>
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
                {candidates.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    aria-pressed={selected?.id === item.id}
                    className="border-border hover:bg-muted focus-visible:ring-ring flex min-h-12 w-full min-w-0 flex-col border-b px-3 py-2 text-left last:border-b-0 focus-visible:ring-2"
                  >
                    <span className="w-full text-sm font-semibold break-words">
                      {item.title}
                    </span>
                    {item.subtitle ? (
                      <span className="text-muted-foreground text-xs">
                        {item.subtitle}
                      </span>
                    ) : null}
                  </button>
                ))}
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
              disabled={!selected || loading}
              onClick={() => void add()}
            >
              {loading ? "Linking…" : "Link item"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
