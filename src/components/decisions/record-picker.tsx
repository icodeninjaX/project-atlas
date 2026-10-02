"use client";

import { Link2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  fieldLabelClass,
  fieldSelectClass,
} from "@/components/career/application-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchGraphCandidatesAction } from "@/lib/graph/actions";
import type { GraphEntitySummary } from "@/lib/graph/registry";

export const recordTypeLabels: Record<
  "task" | "transaction" | "job_application",
  string
> = {
  task: "Task",
  transaction: "Transaction",
  job_application: "Career application",
};

type SourceType = keyof typeof recordTypeLabels;

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
    <div ref={root} className="col-span-full min-w-0">
      <p className="text-muted-foreground text-xs font-medium">
        {label} (optional)
      </p>
      <input
        type="hidden"
        name={name}
        value={selected ? `${selected.type}:${selected.id}` : ""}
      />
      {selected ? (
        <div className="bg-primary/[0.06] ring-primary/20 mt-1.5 flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl py-2 pr-2 pl-3 ring-1">
          <span className="flex min-w-0 items-center gap-2 text-sm break-words">
            <Link2
              aria-hidden="true"
              className="text-primary size-4 shrink-0"
            />
            <span className="min-w-0">
              <span className="text-muted-foreground">
                {recordTypeLabels[selected.type as SourceType]} ·{" "}
              </span>
              {selected.title}
            </span>
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
        <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-[11rem_minmax(0,1fr)_auto]">
          {types.length > 1 && (
            <label className={fieldLabelClass}>
              Record type
              <select
                value={type}
                onChange={(event) => {
                  setType(event.target.value as SourceType);
                  setCandidates([]);
                }}
                className={fieldSelectClass}
              >
                {types.map((item) => (
                  <option key={item} value={item}>
                    {recordTypeLabels[item]}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className={fieldLabelClass}>
            Search{" "}
            {types.length === 1
              ? recordTypeLabels[type].toLowerCase()
              : "records"}
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
            <Search aria-hidden="true" className="size-4" />
            {loading ? "Searching…" : "Find"}
          </Button>
        </div>
      )}
      {!selected && candidates.length > 0 && (
        <ul
          className="bg-background ring-border mt-2 max-h-52 overflow-y-auto rounded-xl p-1 shadow-[0_12px_30px_-18px_rgb(7_10_15/0.45)] ring-1"
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
                className="hover:bg-muted focus-visible:ring-ring min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm break-words focus-visible:ring-2 focus-visible:outline-none"
              >
                {item.title}
                {item.subtitle ? (
                  <span className="text-muted-foreground">
                    {` · ${item.subtitle}`}
                  </span>
                ) : null}
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
