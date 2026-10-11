import { cn } from "@/lib/utils";

/**
 * The light behind a page's lead surface: one source, up and to the right,
 * washing down over the top edge. Every hero shares it, so a page reads as
 * lit the same way as the one before it. `warm` relights it in the
 * destructive tone when the hero is reporting a problem. The host must be
 * positioned and `isolate`.
 */
export function HeroBackdrop({ warm = false }: { warm?: boolean }) {
  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b to-transparent",
          warm ? "from-destructive/12" : "from-primary/14",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -top-40 -right-24 -z-10 size-96 rounded-full blur-3xl",
          warm ? "bg-destructive/15" : "bg-primary/20",
        )}
      />
      <div
        aria-hidden="true"
        className="via-primary/70 pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
      />
    </>
  );
}
