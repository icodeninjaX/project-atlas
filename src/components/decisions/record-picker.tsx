"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchGraphCandidatesAction } from "@/lib/graph/actions";
import type { GraphEntitySummary } from "@/lib/graph/registry";

const labels: Record<"task" | "transaction" | "job_application", string> = {
  task: "Task",
  transaction: "Transaction",
  job_application: "Career application",
};

type SourceType = keyof typeof labels;

export function RecordPicker({
  name,
  label,
  types,
  initial,
}: {
  name: string;
  label: string;
  types: readonly SourceType[];
  initial?: Pick<GraphEntitySummary, "type" | "id" | "title"> | null;
}) {
  const [type, setType] = useState<SourceType>(
    types.includes(initial?.type as SourceType)
      ? (initial!.type as SourceType)
      : types[0]!,
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<typeof initial>(initial ?? null);
  const [candidates, setCandidates] = useState<GraphEntitySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const form = root.current?.closest("form");
    const reset = () => {
      setSelected(initial ?? null);
      setCandidates([]);
      setQuery("");
      setMessage("");
    };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [initial]);

  async function search() {
    setLoading(true);
    setMessage("");
    try {
      const results = await searchGraphCandidatesAction(type, query);
      setCandidates(results);
      if (results.length === 0)
        setMessage("No matching records. Try another search.");
    } catch {
      setMessage("Search could not be completed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={root} className="sm:col-span-2">
      <p className="text-muted-foreground text-xs">{label} (optional)</p>
      <input
        type="hidden"
        name={name}
        value={selected ? `${selected.type}:${selected.id}` : ""}
      />
      {selected ? (
        <div className="border-border bg-background mt-1.5 flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
          <span className="min-w-0 text-sm break-words">
            {labels[selected.type as SourceType]} · {selected.title}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelected(null)}
          >
            Remove link
          </Button>
        </div>
      ) : (
        <div className="mt-1.5 grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)_auto]">
          {types.length > 1 && (
            <label className="text-muted-foreground text-xs">
              Record type
              <select
                value={type}
                onChange={(event) => {
                  setType(event.target.value as SourceType);
                  setCandidates([]);
                }}
                className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
              >
                {types.map((item) => (
                  <option key={item} value={item}>
                    {labels[item]}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="text-muted-foreground text-xs">
            Search {types.length === 1 ? labels[type].toLowerCase() : "records"}
            <Input
              className="mt-1.5"
              value={query}
              maxLength={80}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name"
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            className="self-end"
            disabled={loading}
            onClick={() => void search()}
          >
            {loading ? "Searching…" : "Find"}
          </Button>
        </div>
      )}
      {!selected && candidates.length > 0 && (
        <ul
          className="border-border bg-background mt-2 max-h-52 overflow-y-auto rounded-xl border p-1"
          aria-label="Matching records"
        >
          {candidates.map((item) => (
            <li key={`${item.type}:${item.id}`}>
              <button
                type="button"
                onClick={() => {
                  setSelected(item);
                  setCandidates([]);
                }}
                className="hover:bg-muted focus-visible:ring-ring min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm break-words focus-visible:ring-2"
              >
                {item.title}
                {item.subtitle ? ` · ${item.subtitle}` : ""}
              </button>
            </li>
          ))}
        </ul>
      )}
      {message && (
        <p role="status" className="text-muted-foreground mt-1 text-xs">
          {message}
        </p>
      )}
    </div>
  );
}
