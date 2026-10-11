"use client";

import { Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { CollapsibleFilters } from "@/components/shared/collapsible-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const typeOptions = [
  ["Tasks", "Tasks"],
  ["Goals", "Goals"],
  ["Debts", "Debts"],
  ["Transactions", "Money"],
  ["Career", "Career"],
  ["Reviews", "Reviews"],
  ["Knowledge", "Knowledge"],
] as const;

const fieldClass = "grid min-w-0 gap-1.5 text-sm font-medium";

/** A native select that matches `Input`, focus ring included. */
const selectClass =
  "border-border bg-background focus-visible:border-ring focus-visible:ring-ring/40 min-h-11 w-full rounded-xl border px-3 text-base font-normal outline-none focus-visible:ring-2 sm:text-sm";

const statusOptions = [
  ["open", "Open / active"],
  ["completed", "Completed"],
  ["active", "Active"],
  ["paused", "Paused"],
] as const;

export function SearchInput({
  defaultValue,
  entityType = "all",
  status = "all",
  fromDate = "",
  toDate = "",
}: {
  defaultValue: string;
  entityType?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        event.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) &&
        !target.isContentEditable
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <form
      role="search"
      className="border-border bg-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
    >
      <label className="text-foreground text-sm font-semibold">
        Search ATLAS
        <span className="relative mt-2 block">
          <Search className="text-muted-foreground pointer-events-none absolute top-3.5 left-3.5 size-4" />
          <Input
            ref={inputRef}
            type="search"
            name="q"
            defaultValue={defaultValue}
            minLength={2}
            maxLength={100}
            placeholder="Task, goal, merchant, creditor, company, or phrase"
            className="h-12 pr-12 pl-10"
          />
          <kbd
            aria-hidden="true"
            className="border-border bg-muted text-muted-foreground pointer-events-none absolute top-3.5 right-3 hidden rounded-md border px-1.5 font-mono text-[0.625rem] sm:block"
          >
            /
          </kbd>
        </span>
      </label>
      <CollapsibleFilters
        activeCount={
          [
            typeOptions.some(([value]) => value === entityType),
            statusOptions.some(([value]) => value === status),
            fromDate,
            toDate,
          ].filter(Boolean).length
        }
        actions={
          <Button type="submit" className="h-12 flex-1 self-end">
            Search
          </Button>
        }
      >
        <fieldset className="border-border grid gap-3 border-t pt-3 sm:order-last sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="px-1 text-sm font-semibold">Narrow results</legend>
          <label className={fieldClass}>
            Type
            <select
              name="type"
              defaultValue={entityType}
              className={selectClass}
            >
              <option value="all">All types</option>
              {typeOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldClass}>
            Status
            <select name="status" defaultValue={status} className={selectClass}>
              <option value="all">All statuses</option>
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldClass}>
            From
            <Input
              name="from"
              type="date"
              defaultValue={fromDate}
              className="font-normal"
            />
          </label>
          <label className={fieldClass}>
            To
            <Input
              name="to"
              type="date"
              defaultValue={toDate}
              className="font-normal"
            />
          </label>
        </fieldset>
      </CollapsibleFilters>
    </form>
  );
}
