"use client";

import { useEffect, useRef, useState } from "react";
import { useScrollStrip } from "@/components/shared/scroll-strip";
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
 * Jump links for the long Settings page: sticky underline tabs below `lg`,
 * and a vertical "On this page" list inside the desktop sidebar.
 */
export function SettingsSectionNav({
  variant,
}: {
  variant: "strip" | "sidebar";
}) {
  const [active, setActive] = useActiveSection();
  const stripRef = useRef<HTMLElement>(null);

  useScrollStrip(stripRef, {
    activeKey: active,
    centerActive: variant === "strip",
  });

  const links = settingsSections.map(({ id, label }) => {
    const current = active === id;
    return (
      <a
        key={id}
        href={`#${id}`}
        aria-current={current ? "true" : undefined}
        onClick={() => setActive(id)}
        className={cn(
          "focus-visible:ring-ring relative inline-flex shrink-0 items-center transition-colors focus-visible:ring-2 focus-visible:outline-none",
          variant === "strip" &&
            "min-h-11 text-[0.8125rem] font-medium sm:min-h-10",
          variant === "strip" &&
            (current
              ? "text-foreground shadow-[inset_0_-2px_0_var(--foreground)]"
              : "text-muted-foreground hover:text-foreground"),
          variant === "sidebar" &&
            "min-h-10 w-full rounded-xl px-2.5 text-sm font-medium",
          variant === "sidebar" &&
            (current
              ? "text-foreground"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"),
        )}
      >
        {variant === "sidebar" ? (
          <span
            aria-hidden="true"
            className={cn(
              "bg-foreground absolute top-2 bottom-2 -left-3 w-[3px] rounded-full transition-opacity",
              current ? "opacity-100" : "opacity-0",
            )}
          />
        ) : null}
        {label}
      </a>
    );
  });

  if (variant === "sidebar") {
    return (
      <nav aria-label="Settings sections" className="relative space-y-0.5">
        {links}
      </nav>
    );
  }

  return (
    <nav
      ref={stripRef}
      aria-label="Settings sections"
      className="bg-background sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-4 mt-6 flex [scrollbar-width:none] gap-6 overflow-x-auto px-4 shadow-[inset_0_-1px_0_var(--border)] sm:-mx-6 sm:px-6 lg:hidden [&::-webkit-scrollbar]:hidden"
    >
      {links}
    </nav>
  );
}
