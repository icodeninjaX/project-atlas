"use client";

import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type RefObject,
} from "react";

const ACTIVE_SELECTOR =
  '[aria-current="page"], [aria-current="true"], [aria-selected="true"], [aria-pressed="true"]';

/**
 * Keeps a horizontally scrolling tab strip readable on narrow screens:
 * - `data-fade` is set to "start", "end", or "both" while tabs are hidden
 *   past an edge, which `globals.css` turns into an edge fade;
 * - with `centerActive`, the current tab is scrolled into the middle of the
 *   strip whenever `activeKey` changes, without moving the page.
 */
export function useScrollStrip<T extends HTMLElement>(
  ref: RefObject<T | null>,
  {
    activeKey,
    centerActive = true,
  }: { activeKey?: unknown; centerActive?: boolean } = {},
) {
  useEffect(() => {
    const strip = ref.current;
    if (!strip || !centerActive) return;
    const active = strip.querySelector<HTMLElement>(ACTIVE_SELECTOR);
    if (!active || strip.scrollWidth <= strip.clientWidth) return;
    // offsetLeft is relative to the offset parent; measure against the strip.
    const offset =
      active.getBoundingClientRect().left -
      strip.getBoundingClientRect().left +
      strip.scrollLeft;
    strip.scrollLeft = offset - (strip.clientWidth - active.offsetWidth) / 2;
  }, [ref, activeKey, centerActive]);

  useEffect(() => {
    const strip = ref.current;
    if (!strip) return;
    const update = () => {
      const overflow = strip.scrollWidth - strip.clientWidth;
      const start = overflow > 1 && strip.scrollLeft > 1;
      const end = overflow > 1 && strip.scrollLeft < overflow - 1;
      const fade = start && end ? "both" : start ? "start" : end ? "end" : "";
      if (fade) strip.dataset.fade = fade;
      else delete strip.dataset.fade;
    };
    update();
    strip.addEventListener("scroll", update, { passive: true });
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(strip);
    return () => {
      strip.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [ref]);
}

/** A `<nav>` (or `<div>`) tab strip with edge fades and active-tab centering. */
export function ScrollStrip({
  as: Tag = "nav",
  activeKey,
  ...props
}: ComponentPropsWithoutRef<"nav"> & {
  as?: "nav" | "div";
  activeKey?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useScrollStrip(ref, { activeKey });
  return <Tag ref={ref as RefObject<HTMLDivElement>} {...props} />;
}
