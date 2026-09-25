"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  type ChapterAnchor,
  CORE_DOMAINS,
  LANDING_CHAPTERS,
  type LandingChapter,
  ROUTE_STOPS,
} from "./scene-states";

type StageStatus = "loading" | "ready" | "fallback";

function readAnchors(): ChapterAnchor[] {
  const viewport = window.innerHeight;
  const anchors: ChapterAnchor[] = [];
  for (const element of document.querySelectorAll<HTMLElement>(
    "[data-chapter]",
  )) {
    const chapter = element.dataset.chapter as LandingChapter;
    if (!LANDING_CHAPTERS.includes(chapter)) continue;
    const top = element.getBoundingClientRect().top + window.scrollY;
    const pin = element.querySelector<HTMLElement>(".landing-pin");
    const pinned = pin ? getComputedStyle(pin).position === "sticky" : false;
    // Unpinned chapters on narrow screens reserve space above their copy for
    // the scene, so their state is reached as the chapter's top arrives.
    const anchor =
      chapter === "hero"
        ? 0
        : !pinned && window.innerWidth < 1024
          ? Math.max(0, top - viewport * 0.08)
          : top + Math.max(0, element.offsetHeight - viewport) / 2;
    anchors.push({ chapter, scrollY: anchor });
  }
  return anchors.sort((a, b) => a.scrollY - b.scrollY);
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function LandingStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const domainRefs = useRef<HTMLDivElement[]>([]);
  const routeRefs = useRef<HTMLDivElement[]>([]);
  const [status, setStatus] = useState<StageStatus>("loading");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!supportsWebGL()) {
      // Deferred so the fallback swap happens outside the effect body.
      const frame = requestAnimationFrame(() => setStatus("fallback"));
      return () => cancelAnimationFrame(frame);
    }

    let disposed = false;
    let engine: import("./system-core-engine").SystemCoreEngine | null = null;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    import("./system-core-engine")
      .then(({ SystemCoreEngine }) => {
        if (disposed) return;
        engine = new SystemCoreEngine({
          canvas,
          domainLabels: domainRefs.current,
          routeLabels: routeRefs.current,
          getAnchors: readAnchors,
          reducedMotion,
          onReady: () => setStatus("ready"),
          onContextLost: () => setStatus("fallback"),
        });
        engine.start();
      })
      .catch(() => {
        if (!disposed) setStatus("fallback");
      });

    return () => {
      disposed = true;
      engine?.dispose();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="landing-stage pointer-events-none fixed inset-0 z-0 overflow-hidden"
      data-status={status}
    >
      <div className="landing-stage-backdrop absolute inset-0" />
      {status === "fallback" ? (
        <Image
          src="/landing/system-core-glass.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="landing-stage-fallback object-cover"
        />
      ) : (
        <canvas
          ref={canvasRef}
          className="landing-stage-canvas absolute inset-0 size-full"
        />
      )}
      <div className="absolute inset-0">
        {CORE_DOMAINS.map((domain, index) => (
          <div
            key={domain}
            ref={(element) => {
              if (element) domainRefs.current[index] = element;
            }}
            className="landing-domain-label"
            style={{ opacity: 0, visibility: "hidden" }}
          >
            <span className="landing-domain-label-inner">
              <span className="landing-domain-label-index">0{index + 1}</span>
              {domain}
            </span>
          </div>
        ))}
        {ROUTE_STOPS.map((stop, index) => (
          <div
            key={stop.time}
            ref={(element) => {
              if (element) routeRefs.current[index] = element;
            }}
            className="landing-route-label"
            style={{ opacity: 0, visibility: "hidden" }}
          >
            <span className="landing-route-label-inner">
              <span className="landing-route-label-time">
                {stop.time} · {CORE_DOMAINS[index]}
              </span>
              <span className="landing-route-label-title">{stop.title}</span>
              <span className="landing-route-label-note">{stop.note}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="landing-stage-vignette absolute inset-0" />
    </div>
  );
}
