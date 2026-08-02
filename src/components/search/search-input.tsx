"use client";

import { Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
        Search Atlas
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
            className="border-border bg-muted text-muted-foreground pointer-events-none absolute top-3.5 right-3 rounded border px-1.5 font-mono text-[10px]"
          >
            /
          </kbd>
        </span>
      </label>
      <Button type="submit" className="h-12 self-end">
        Search
      </Button>
      <fieldset className="border-border grid gap-3 border-t pt-3 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="text-muted-foreground px-1 text-xs font-semibold">
          Narrow results
        </legend>
        <label className="text-muted-foreground text-xs">
          Type
          <select
            name="type"
            defaultValue={entityType}
            className="border-border bg-background mt-1 min-h-10 w-full rounded-xl border px-3 text-sm"
          >
            <option value="all">All types</option>
            <option value="Tasks">Tasks</option>
            <option value="Goals">Goals</option>
            <option value="Debts">Debts</option>
            <option value="Transactions">Money</option>
            <option value="Career">Career</option>
            <option value="Reviews">Reviews</option>
          </select>
        </label>
        <label className="text-muted-foreground text-xs">
          Status
          <select
            name="status"
            defaultValue={status}
            className="border-border bg-background mt-1 min-h-10 w-full rounded-xl border px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="open">Open / active</option>
            <option value="completed">Completed</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </label>
        <label className="text-muted-foreground text-xs">
          From
          <Input
            name="from"
            type="date"
            defaultValue={fromDate}
            className="mt-1"
          />
        </label>
        <label className="text-muted-foreground text-xs">
          To
          <Input name="to" type="date" defaultValue={toDate} className="mt-1" />
        </label>
      </fieldset>
    </form>
  );
}
