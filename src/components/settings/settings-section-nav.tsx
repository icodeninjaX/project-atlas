"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const settingsSections = [
  { id: "profile", label: "Profile" },
  { id: "appearance", label: "Appearance" },
  { id: "security", label: "Security" },
  { id: "offline", label: "Offline" },
  { id: "reminders", label: "Reminders" },
  { id: "data", label: "Data" },
  { id: "account", label: "Account" },
] as const;

export type SettingsSectionId = (typeof settingsSections)[number]["id"];

function useActiveSection() {
  const [active, setActive] = useState<SettingsSectionId>(
    settingsSections[0].id,
  );

  useEffect(() => {
    const elements = settingsSections
      .map(({ id }) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (!elements.length || typeof IntersectionObserver === "undefined") {
      return;
    }

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // The first section in page order that crosses the reading band wins.
        const first = settingsSections.find(({ id }) => visible.has(id));
        if (first) setActive(first.id);
      },
      // A band just below the sticky header and section strip.
      { rootMargin: "-140px 0px -55% 0px" },
    );
    elements.forEach((element) => observer.observe(element));

    // The last sections can be too short to reach the reading band; at the
    // bottom of the page, highlight the last one that is on screen.
    const onScroll = () => {
      const root = document.documentElement;
      if (window.innerHeight + window.scrollY < root.scrollHeight - 2) return;
      const last = [...elements]
        .reverse()
        .find((element) => element.getBoundingClientRect().top < innerHeight);
      if (last) setActive(last.id as SettingsSectionId);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return [active, setActive] as const;
}

/**
 * Jump links for the long Settings page: a sticky chip strip below `lg`, and a
 * vertical "On this page" list inside the desktop sidebar.
 */
export function SettingsSectionNav({
  variant,
}: {
  variant: "strip" | "sidebar";
}) {
  const [active, setActive] = useActiveSection();
  const stripRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (variant !== "strip") return;
    const strip = stripRef.current;
    const chip = strip?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!strip || !chip || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollLeft =
      chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2;
  }, [active, variant]);

  const links = settingsSections.map(({ id, label }) => (
    <a
      key={id}
      href={`#${id}`}
      aria-current={active === id ? "true" : undefined}
      onClick={() => setActive(id)}
      className={cn(
        "focus-visible:ring-ring inline-flex min-h-10 shrink-0 items-center rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
        variant === "sidebar" && "min-h-9 w-full",
        active === id
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </a>
  ));

  if (variant === "sidebar") {
    return (
      <nav aria-label="Settings sections" className="space-y-0.5">
        {links}
      </nav>
    );
  }

  return (
    <nav
      ref={stripRef}
      aria-label="Settings sections"
      className="border-border bg-background/95 sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-4 mt-6 flex [scrollbar-width:none] gap-1 overflow-x-auto border-b px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden [&::-webkit-scrollbar]:hidden"
    >
      {links}
    </nav>
  );
}
