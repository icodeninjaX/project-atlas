"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";

/**
 * Reading a chart one bucket at a time: a mouse or touch picks the bucket
 * under it, and the arrow keys, Home, and End step through them. Key moves
 * are announced; pointer moves are not, so a mouse never floods a screen
 * reader. Without a pick, `index` rests on `resting`.
 */
export function useScrub(
  count: number,
  resting: number,
  describe: (index: number) => string,
) {
  const [picked, setPicked] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const index = picked ?? resting;

  const pick = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    setPicked(Math.min(Math.max(Math.floor(ratio * count), 0), count - 1));
  };

  const step = (event: KeyboardEvent<HTMLElement>) => {
    const moves: Record<string, number> = {
      ArrowRight: Math.min(index + 1, count - 1),
      ArrowLeft: Math.max(index - 1, 0),
      Home: 0,
      End: count - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setPicked(next);
    setAnnouncement(describe(next));
  };

  return {
    index,
    /** A bucket is picked, rather than resting. */
    active: picked !== null,
    announcement,
    handlers: {
      onPointerMove: pick,
      onPointerDown: pick,
      onPointerLeave: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType === "mouse") setPicked(null);
      },
      onKeyDown: step,
      onBlur: () => setPicked(null),
    },
  };
}
