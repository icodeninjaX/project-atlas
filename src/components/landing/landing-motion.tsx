"use client";

import { useEffect, useState } from "react";

const RAIL = [
  { chapter: "hero", label: "Core" },
  { chapter: "money", label: "Money" },
  { chapter: "tasks", label: "Tasks" },
  { chapter: "goals", label: "Goals" },
  { chapter: "career", label: "Career" },
  { chapter: "reflection", label: "Reflection" },
  { chapter: "intelligence", label: "Center" },
  { chapter: "dayline", label: "Route" },
  { chapter: "trust", label: "Trust" },
] as const;

const RAIL_ALIASES: Record<string, string> = {
  fracture: "hero",
  home: "trust",
  cta: "trust",
};

/**
 * Smooth scrolling, reveal-on-view, and the chapter rail for the landing page.
 * Content stays fully visible without JavaScript; the `data-motion` flag on
 * the landing root opts into the entrance transitions.
 */
export function LandingMotion() {
  const [active, setActive] = useState<string>("hero");

  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-landing-root]");
    if (!root) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    root.dataset.motion = reducedMotion ? "reduced" : "full";

    const onScroll = () => {
      root.dataset.scrolled = window.scrollY > 24 ? "true" : "false";
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.inview = "true";
          reveal.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -18% 0px", threshold: 0.12 },
    );
    const sections = document.querySelectorAll<HTMLElement>(
      "[data-reveal-group]",
    );
    sections.forEach((section) => reveal.observe(section));

    const chapters = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const chapter = (entry.target as HTMLElement).dataset.chapter;
          if (entry.isIntersecting && chapter) {
            setActive(RAIL_ALIASES[chapter] ?? chapter);
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    document
      .querySelectorAll<HTMLElement>("[data-chapter]")
      .forEach((chapter) => chapters.observe(chapter));

    let lenis: import("lenis").default | null = null;
    let cancelled = false;
    if (!reducedMotion) {
      import("lenis").then(({ default: Lenis }) => {
        if (cancelled) return;
        lenis = new Lenis({
          autoRaf: true,
          anchors: true,
          lerp: 0.085,
          wheelMultiplier: 0.9,
        });
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
      reveal.disconnect();
      chapters.disconnect();
      lenis?.destroy();
    };
  }, []);

  const activeIndex = RAIL.findIndex((item) => item.chapter === active);

  return (
    <nav aria-label="Page chapters" className="landing-rail">
      <ol>
        {RAIL.map((item, index) => (
          <li key={item.chapter}>
            <a
              href={`#${item.chapter}`}
              aria-current={index === activeIndex ? "step" : undefined}
              data-passed={activeIndex >= index ? "true" : "false"}
            >
              <span className="landing-rail-label">{item.label}</span>
              <span className="landing-rail-tick" />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
