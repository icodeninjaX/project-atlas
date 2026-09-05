"use client";

import { Sunrise } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  getRandomWisdomQuote,
  type WisdomQuote,
} from "@/lib/gratitude/gratitude-reflections";

export const GRATITUDE_ROTATION_INTERVAL_MS = 60 * 60 * 1_000;

const WISDOM_SESSION_KEY = "atlas-wisdom-quote-v1";

function readRememberedIndex() {
  try {
    const storedIndex = window.sessionStorage.getItem(WISDOM_SESSION_KEY);
    if (storedIndex === null) return undefined;

    const index = Number(storedIndex);
    return Number.isInteger(index) ? index : undefined;
  } catch {
    return undefined;
  }
}

function rememberIndex(index: number) {
  try {
    window.sessionStorage.setItem(WISDOM_SESSION_KEY, String(index));
  } catch {
    // The rotation still works when browser storage is unavailable.
  }
}

export function GratitudeCard({
  className = "",
  initialQuote,
  compact = false,
}: {
  className?: string;
  initialQuote: WisdomQuote;
  compact?: boolean;
}) {
  const [quote, setQuote] = useState(initialQuote);
  const didResolveRefresh = useRef(false);

  useEffect(() => {
    if (didResolveRefresh.current) return;
    didResolveRefresh.current = true;

    setQuote((current) => {
      const rememberedIndex = readRememberedIndex();
      const next =
        rememberedIndex === current.index
          ? getRandomWisdomQuote(current.index)
          : current;

      rememberIndex(next.index);
      return next;
    });
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setQuote((current) => {
        const next = getRandomWisdomQuote(current.index);
        rememberIndex(next.index);
        return next;
      });
    }, GRATITUDE_ROTATION_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <Card
      aria-label="Daily wisdom"
      className={`relative overflow-hidden border-[#9a795f]/80 bg-[#172236] text-white ${className}`}
      style={{
        backgroundImage: 'url("/gratitude/atlas-gratitude-card-surface.webp")',
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <CardContent
        className={`relative flex h-full flex-col justify-between ${
          compact
            ? "min-h-36 p-4 sm:min-h-40 sm:p-5"
            : "min-h-44 p-4 sm:min-h-52 sm:p-6 lg:min-h-56 lg:p-7"
        }`}
      >
        <div className={compact ? "pr-12" : "pr-16 sm:pr-20 lg:pr-24"}>
          <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-[#a9c5ff] uppercase">
            {quote.category}
          </p>
          <blockquote
            aria-live="polite"
            className={compact ? "mt-2" : "mt-3 sm:mt-4"}
          >
            <p
              className={`max-w-xl font-serif text-[#f8fafc] ${
                compact
                  ? "text-base leading-6 sm:text-lg"
                  : "text-lg leading-6 sm:text-2xl sm:leading-[1.45] lg:text-[1.7rem] lg:leading-[1.35]"
              }`}
            >
              “{quote.message}”
            </p>
            <footer className="mt-2 text-xs font-medium text-[#dce6f5] sm:text-sm">
              — {quote.author}
            </footer>
          </blockquote>
        </div>

        {!compact && (
          <p className="mt-4 text-xs leading-5 text-[#aab6c8] sm:mt-5">
            New on refresh · Changes hourly · {quote.collectionSize} famous
            quotes
          </p>
        )}

        <Sunrise
          aria-hidden="true"
          className={`absolute text-[#dce6f5]/85 ${
            compact
              ? "top-4 right-4 size-8"
              : "top-5 right-5 size-11 sm:top-6 sm:right-6 sm:size-14 lg:top-1/2 lg:right-7 lg:size-16 lg:-translate-y-1/2"
          }`}
          strokeWidth={1.25}
        />
      </CardContent>
    </Card>
  );
}
