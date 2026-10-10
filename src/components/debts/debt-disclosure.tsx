"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Optional detail folded behind one row: a label, and while closed a short
 * summary of what is inside, so nothing set there is out of sight. Closed
 * content stays in the page (hidden), so its fields still submit.
 *
 * `tile` is a soft filled row for forms; `row` is a hairline-topped row
 * for the end of a card.
 */
export function Disclosure({
  label,
  summary,
  defaultOpen = false,
  variant = "tile",
  className,
  children,
}: {
  label: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  variant?: "tile" | "row";
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        variant === "row" && "border-border/70 border-t pt-1",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "focus-visible:ring-ring flex w-full min-w-0 items-center gap-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
          variant === "tile"
            ? "bg-muted/45 hover:bg-muted/70 min-h-12 rounded-2xl px-4 py-2.5"
            : "hover:text-foreground min-h-12 rounded-lg py-2",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{label}</span>
          {summary && !open ? (
            <span className="text-muted-foreground block truncate text-xs">
              {summary}
            </span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div id={id} hidden={!open} className="pt-4">
        {children}
      </div>
    </div>
  );
}
