"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The pipeline's breakdown. Phones fold it behind one toggle so the list
 * starts within the first screen; wide screens always show it in the
 * hero's grid, where `contents` lets each child keep its own cell.
 */
export function PipelineDetails({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
        className="text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:ring-ring -mx-2 -my-3 flex min-h-11 items-center justify-between gap-2 rounded-xl px-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none lg:hidden"
      >
        {open ? "Hide stage breakdown" : "Show stage breakdown"}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 transition-transform motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      <div id={id} className={cn(open ? "contents" : "hidden", "lg:contents")}>
        {children}
      </div>
    </>
  );
}
