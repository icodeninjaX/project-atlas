import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The frame every app page sits in: one width and one gutter, so the
 * title never jumps between pages.
 */
export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate mx-auto w-full max-w-[1240px] min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10",
        className,
      )}
    >
      {children}
    </div>
  );
}
