"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Tracks a mouse pointer over any `[data-spotlight]` card inside it and
 * hands the card `--spot-x` / `--spot-y`, which its spotlight light reads.
 * Touch and pen are ignored, and one listener serves the whole page.
 */
export function SpotlightArea({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <div
      className={className}
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse") return;
        const card = (event.target as Element).closest<HTMLElement>(
          "[data-spotlight]",
        );
        if (!card) return;
        const { clientX, clientY } = event;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty("--spot-x", `${clientX - rect.left}px`);
          card.style.setProperty("--spot-y", `${clientY - rect.top}px`);
        });
      }}
    >
      {children}
    </div>
  );
}
