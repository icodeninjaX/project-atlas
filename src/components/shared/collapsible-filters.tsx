"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Secondary filter fields that stay out of the way on phones.
 *
 * Below `sm`, the fields sit behind a "Filters" toggle so results are visible
 * without scrolling past the form; the panel starts open when a filter is
 * already applied. From `sm` up, both wrappers use `display: contents`, so the
 * fields and actions lay out in the parent grid exactly as before.
 */
export function CollapsibleFilters({
  activeCount,
  children,
  actions,
  panelClassName,
}: {
  activeCount: number;
  children: ReactNode;
  actions?: ReactNode;
  panelClassName?: string;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(activeCount > 0);

  return (
    <>
      <div
        id={panelId}
        className={cn(
          open ? "grid" : "hidden",
          "gap-3 sm:contents",
          panelClassName,
        )}
      >
        {children}
      </div>
      <div className="flex flex-wrap gap-2 sm:contents">
        <Button
          type="button"
          variant="secondary"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="min-h-11 flex-1 sm:hidden"
        >
          Filters
          {activeCount > 0 ? (
            <span className="text-muted-foreground font-mono text-xs">
              {activeCount}
            </span>
          ) : null}
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </Button>
        {actions}
      </div>
    </>
  );
}
