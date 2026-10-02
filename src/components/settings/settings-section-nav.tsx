"use client";

import {
  BellRing,
  Database,
  Fingerprint,
  HardDrive,
  Palette,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useScrollStrip } from "@/components/shared/scroll-strip";
import { cn } from "@/lib/utils";

export const settingsSections = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security", icon: Fingerprint },
  { id: "offline", label: "Offline", icon: HardDrive },
  { id: "reminders", label: "Reminders", icon: BellRing },
  { id: "data", label: "Data", icon: Database },
  { id: "account", label: "Account", icon: ShieldCheck },
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

  useScrollStrip(stripRef, {
    activeKey: active,
    centerActive: variant === "strip",
  });

  const links = settingsSections.map(({ id, label, icon: Icon }, index) => {
    const current = active === id;
    return (
      <a
        key={id}
        href={`#${id}`}
        aria-current={current ? "true" : undefined}
        onClick={() => setActive(id)}
        className={cn(
          "focus-visible:ring-ring group relative inline-flex shrink-0 items-center gap-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
          variant === "strip" && "min-h-10 rounded-full px-3.5 ring-1",
          variant === "strip" &&
            (current
              ? "bg-primary-solid text-primary-solid-foreground ring-primary-solid shadow-[0_4px_14px_-6px_color-mix(in_srgb,var(--primary-solid)_70%,transparent)]"
              : "bg-card/70 text-muted-foreground ring-border/80 hover:text-foreground hover:bg-card"),
          variant === "sidebar" && "min-h-10 w-full rounded-xl px-2.5",
          variant === "sidebar" &&
            (current
              ? "bg-primary/10 text-foreground"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"),
        )}
      >
        {variant === "sidebar" ? (
          <span
            aria-hidden="true"
            className={cn(
              "bg-primary absolute top-2 bottom-2 -left-3 w-[3px] rounded-full transition-opacity",
              current ? "opacity-100" : "opacity-0",
            )}
          />
        ) : null}
        <Icon
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0",
            variant === "sidebar" && (current ? "text-primary" : ""),
          )}
        />
        <span className="flex-1">{label}</span>
        {variant === "sidebar" ? (
          <span
            aria-hidden="true"
            className={cn(
              "font-mono text-[10px] tabular-nums",
              current ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        ) : null}
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
      className="bg-background/80 sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-4 mt-6 flex [scrollbar-width:none] gap-1.5 overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-1rem),transparent)] px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden [&::-webkit-scrollbar]:hidden"
    >
      {links}
    </nav>
  );
}
